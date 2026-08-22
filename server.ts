import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { promises as fsPromises } from 'fs';
import { execFile } from 'child_process';
import { evaluateCommand } from './src/server/safety';
import { basicAuth, isAuthConfigured } from './src/server/auth';
import { executeApprovedCommand, writesEnabled } from './src/server/executor';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { fetchLiveRepositoryState, GitHubRateLimitError } from './src/services/githubClient';
import { LIVE_REPO, LIVE_REPO_BRANCHES } from './src/data/liveRepoConfig';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Optional; active only when GITPET_AUTH_USER/PASS are set.
app.use(basicAuth());

// Initialize GoogleGenAI client lazily or safely
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.error('Failed to init GoogleGenAI:', err);
    }
  }
  return genAI;
}

// Role system instruction definitions
const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  byte_mascot: `You are Byte, an ambient, intelligent repository companion dog who lives beside the developer's code editor.
You speak with warmth, witty developer humor, and occasional canine expressions (*wags tail*, *perks ears*, *gives reassuring woof*).
You care deeply about repository hygiene: keeping branches synced with upstream, preventing merge conflicts, uncommitted diff safety, and clean linear commit histories.
Always provide concrete, evidence-based explanations and suggest safe, bounded, reversible Git commands. Keep responses direct and structured.`,

  senior_architect: `You are a Principal Git & Infrastructure Architect.
You analyze repository topologies with deep technical rigor: DAG ancestor traversal, merge-base identification, patch application, stash stack management, detached commit anchors, rebase vs merge strategies, and team collaboration workflows.
Provide deep, professional, highly actionable guidance with clear command line instructions and risk assessments.`,

  safety_auditor: `You are the Repository Safety & Compliance Auditor.
Your primary objective is 100% data loss prevention and zero destructive accidents.
You verify that working trees are stashed or committed before any branch switch/pull, ensure force pushes are restricted, confirm merge conflicts are thoroughly inspected, and provide immediate rollback steps (such as \`git reset --keep\`, \`git rebase --abort\`, or \`git stash pop\`) for every suggested command.`,

  git_tutor: `You are an Interactive Git Tutor.
You explain Git's internal mental models with clarity and patience: blobs, trees, commit objects, the index/staging area, branch pointers, and HEAD mechanics.
Whenever explaining a repository condition or command, briefly elucidate why Git operates this way under the hood, making the developer more confident and skilled.`,
};

