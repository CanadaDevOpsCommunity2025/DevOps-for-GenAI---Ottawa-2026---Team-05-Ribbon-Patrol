import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { TopBar } from './components/TopBar';
import { PetStage } from './components/PetStage';
import { ChatStream } from './components/ChatStream';
import { ScenarioSwitcher } from './components/ScenarioSwitcher';
import { RepositoryDrawer } from './components/RepositoryDrawer';
import { PreviewChangesModal } from './components/PreviewChangesModal';
import { PitchDeckModal } from './components/PitchDeckModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import {
  MVP_SCENARIO,
  ALL_SCENARIOS,
  INITIAL_PRACTICE_STATS,
  computeRepositoryHealth,
  CLEAN_HEALTHY_SCENARIO,
  CONFLICT_SCENARIO,
  UNSAFE_LOSS_RISK_SCENARIO,
} from './data/mockScenarios';
import { LIVE_REPO } from './data/liveRepoConfig';
import {
  RepositoryState,
  ChatMessage,
  RecommendedAction,
  PracticeStats,
  ScenarioPreset,
  FileChange,
  ChatRole,
  ModelTier,
  ChatHistoryEntry,
  LiveScanState,
} from './types';

// Neutral placeholder shown for the brief moment before the live repo fetch
// on mount resolves, so the app never flashes acme-corp mock data by default.
const LIVE_LOADING_STATE: RepositoryState = {
  repoName: `${LIVE_REPO.owner}/${LIVE_REPO.repo}`,
  currentBranch: {
    name: LIVE_REPO.defaultBranch,
    upstream: `origin/${LIVE_REPO.defaultBranch}`,
    aheadCount: 0,
    behindCount: 0,
    isDetached: false,
    isStale: false,
    lastCommitMessage: 'Connecting to live repository…',
    lastCommitHash: '',
    lastActivity: '',
  },
  allBranches: [],
  workingTree: [],
  stashes: [],
  localCommitsAhead: [],
  remoteCommitsBehind: [],
  commitHistory: [],
  healthPercentage: 100,
  healthLevel: 'Healthy',
  primarySymptom: 'clean_sync',
  symptomTitle: 'Connecting…',
  symptomDescription: `Loading live state from ${LIVE_REPO.owner}/${LIVE_REPO.repo}.`,
  operatorMeaning: '',
};

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('live:loading');
  const [repoState, setRepoState] = useState<RepositoryState>(LIVE_LOADING_STATE);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>(INITIAL_PRACTICE_STATS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState<boolean>(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<ChatRole>('byte_mascot');
  const [selectedTier, setSelectedTier] = useState<ModelTier>('general');
  const [activeLiveBranch, setActiveLiveBranch] = useState<string | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);

  // Live Workspace Scanner State
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [liveScanState, setLiveScanState] = useState<LiveScanState>({ loading: false });
  const [cachedSandboxState, setCachedSandboxState] = useState<RepositoryState>(MVP_SCENARIO.state);

  const [previewAction, setPreviewAction] = useState<RecommendedAction | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);
  const [auditHistory, setAuditHistory] = useState<
    { id: string; command: string; timestamp: string; description: string }[]
  >([]);

  // Initial message while the live repo fetch (see effect below) is in flight.
  // Replaced by handleLoadLiveRepo's own message once real data arrives.
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'assistant',
      role: 'byte_mascot',
      modelUsed: 'gemini-3.5-flash',
      timestamp: 'Just now',
      text: `Hello! I'm **Byte**, your ambient repository companion.\n\nConnecting to **${LIVE_REPO.owner}/${LIVE_REPO.repo}** to pull real branch and commit data…`,
    },
  ]);

  // Handler for sending messages to Gemini API backend (/api/ai/chat)
  const handleSendMessage = async (
    userPrompt: string,
    roleOverride?: ChatRole,
    tierOverride?: ModelTier
  ) => {
    const activeRole = roleOverride || selectedRole;
    const activeTier = tierOverride || selectedTier;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: userPrompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Build multi-turn history for the chat API
    const history: ChatHistoryEntry[] = messages
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          role: activeRole,
          modelTier: activeTier,
          history,
          state: repoState,
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        let recAction: RecommendedAction | undefined = undefined;
        if (repoState.healthLevel !== 'Healthy' && !data.reply.includes('```')) {
          recAction = messages[0]?.recommendedAction;
        }

        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          role: activeRole,
          modelUsed: data.modelUsed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: data.reply,
          evidenceSummary: {
            symptom: repoState.symptomTitle,
            healthLevel: repoState.healthLevel,
            evidencePoints: [
              `Branch: ${repoState.currentBranch.name}`,
              `Ahead: ${repoState.currentBranch.aheadCount} | Behind: ${repoState.currentBranch.behindCount}`,
              `Uncommitted files: ${repoState.workingTree.length}`,
            ],
          },
          recommendedAction: recAction,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const analyzeRes = await fetch('/api/gitpet/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: repoState,
            userMessage: userPrompt,
          }),
        });
        const analyzeData = await analyzeRes.json();

        if (analyzeData.success) {
          const fallbackAsstMsg: ChatMessage = {
            id: `msg_asst_${Date.now()}`,
            sender: 'assistant',
            role: activeRole,
            modelUsed: 'gemini-3.5-flash',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: analyzeData.explanation,
            evidenceSummary: {
              symptom: repoState.symptomTitle,
              healthLevel: repoState.healthLevel,
              evidencePoints: analyzeData.evidencePoints || [],
            },
            recommendedAction: analyzeData.recommendedAction,
          };
          setMessages((prev) => [...prev, fallbackAsstMsg]);
        }
      }
    } catch (err) {
      console.warn('API call error, using clean fallback response:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        role: activeRole,
        modelUsed: 'gemini-3.1-flash-lite',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Based on current repository signals, branch **${repoState.currentBranch.name}** has ${repoState.currentBranch.behindCount} commits behind upstream with ${repoState.workingTree.length} uncommitted files.\n\nRecommended: Run \`git stash push -m "gitpet: save"\` before pulling.`,
        evidenceSummary: {
          symptom: repoState.symptomTitle,
          healthLevel: repoState.healthLevel,
          evidencePoints: [
            `Branch: ${repoState.currentBranch.name}`,
            `Behind: ${repoState.currentBranch.behindCount} commits`,
            `Working tree: ${repoState.workingTree.length} files`,
          ],
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for executing the approved safe action
  const handleExecuteAction = (action: RecommendedAction) => {
    setExecutingActionId(action.id);

    setTimeout(() => {
      const previousHealth = repoState.healthPercentage;

      let updatedWorkingTree = [...repoState.workingTree];
      let updatedBehind = repoState.currentBranch.behindCount;
      let updatedAhead = repoState.currentBranch.aheadCount;
      let updatedStashes = [...repoState.stashes];
      let updatedRemoteBehind = [...repoState.remoteCommitsBehind];

      if (action.title.includes('Stash') || action.title.includes('Pull') || action.title.includes('Preserve') || action.command.includes('pre-sync')) {
        updatedBehind = 0;
        updatedRemoteBehind = [];
        if (updatedWorkingTree.length > 0) {
          updatedStashes = [
            {
              id: `stash_${Date.now()}`,
              index: updatedStashes.length,
              message: 'gitpet: emergency safety backup before sync',
              timestamp: 'Just now',
              fileCount: updatedWorkingTree.length,
              files: updatedWorkingTree.map((f) => f.path),
            },
            ...updatedStashes,
          ];
          updatedWorkingTree = [];
        }
      }

      if (action.title.includes('Conflict') || action.title.includes('Rebase')) {
        updatedWorkingTree = updatedWorkingTree.filter((f) => f.status !== 'conflicted');
      }

      if (action.title.includes('Push')) {
        updatedAhead = 0;
      }

      if (action.title.includes('Anchor') || action.title.includes('switch -c')) {
        repoState.currentBranch.isDetached = false;
        repoState.currentBranch.name = 'feat/cart-worker';
      }

      const nextBaseState: RepositoryState = {
        ...repoState,
        currentBranch: {
          ...repoState.currentBranch,
          behindCount: updatedBehind,
          aheadCount: updatedAhead,
          isDetached: false,
          isStale: false,
        },
        workingTree: updatedWorkingTree,
        remoteCommitsBehind: updatedRemoteBehind,
        stashes: updatedStashes,
        destructiveRiskWarning: undefined,
        lossRiskSummary: undefined,
      };

      const healthCalc = computeRepositoryHealth(nextBaseState);

      const finalState: RepositoryState = {
        ...nextBaseState,
        ...healthCalc,
      };

      setRepoState(finalState);
      setExecutingActionId(null);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B'],
        });
      } catch (_) {}

      // Update practice stats
      setPracticeStats((prev) => ({
        ...prev,
        cleanCommitStreak: prev.cleanCommitStreak + 1,
        verifiedSyncs: prev.verifiedSyncs + 1,
        stewardshipScore: Math.min(100, prev.stewardshipScore + 2),
      }));

      // Record in audit history
      setAuditHistory((prev) => [
        {
          id: `audit_${Date.now()}`,
          command: action.command,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description: action.title,
        },
        ...prev,
      ]);

      // Update the chat message status
      setMessages((prev) =>
        prev.map((m) =>
          m.recommendedAction?.id === action.id
            ? {
                ...m,
                executed: true,
                executionResult: {
                  success: true,
                  message: 'Action completed successfully! Repository state verified and clean.',
                  previousHealth,
                  newHealth: finalState.healthPercentage,
                },
              }
            : m
        )
      );
    }, 1200);
  };

  // Rollback last action
  const handleRollbackLastAction = () => {
    if (auditHistory.length === 0) return;
    const last = auditHistory[0];
    setAuditHistory((prev) => prev.slice(1));

    setRepoState(MVP_SCENARIO.state);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg_rollback_${Date.now()}`,
        sender: 'system',
        timestamp: 'Just now',
        text: `Rolled back: ${last.description}. Repository restored to previous state.`,
      },
    ]);
  };

  // Live Workspace Status Scanner
  const handleFetchLiveStatus = async (isInitialSwitch = false) => {
    setLiveScanState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/git/live-status');
      const data = await res.json();
      if (data.repositoryUnavailable) {
        setLiveScanState({
          loading: false,
          unavailable: true,
          error: 'Current workspace is not a Git repository.',
          lastRefreshed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_live_unavail_${Date.now()}`,
            sender: 'assistant',
            role: selectedRole,
            modelUsed: 'gemini-3.5-flash',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `⚠️ **Workspace Unavailable**: The active folder is not inside a Git work tree. You can initialize one with \`git init\` or switch back to **Sandbox Presets** to test scenarios.`,
          },
        ]);
      } else if (data.success && data.state) {
        setRepoState(data.state);
        setLiveScanState({
          loading: false,
          unavailable: false,
          error: null,
          lastRefreshed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        if (isInitialSwitch) {
          const liveState = data.state as RepositoryState;
          const branch = liveState.currentBranch;
          const dirtyCount = liveState.workingTree.length;
          let summaryText = `🟢 **Live Workspace Connected**: Active branch is **${branch.name}**`;
          if (branch.upstream) {
            summaryText += ` tracking **${branch.upstream}** (${branch.aheadCount} ahead / ${branch.behindCount} behind).`;
          } else {
            summaryText += ` (no upstream configured).`;
          }
          if (dirtyCount > 0) {
            summaryText += `\n\nFound **${dirtyCount} uncommitted file(s)** in working tree.`;
          } else {
            summaryText += `\n\nWorking tree is completely clean!`;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `live_switch_${Date.now()}`,
              sender: 'assistant',
              role: selectedRole,
              modelUsed: 'gemini-3.5-flash',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: summaryText,
              evidenceSummary: {
                symptom: liveState.symptomTitle,
                healthLevel: liveState.healthLevel,
                evidencePoints: [
                  `Branch: ${branch.name}`,
                  branch.upstream ? `Tracking: ${branch.upstream} (↑${branch.aheadCount} / ↓${branch.behindCount})` : 'Upstream: None configured',
                  `Uncommitted files: ${dirtyCount}`,
                ],
              },
            },
          ]);
        }
      } else {
        setLiveScanState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to scan live workspace',
        }));
      }
    } catch (err: any) {
      setLiveScanState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Network error scanning live workspace',
      }));
    }
  };

  const handleToggleLiveMode = () => {
    if (!isLiveMode) {
      setCachedSandboxState(repoState);
      setIsLiveMode(true);
      handleFetchLiveStatus(true);
    } else {
      setIsLiveMode(false);
      setRepoState(cachedSandboxState);
      setMessages((prev) => [
        ...prev,
        {
          id: `sandbox_switch_${Date.now()}`,
          sender: 'assistant',
          role: selectedRole,
          modelUsed: 'gemini-3.5-flash',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `📦 **Switched back to Sandbox Mode**.\n\nRestored previous scenario preset. You can continue simulating anomalies and test safe actions risk-free.`,
        },
      ]);
    }
  };

  // Scenario selection
  const handleSelectScenario = (scenario: ScenarioPreset) => {
    if (isLiveMode) {
      setIsLiveMode(false);
    }
    setActiveScenarioId(scenario.id);
    setRepoState(scenario.state);

    setMessages((prev) => [
      ...prev,
      {
        id: `scenario_switch_${Date.now()}`,
        sender: 'assistant',
        role: selectedRole,
        modelUsed: 'gemini-3.5-flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Loaded scenario: **${scenario.title}**.\n\n${scenario.description}`,
        evidenceSummary: {
          symptom: scenario.state.symptomTitle,
          healthLevel: scenario.state.healthLevel,
          evidencePoints: [
            scenario.state.symptomDescription,
            `Primary Symptom: ${scenario.state.primarySymptom}`,
            `Health Score: ${scenario.state.healthPercentage}%`,
          ],
        },
      },
    ]);

    setTimeout(() => {
      handleSendMessage(scenario.samplePrompt, selectedRole, selectedTier);
    }, 300);
  };

  // Load real repository state from the public GitHub test fixture
  // (farisnour/gitpet-acme-corp-ecommerce-store) instead of a mock scenario.
  const handleLoadLiveRepo = async (branch: string) => {
    setIsLiveLoading(true);
    try {
      const res = await fetch(`/api/repo/live?branch=${encodeURIComponent(branch)}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load live repository state');
      }

      setActiveLiveBranch(branch);
      setActiveScenarioId(`live:${branch}`);
      setRepoState(data.state);

      setMessages((prev) => [
        ...prev,
        {
          id: `live_switch_${Date.now()}`,
          sender: 'assistant',
          role: selectedRole,
          modelUsed: 'github_live',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🔗 Loaded **live** data from [${data.repo}](${data.repoUrl}) — branch \`${branch}\`.\n\n${data.state.symptomDescription}`,
          evidenceSummary: {
            symptom: data.state.symptomTitle,
            healthLevel: data.state.healthLevel,
            evidencePoints: [
              data.state.symptomDescription,
              `Ahead: ${data.state.currentBranch.aheadCount} | Behind: ${data.state.currentBranch.behindCount} (vs ${LIVE_REPO.defaultBranch})`,
              `Health Score: ${data.state.healthPercentage}%`,
            ],
          },
        },
      ]);

      setTimeout(() => {
        handleSendMessage(`Status report for the live ${branch} branch! What needs attention?`, selectedRole, selectedTier);
      }, 300);
    } catch (err) {
      console.warn('Failed to load live repo state:', err);
      // Fall back to a mock scenario so the app stays usable if GitHub is
      // unreachable (offline dev, rate limit) instead of leaving the
      // "Connecting…" placeholder up indefinitely.
      setActiveScenarioId(MVP_SCENARIO.id);
      setRepoState(MVP_SCENARIO.state);
      setMessages((prev) => [
        ...prev,
        {
          id: `live_err_${Date.now()}`,
          sender: 'system',
          timestamp: 'Just now',
          text: `⚠️ Could not reach GitHub for live repo data (rate limit or network issue). Falling back to a mock scenario — pick a branch above to retry.`,
        },
      ]);
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Default on load: pull real state from the public GitHub test fixture
  // instead of starting on a hardcoded mock scenario. Guarded against
  // StrictMode's dev-only double-invoke of mount effects.
  const hasLoadedLiveOnMount = React.useRef(false);
  useEffect(() => {
    if (hasLoadedLiveOnMount.current) return;
    hasLoadedLiveOnMount.current = true;
    handleLoadLiveRepo(LIVE_REPO.defaultBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sandbox Anomaly Injectors
  const handleInjectRemoteCommit = () => {
    const newCommit = {
      hash: `c_${Date.now()}`,
      shortHash: Math.random().toString(36).substring(2, 9),
      message: 'chore(deps): bump tailwind & ui tokens',
      author: 'Alex Rivera <alex@acme.dev>',
      timestamp: 'Just now',
      isRemote: true,
    };

    const nextState: RepositoryState = {
      ...repoState,
      currentBranch: {
        ...repoState.currentBranch,
        behindCount: repoState.currentBranch.behindCount + 1,
      },
      remoteCommitsBehind: [newCommit, ...repoState.remoteCommitsBehind],
    };

    const health = computeRepositoryHealth(nextState);
    setRepoState({ ...nextState, ...health });
  };

  const handleInjectLocalEdit = () => {
    const newFile: FileChange = {
      path: `src/utils/cartHelper_${Date.now().toString().slice(-4)}.ts`,
      status: 'modified',
      additions: 10,
      deletions: 2,
      diffSnippet: `+// Draft helper function\n+export function validateCart() { return true; }`,
    };

    const nextState: RepositoryState = {
      ...repoState,
      workingTree: [newFile, ...repoState.workingTree],
    };

    const health = computeRepositoryHealth(nextState);
    setRepoState({ ...nextState, ...health });
  };

  const handleInjectConflict = () => {
    setRepoState(CONFLICT_SCENARIO.state);
    setActiveScenarioId(CONFLICT_SCENARIO.id);
    handleSendMessage('Conflict alert! What files are blocking the rebase?', selectedRole, selectedTier);
  };

  const handleInjectUnsafeRisk = () => {
    setRepoState(UNSAFE_LOSS_RISK_SCENARIO.state);
    setActiveScenarioId(UNSAFE_LOSS_RISK_SCENARIO.id);
    handleSendMessage(
      'EMERGENCY: What is the work-loss risk and how do I preserve my work safely?',
      selectedRole,
      selectedTier
    );
  };

  const handleResetToClean = () => {
    setRepoState(CLEAN_HEALTHY_SCENARIO.state);
    setActiveScenarioId(CLEAN_HEALTHY_SCENARIO.id);
  };

  // 90-Second Demo Step Flow
  const handleRunDemoStep = (stepNumber: number) => {
    setDemoStep(stepNumber);
    if (stepNumber === 1) {
      setRepoState(CLEAN_HEALTHY_SCENARIO.state);
      setActiveScenarioId(CLEAN_HEALTHY_SCENARIO.id);
      setMessages([
        {
          id: 'demo_clean_msg',
          sender: 'assistant',
          role: 'byte_mascot',
          timestamp: 'Just now',
          text: 'Repository is pristine! Branch **main** is in sync with upstream origin/main. Tail wagging happily.',
        },
      ]);
    } else if (stepNumber === 2) {
      setRepoState(MVP_SCENARIO.state);
      setActiveScenarioId(MVP_SCENARIO.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `demo_anomaly_${Date.now()}`,
          sender: 'system',
          timestamp: 'Just now',
          text: '⚠️ Anomaly Injected: Remote branch gained 3 commits. Working directory accumulated 2 dirty files. Pet visual shifted to pulling on leash with heavy backpack!',
        },
      ]);
    } else if (stepNumber === 3) {
      handleSendMessage('Status report! What needs attention?', selectedRole, selectedTier);
    } else if (stepNumber === 4) {
      const lastMsgWithAction = [...messages].reverse().find((m) => m.recommendedAction && !m.executed);
      if (lastMsgWithAction?.recommendedAction) {
        handleExecuteAction(lastMsgWithAction.recommendedAction);
      } else if (messages[0]?.recommendedAction) {
        handleExecuteAction(messages[0].recommendedAction);
      }
    }
  };

  return (
    <div
      id="gitpet-app-root"
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-slate-200 selection:text-slate-900"
    >
      {/* Top Bar */}
      <TopBar
        state={repoState}
        practiceStats={practiceStats}
        onSelectBranch={(branch) => {
          setRepoState((prev) => ({
            ...prev,
            currentBranch: { ...prev.currentBranch, name: branch },
          }));
        }}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        onOpenPitchDeck={() => setIsPitchDeckOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        isDrawerOpen={isDrawerOpen}
        isLiveMode={isLiveMode}
        liveScanState={liveScanState}
        onRefreshLive={handleFetchLiveStatus}
      />

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* Scenario Switcher & Anomaly Sandbox Bar */}
        <ScenarioSwitcher
          scenarios={ALL_SCENARIOS}
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          onInjectRemoteCommit={handleInjectRemoteCommit}
          onInjectLocalEdit={handleInjectLocalEdit}
          onInjectConflict={handleInjectConflict}
          onInjectUnsafeRisk={handleInjectUnsafeRisk}
          onResetToClean={handleResetToClean}
          isLiveMode={isLiveMode}
          onToggleLiveMode={handleToggleLiveMode}
          onRefreshLive={handleFetchLiveStatus}
          liveScanState={liveScanState}
          activeLiveBranch={activeLiveBranch}
          isLiveLoading={isLiveLoading}
          onSelectLiveBranch={handleLoadLiveRepo}
        />

        {/* Core Layout Grid: Pet Stage (Left) + Chat Stream (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Left Column: Pet Ambient Canvas & Posture Visualization */}
          <div className="lg:col-span-5 space-y-3">
            <PetStage
              state={repoState}
              customAvatarUrl={customAvatarUrl}
              onOpenImageStudio={() => setIsImageStudioOpen(true)}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onPetClick={() => {}}
            />

            {/* Quick Practice Metrics Card */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 font-bold">
                  🔥
                </div>
                <div>
                  <span className="font-bold text-slate-800">Clean Review Streak</span>
                  <p className="text-[11px] text-slate-400">
                    {practiceStats.cleanCommitStreak} verified reviews in a row
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                Active & Protected
              </span>
            </div>
          </div>

          {/* Right Column: Conversational Repository Guidance Stream */}
          <div className="lg:col-span-7 h-full">
            <ChatStream
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onPreviewAction={(action) => setPreviewAction(action)}
              onExecuteAction={handleExecuteAction}
              state={repoState}
              executingActionId={executingActionId}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              selectedTier={selectedTier}
              setSelectedTier={setSelectedTier}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Preview Changes & Diff Modal */}
      {previewAction && (
        <PreviewChangesModal
          isOpen={!!previewAction}
          onClose={() => setPreviewAction(null)}
          action={previewAction}
          state={repoState}
          onConfirmAction={() => handleExecuteAction(previewAction)}
        />
      )}

      {/* Repository Drawer */}
      <RepositoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        state={repoState}
        auditHistory={auditHistory}
        onRollbackLastAction={handleRollbackLastAction}
      />

      {/* Pitch Deck & 90-Second Demo Modal */}
      <PitchDeckModal
        isOpen={isPitchDeckOpen}
        onClose={() => setIsPitchDeckOpen(false)}
        onRunDemoStep={handleRunDemoStep}
        demoStep={demoStep}
      />

      {/* Image & Mascot Studio Modal (gemini-3.1-flash-image) */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onSelectAvatar={(imageUrl) => {
          setCustomAvatarUrl(imageUrl);
        }}
        currentAvatarUrl={customAvatarUrl}
      />

      {/* Live Voice Conversation Modal (gemini-3.1-flash-live-preview) */}
      <LiveVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        repoState={repoState}
        onExecuteAction={() => {
          if (messages[0]?.recommendedAction) {
            handleExecuteAction(messages[0].recommendedAction);
          }
        }}
      />
    </div>
  );
}
