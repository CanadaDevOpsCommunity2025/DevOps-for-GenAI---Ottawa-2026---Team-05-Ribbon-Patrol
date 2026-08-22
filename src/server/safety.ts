/**
 * Command safety policy for GitPet.
 *
 * Two independent layers, both provider-agnostic — they behave identically
 * whether the recommendation came from Gemini, from the rule engine, or was
 * typed by hand:
 *
 *   1. STATIC rules reject commands that are unsafe in any repository
 *      (force pushes, hard resets, history rewriting, shell injection).
 *   2. CONTEXTUAL lints compare the command against the repository's actual
 *      observed state, catching advice that is syntactically fine but wrong
 *      for this working tree — most importantly `git stash` proposed while
 *      untracked files are present, which silently leaves them behind.
 *
 * The model is instructed to avoid unsafe commands, but that is guidance, not
 * a guarantee. This module is the boundary that actually holds.
 */

export type SafetyVerdict = 'allow' | 'warn' | 'block';

export interface SafetyFinding {
  severity: 'block' | 'warn';
  code: string;
  message: string;
  /** A corrected command, when a mechanical fix exists. */
  suggestion?: string;
}

export interface ParsedGitCommand {
  raw: string;
  subcommand: string;
  args: string[];
}

export interface SafetyReport {
  verdict: SafetyVerdict;
  findings: SafetyFinding[];
  commands: ParsedGitCommand[];
  /** True when the command line parsed cleanly into git invocations. */
  parsed: boolean;
}

/** Minimal shape needed for contextual lints; matches RepositoryState. */
export interface RepositoryContext {
  workingTree?: Array<{ path: string; status: string }>;
  stashes?: Array<unknown>;
  currentBranch?: {
    behindCount?: number;
    aheadCount?: number;
    isDetached?: boolean;
    upstream?: string | null;
  };
  operation?: string | null;
}

const ALLOWED_SUBCOMMANDS = new Set([
  'add', 'branch', 'checkout', 'cherry-pick', 'commit', 'diff', 'fetch',
  'log', 'merge', 'pull', 'push', 'rebase', 'remote', 'reset', 'restore',
  'revert', 'rev-parse', 'show', 'stash', 'status', 'switch', 'tag',
]);

/** Characters that only have meaning in a shell; we execute argv, so their
 *  presence means the command would not do what it appears to do. */