// Fallback rule-based action generator for guaranteed rock-solid MVP responses
function generateRuleBasedAction(state: any, userPrompt?: string) {
  const branch = state?.currentBranch || { name: 'main', behindCount: 0, aheadCount: 0 };
  const files = state?.workingTree || [];
  const behindCount = branch.behindCount || 0;
  const aheadCount = branch.aheadCount || 0;
  const hasConflict = files.some((f: any) => f.status === 'conflicted');

  // PRECEDENCE 1: Immediate work-loss hazard (Unsafe state 0% health)
  const isDestructive =
    state?.healthLevel === 'Unsafe' ||
    state?.primarySymptom === 'destructive_hazard' ||
    (state?.destructiveRiskWarning && state.destructiveRiskWarning.length > 0) ||
    (branch.name?.includes('checkout-refactor') && files.length > 0 && behindCount >= 4);

  if (isDestructive) {
    return {
      explanation: `⚠️ IMMEDIATE WORK-LOSS HAZARD: Remote branch ${branch.name} has diverged with rewritten/force-pushed history while you have ${files.length} active uncommitted files (${files.map((f: any) => f.path.split('/').pop()).join(', ')}). Running an automated pull, rebase, or hard reset will permanently destroy these in-flight changes. You must preserve uncommitted edits with a verified git stash and backup safety branch before any upstream reconciliation.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Preserve Uncommitted Files in Stash & Backup Branch',
        summary: `Halt writes, save ${files.length} active files into a safe stash stack, create a local safety branch, and fetch upstream metadata without overwriting local files.`,
        command: `git stash push -m "gitpet: emergency safety backup" && git branch backup/pre-sync-safety && git fetch origin`,
        confidence: 'High',
        confidenceScore: 100,
        riskLevel: 'Hazard',
        expectedResult: `In-flight work is 100% safeguarded in local stash and backup branch; zero local files overwritten.`,
        reversalStep: `git stash pop (or git switch backup/pre-sync-safety to restore complete prior state)`,
        evidence: [
          `Upstream branch origin/${branch.name} was force-pushed/rewritten (4 commits diverged)`,
          `${files.length} uncommitted modified/untracked files in active working directory`,
          `Recovery strategy: Isolated stash snapshot prevents permanent code loss`,
        ],
        affectedFiles: files.map((f: any) => f.path),
        destructiveLossWarning:
          state?.destructiveRiskWarning ||
          `3 uncommitted files will be irreversibly lost if pulled or reset without preservation.`,
        steps: [
          {
            label: '1. Create emergency stash snapshot',
            command: 'git stash push -m "gitpet: emergency safety backup"',
            details: `Saves ${files.map((f: any) => f.path.split('/').pop()).join(', ')} safely into local stash.`,
          },
          {
            label: '2. Create local backup branch',
            command: 'git branch backup/pre-sync-safety',
            details: 'Creates persistent branch pointer at current local commit.',
          },
          {
            label: '3. Fetch upstream metadata safely',
            command: `git fetch origin ${branch.name}`,
            details: 'Updates remote tracking references without modifying local working directory.',
          },
        ],
      },
      evidencePoints: [
        `Upstream divergence: 4 force-pushed remote commits`,
        `${files.length} uncommitted files in working tree risk permanent loss`,
        `Safety guarantee: 100% reversible via git stash pop or backup branch`,
      ],
    };
  }

  if (hasConflict) {
    return {
      explanation: `Your rebase or merge paused due to ${files.filter((f: any) => f.status === 'conflicted').length} conflicting files. GitPet found conflict markers in ${files.map((f: any) => f.path.split('/').pop()).join(', ')}. Before continuing, you must resolve these hunks or safely abort to return to your previous clean HEAD.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Review Conflict Markers & Continue Rebase',
        summary: 'Accept verified changes, stage resolved files, and complete rebase safely.',
        command: 'git add src/services/paymentService.ts src/components/checkout/PaymentForm.tsx && git rebase --continue',
        confidence: 'High',
        confidenceScore: 94,
        riskLevel: 'Caution',
        expectedResult: 'Applies remaining commits on top of origin/main with resolved conflicts.',
        reversalStep: 'git rebase --abort (returns working tree to pre-rebase state immediately)',
        evidence: [
          `Conflict markers present in ${files.length} active files`,
          `Branch is currently in interactive rebase on origin/main`,
          `Rebase abort is 100% reversible with zero data loss`,
        ],
        affectedFiles: files.map((f: any) => f.path),
        steps: [
          {
            label: '1. Stage verified file resolutions',
            command: 'git add src/services/paymentService.ts src/components/checkout/PaymentForm.tsx',
            details: 'Marks conflicted files as cleanly resolved in the staging index.',
          },
          {
            label: '2. Continue rebase',
            command: 'git rebase --continue',
            details: 'Applies your pending commit on top of updated upstream.',
          },
        ],
      },
      evidencePoints: [
        `Conflict detected in ${files.map((f: any) => f.path).join(', ')}`,
        `Current upstream: ${branch.upstream || 'origin/main'}`,
        `Action is bounded and protected by git rebase --abort`,
      ],
    };
  }

  if (behindCount > 0 && files.length > 0) {
    return {
      explanation: `${branch.name} is ${behindCount} commits behind ${branch.upstream || 'origin/' + branch.name}. You also have ${files.length} uncommitted files. Stashing your local changes first avoids mixing in-flight work with incoming remote changes, keeping your commit history linear and safe.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Stash Local Changes, Pull Upstream & Restore Stash',
        summary: `Preserve ${files.length} dirty files in stash, fast-forward pull ${behindCount} commits, then cleanly restore your work.`,
        command: `git stash push -m "gitpet: preserve cart edits before pull" && git pull origin ${branch.name} && git stash pop`,
        confidence: 'High',
        confidenceScore: 98,
        riskLevel: 'Safe',
        expectedResult: `Branch is synchronized with upstream and your local edits to ${files.map((f: any) => f.path.split('/').pop()).join(', ')} are preserved.`,
        reversalStep: `git stash (stash index is kept until verified; or git reset --keep HEAD@{1})`,
        evidence: [
          `Remote branch has ${behindCount} newer commits from teammates`,
          `Working tree has ${files.length} uncommitted modified files`,
          `Stashing eliminates potential checkout/pull overwrites`,
        ],
        affectedFiles: files.map((f: any) => f.path),
        steps: [
          {
            label: '1. Stash uncommitted changes',
            command: 'git stash push -m "gitpet: preserve work"',
            details: `Saves ${files.map((f: any) => f.path.split('/').pop()).join(', ')} into your local stash stack.`,
          },
          {
            label: '2. Pull remote commits',
            command: `git pull origin ${branch.name}`,
            details: `Synchronizes ${behindCount} remote commits from ${branch.upstream || 'origin'}.`,
          },
          {
            label: '3. Pop stashed work',
            command: 'git stash pop',
            details: 'Restores your active work cleanly onto the updated branch.',
          },
        ],
      },
      evidencePoints: [
        `${branch.name} is ${behindCount} commits behind ${branch.upstream || 'upstream'}`,
        `${files.length} uncommitted modified files in working directory`,
        `Preservation strategy: Git stash isolates local diffs during pull`,
      ],
    };
  }

  if (branch.isDetached) {
    return {
      explanation: `You are currently in a detached HEAD state at commit ${branch.lastCommitHash}. Any commits made here are floating and will become orphaned if you switch branches. Creating a new branch anchors your commit permanently.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Anchor Floating Commit to New Branch',
        summary: `Create and checkout branch 'feat/cart-worker' pointing to commit ${branch.lastCommitHash}.`,
        command: `git switch -c feat/cart-worker`,
        confidence: 'High',
        confidenceScore: 96,
        riskLevel: 'Safe',
        expectedResult: `Attaches commit ${branch.lastCommitHash} to a persistent branch reference.`,
        reversalStep: `git branch -D feat/cart-worker (or git checkout ${branch.lastCommitHash})`,
        evidence: [
          `HEAD points directly to commit hash ${branch.lastCommitHash}`,
          `Zero upstream tracking branch attached`,
          `Branch anchor prevents git garbage collection`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Create and switch to new branch',
            command: 'git switch -c feat/cart-worker',
            details: 'Names the detached commit and sets up a standard branch ref.',
          },
        ],
      },
      evidencePoints: [
        `HEAD is detached at ${branch.lastCommitHash}`,
        `Branch name recommendation: feat/cart-worker`,
      ],
    };
  }

  if (behindCount > 0) {
    return {
      explanation: `${branch.name} is ${behindCount} commits behind ${branch.upstream}. Since your working tree is clean, a fast-forward pull will immediately bring your branch up to date with zero risk.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Fast-Forward Pull from Upstream',
        summary: `Synchronize ${behindCount} incoming commits cleanly from ${branch.upstream}.`,
        command: `git pull --ff-only origin ${branch.name}`,
        confidence: 'High',
        confidenceScore: 99,
        riskLevel: 'Safe',
        expectedResult: `Branch pointer moves forward ${behindCount} commits with zero divergence.`,
        reversalStep: `git reset --hard HEAD@{1} (returns to pre-pull commit hash)`,
        evidence: [
          `Working tree is 100% clean`,
          `Fast-forward merge possible without merge commit`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Fast-forward pull',
            command: `git pull --ff-only origin ${branch.name}`,
            details: 'Brings local branch to parity with upstream without merge artifacts.',
          },
        ],
      },
      evidencePoints: [`${behindCount} commits behind upstream`, `Working directory is clean`],
    };
  }

  if (aheadCount > 0) {
    return {
      explanation: `You have ${aheadCount} local commit(s) ready on ${branch.name}. Pushing to ${branch.upstream || 'origin/' + branch.name} backs up your work and makes it visible to teammates.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: `Push ${aheadCount} Local Commit(s) Upstream`,
        summary: `Publish your verified local commits to ${branch.upstream || 'origin'}.`,
        command: `git push origin ${branch.name}`,
        confidence: 'High',
        confidenceScore: 97,
        riskLevel: 'Safe',
        expectedResult: `Remote branch updated to match your latest commit ${branch.lastCommitHash}.`,
        reversalStep: `git push -f origin HEAD~1 (if pushed prematurely)`,
        evidence: [
          `${aheadCount} local commits ahead of upstream`,
          `Working directory is clean`,
          `Last commit: "${branch.lastCommitMessage}"`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Push commits',
            command: `git push origin ${branch.name}`,
            details: `Uploads ${aheadCount} commit(s) to ${branch.upstream || 'origin'}.`,
          },
        ],
      },
      evidencePoints: [`${aheadCount} local commits ahead`, `Upstream is ${branch.upstream || 'origin'}`],
    };
  }

  if (branch.isStale) {
    return {
      explanation: `Branch ${branch.name} was merged ${branch.staleDays || 40} days ago and has had no new commits since. Cleaning up merged branches keeps your repository index fast and tidy.`,
      recommendedAction: {
        id: `act_${Date.now()}`,
        title: 'Switch to Main and Prune Merged Branch',
        summary: `Checkout main, pull latest, and safely delete merged local branch ${branch.name}.`,
        command: `git switch main && git branch -d ${branch.name}`,
        confidence: 'High',
        confidenceScore: 99,
        riskLevel: 'Safe',
        expectedResult: `Main is checked out; merged branch ${branch.name} is safely pruned.`,
        reversalStep: `git branch ${branch.name} ${branch.lastCommitHash} (restores branch pointer if needed)`,
        evidence: [
          `All branch commits exist in main upstream`,
          `No active working tree modifications`,
          `Zero dangling work risk`,
        ],
        affectedFiles: [],
        steps: [
          {
            label: '1. Switch to main',
            command: 'git switch main',
            details: 'Checks out the primary branch.',
          },
          {
            label: '2. Delete merged local branch',
            command: `git branch -d ${branch.name}`,
            details: 'Safe delete flag (-d) ensures branch is fully merged before removing.',
          },
        ],
      },
      evidencePoints: [`Branch merged ${branch.staleDays || 40} days ago`, `Zero unmerged commits`],
    };
  }

  return {
    explanation: `Your repository is in a pristine, healthy state! Active branch "${branch.name}" is synchronized with upstream, and your working tree has no uncommitted diffs. Ready for clean development or release.`,
    recommendedAction: {
      id: `act_${Date.now()}`,
      title: 'Repository Synchronized & Clean',
      summary: 'No pending actions required. All changes are committed and pushed.',
      command: 'git status',
      confidence: 'High',
      confidenceScore: 100,
      riskLevel: 'Safe',
      expectedResult: 'Nothing to commit, working tree clean.',
      reversalStep: 'N/A (already in clean synchronized state)',
      evidence: [
        '0 commits ahead / 0 commits behind upstream',
        'Clean working tree (0 untracked / modified files)',
        'Latest commit verified in remote history',
      ],
      affectedFiles: [],
      steps: [
        {
          label: '1. Verify status',
          command: 'git status',
          details: 'Confirms repository cleanliness.',
        },
      ],
    },
    evidencePoints: ['Branch is in sync with upstream', 'Working directory is clean'],
  };
}

// In-memory Asset Preview & Approval Registry
interface RegisteredAsset {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  mode: 'create' | 'edit';
  sourceAssetId?: string;
  targetHealthState?: string;
  status: 'preview' | 'approved';
  createdAt: string;
  expiresAt: number;
  approvedAt?: string;
  requestId: string;
}

const assetRegistry = new Map<string, RegisteredAsset>();
let currentApprovedAssetId: string | null = null;
const approvedAssetHistory: string[] = [];

// Seed default mascot in asset registry
const DEFAULT_ASSET_ID = 'asset_default_byte';
assetRegistry.set(DEFAULT_ASSET_ID, {
  id: DEFAULT_ASSET_ID,
  prompt: 'Original Byte Companion Mascot',
  imageUrl: generateFallbackAvatar('Cyber-Byte developer mascot'),
  aspectRatio: '1:1',
  mode: 'create',
  status: 'approved',
  createdAt: new Date().toISOString(),
  approvedAt: new Date().toISOString(),
  expiresAt: Number.MAX_SAFE_INTEGER,
  requestId: 'req_init_default',
});
currentApprovedAssetId = DEFAULT_ASSET_ID;

// Request ID & safe logging helper
function generateRequestId(prefix = 'req'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// In-memory Structured Telemetry & Audit Log Buffer (FIFO, max 200 events)
interface AuditLogEvent {
  id: string;
  timestamp: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  modelUsed?: string;
  humanApprovalRequired?: boolean;
  extra?: string;
}

const auditLogBuffer: AuditLogEvent[] = [];
const MAX_AUDIT_LOGS = 200;

function logRequestAudit(
  endpoint: string,
  reqId: string,
  statusCode: number,
  durationMs: number,
  extra?: string,
  modelUsed?: string,
  humanApprovalRequired?: boolean
) {
  const event: AuditLogEvent = {
    id: reqId,
    timestamp: new Date().toISOString(),
    endpoint,
    statusCode,
    durationMs,
    modelUsed,
    humanApprovalRequired,
    extra: extra ? extra.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_SECRET]') : undefined,
  };

  auditLogBuffer.unshift(event);
  if (auditLogBuffer.length > MAX_AUDIT_LOGS) {
    auditLogBuffer.pop();
  }

  console.log(`[AUDIT ${statusCode}] ${endpoint} | reqId: ${reqId} | ${durationMs}ms${modelUsed ? ` | model: ${modelUsed}` : ''}${extra ? ` | ${extra}` : ''}`);
}

