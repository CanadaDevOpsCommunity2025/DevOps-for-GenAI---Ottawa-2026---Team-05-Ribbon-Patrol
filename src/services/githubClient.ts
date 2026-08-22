// Server-only: fetches real repository state from the GitHub REST API for
// LIVE_REPO and shapes it into the same RepositoryState the mock scenarios use,
// so GitPet's chat/health engine works unmodified against real git history.
import { RepositoryState, BranchState, CommitInfo } from '../types';
import { computeRepositoryHealth } from '../data/mockScenarios';
import { LIVE_REPO } from '../data/liveRepoConfig';

const GITHUB_API = 'https://api.github.com';

interface GhCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
}

interface GhCompare {
  ahead_by: number;
  commits: GhCommit[];
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toCommitInfo(c: GhCommit, flags: { isRemote?: boolean; isLocal?: boolean } = {}): CommitInfo {
  return {
    hash: c.sha,
    shortHash: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: `${c.commit.author.name} <${c.commit.author.email}>`,
    timestamp: relativeTime(c.commit.author.date),
    ...flags,
  };
}

async function ghFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gitpet-app',
  };
  // Optional: set GITHUB_TOKEN in .env to raise the unauthenticated 60/hr rate
  // limit. Never required for a public repo — never hardcode a token here.
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLiveRepositoryState(branchName: string): Promise<RepositoryState> {
  const { owner, repo, defaultBranch } = LIVE_REPO;
  const isDefault = branchName === defaultBranch;

  const [branches, branchCommits] = await Promise.all([
    ghFetch<{ name: string }[]>(`/repos/${owner}/${repo}/branches?per_page=100`),
    ghFetch<GhCommit[]>(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branchName)}&per_page=10`),
  ]);

  const allBranches = branches.map((b) => b.name);

  let aheadCount = 0;
  let behindCount = 0;
  let localCommitsAhead: CommitInfo[] = [];
  let remoteCommitsBehind: CommitInfo[] = [];

  if (!isDefault) {
    const [aheadOfMain, behindMain] = await Promise.all([
      ghFetch<GhCompare>(`/repos/${owner}/${repo}/compare/${defaultBranch}...${encodeURIComponent(branchName)}`),
      ghFetch<GhCompare>(`/repos/${owner}/${repo}/compare/${encodeURIComponent(branchName)}...${defaultBranch}`),
    ]);
    aheadCount = aheadOfMain.ahead_by;
    behindCount = behindMain.ahead_by;
    localCommitsAhead = aheadOfMain.commits.slice(-5).reverse().map((c) => toCommitInfo(c, { isLocal: true }));
    remoteCommitsBehind = behindMain.commits.slice(-5).reverse().map((c) => toCommitInfo(c, { isRemote: true }));
  }

  const isStale = !isDefault && aheadCount === 0 && behindCount > 0;
  const tip = branchCommits[0];

  const currentBranch: BranchState = {
    name: branchName,
    upstream: `origin/${branchName}`,
    aheadCount,
    behindCount,
    isDetached: false,
    isStale,
    staleDays: isStale && tip ? Math.max(1, Math.round((Date.now() - new Date(tip.commit.author.date).getTime()) / 86400000)) : undefined,
    lastCommitMessage: tip ? tip.commit.message.split('\n')[0] : '',
    lastCommitHash: tip ? tip.sha.slice(0, 7) : '',
    lastActivity: tip ? relativeTime(tip.commit.author.date) : '',
  };

  const commitHistory = branchCommits.map((c) => toCommitInfo(c));

  const baseState: RepositoryState = {
    repoName: `${owner}/${repo}`,
    currentBranch,
    allBranches,
    // Working-tree / stash / detached-HEAD state is inherently local and
    // invisible to the GitHub API — live mode only reflects real branch
    // and commit divergence. See TESTING.md in the fixture repo for how to
    // reproduce those local-only scenarios against a real clone.
    workingTree: [],
    stashes: [],
    localCommitsAhead,
    remoteCommitsBehind,
    commitHistory,
    healthPercentage: 100,
    healthLevel: 'Healthy',
    primarySymptom: 'clean_sync',
    symptomTitle: '',
    symptomDescription: '',
    operatorMeaning: '',
  };

  return { ...baseState, ...computeRepositoryHealth(baseState) };
}
