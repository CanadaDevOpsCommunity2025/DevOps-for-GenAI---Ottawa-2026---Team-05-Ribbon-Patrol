import { execFile } from 'child_process';
import { evaluateCommand, RepositoryContext, SafetyReport } from './safety';

/**
 * Executes git commands that the developer has explicitly approved.
 *
 * Writes are disabled by default. GitPet's live workspace scanner is read-only,
 * and that remains the default posture: an operator must opt in with
 * GITPET_ALLOW_WRITES=true before this module will change anything. Every
 * command is re-checked against the safety policy at execution time, so a
 * client cannot approve something the policy would refuse.
 */

export interface ExecutedStep {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  skipped?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  dryRun: boolean;
  /** True when writes are disabled and the request was preview-only. */
  writesDisabled: boolean;
  safety: SafetyReport;
  steps: ExecutedStep[];
  /** HEAD before we touched anything — the recovery anchor. */
  headBefore: string | null;
  headAfter: string | null;
  message: string;
}

export function writesEnabled(): boolean {
  return process.env.GITPET_ALLOW_WRITES === 'true';
}

/** Runs git with an argv array. Never a shell, so metacharacters are inert. */
function runGit(
  args: string[],
  cwd: string,
  timeoutMs = 60_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 12 * 1024 * 1024,
        env: { ...process.env, LC_ALL: 'C', GIT_TERMINAL_PROMPT: '0' },
      },
      (error, stdout, stderr) => {
        const out = stdout ? stdout.toString() : '';
        const err = stderr ? stderr.toString() : '';
        if (error) {
          resolve({
            stdout: out,
            stderr: err || (error as Error).message || '',
            exitCode: typeof (error as { code?: number }).code === 'number'
              ? (error as { code: number }).code
              : 1,
          });
        } else {
          resolve({ stdout: out, stderr: err, exitCode: 0 });
        }
      }
    );
  });
}

async function readHead(cwd: string): Promise<string | null> {
  const result = await runGit(['rev-parse', 'HEAD'], cwd, 10_000);
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

/**
 * Evaluates a command and, when `dryRun` is false and writes are enabled,
 * runs it. A `block` verdict from the safety policy always refuses, regardless
 * of what the caller asked for.
 */
export async function executeApprovedCommand(
  commandLine: string,
  workspaceRoot: string,
  context: RepositoryContext = {},
  options: { dryRun?: boolean } = {}
): Promise<ExecutionResult> {
  const dryRun = options.dryRun ?? true;
  const safety = evaluateCommand(commandLine, context);
  const headBefore = await readHead(workspaceRoot);

  const base = {
    safety,
    headBefore,
    headAfter: headBefore,
    steps: [] as ExecutedStep[],
    writesDisabled: !writesEnabled(),
  };

  if (safety.verdict === 'block') {
    return {
      ...base,
      success: false,
      dryRun,
      message: `Refused by safety policy: ${safety.findings
        .filter((f) => f.severity === 'block')
        .map((f) => f.message)
        .join(' ')}`,
    };
  }

  // A preview never touches the repository — it reports what would run.
  if (dryRun) {
    return {
      ...base,
      success: true,
      dryRun: true,
      steps: safety.commands.map((c) => ({
        command: c.raw,
        stdout: '',
        stderr: '',
        exitCode: 0,
        skipped: true,
      })),
      message: writesEnabled()
        ? `${safety.commands.length} step(s) reviewed and ready to run.`
        : `${safety.commands.length} step(s) reviewed. Writes are disabled — set GITPET_ALLOW_WRITES=true to enable execution.`,
    };
  }

  if (!writesEnabled()) {
    return {
      ...base,
      success: false,
      dryRun: false,
      message: 'Writes are disabled on this server. Set GITPET_ALLOW_WRITES=true to enable execution.',
    };
  }

  const steps: ExecutedStep[] = [];
  let success = true;

  for (const command of safety.commands) {
    // Stop at the first failure: later steps in a chain assume the earlier
    // ones succeeded, and running them anyway compounds the damage.
    if (!success) {
      steps.push({ command: command.raw, stdout: '', stderr: '', exitCode: -1, skipped: true });
      continue;
    }

    const argv = [command.subcommand, ...command.args];
    const result = await runGit(argv, workspaceRoot);
    steps.push({
      command: command.raw,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.exitCode,
    });
    if (result.exitCode !== 0) success = false;
  }

  const headAfter = await readHead(workspaceRoot);
  const failed = steps.find((s) => s.exitCode > 0);

  return {
    safety,
    steps,
    headBefore,
    headAfter,
    writesDisabled: false,
    success,
    dryRun: false,
    message: success
      ? 'All steps completed successfully.'
      : `Stopped at "${failed?.command}": ${failed?.stderr || 'command failed'}`,
  };
}