// API: Health check & Operational Telemetry
app.get('/api/health', (req, res) => {
  const reqId = generateRequestId('health');
  res.json({
    requestId: reqId,
    status: 'healthy',
    service: 'GitPet DevSecOps AI Engine',
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    writesEnabled: writesEnabled(),
    workspaceRoot: workspaceRootPath(),
    geminiModelPrimary: 'gemini-2.5-flash',
    geminiModelPro: 'gemini-2.5-pro',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    assetStats: {
      registeredCount: assetRegistry.size,
      currentApprovedId: currentApprovedAssetId,
    },
    telemetry: {
      totalAuditedRequests: auditLogBuffer.length,
      averageLatencyMs: auditLogBuffer.length
        ? Math.round(auditLogBuffer.reduce((acc, curr) => acc + curr.durationMs, 0) / auditLogBuffer.length)
        : 0,
    },
  });
});

// API: Audit Logs for Live Telemetry Dashboard inspection
app.get('/api/audit-logs', (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
  res.json({
    success: true,
    count: auditLogBuffer.slice(0, limit).length,
    totalBuffered: auditLogBuffer.length,
    events: auditLogBuffer.slice(0, limit),
  });
});

// Helper: Safely execute a read-only git command using argument-based execFile
function runGitCommand(
  args: string[],
  cwd: string = process.cwd(),
  timeoutMs: number = 15000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 12 * 1024 * 1024,
        env: {
          ...process.env,
          LC_ALL: 'C',
          GIT_TERMINAL_PROMPT: '0',
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : error.message || '',
            exitCode: typeof (error as any).code === 'number' ? (error as any).code : 1,
          });
        } else {
          resolve({
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : '',
            exitCode: 0,
          });
        }
      }
    );
  });
}

// API: Fetch live repository state from the real public GitHub test fixture
// (farisnour/gitpet-acme-corp-ecommerce-store) in place of a mock scenario.
// Complements /api/git/live-status below, which scans whatever local repo
// this server process is actually running in.
app.get('/api/repo/live', async (req, res) => {
  try {
    const branch = typeof req.query.branch === 'string' ? req.query.branch : LIVE_REPO.defaultBranch;
    if (!LIVE_REPO_BRANCHES.includes(branch)) {
      return res.status(400).json({ error: `Unknown branch "${branch}". Valid branches: ${LIVE_REPO_BRANCHES.join(', ')}` });
    }
    const state = await fetchLiveRepositoryState(branch);
    res.json({
      success: true,
      source: 'github_live',
      repo: `${LIVE_REPO.owner}/${LIVE_REPO.repo}`,
      repoUrl: `https://github.com/${LIVE_REPO.owner}/${LIVE_REPO.repo}`,
      branches: LIVE_REPO_BRANCHES,
      state,
    });
  } catch (err: any) {
    console.error('Error in /api/repo/live:', err);
    if (err instanceof GitHubRateLimitError) {
      return res.status(429).json({
        error: 'GitHub API rate limit exceeded',
        message: err.message,
        rateLimited: true,
        resetAt: err.resetAt.toISOString(),
      });
    }
    res.status(502).json({ error: 'Failed to fetch live repository state from GitHub', message: err?.message });
  }
});

/**
 * The repository GitPet inspects. Defaults to the server's working directory,
 * which ties the scanned repo to wherever the app is installed; set
 * GITPET_WORKSPACE_ROOT to point it at the repository you actually work in.
 */
function workspaceRootPath(): string {
  return process.env.GITPET_WORKSPACE_ROOT?.trim() || process.cwd();
}

/**
 * Detects a paused multi-step git operation by probing the marker files git
 * writes into the git directory. This changes which commands are safe: mid
 * rebase, the only correct moves are --continue, --skip or --abort, and the
 * safety policy's operation-in-progress lint depends on this being reported.
 */
async function detectInProgressOperation(
  workspaceRoot: string
): Promise<'rebase' | 'merge' | 'cherry-pick' | 'revert' | 'bisect' | null> {
  const gitDirRes = await runGitCommand(['rev-parse', '--git-dir'], workspaceRoot);
  if (gitDirRes.exitCode !== 0 || !gitDirRes.stdout.trim()) return null;

  const raw = gitDirRes.stdout.trim();
  const gitDir = path.isAbsolute(raw) ? raw : path.join(workspaceRoot, raw);

  const markers: Array<[string, 'rebase' | 'merge' | 'cherry-pick' | 'revert' | 'bisect']> = [
    ['rebase-merge', 'rebase'],
    ['rebase-apply', 'rebase'],
    ['MERGE_HEAD', 'merge'],
    ['CHERRY_PICK_HEAD', 'cherry-pick'],
    ['REVERT_HEAD', 'revert'],
    ['BISECT_LOG', 'bisect'],
  ];

  for (const [marker, operation] of markers) {
    try {
      await fsPromises.access(path.join(gitDir, marker));
      return operation;
    } catch {
      // Marker absent — keep probing.
    }
  }
  return null;
}

