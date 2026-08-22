export type HealthLevel = 'Healthy' | 'Attention' | 'Blocked' | 'Unsafe';

export type SymptomType =
  | 'behind_remote'
  | 'unpushed_work'
  | 'merge_conflict'
  | 'stale_branch'
  | 'detached_head'
  | 'clean_sync'
  | 'destructive_hazard';

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
  parents?: string[];
  branchRef?: string;
  isHead?: boolean;
}

export type DagNodeRole =
  | 'head'
  | 'upstream_head'
  | 'local_ahead'
  | 'remote_behind'
  | 'merge_base'
  | 'fork_point'
  | 'detached'
  | 'conflicted'
  | 'hazard'
  | 'sync_clean'
  | 'collapsed_run';

export interface DagCommitNode {
  id: string;
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: string;
  laneIndex: number;
  laneName: string;
  role: DagNodeRole;
  isHead: boolean;
  isUpstreamHead: boolean;
  isLocalAhead: boolean;
  isRemoteBehind: boolean;
  isMergeBase: boolean;
  isForkPoint: boolean;
  isDetached: boolean;
  isConflicted?: boolean;
  isHazard?: boolean;
  parents: string[];
  children: string[];
  x: number;
  y: number;
  isCollapsedGroup?: boolean;
  collapsedCount?: number;
  collapsedCommitIds?: string[];
  tags?: string[];
}

export interface DagEdge {
  id: string;
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isDivergent: boolean;
  isMerge: boolean;
  isDirect: boolean;
  isHazard?: boolean;
  isConflicted?: boolean;
}

export interface DagLane {
  index: number;
  name: string;
  shortName: string;
  color: string;
  isCurrent: boolean;
  isUpstream: boolean;
  x: number;
}

export interface DagGraph {
  nodes: DagCommitNode[];
  edges: DagEdge[];
  lanes: DagLane[];
  width: number;
  height: number;
  headNodeId?: string;
  upstreamNodeId?: string;
  mergeBaseNodeId?: string;
  hasIncompleteHistory?: boolean;
  incompleteHistoryReason?: string;
  collapsedGroupCount: number;
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
  destructiveRiskWarning?: string;
  lossRiskSummary?: string;
  isLiveMode?: boolean;
  upstreamUnavailable?: boolean;
  repositoryUnavailable?: boolean;
  scannedAt?: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  summary: string;
  command: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  riskLevel: 'Safe' | 'Caution' | 'Protected' | 'Hazard';
  expectedResult: string;
  reversalStep: string;
  evidence: string[];
  affectedFiles: string[];
  destructiveLossWarning?: string;
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

export type AssetStatus = 'preview' | 'approved';

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  aspectRatio: string;
  mode: 'create' | 'edit';
  originalImage?: string;
  sourceAssetId?: string;
  status?: AssetStatus;
  targetHealthState?: HealthLevel;
  requestId?: string;
  approvedAt?: string;
}

export interface PetAsset {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  status: AssetStatus;
  targetHealthState?: HealthLevel;
  sourceAssetId?: string;
  createdAt: string;
  approvedAt?: string;
  requestId?: string;
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

export interface LiveWorkspaceStatusResponse {
  requestId: string;
  success: boolean;
  live: true;
  timestamp: string;
  repositoryUnavailable?: boolean;
  upstreamUnavailable?: boolean;
  isDetached?: boolean;
  message?: string;
  state?: RepositoryState;
  rawSummary?: {
    branch: string;
    upstream: string | null;
    aheadCount: number;
    behindCount: number;
    dirtyFileCount: number;
    totalDirtyFiles: number;
    isDetached: boolean;
  };
}

export interface LiveScanState {
  loading: boolean;
  lastRefreshed?: string;
  error?: string | null;
  unavailable?: boolean;
}