const SHELL_METACHARACTERS = /[;|`$><]|\|\||\$\(/;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Splits a chained command line on `&&` and newlines, ignoring separators that
 * fall inside quotes. Splitting naively would break a commit or stash message
 * that legitimately contains "&&".
 */
export function splitChain(input: string): string[] {
  const segments: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '&' && input[i + 1] === '&') {
      segments.push(current);
      current = '';
      i++;
      continue;
    }
    if (char === '\n') {
      segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  segments.push(current);

  return segments.map((s) => s.trim()).filter(Boolean);
}

/** Splits a command line into argv, honouring single and double quotes. */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let quoted = false;

  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      quoted = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (current || quoted) tokens.push(current);
      current = '';
      quoted = false;
      continue;
    }
    current += char;
  }
  if (current || quoted) tokens.push(current);
  return tokens;
}

// ---------------------------------------------------------------------------
// Static rules — unsafe regardless of repository state
// ---------------------------------------------------------------------------

interface StaticRule {
  code: string;
  severity: 'block' | 'warn';
  test: (cmd: ParsedGitCommand) => boolean;
  message: string;
  suggest?: (cmd: ParsedGitCommand) => string | undefined;
}

const STATIC_RULES: StaticRule[] = [
  {
    code: 'force-push',
    severity: 'block',
    test: (c) =>
      c.subcommand === 'push' &&
      (c.args.includes('--force') || c.args.includes('-f')) &&
      !c.args.includes('--force-with-lease'),
    message:
      'Unconditional force push can overwrite commits a teammate already pushed, with no local copy to recover from.',
    suggest: (c) =>
      c.raw.replace(/--force\b/, '--force-with-lease').replace(/(^|\s)-f(\s|$)/, '$1--force-with-lease$2'),
  },
  {
    code: 'remote-ref-delete',
    severity: 'block',
    test: (c) => c.subcommand === 'push' && (c.args.includes('--delete') || c.args.includes('-d')),
    message: 'Deleting a remote ref cannot be undone from this machine.',
  },
  {
    code: 'hard-reset',
    severity: 'block',
    test: (c) => c.subcommand === 'reset' && c.args.includes('--hard'),
    message:
      'reset --hard discards uncommitted work with no reflog entry for the working tree.',
    suggest: (c) => c.raw.replace('--hard', '--keep'),
  },
  {
    code: 'clean',
    severity: 'block',
    test: (c) => c.subcommand === 'clean',
    message: 'git clean permanently deletes untracked files, including ones never committed anywhere.',
  },
  {
    code: 'force-branch-delete',
    severity: 'block',
    test: (c) => c.subcommand === 'branch' && c.args.includes('-D'),
    message:
      'branch -D deletes a branch even when it holds unmerged commits.',
    suggest: (c) => c.raw.replace('-D', '-d'),
  },
  {
    code: 'stash-destroy',
    severity: 'block',
    test: (c) => c.subcommand === 'stash' && (c.args.includes('clear') || c.args.includes('drop')),
    message: 'Dropping or clearing a stash discards the only copy of that work.',
  },
  {
    code: 'history-rewrite',
    severity: 'block',
    test: (c) => c.subcommand === 'filter-branch' || c.args.includes('--filter-repo'),
    message: 'History rewriting is out of scope for an automated recommendation.',
  },
  {
    code: 'checkout-paths',
    severity: 'block',
    test: (c) =>
      c.subcommand === 'checkout' && c.args.includes('--') && !c.args.includes('-b'),
    message:
      'checkout of paths overwrites uncommitted edits in place and they are not recoverable.',
  },
  {
    code: 'rebase-onto-shared',
    severity: 'warn',
    test: (c) => c.subcommand === 'rebase' && c.args.includes('--onto'),
    message:
      'rebase --onto rewrites commit identities. Safe on unpushed work; disruptive if these commits are already shared.',
  },
];

// ---------------------------------------------------------------------------
// Contextual lints — correct syntax, wrong for THIS repository
// ---------------------------------------------------------------------------

function contextualFindings(
  commands: ParsedGitCommand[],
  context: RepositoryContext
): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const workingTree = context.workingTree ?? [];
  const untracked = workingTree.filter((f) => f.status === 'untracked');
  const conflicted = workingTree.filter((f) => f.status === 'conflicted');
  const stashCount = (context.stashes ?? []).length;

  const has = (sub: string) => commands.some((c) => c.subcommand === sub);
  const stashSave = commands.find(
    (c) => c.subcommand === 'stash' && !c.args.some((a) => ['pop', 'apply', 'list', 'show'].includes(a))
  );

  // The bug this module exists for: `git stash` without -u silently leaves
  // untracked files in the working tree, so a subsequent pull can still be
  // blocked by them — or overwrite them.
  if (stashSave && untracked.length > 0) {
    const includesUntracked =
      stashSave.args.includes('-u') ||
      stashSave.args.includes('--include-untracked') ||
      stashSave.args.includes('-a') ||
      stashSave.args.includes('--all');

    if (!includesUntracked) {
      findings.push({
        severity: 'warn',
        code: 'stash-misses-untracked',
        message:
          `${untracked.length} untracked file(s) (${untracked.map((f) => f.path).join(', ')}) will NOT be stashed by this command. ` +
          'They stay in the working tree, so a following pull or checkout can still fail or overwrite them.',
        suggestion: stashSave.raw.replace(/\bstash\b(\s+push)?/, (m) =>
          m.includes('push') ? `${m} -u` : 'stash push -u'
        ),
      });
    }
  }

  // Popping from an empty stash stack fails outright.
  if (
    commands.some((c) => c.subcommand === 'stash' && (c.args.includes('pop') || c.args.includes('apply'))) &&
    stashCount === 0 &&
    !stashSave
  ) {
    findings.push({
      severity: 'warn',
      code: 'stash-pop-empty',
      message: 'The stash list is currently empty, so this pop has nothing to restore and will fail.',
    });
  }

  // Pulling or switching with a dirty tree and no stash in the same chain.
  if ((has('pull') || has('merge')) && workingTree.length > 0 && !stashSave) {
    findings.push({
      severity: 'warn',
      code: 'pull-dirty-tree',
      message:
        `${workingTree.length} uncommitted file(s) are present and nothing in this command preserves them. ` +
        'The operation can refuse to run, or leave your edits entangled with incoming changes.',
    });
  }

  // Conflicts must be resolved before anything else is attempted.
  if (conflicted.length > 0 && (has('pull') || has('merge') || has('switch') || has('checkout'))) {
    findings.push({
      severity: 'block',
      code: 'unresolved-conflicts',
      message:
        `${conflicted.length} file(s) are in a conflicted state. Resolve or abort the in-progress operation before running this.`,
    });
  }

  // A paused rebase/merge narrows the safe options to continue/skip/abort.
  if (context.operation) {
    const continuation = commands.some(
      (c) =>
        c.args.includes('--continue') || c.args.includes('--abort') || c.args.includes('--skip')
    );
    const readOnly = commands.every((c) => ['status', 'log', 'diff', 'show', 'rev-parse'].includes(c.subcommand));
    if (!continuation && !readOnly && !has('add')) {
      findings.push({
        severity: 'block',
        code: 'operation-in-progress',
        message:
          `A ${context.operation} is in progress. Only --continue, --skip, --abort, staging fixes, or read-only inspection are safe right now.`,
      });
    }
  }

  // Pushing while behind produces a rejected non-fast-forward.
  if (has('push') && (context.currentBranch?.behindCount ?? 0) > 0) {
    findings.push({
      severity: 'warn',
      code: 'push-while-behind',
      message:
        `Branch is ${context.currentBranch?.behindCount} commit(s) behind upstream; this push will be rejected as a non-fast-forward until you integrate them.`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Evaluates a proposed command line. Pass repository state as `context` to
 * enable the contextual lints; without it only the static rules apply.
 */
export function evaluateCommand(
  commandLine: string,
  context: RepositoryContext = {}
): SafetyReport {
  const findings: SafetyFinding[] = [];
  const commands: ParsedGitCommand[] = [];

  const segments = splitChain(commandLine ?? '');

  if (segments.length === 0) {
    return {
      verdict: 'block',
      findings: [{ severity: 'block', code: 'empty', message: 'No command to evaluate.' }],
      commands: [],
      parsed: false,
    };
  }

  let parsed = true;

  for (const segment of segments) {
    const illegal = segment.match(SHELL_METACHARACTERS);
    if (illegal) {
      parsed = false;
      findings.push({
        severity: 'block',
        code: 'shell-metacharacter',
        message: `"${illegal[0]}" is a shell control character. Commands run as argv, so this would not behave as written.`,
      });
      continue;
    }

    const tokens = tokenize(segment);
    if (tokens[0] !== 'git') {
      parsed = false;
      findings.push({
        severity: 'block',
        code: 'not-git',
        message: `Only git commands are permitted; got "${tokens[0] ?? segment}".`,
      });
      continue;
    }

    // Step past global flags (-C <path>, -c <cfg>) to reach the subcommand.
    const args = tokens.slice(1);
    let index = 0;
    while (index < args.length && args[index].startsWith('-')) {
      index += args[index] === '-C' || args[index] === '-c' ? 2 : 1;
    }
    const subcommand = args[index];

    if (!subcommand) {
      parsed = false;
      findings.push({
        severity: 'block',
        code: 'no-subcommand',
        message: `No git subcommand found in "${segment}".`,
      });
      continue;
    }

    const command: ParsedGitCommand = { raw: segment, subcommand, args: args.slice(index + 1) };
    commands.push(command);

    if (!ALLOWED_SUBCOMMANDS.has(subcommand)) {
      findings.push({
        severity: 'block',
        code: 'subcommand-not-allowed',
        message: `git ${subcommand} is not on the permitted subcommand list.`,
      });
      continue;
    }

    for (const rule of STATIC_RULES) {
      if (rule.test(command)) {
        findings.push({
          severity: rule.severity,
          code: rule.code,
          message: rule.message,
          suggestion: rule.suggest?.(command),
        });
      }
    }
  }

  if (parsed && commands.length > 0) {
    findings.push(...contextualFindings(commands, context));
  }

  const verdict: SafetyVerdict = findings.some((f) => f.severity === 'block')
    ? 'block'
    : findings.length > 0
      ? 'warn'
      : 'allow';

  return { verdict, findings, commands, parsed };
}