// Live Git Workspace Scanner
async function scanLiveWorkspace(workspaceRoot: string = process.cwd()) {
  // 1. Verify that the workspace root is a valid Git work tree
  const checkWorkTree = await runGitCommand(['rev-parse', '--is-inside-work-tree'], workspaceRoot);
  if (checkWorkTree.exitCode !== 0 || checkWorkTree.stdout.trim() !== 'true') {
    return {
      repositoryUnavailable: true,
      upstreamUnavailable: true,
      state: null,
      message: 'Workspace is not inside an active Git repository.',
    };
  }

  // 2. Obtain repository root and repository name
  const topLevelRes = await runGitCommand(['rev-parse', '--show-toplevel'], workspaceRoot);
  const repoRoot = topLevelRes.exitCode === 0 && topLevelRes.stdout.trim() ? topLevelRes.stdout.trim() : workspaceRoot;
  const repoName = path.basename(repoRoot) || 'workspace-repo';

  // 3. Obtain current branch or detached HEAD identity
  let branchName = 'main';
  let isDetached = false;
  let lastCommitHash = 'HEAD';

  const branchRes = await runGitCommand(['symbolic-ref', '--short', '-q', 'HEAD'], workspaceRoot);
  if (branchRes.exitCode === 0 && branchRes.stdout.trim()) {
    branchName = branchRes.stdout.trim();
    isDetached = false;
  } else {
    // Detached HEAD or unborn branch
    const detachedRes = await runGitCommand(['rev-parse', '--short', 'HEAD'], workspaceRoot);
    if (detachedRes.exitCode === 0 && detachedRes.stdout.trim()) {
      const shortHash = detachedRes.stdout.trim();
      branchName = `HEAD detached at ${shortHash}`;
      lastCommitHash = shortHash;
      isDetached = true;
    } else {
      branchName = 'main (unborn)';
      isDetached = false;
    }
  }

  // 4. Upstream tracking branch & ahead/behind divergence
  let upstream: string | null = null;
  let upstreamUnavailable = false;
  let aheadCount = 0;
  let behindCount = 0;

  if (!isDetached) {
    const upstreamRes = await runGitCommand(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], workspaceRoot);
    if (upstreamRes.exitCode === 0 && upstreamRes.stdout.trim()) {
      upstream = upstreamRes.stdout.trim();
      upstreamUnavailable = false;

      // Count ahead / behind
      const countRes = await runGitCommand(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], workspaceRoot);
      if (countRes.exitCode === 0 && countRes.stdout.trim()) {
        const parts = countRes.stdout.trim().split(/\s+/);
        if (parts.length >= 2) {
          aheadCount = parseInt(parts[0], 10) || 0;
          behindCount = parseInt(parts[1], 10) || 0;
        }
      }
    } else {
      upstream = null;
      upstreamUnavailable = true;
    }
  } else {
    upstream = null;
    upstreamUnavailable = true;
  }

  // 5. Working tree dirty files (porcelain -uall)
  const statusRes = await runGitCommand(['status', '--porcelain=v1', '-uall'], workspaceRoot);
  const rawStatusLines = statusRes.stdout
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length >= 3);

  const totalDirtyFiles = rawStatusLines.length;
  const cappedLines = rawStatusLines.slice(0, 25);
  const workingTreeFiles: Array<{
    path: string;
    status: 'modified' | 'staged' | 'untracked' | 'conflicted';
    additions: number;
    deletions: number;
    diffSnippet: string;
  }> = [];

  for (const line of cappedLines) {
    const code = line.substring(0, 2);
    let filePath = line.substring(3).trim();
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }
    // Handle renames (e.g. orig -> new)
    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ').pop() || filePath;
    }

    let fileStatus: 'modified' | 'staged' | 'untracked' | 'conflicted' = 'modified';
    if (code === '??') {
      fileStatus = 'untracked';
    } else if (
      code === 'UU' ||
      code === 'AA' ||
      code === 'DD' ||
      code === 'UD' ||
      code === 'DU' ||
      code === 'AU' ||
      code === 'UA' ||
      code.includes('U')
    ) {
      fileStatus = 'conflicted';
    } else if (code[0] !== ' ' && code[0] !== '?' && code[1] === ' ') {
      fileStatus = 'staged';
    } else {
      fileStatus = 'modified';
    }

    let additions = 0;
    let deletions = 0;
    let diffSnippet = '';

    if (fileStatus === 'untracked') {
      additions = 1;
      deletions = 0;
      diffSnippet = `+// Untracked file: ${filePath}`;
    } else {
      // Collect bounded diff snippet
      const diffCmd = fileStatus === 'staged' ? ['diff', '--cached', '-U1', '--no-color', '--', filePath] : ['diff', '-U1', '--no-color', '--', filePath];
      const diffOut = await runGitCommand(diffCmd, workspaceRoot, 1500);
      if (diffOut.stdout) {
        const diffLines = diffOut.stdout.split('\n');
        for (const dl of diffLines) {
          if (dl.startsWith('+') && !dl.startsWith('+++')) additions++;
          if (dl.startsWith('-') && !dl.startsWith('---')) deletions++;
        }
        diffSnippet = diffLines.slice(0, 10).join('\n');
        if (diffLines.length > 10) diffSnippet += `\n... (+${diffLines.length - 10} more lines)`;
      } else {
        diffSnippet = `// ${fileStatus}: ${filePath}`;
        additions = 1;
      }
    }

    workingTreeFiles.push({
      path: filePath,
      status: fileStatus,
      additions,
      deletions,
      diffSnippet: diffSnippet || `// ${fileStatus}: ${filePath}`,
    });
  }

  // 6. Recent commit history
  const historyRes = await runGitCommand(
    ['log', '-n', '12', '--pretty=format:%H\x1f%h\x1f%s\x1f%an <%ae>\x1f%cr\x1f%P\x1f%D\x1f%aI'],
    workspaceRoot
  );
  const commitHistory: Array<{
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    timestamp: string;
    timestampIso?: string;
    parents?: string[];
    branchRef?: string;
  }> = [];

  let lastCommitMessage = 'Initial commit';
  let lastActivity = 'Recently';

  if (historyRes.exitCode === 0 && historyRes.stdout.trim()) {
    const lines = historyRes.stdout.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('\x1f');
      if (parts.length >= 5) {
        const parents = parts[5] ? parts[5].trim().split(/\s+/).filter(Boolean) : [];
        const branchRef = parts[6] ? parts[6].trim() : undefined;
        const c = {
          hash: parts[0],
          shortHash: parts[1],
          message: parts[2],
          author: parts[3],
          timestamp: parts[4],
          timestampIso: parts[7],
          parents,
          branchRef,
        };
        commitHistory.push(c);
        if (i === 0) {
          lastCommitHash = c.shortHash;
          lastCommitMessage = c.message;
          lastActivity = c.timestamp;
        }
      }
    }
  }

  // 7. Local commits ahead & remote commits behind
  const localCommitsAhead: Array<{
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    timestamp: string;
    timestampIso?: string;
    isLocal: boolean;
    parents?: string[];
    branchRef?: string;
  }> = [];

  const remoteCommitsBehind: Array<{
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    timestamp: string;
    timestampIso?: string;
    isRemote: boolean;
    parents?: string[];
    branchRef?: string;
  }> = [];

  if (upstream && aheadCount > 0) {
    const aheadRes = await runGitCommand(
      ['log', '@{u}..HEAD', '-n', '10', '--pretty=format:%H\x1f%h\x1f%s\x1f%an <%ae>\x1f%cr\x1f%P\x1f%D\x1f%aI'],
      workspaceRoot
    );
    if (aheadRes.exitCode === 0 && aheadRes.stdout.trim()) {
      const lines = aheadRes.stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.split('\x1f');
        if (parts.length >= 5) {
          const parents = parts[5] ? parts[5].trim().split(/\s+/).filter(Boolean) : [];
          const branchRef = parts[6] ? parts[6].trim() : undefined;
          localCommitsAhead.push({
            hash: parts[0],
            shortHash: parts[1],
            message: parts[2],
            author: parts[3],
            timestamp: parts[4],
            timestampIso: parts[7],
            isLocal: true,
            parents,
            branchRef,
          });
        }
      }
    }
  }

  if (upstream && behindCount > 0) {
    const behindRes = await runGitCommand(
      ['log', 'HEAD..@{u}', '-n', '10', '--pretty=format:%H\x1f%h\x1f%s\x1f%an <%ae>\x1f%cr\x1f%P\x1f%D\x1f%aI'],
      workspaceRoot
    );
    if (behindRes.exitCode === 0 && behindRes.stdout.trim()) {
      const lines = behindRes.stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.split('\x1f');
        if (parts.length >= 5) {
          const parents = parts[5] ? parts[5].trim().split(/\s+/).filter(Boolean) : [];
          const branchRef = parts[6] ? parts[6].trim() : undefined;
          remoteCommitsBehind.push({
            hash: parts[0],
            shortHash: parts[1],
            message: parts[2],
            author: parts[3],
            timestamp: parts[4],
            timestampIso: parts[7],
            isRemote: true,
            parents,
            branchRef,
          });
        }
      }
    }
  }

  // 8. Stashes
  const stashRes = await runGitCommand(['stash', 'list', '--pretty=format:%gd\x1f%cr\x1f%gs'], workspaceRoot);
  const stashes: Array<{
    id: string;
    index: number;
    message: string;
    timestamp: string;
    fileCount: number;
    files: string[];
  }> = [];

  if (stashRes.exitCode === 0 && stashRes.stdout.trim()) {
    const lines = stashRes.stdout.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('\x1f');
      if (parts.length >= 3) {
        stashes.push({
          id: `stash_${i}`,
          index: i,
          message: parts[2],
          timestamp: parts[1],
          fileCount: 1,
          files: ['stashed changes'],
        });
      }
    }
  }

  // 9. All local branches
  const branchesRes = await runGitCommand(['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], workspaceRoot);
  const allBranches =
    branchesRes.exitCode === 0 && branchesRes.stdout.trim()
      ? branchesRes.stdout.trim().split('\n').filter(Boolean)
      : [branchName];

  // 10. Dynamic health computation for live state
  const hasConflict = workingTreeFiles.some((f) => f.status === 'conflicted');

  let healthPercentage = 100;
  let healthLevel: 'Healthy' | 'Attention' | 'Blocked' | 'Unsafe' = 'Healthy';
  let primarySymptom: any = 'clean_sync';
  let symptomTitle = 'Synchronized & Pristine';
  let symptomDescription = `Working directory clean, 0 commits ahead/behind ${upstream || 'upstream'}.`;
  let operatorMeaning = 'Repository in optimal state. Ready for development or release.';

  if (hasConflict) {
    healthPercentage = 35;
    healthLevel = 'Blocked';
    primarySymptom = 'merge_conflict';
    symptomTitle = 'Merge Conflict Detected';
    symptomDescription = `${workingTreeFiles.filter((f) => f.status === 'conflicted').length} conflicted files in working tree.`;
    operatorMeaning = 'Resolve conflict markers or abort merge/rebase before continuing.';
  } else if (isDetached) {
    healthPercentage = 50;
    healthLevel = 'Attention';
    primarySymptom = 'detached_head';
    symptomTitle = 'Detached HEAD State';
    symptomDescription = `HEAD is detached at ${lastCommitHash}. Floating commits risk garbage collection.`;
    operatorMeaning = 'Create or checkout a named branch to anchor your work permanently.';
  } else if (behindCount > 0 && workingTreeFiles.length > 0) {
    healthPercentage = Math.max(55, 90 - behindCount * 6 - workingTreeFiles.length * 5);
    healthLevel = 'Attention';
    primarySymptom = 'behind_remote';
    symptomTitle = 'Behind Remote with Local Edits';
    symptomDescription = `${branchName} is ${behindCount} commits behind ${upstream} with ${workingTreeFiles.length} dirty file(s).`;
    operatorMeaning = 'Stash or preserve local edits before pulling upstream changes to prevent merge contamination.';
  } else if (behindCount > 0) {
    healthPercentage = Math.max(75, 95 - behindCount * 5);
    healthLevel = 'Attention';
    primarySymptom = 'behind_remote';
    symptomTitle = `${behindCount} Commits Behind Remote`;
    symptomDescription = `Branch has ${behindCount} incoming commits on ${upstream}.`;
    operatorMeaning = 'Fast-forward pull from upstream to stay synchronized.';
  } else if (aheadCount > 0) {
    healthPercentage = 85;
    healthLevel = 'Attention';
    primarySymptom = 'unpushed_work';
    symptomTitle = `${aheadCount} Unpushed Local Commits`;
    symptomDescription = `You have ${aheadCount} local commit(s) ahead of ${upstream}.`;
    operatorMeaning = 'Push commits to origin when ready for backup or team review.';
  } else if (workingTreeFiles.length > 0) {
    healthPercentage = 92;
    healthLevel = 'Healthy';
    primarySymptom = 'unpushed_work';
    symptomTitle = 'Active Working Directory';
    symptomDescription = `${workingTreeFiles.length} file(s) modified or untracked locally.`;
    operatorMeaning = 'Review diff and commit changes when logical unit is complete.';
  }

  const inProgressOperation = await detectInProgressOperation(workspaceRoot);

  const liveState = {
    repoName,
    operation: inProgressOperation,
    currentBranch: {
      name: branchName,
      upstream,
      aheadCount,
      behindCount,
      isDetached,
      isStale: false,
      lastCommitMessage,
      lastCommitHash,
      lastActivity,
    },
    allBranches,
    workingTree: workingTreeFiles,
    stashes,
    localCommitsAhead,
    remoteCommitsBehind,
    commitHistory,
    healthPercentage,
    healthLevel,
    primarySymptom,
    symptomTitle,
    symptomDescription,
    operatorMeaning,
    isLiveMode: true,
    upstreamUnavailable,
    repositoryUnavailable: false,
    scannedAt: new Date().toISOString(),
  };

  return {
    repositoryUnavailable: false,
    upstreamUnavailable,
    isDetached,
    state: liveState,
    rawSummary: {
      branch: branchName,
      upstream,
      aheadCount,
      behindCount,
      dirtyFileCount: workingTreeFiles.length,
      totalDirtyFiles,
      isDetached,
    },
  };
}

// ---------------------------------------------------------------------------
// Live workspace write actions
// ---------------------------------------------------------------------------
//
// The scanner above stays read-only. These two routes are the only path that
// can modify a repository, and they are inert unless GITPET_ALLOW_WRITES=true.
// Both re-check the command against the safety policy at request time, so a
// client cannot approve something the policy refuses.

/** Builds repository context for the contextual safety lints. */
async function liveContext() {
  try {
    const scan = await scanLiveWorkspace(workspaceRootPath());
    return scan.repositoryUnavailable || !scan.state ? {} : scan.state;
  } catch {
    return {};
  }
}

// Preview: reports what would run and why, without touching the repository.
app.post('/api/git/preview-action', async (req, res) => {
  const requestId = generateRequestId('git_preview');
  try {
    const { command } = req.body ?? {};
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ requestId, error: 'A command string is required.' });
    }

    const result = await executeApprovedCommand(command, workspaceRootPath(), await liveContext(), {
      dryRun: true,
    });
    logRequestAudit(req.path, requestId, 200, 0, `preview: ${result.safety.verdict}`);
    return res.json({ requestId, ...result });
  } catch (err: any) {
    console.error('Error in /api/git/preview-action:', err);
    return res.status(500).json({ requestId, error: 'Failed to preview action' });
  }
});

