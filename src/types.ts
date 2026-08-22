export type HealthLevel = 'Healthy' | 'Attention' | 'Blocked' | 'Unsafe';

export type SymptomType =
  | 'behind_remote'
  | 'unpushed_work'
  | 'merge_conflict'
  | 'stale_branch'
  | 'detached_head'
  | 'clean_sync';

export interface FileChange {
  path: string;
  status: 'modified' | 'staged' | 'untracked' | 'conflicted';
  additions: number;
  deletions: number;
  diffSnippet: string;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: string;
  isRemote?: boolean;
  isLocal?: boolean;
}

export interface StashItem {
  id: string;
  index: number;
  message: string;
  timestamp: string;
  fileCount: number;
  files: string[];
}

export interface BranchState {
  name: string;
  upstream: string | null;
  aheadCount: number;
  behindCount: number;
  isDetached: boolean;
  isStale: boolean;
  staleDays?: number;
  lastCommitMessage: string;
  lastCommitHash: string;
  lastActivity: string;
}

export interface RepositoryState {
  repoName: string;
  currentBranch: BranchState;
  allBranches: string[];
  workingTree: FileChange[];
  stashes: StashItem[];
  localCommitsAhead: CommitInfo[];
  remoteCommitsBehind: CommitInfo[];
  commitHistory: CommitInfo[];
  healthPercentage: number;
  healthLevel: HealthLevel;
  primarySymptom: SymptomType;
  symptomTitle: string;
  symptomDescription: string;
  operatorMeaning: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  summary: string;
  command: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  riskLevel: 'Safe' | 'Caution' | 'Protected';
  expectedResult: string;
  reversalStep: string;
  evidence: string[];
  affectedFiles: string[];
  steps: {
    label: string;
    command: string;
    details: string;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  text: string;
  role?: ChatRole;
  modelUsed?: string;
  evidenceSummary?: {
    symptom: string;
    healthLevel: HealthLevel;
    evidencePoints: string[];
  };
  recommendedAction?: RecommendedAction;
  executed?: boolean;
  executionResult?: {
    success: boolean;
    message: string;
    previousHealth: number;
    newHealth: number;
  };
}

export type ChatRole =
  | 'byte_mascot'
  | 'senior_architect'
  | 'safety_auditor'
  | 'git_tutor';

export type ModelTier = 'fast' | 'general' | 'deep';

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  aspectRatio: string;
  mode: 'create' | 'edit';
  originalImage?: string;
}

export type LiveVoiceState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';

export interface LiveTranscriptItem {
  id: string;
  sender: 'user' | 'byte';
  text: string;
  timestamp: string;
}

export interface ChatHistoryEntry {
  role: 'user' | 'model';
  parts: { text: string }[];
}


export interface PracticeStats {
  cleanCommitStreak: number;
  verifiedSyncs: number;
  stewardshipScore: number;
  badges: {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlockedAt?: string;
    progress: number; // 0 to 100
  }[];
}

export interface ScenarioPreset {
  id: string;
  title: string;
  badge: string;
  description: string;
  petExpression: string;
  state: RepositoryState;
  samplePrompt: string;
}