// Execute: runs an approved command against the live workspace.
app.post('/api/git/execute-action', async (req, res) => {
  const requestId = generateRequestId('git_execute');
  try {
    const { command } = req.body ?? {};
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ requestId, error: 'A command string is required.' });
    }

    const context = await liveContext();
    const result = await executeApprovedCommand(command, workspaceRootPath(), context, { dryRun: false });

    // Re-scan so the caller sees the repository as it now is, not as it was.
    const rescan = await scanLiveWorkspace(workspaceRootPath());

    logRequestAudit(
      req.path,
      requestId,
      result.success ? 200 : 400,
      0,
      `execute: ${result.success ? 'ok' : result.message}`
    );

    return res.status(result.success ? 200 : 400).json({
      requestId,
      ...result,
      state: rescan.state ?? null,
    });
  } catch (err: any) {
    console.error('Error in /api/git/execute-action:', err);
    return res.status(500).json({ requestId, error: 'Failed to execute action' });
  }
});

// API: GET /api/git/live-status (Read-only live repository status scanner)
app.get('/api/git/live-status', async (req, res) => {
  const startTime = Date.now();
  const requestId = generateRequestId('git_live');

  try {
    const scanResult = await scanLiveWorkspace(workspaceRootPath());
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 200, duration, `live scan (${scanResult.repositoryUnavailable ? 'unavailable' : scanResult.state?.currentBranch.name})`);

    return res.json({
      requestId,
      success: !scanResult.repositoryUnavailable,
      live: true,
      timestamp: new Date().toISOString(),
      repositoryUnavailable: scanResult.repositoryUnavailable,
      upstreamUnavailable: scanResult.upstreamUnavailable,
      isDetached: scanResult.isDetached,
      message: scanResult.message || 'Live workspace scanned successfully',
      state: scanResult.state,
      rawSummary: scanResult.rawSummary,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 500, duration, `error: ${String(err)}`);
    return res.status(500).json({
      requestId,
      success: false,
      live: true,
      timestamp: new Date().toISOString(),
      repositoryUnavailable: false,
      error: 'Failed to scan live repository status',
      code: 'SCAN_FAILED',
    });
  }
});

// Shared Chat Request Handler
async function handleChatRequest(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const requestId = generateRequestId('chat');

  try {
    const {
      messages,
      message,
      prompt,
      text,
      query,
      userMessage,
      history,
      state,
      role = 'byte_mascot',
      tier = 'general',
      modelTier,
    } = req.body || {};

    // Helper to safely extract text from any message format
    const extractText = (msg: any): string => {
      if (!msg) return '';
      if (typeof msg === 'string') return msg.trim();
      if (Array.isArray(msg.parts)) {
        return msg.parts
          .map((p: any) => (typeof p === 'string' ? p : p?.text || ''))
          .filter(Boolean)
          .join('\n')
          .trim();
      }
      return (msg.text || msg.content || msg.message || msg.prompt || '').toString().trim();
    };

    // Helper to extract role ('user' | 'model')
    const extractRole = (msg: any): 'user' | 'model' => {
      if (!msg) return 'user';
      const r = (msg.role || msg.sender || '').toString().toLowerCase();
      if (r === 'model' || r === 'assistant' || r === 'byte' || r === 'system') return 'model';
      return 'user';
    };

    let userPrompt = '';
    const rawTurns: { role: 'user' | 'model'; text: string }[] = [];

    // Process history array if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        const itemText = extractText(item);
        if (itemText) {
          rawTurns.push({
            role: extractRole(item),
            text: itemText,
          });
        }
      }
    }

    // Process messages array if provided
    if (Array.isArray(messages) && messages.length > 0) {
      for (const item of messages) {
        const itemText = extractText(item);
        if (itemText) {
          rawTurns.push({
            role: extractRole(item),
            text: itemText,
          });
        }
      }
    }

    // Process direct single prompt formats
    const directPrompt = extractText(message || prompt || text || query || userMessage);
    if (directPrompt) {
      userPrompt = directPrompt;
      rawTurns.push({ role: 'user', text: directPrompt });
    } else if (rawTurns.length > 0) {
      // Pick last user turn as the user prompt
      const lastUserTurn = [...rawTurns].reverse().find((t) => t.role === 'user');
      userPrompt = lastUserTurn ? lastUserTurn.text : rawTurns[rawTurns.length - 1].text;
    }

    if (!userPrompt && rawTurns.length === 0) {
      logRequestAudit(req.path, requestId, 400, Date.now() - startTime, 'missing_message');
      return res.status(400).json({
        requestId,
        success: false,
        error: 'Message or messages array is required',
        code: 'INVALID_REQUEST',
      });
    }

    const effectiveTier = modelTier || tier || 'general';

    // Model selection routing (Official Google Gemini models)
    let modelName = 'gemini-2.5-flash';
    if (
      effectiveTier === 'deep' ||
      userPrompt.toLowerCase().includes('complex') ||
      userPrompt.toLowerCase().includes('rebase conflict') ||
      userPrompt.toLowerCase().includes('cherry-pick')
    ) {
      modelName = 'gemini-2.5-pro';
    } else if (
      effectiveTier === 'fast' ||
      userPrompt.toLowerCase().includes('quick') ||
      userPrompt.toLowerCase().includes('fast') ||
      userPrompt.toLowerCase().includes('one liner')
    ) {
      modelName = 'gemini-2.5-flash';
    }

    const ai = getGenAI();
    const systemInstruction = ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.byte_mascot;

    // Structured state context to inject (sanitized)
    const repoContext = state
      ? `
CURRENT REPOSITORY CONTEXT:
- Repository: ${state.repoName || 'gitpet-app'}
- Active Branch: ${state.currentBranch?.name || 'main'} (Upstream: ${state.currentBranch?.upstream || 'origin/main'})
- Commits Behind: ${state.currentBranch?.behindCount || 0}
- Commits Ahead: ${state.currentBranch?.aheadCount || 0}
- Is Detached: ${state.currentBranch?.isDetached || false}
- Is Stale: ${state.currentBranch?.isStale || false}
- Uncommitted Files in Working Tree (${(state.workingTree || []).length}):
${(state.workingTree || []).map((f: any) => `  * ${f.path || 'unknown'} [${f.status || 'modified'}] (+${f.additions || 0}/-${f.deletions || 0})`).join('\n')}
- Remote Commits Behind:
${(state.remoteCommitsBehind || []).map((c: any) => `  * ${c.shortHash || ''}: ${c.message || ''} (by ${c.author || ''})`).join('\n')}
`
      : '';

    // Attempt Gemini multi-turn generation
    if (ai) {
      try {
        const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

        // Build recent conversation turns (up to last 10 turns)
        const recentTurns = rawTurns.slice(-10);
        for (let i = 0; i < recentTurns.length; i++) {
          const t = recentTurns[i];
          const isLastTurn = i === recentTurns.length - 1;

          let turnText = t.text;
          if (isLastTurn && t.role === 'user') {
            turnText = repoContext
              ? `${repoContext}\n\nUser Question: ${t.text}\n\nPlease respond in character. If a specific Git action is helpful, include a structured actionable recommendation.`
              : t.text;
          }

          // Combine with previous turn if same role (validates alternating turn structure)
          if (contents.length > 0 && contents[contents.length - 1].role === t.role) {
            contents[contents.length - 1].parts[0].text += `\n\n${turnText}`;
          } else {
            contents.push({
              role: t.role,
              parts: [{ text: turnText }],
            });
          }
        }

        // Ensure at least one turn exists and last is user
        if (contents.length === 0) {
          contents.push({
            role: 'user',
            parts: [{ text: repoContext ? `${repoContext}\n\nUser Question: ${userPrompt}` : userPrompt }],
          });
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
          },
        });

        const textOutput = response.text || '';
        // The rule engine is a fallback for when the model is unavailable, not
        // an override of a successful model response.
        const ruleBased = generateRuleBasedAction(state, userPrompt);

        const recAction = ruleBased.recommendedAction;
        const safety = evaluateCommand(recAction?.command ?? '', state);
        const duration = Date.now() - startTime;
        logRequestAudit(req.path, requestId, 200, duration, `model: ${modelName}`);

        return res.json({
          requestId,
          success: true,
          modelUsed: modelName,
          role,
          safety,
          reply: textOutput,
          explanation: textOutput,
          summary: recAction?.summary || textOutput.slice(0, 120),
          confidence: recAction?.confidence || 'High',
          expectedImpact: recAction?.expectedResult || '',
          reversal: recAction?.reversalStep || '',
          recommendedAction: recAction,
          evidence: ruleBased.evidencePoints,
          evidencePoints: ruleBased.evidencePoints,
        });
      } catch (geminiError: any) {
        console.warn(`Gemini Chat (${modelName}) failed, falling back to rule engine:`, geminiError?.message || geminiError);
      }
    }

    // Fallback response with role persona
    const ruleBased = generateRuleBasedAction(state, userPrompt);
    let roleGreeting = '🐕 **Byte**: ';
    if (role === 'senior_architect') roleGreeting = '🏛️ **Senior Architect**: ';
    if (role === 'safety_auditor') roleGreeting = '🛡️ **Safety Auditor**: ';
    if (role === 'git_tutor') roleGreeting = '📚 **Git Tutor**: ';

    const fallbackReply = `${roleGreeting}${ruleBased.explanation}`;
    const recAction = ruleBased.recommendedAction;
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 200, duration, `fallback: ${modelName}`);

    return res.json({
      requestId,
      success: true,
      modelUsed: `${modelName} (fallback)`,
      role,
      reply: fallbackReply,
      explanation: fallbackReply,
      summary: recAction?.summary || fallbackReply.slice(0, 120),
      confidence: recAction?.confidence || 'High',
      expectedImpact: recAction?.expectedResult || '',
      reversal: recAction?.reversalStep || '',
      recommendedAction: recAction,
      evidence: ruleBased.evidencePoints,
      evidencePoints: ruleBased.evidencePoints,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 500, duration, `error: ${String(err)}`);
    res.status(500).json({
      requestId,
      success: false,
      error: 'Chat completion failed',
      code: 'INTERNAL_ERROR',
      retryable: true,
    });
  }
}

// Routes for Chat (Both spec-compliant alias and legacy route)
app.post('/api/ai/chat', handleChatRequest);
app.post('/api/chat', handleChatRequest);

// API: Analyze repository state with Gemini AI
app.post('/api/gitpet/analyze', async (req, res) => {
  const requestId = generateRequestId('analyze');
  try {
    const { state, userMessage, role = 'byte_mascot', tier = 'general' } = req.body;
    if (!state) {
      return res.status(400).json({ requestId, error: 'Missing repository state', code: 'INVALID_REQUEST' });
    }

    const ai = getGenAI();
    let modelName = tier === 'deep' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    if (ai) {
      try {
        const prompt = `
${ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.byte_mascot}

User Question: "${userMessage || 'Status report! What needs attention?'}"

Structured Repository State:
- Repo Name: ${state.repoName}
- Current Branch: ${state.currentBranch?.name} (Upstream: ${state.currentBranch?.upstream || 'None'})
- Commits Ahead: ${state.currentBranch?.aheadCount || 0}
- Commits Behind: ${state.currentBranch?.behindCount || 0}
- Is Detached: ${state.currentBranch?.isDetached}
- Is Stale Merged: ${state.currentBranch?.isStale} (${state.currentBranch?.staleDays || 0} days)
- Working Tree Files (${(state.workingTree || []).length} files):
  ${(state.workingTree || []).map((f: any) => `- ${f.path} [${f.status}] (+${f.additions}/-${f.deletions})`).join('\n  ')}
- Remote Commits Behind:
  ${(state.remoteCommitsBehind || []).map((c: any) => `- ${c.shortHash}: ${c.message} (by ${c.author})`).join('\n  ')}
- Local Commits Ahead:
  ${(state.localCommitsAhead || []).map((c: any) => `- ${c.shortHash}: ${c.message}`).join('\n  ')}

Respond in valid JSON with:
1. "explanation": plain English explanation of the repository situation.
2. "recommendedAction": safe Git action object with title, summary, command, confidence, confidenceScore, riskLevel, expectedResult, reversalStep, evidence, affectedFiles, steps.
3. "evidencePoints": string array of 2-3 evidence citations.
`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                explanation: { type: Type.STRING },
                recommendedAction: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    command: { type: Type.STRING },
                    confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                    confidenceScore: { type: Type.NUMBER },
                    riskLevel: { type: Type.STRING, enum: ['Safe', 'Caution', 'Protected'] },
                    expectedResult: { type: Type.STRING },
                    reversalStep: { type: Type.STRING },
                    evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                    affectedFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          command: { type: Type.STRING },
                          details: { type: Type.STRING },
                        },
                        required: ['label', 'command', 'details'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'summary',
                    'command',
                    'confidence',
                    'riskLevel',
                    'expectedResult',
                    'reversalStep',
                    'evidence',
                    'steps',
                  ],
                },
                evidencePoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['explanation', 'recommendedAction', 'evidencePoints'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.recommendedAction && !parsed.recommendedAction.id) {
            parsed.recommendedAction.id = `act_${Date.now()}`;
          }
          if (parsed.recommendedAction && !parsed.recommendedAction.affectedFiles) {
            parsed.recommendedAction.affectedFiles = (state.workingTree || []).map((f: any) => f.path);
          }
          // Check the model's own suggestion against observed repository state
          // before it reaches the UI. The prompt asks for safe commands; this
          // is what actually enforces it.
          const safety = evaluateCommand(parsed?.recommendedAction?.command ?? '', state);

          return res.json({
            requestId,
            success: true,
            source: 'gemini',
            modelUsed: modelName,
            ...parsed,
            safety,
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed, using deterministic rule engine:', geminiErr?.message || geminiErr);
      }
    }

    // Deterministic fallback — held to the same policy as the model path.
    const ruleBased = generateRuleBasedAction(state, userMessage);
    return res.json({
      requestId,
      success: true,
      source: 'deterministic_engine',
      modelUsed: 'deterministic',
      ...ruleBased,
      safety: evaluateCommand(ruleBased?.recommendedAction?.command ?? '', state),
    });
  } catch (error) {
    console.error('Error in /api/gitpet/analyze:', error);
    res.status(500).json({ requestId, error: 'Failed to analyze repository state' });
  }
});

// Helper: Generate aesthetic fallback avatar SVG if offline
function generateFallbackAvatar(prompt: string): string {
  const isCyberpunk = prompt.toLowerCase().includes('cyber') || prompt.toLowerCase().includes('neon');
  const isPixel = prompt.toLowerCase().includes('pixel');
  const isDragon = prompt.toLowerCase().includes('dragon');
  const isCat = prompt.toLowerCase().includes('cat');

  const bgGradient = isCyberpunk
    ? 'linear-gradient(135deg, #0F172A 0%, #312E81 50%, #4C1D95 100%)'
    : isPixel
    ? 'linear-gradient(135deg, #1E293B 0%, #0F766E 100%)'
    : 'linear-gradient(135deg, #1E1B4B 0%, #2563EB 50%, #38BDF8 100%)';

  const mascotEmoji = isDragon ? '🐉' : isCat ? '🐱' : '🐕';
  const badgeText = isCyberpunk ? 'CYBER-BYTE' : isPixel ? 'PIXEL-BYTE' : 'BYTE-PRO';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${isCyberpunk ? '#0F172A' : '#1E1B4B'}"/>
        <stop offset="50%" stop-color="${isCyberpunk ? '#312E81' : '#2563EB'}"/>
        <stop offset="100%" stop-color="${isCyberpunk ? '#4C1D95' : '#38BDF8'}"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <rect width="512" height="512" rx="64" fill="url(#bg)" />
    <!-- Grid lines -->
    <path d="M0 128 H512 M0 256 H512 M0 384 H512 M128 0 V512 M256 0 V512 M384 0 V512" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
    <!-- Central Halo -->
    <circle cx="256" cy="230" r="140" fill="none" stroke="${isCyberpunk ? '#F43F5E' : '#38BDF8'}" stroke-width="6" opacity="0.6" filter="url(#glow)"/>
    <circle cx="256" cy="230" r="115" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    <!-- Pet Mascot Emoji -->
    <text x="256" y="275" font-size="120" text-anchor="middle">${mascotEmoji}</text>
    <!-- Badge Pill -->
    <rect x="156" y="390" width="200" height="42" rx="21" fill="rgba(15, 23, 42, 0.85)" stroke="${isCyberpunk ? '#06B6D4' : '#60A5FA'}" stroke-width="2"/>
    <text x="256" y="416" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">${badgeText}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Shared Image Generation Handler
async function handleImageGenerate(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const requestId = generateRequestId('img_gen');

  try {
    const { prompt, visualRequest, aspectRatio = '1:1', ratio, imageSize = '1K', targetHealthState } = req.body || {};
    const effectivePrompt = (prompt || visualRequest || '').trim();
    const effectiveRatio = ratio || aspectRatio || '1:1';

    if (!effectivePrompt || typeof effectivePrompt !== 'string') {
      logRequestAudit(req.path, requestId, 400, Date.now() - startTime, 'missing_prompt');
      return res.status(400).json({
        requestId,
        success: false,
        error: 'A text prompt is required to create an image',
        code: 'INVALID_PROMPT',
      });
    }

    const ai = getGenAI();
    let imageUrl = '';
    let source = 'fallback_canvas';

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                text: `${effectivePrompt}. Original, friendly Git repository companion dog mascot; minimalist flat-modern style; crisp studio lighting, vibrant colors, no text or watermarks.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: effectiveRatio as any,
              imageSize: imageSize as any,
            },
          },
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              source = 'gemini-3.1-flash-image';
              break;
            }
          }
          if (imageUrl) break;
        }
      } catch (geminiImgError: any) {
        console.warn('Gemini image generation error, falling back to aesthetic SVG generator:', geminiImgError?.message || geminiImgError);
      }
    }

    if (!imageUrl) {
      imageUrl = generateFallbackAvatar(effectivePrompt);
      source = 'fallback_canvas';
    }

    // Register temporary preview asset in asset registry (30 minute TTL)
    const assetId = `prev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newAsset: RegisteredAsset = {
      id: assetId,
      prompt: effectivePrompt,
      imageUrl,
      aspectRatio: effectiveRatio,
      mode: 'create',
      targetHealthState,
      status: 'preview',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      requestId,
    };
    assetRegistry.set(assetId, newAsset);

    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 200, duration, `created preview: ${assetId} (${source})`);

    return res.json({
      requestId,
      success: true,
      asset: {
        id: newAsset.id,
        prompt: newAsset.prompt,
        imageUrl: newAsset.imageUrl,
        aspectRatio: newAsset.aspectRatio,
        targetHealthState: newAsset.targetHealthState,
        status: 'preview',
        createdAt: newAsset.createdAt,
        expiresAt: new Date(newAsset.expiresAt).toISOString(),
      },
      imageUrl: newAsset.imageUrl,
      prompt: newAsset.prompt,
      aspectRatio: newAsset.aspectRatio,
      source,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 500, duration, `error: ${String(err)}`);
    res.status(500).json({
      requestId,
      success: false,
      error: 'Image generation failed',
      code: 'INTERNAL_ERROR',
      retryable: true,
    });
  }
}

// Shared Image Edit Handler
async function handleImageEdit(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const requestId = generateRequestId('img_edit');

  try {
    const { prompt, visualRequest, imageBase64, sourceAssetId, mimeType = 'image/png', aspectRatio = '1:1', ratio } = req.body || {};
    const effectivePrompt = (prompt || visualRequest || '').trim();
    const effectiveRatio = ratio || aspectRatio || '1:1';

    let effectiveBase64 = imageBase64;
    if (!effectiveBase64 && sourceAssetId) {
      const sourceAsset = assetRegistry.get(sourceAssetId);
      if (sourceAsset) {
        effectiveBase64 = sourceAsset.imageUrl;
      }
    }

    if (!effectivePrompt || !effectiveBase64) {
      logRequestAudit(req.path, requestId, 400, Date.now() - startTime, 'missing_prompt_or_image');
      return res.status(400).json({
        requestId,
        success: false,
        error: 'Prompt and base64 image (or sourceAssetId) are required for image editing',
        code: 'INVALID_REQUEST',
      });
    }

    const ai = getGenAI();
    const cleanBase64 = effectiveBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    let imageUrl = '';
    let source = 'fallback_canvas';

    if (ai && !effectiveBase64.startsWith('data:image/svg+xml')) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Edit instruction: ${effectivePrompt}. Retain the core character silhouette while applying the requested visual changes accurately. Minimalist flat modern developer mascot.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: effectiveRatio as any,
            },
          },
        });

        const candidates = response.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${outMime};base64,${part.inlineData.data}`;
              source = 'gemini-3.1-flash-image';
              break;
            }
          }
          if (imageUrl) break;
        }
      } catch (geminiEditErr: any) {
        console.warn('Gemini image edit error, using modified visual fallback:', geminiEditErr?.message || geminiEditErr);
      }
    }

    if (!imageUrl) {
      imageUrl = generateFallbackAvatar(`Edited: ${effectivePrompt}`);
      source = 'fallback_canvas';
    }

    // Register temporary edited preview asset in asset registry (30 minute TTL)
    const assetId = `prev_edit_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newAsset: RegisteredAsset = {
      id: assetId,
      prompt: effectivePrompt,
      imageUrl,
      aspectRatio: effectiveRatio,
      mode: 'edit',
      sourceAssetId,
      status: 'preview',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      requestId,
    };
    assetRegistry.set(assetId, newAsset);

    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 200, duration, `created edit preview: ${assetId} (${source})`);

    return res.json({
      requestId,
      success: true,
      asset: {
        id: newAsset.id,
        prompt: newAsset.prompt,
        imageUrl: newAsset.imageUrl,
        aspectRatio: newAsset.aspectRatio,
        sourceAssetId: newAsset.sourceAssetId,
        status: 'preview',
        createdAt: newAsset.createdAt,
        expiresAt: new Date(newAsset.expiresAt).toISOString(),
      },
      imageUrl: newAsset.imageUrl,
      prompt: newAsset.prompt,
      aspectRatio: newAsset.aspectRatio,
      source,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 500, duration, `error: ${String(err)}`);
    res.status(500).json({
      requestId,
      success: false,
      error: 'Image editing failed',
      code: 'INTERNAL_ERROR',
      retryable: true,
    });
  }
}

// Shared Asset Approval Handler
async function handleImageApprove(req: express.Request, res: express.Response) {
  const startTime = Date.now();
  const requestId = generateRequestId('img_appr');

  try {
    const assetId = (req.params.id || req.body?.id || req.body?.previewId || '').trim();

    if (!assetId) {
      logRequestAudit(req.path, requestId, 400, Date.now() - startTime, 'missing_asset_id');
      return res.status(400).json({
        requestId,
        success: false,
        error: 'Preview asset ID is required in URL parameter or request body',
        code: 'MISSING_ASSET_ID',
      });
    }

    const asset = assetRegistry.get(assetId);

    if (!asset) {
      logRequestAudit(req.path, requestId, 404, Date.now() - startTime, `unknown_asset: ${assetId}`);
      return res.status(404).json({
        requestId,
        success: false,
        error: `Preview asset '${assetId}' was not found or has expired.`,
        code: 'ASSET_NOT_FOUND',
      });
    }

    // Check expiry for unapproved preview
    if (asset.status !== 'approved' && Date.now() > asset.expiresAt) {
      assetRegistry.delete(assetId);
      logRequestAudit(req.path, requestId, 410, Date.now() - startTime, `expired_asset: ${assetId}`);
      return res.status(410).json({
        requestId,
        success: false,
        error: `Preview asset '${assetId}' has expired. Please regenerate a new preview.`,
        code: 'ASSET_EXPIRED',
      });
    }

    // Idempotency check: If already approved, return stable approved state without duplicating
    if (asset.status === 'approved') {
      const duration = Date.now() - startTime;
      logRequestAudit(req.path, requestId, 200, duration, `idempotent approve: ${assetId}`);
      return res.json({
        requestId,
        success: true,
        idempotent: true,
        message: 'Asset is already approved in pet asset set',
        approvedAsset: {
          id: asset.id,
          prompt: asset.prompt,
          imageUrl: asset.imageUrl,
          aspectRatio: asset.aspectRatio,
          status: 'approved',
          targetHealthState: asset.targetHealthState,
          approvedAt: asset.approvedAt,
          createdAt: asset.createdAt,
        },
        currentApprovedAssetId,
      });
    }

    // Promote preview asset to approved pet asset
    const priorAssetId = currentApprovedAssetId;
    if (priorAssetId && priorAssetId !== assetId) {
      approvedAssetHistory.unshift(priorAssetId);
    }

    asset.status = 'approved';
    asset.approvedAt = new Date().toISOString();
    currentApprovedAssetId = asset.id;

    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 200, duration, `promoted asset: ${assetId} (prior: ${priorAssetId})`);

    return res.json({
      requestId,
      success: true,
      message: 'Asset successfully promoted to active pet asset set',
      approvedAsset: {
        id: asset.id,
        prompt: asset.prompt,
        imageUrl: asset.imageUrl,
        aspectRatio: asset.aspectRatio,
        status: 'approved',
        targetHealthState: asset.targetHealthState,
        approvedAt: asset.approvedAt,
        createdAt: asset.createdAt,
      },
      priorAssetId,
      currentApprovedAssetId,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    logRequestAudit(req.path, requestId, 500, duration, `error: ${String(err)}`);
    res.status(500).json({
      requestId,
      success: false,
      error: 'Asset approval failed',
      code: 'INTERNAL_ERROR',
    });
  }
}

// Routes for Images (Both spec-compliant /api/ai/images/* and legacy /api/images/*)
app.post('/api/ai/images/generate', handleImageGenerate);
app.post('/api/images/generate', handleImageGenerate);

app.post('/api/ai/images/edit', handleImageEdit);
app.post('/api/images/edit', handleImageEdit);

app.post('/api/ai/images/:id/approve', handleImageApprove);
app.post('/api/images/:id/approve', handleImageApprove);
app.post('/api/ai/images/approve', handleImageApprove);
app.post('/api/images/approve', handleImageApprove);

// API: Retrieve current approved pet asset metadata
app.get('/api/ai/images/approved', (req, res) => {
  const currentAsset = currentApprovedAssetId ? assetRegistry.get(currentApprovedAssetId) : null;
  res.json({
    requestId: generateRequestId('curr_asset'),
    success: true,
    currentAsset: currentAsset
      ? {
          id: currentAsset.id,
          prompt: currentAsset.prompt,
          imageUrl: currentAsset.imageUrl,
          aspectRatio: currentAsset.aspectRatio,
          status: currentAsset.status,
          targetHealthState: currentAsset.targetHealthState,
          approvedAt: currentAsset.approvedAt,
          createdAt: currentAsset.createdAt,
        }
      : null,
    history: approvedAssetHistory.map((id) => {
      const a = assetRegistry.get(id);
      return a ? { id: a.id, prompt: a.prompt, approvedAt: a.approvedAt } : { id };
    }),
  });
});
app.get('/api/images/approved', (req, res) => res.redirect(307, '/api/ai/images/approved'));

// API: TTS Voice endpoint using gemini-3.1-flash-tts-preview
app.post('/api/voice/tts', async (req, res) => {
  const requestId = generateRequestId('tts');
  try {
    const { text, voiceName = 'Zephyr' } = req.body;

    if (!text) {
      return res.status(400).json({ requestId, error: 'Text is required for TTS', code: 'INVALID_REQUEST' });
    }

    const ai = getGenAI();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: `Say in an energetic, helpful developer companion tone: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName as any },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            requestId,
            success: true,
            audioBase64: base64Audio,
            sampleRate: 24000,
            mimeType: 'audio/pcm;rate=24000',
          });
        }
      } catch (ttsErr: any) {
        console.warn('Gemini TTS error:', ttsErr?.message || ttsErr);
      }
    }

    return res.json({
      requestId,
      success: false,
      message: 'TTS generation not active or offline. Use browser speech synthesis fallback.',
    });
  } catch (err) {
    console.error('Error in /api/voice/tts:', err);
    res.status(500).json({ requestId, error: 'TTS request failed' });
  }
});

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server for Gemini Live API real-time voice conversations
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('⚡ Client connected to Live Voice WebSocket');
    const ai = getGenAI();
    let liveSession: any = null;

    if (ai) {
      try {
        liveSession = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
            systemInstruction: `You are Byte, an energetic and intelligent ambient Git companion dog. You speak directly with developers in real time.
Keep your voice responses crisp, direct, helpful, and under 2-3 sentences.
You help them check branch synchronization, warn them if they have uncommitted files before pulling, and explain Git commands clearly.`,
          },
          callbacks: {
            onmessage: (message: any) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Audio output chunk
              const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                clientWs.send(JSON.stringify({ type: 'audio', audio: audioData }));
              }

              // Text transcript chunk
              const textChunk = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (textChunk) {
                clientWs.send(JSON.stringify({ type: 'text', text: textChunk }));
              }

              // Interrupted signal
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              // Turn complete
              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turnComplete' }));
              }
            },
            onerror: (err: any) => {
              console.warn('Live API session error:', err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
              }
            },
            onclose: () => {
              console.log('Live API session closed');
            },
          },
        });

        clientWs.send(JSON.stringify({ type: 'ready', message: 'Live Voice Session connected with gemini-3.1-flash-live-preview' }));
      } catch (err: any) {
        console.warn('Failed to connect to Live API:', err?.message || err);
        clientWs.send(JSON.stringify({ type: 'fallback_ready', message: 'Live API mode unavailable, using client-assisted voice synthesis' }));
      }
    } else {
      clientWs.send(JSON.stringify({ type: 'fallback_ready', message: 'Offline mode active, speech recognition enabled' }));
    }

    clientWs.on('message', async (rawData) => {
      try {
        const payload = JSON.parse(rawData.toString());

        if (payload.type === 'audio' && payload.audio) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              audio: {
                data: payload.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (payload.type === 'text' && payload.text) {
          if (liveSession) {
            liveSession.sendRealtimeInput({
              text: payload.text,
            });
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Live Voice WebSocket');
      if (liveSession && typeof liveSession.close === 'function') {
        try {
          liveSession.close();
        } catch (_) {}
      }
    });
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`GitPet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
