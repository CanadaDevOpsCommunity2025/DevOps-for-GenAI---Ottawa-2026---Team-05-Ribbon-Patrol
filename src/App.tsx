import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { TopBar } from './components/TopBar';
import { PetStage } from './components/PetStage';
import { ChatStream } from './components/ChatStream';
import { ScenarioSwitcher } from './components/ScenarioSwitcher';
import { RepositoryDrawer } from './components/RepositoryDrawer';
import { PreviewChangesModal } from './components/PreviewChangesModal';
import { GuidedDemoBar } from './components/GuidedDemoBar';
import { QuickPaletteModal } from './components/QuickPaletteModal';
import {
  isAudioMuted,
  toggleAudioMuted,
  subscribeAudioMute,
  playSyncSuccessSound,
  playConflictAlertSound,
  playPetChirpSound,
} from './utils/audioEffects';
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

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(MVP_SCENARIO.id);
  const [repoState, setRepoState] = useState<RepositoryState>(MVP_SCENARIO.state);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>(INITIAL_PRACTICE_STATS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<ChatRole>('byte_mascot');
  const [selectedTier, setSelectedTier] = useState<ModelTier>('general');

  // Live Workspace Scanner State
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [liveScanState, setLiveScanState] = useState<LiveScanState>({ loading: false });
  const [cachedSandboxState, setCachedSandboxState] = useState<RepositoryState>(MVP_SCENARIO.state);

  // Live Repo (public GitHub fixture) branch picker state
  const [activeLiveBranch, setActiveLiveBranch] = useState<string | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  // Server capability, read once at startup: live mode can still be read-only
  // if the operator has not opted into writes.
  const [writesEnabled, setWritesEnabled] = useState<boolean>(false);
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');

  const [previewAction, setPreviewAction] = useState<RecommendedAction | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 90-Second Guided Demo State
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);
  const [isDemoPaused, setIsDemoPaused] = useState<boolean>(false);
  const [demoElapsedSeconds, setDemoElapsedSeconds] = useState<number>(0);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  
  // Quick Palette & Audio State
  const [isQuickPaletteOpen, setIsQuickPaletteOpen] = useState<boolean>(false);
  const [isAudioMutedState, setIsAudioMutedState] = useState<boolean>(() => isAudioMuted());
  const [petTriggerTimestamp, setPetTriggerTimestamp] = useState<number>(0);

  // Subscribe to audio mute changes
  useEffect(() => {
    const unsubscribe = subscribeAudioMute((muted) => {
      setIsAudioMutedState(muted);
    });
    return unsubscribe;
  }, []);

  // Alert sound when transitioning into Unsafe or Blocked states
  const prevHealthLevelRef = useRef<string>(repoState.healthLevel);
  useEffect(() => {
    if (
      (repoState.healthLevel === 'Unsafe' || repoState.healthLevel === 'Blocked') &&
      prevHealthLevelRef.current !== 'Unsafe' &&
      prevHealthLevelRef.current !== 'Blocked'
    ) {
      playConflictAlertSound();
    }
    prevHealthLevelRef.current = repoState.healthLevel;
  }, [repoState.healthLevel]);

  const handlePetByte = () => {
    setPetTriggerTimestamp(Date.now());
    playPetChirpSound();
  };

  const handleToggleAudio = () => {
    const next = toggleAudioMuted();
    setIsAudioMutedState(next);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC');
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      const activeEl = document.activeElement;
      const isEditable =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        e.isComposing;

      // 1. Cmd+K / Ctrl+K -> Toggle Quick Palette
      if (isCmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsQuickPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Cmd+B / Ctrl+B -> Toggle Repository Drawer
      if (isCmdOrCtrl && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
        return;
      }

      // 3. Escape key -> Strict layered close hierarchy
      if (e.key === 'Escape') {
        // Layer 1: Confirmation / Preview Modal
        if (previewAction) {
          e.preventDefault();
          setPreviewAction(null);
          return;
        }
        // Layer 2: Quick Palette
        if (isQuickPaletteOpen) {
          e.preventDefault();
          setIsQuickPaletteOpen(false);
          return;
        }
        // Layer 3: Repository Drawer
        if (isDrawerOpen) {
          e.preventDefault();
          setIsDrawerOpen(false);
          return;
        }
        return;
      }

      // 4. Space bar -> Pet Mascot (ONLY when NOT in an editable field or active modal)
      if (e.code === 'Space' || e.key === ' ') {
        if (
          !isEditable &&
          !isQuickPaletteOpen &&
          !previewAction
        ) {
          e.preventDefault();
          handlePetByte();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    previewAction,
    isQuickPaletteOpen,
    isDrawerOpen,
  ]);

  const [auditHistory, setAuditHistory] = useState<
    { id: string; command: string; timestamp: string; description: string }[]
  >([]);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'assistant',
      role: 'byte_mascot',
      modelUsed: 'gemini-2.5-flash',
      timestamp: 'Just now',
      text: `Hello! I'm **Byte**, your ambient repository companion.\n\nI monitor your repository's branch drift, uncommitted working tree diffs, and work-loss hazards in real-time.\n\nClick **🚀 90s Demo** to see the full walkthrough, ask me for a status report, or test any scenario!`,
      evidenceSummary: {
        symptom: MVP_SCENARIO.state.symptomTitle,
        healthLevel: MVP_SCENARIO.state.healthLevel,
        evidencePoints: [
          `Branch: ${MVP_SCENARIO.state.currentBranch.name}`,
          `Behind: ${MVP_SCENARIO.state.currentBranch.behindCount} commits | Ahead: ${MVP_SCENARIO.state.currentBranch.aheadCount}`,
          `Uncommitted files: ${MVP_SCENARIO.state.workingTree.length}`,
        ],
      },
    },
  ]);

  // Handler for sending messages to Gemini API backend (/api/ai/chat)
  // Ask the server what it is actually able to do. Live Workspace Mode can
  // still be read-only, and the repository it inspects is set server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (cancelled) return;
        setWritesEnabled(Boolean(data.writesEnabled));
        setWorkspaceRoot(data.workspaceRoot || '');
      } catch {
        // Leave the conservative defaults in place.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendMessage = async (
    userPrompt: string,
    roleOverride?: ChatRole,
    tierOverride?: ModelTier,
    // Callers that have just queued a state change must pass the new state
    // explicitly: `repoState` below is captured from the render this function
    // was created in, so a prompt fired immediately after setRepoState would
    // otherwise describe the previous repository.
    stateOverride?: RepositoryState
  ) => {
    const activeRole = roleOverride || selectedRole;
    const activeTier = tierOverride || selectedTier;
    const activeState = stateOverride ?? repoState;

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
          state: activeState,
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
            symptom: activeState.symptomTitle,
            healthLevel: activeState.healthLevel,
            evidencePoints: [
              `Branch: ${activeState.currentBranch.name}`,
              `Ahead: ${activeState.currentBranch.aheadCount} | Behind: ${activeState.currentBranch.behindCount}`,
              `Uncommitted files: ${activeState.workingTree.length}`,
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
            state: activeState,
            userMessage: userPrompt,
          }),
        });
        const analyzeData = await analyzeRes.json();

        if (analyzeData.success) {
          const fallbackAsstMsg: ChatMessage = {
            id: `msg_asst_${Date.now()}`,
            sender: 'assistant',
            role: activeRole,
            modelUsed: 'gemini-2.5-flash',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: analyzeData.explanation,
            evidenceSummary: {
              symptom: activeState.symptomTitle,
              healthLevel: activeState.healthLevel,
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
        modelUsed: 'gemini-2.5-flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Based on current repository signals, branch **${repoState.currentBranch.name}** has ${repoState.currentBranch.behindCount} commits behind upstream with ${repoState.workingTree.length} uncommitted files.\n\nRecommended: Run \`git stash push -m "gitpet: save"\` before pulling.`,
        evidenceSummary: {
          symptom: activeState.symptomTitle,
          healthLevel: activeState.healthLevel,
          evidencePoints: [
            `Branch: ${activeState.currentBranch.name}`,
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
  const handleExecuteAction = async (action: RecommendedAction) => {
    setPreviewAction(null);
    setExecutingActionId(action.id);

    // Live workspace: run the command for real and re-read the repository.
    // Sandbox keeps the simulated transition below, so demo scenarios still
    // work without touching anything on disk.
    if (isLiveMode) {
      if (!writesEnabled) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_writes_off_${Date.now()}`,
            sender: 'system' as const,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text:
              'Live Workspace is read-only on this server, so nothing was run. ' +
              'Set GITPET_ALLOW_WRITES=true in .env (and GITPET_WORKSPACE_ROOT to the repository you want GitPet to act on), then restart.',
          },
        ]);
        setExecutingActionId(null);
        return;
      }

      const previousHealth = repoState.healthPercentage;
      try {
        const res = await fetch('/api/git/execute-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: action.command }),
        });
        const data = await res.json();

        if (data.state) setRepoState(data.state);

        if (data.success) {
          setAuditHistory((prev) => [
            {
              id: `audit_${Date.now()}`,
              command: action.command,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              description: action.title,
            },
            ...prev,
          ]);
          try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
          } catch {
            // Confetti is decorative; never let it break the result path.
          }
        }

        // Echo real stdout/stderr so the outcome is verifiable, not asserted.
        const transcript = (data.steps || [])
          .filter((step: any) => !step.skipped)
          .map((step: any) => `$ ${step.command}\n${(step.stdout || step.stderr || '(no output)').trim()}`)
          .join('\n\n');

        setMessages((prev) => [
          ...prev.map((m) =>
            m.recommendedAction?.id === action.id
              ? {
                  ...m,
                  executed: data.success,
                  executionResult: {
                    success: data.success,
                    message: data.message,
                    previousHealth,
                    newHealth: data.state?.healthPercentage ?? previousHealth,
                  },
                }
              : m
          ),
          {
            id: `msg_exec_${Date.now()}`,
            sender: 'system' as const,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: transcript || data.message || 'No output.',
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_exec_err_${Date.now()}`,
            sender: 'system' as const,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: 'Could not reach the execution endpoint.',
          },
        ]);
      } finally {
        setExecutingActionId(null);
      }
      return;
    }

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

      // Trigger celebration confetti and sync success chime
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B'],
        });
      } catch (_) {}

      // Play warm ascending sync success chime
      playSyncSuccessSound();

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
                  message:
                    'Simulated in Sandbox Mode — no repository was modified. Switch to Live Workspace to run this for real.',
                  previousHealth,
                  newHealth: finalState.healthPercentage,
                },
              }
            : m
        )
      );

      // Say plainly that nothing on disk changed. Without this the sandbox
      // reports success identically to a real run, which reads as GitPet
      // silently failing to touch the repository.
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_sandbox_note_${Date.now()}`,
          sender: 'system' as const,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Sandbox Mode: simulated \`${action.command}\`. No files, branches or commits were changed. Toggle Live Workspace in the top bar to run commands against a real repository.`,
        },
      ]);
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
  const handleFetchLiveStatus = async (isInitialSwitch = false, silent = false) => {
    if (!silent) {
      setLiveScanState((prev) => ({ ...prev, loading: true, error: null }));
    }
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
        if (!silent) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_live_unavail_${Date.now()}`,
              sender: 'assistant',
              role: selectedRole,
              modelUsed: 'gemini-2.5-flash',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `⚠️ **Workspace Unavailable**: The active folder is not inside a Git work tree. You can initialize one with \`git init\` or switch back to **Sandbox Presets** to test scenarios.`,
            },
          ]);
        }
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

          // State which repository is in scope and whether actions can run.
          // Without this, a read-only server looks identical to a broken one.
          if (workspaceRoot) {
            summaryText += `\n\nRepository: \`${workspaceRoot}\``;
          }
          summaryText += writesEnabled
            ? `\n\n✅ **Actions enabled** — approved commands run against this repository.`
            : `\n\n🔒 **Read-only** — approved commands will not run. Set \`GITPET_ALLOW_WRITES=true\` in .env and restart to enable them.`;

          setMessages((prev) => [
            ...prev,
            {
              id: `live_switch_${Date.now()}`,
              sender: 'assistant',
              role: selectedRole,
              modelUsed: 'gemini-2.5-flash',
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
      setActiveLiveBranch(null);
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
          modelUsed: 'gemini-2.5-flash',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `📦 **Switched back to Sandbox Mode**.\n\nRestored previous scenario preset. You can continue simulating anomalies and test safe actions risk-free.`,
        },
      ]);
    }
  };

  // Auto-refresh Live Workspace while active, so uncommitted edits and new
  // commits show up on their own instead of requiring a manual "Scan Live
  // Repo" click. Silent polls skip the loading spinner and the connection
  // chat message so they don't spam the UI every tick.
  useEffect(() => {
    if (!isLiveMode) return;
    const interval = setInterval(() => {
      handleFetchLiveStatus(false, true);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveMode]);

  // Scenario selection
  const handleSelectScenario = (scenario: ScenarioPreset) => {
    if (isLiveMode) {
      setIsLiveMode(false);
    }
    setActiveLiveBranch(null);
    setActiveScenarioId(scenario.id);
    setRepoState(scenario.state);

    setMessages((prev) => [
      ...prev,
      {
        id: `scenario_switch_${Date.now()}`,
        sender: 'assistant',
        role: selectedRole,
        modelUsed: 'scenario',
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
      handleSendMessage(scenario.samplePrompt, selectedRole, selectedTier, scenario.state);
    }, 300);
  };

  // Load real repository state from the public GitHub test fixture
  // (farisnour/gitpet-acme-corp-ecommerce-store) instead of a mock scenario.
  const handleLoadLiveRepo = async (branch: string) => {
    if (isLiveMode) {
      setIsLiveMode(false);
    }
    setIsLiveLoading(true);
    try {
      const res = await fetch(`/api/repo/live?branch=${encodeURIComponent(branch)}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to load live repository state');
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
    } catch (err: any) {
      console.warn('Failed to load live repo state:', err);
      const rateLimited = err?.message?.includes('rate limit');
      setMessages((prev) => [
        ...prev,
        {
          id: `live_err_${Date.now()}`,
          sender: 'system',
          timestamp: 'Just now',
          text: rateLimited
            ? `⚠️ ${err.message}`
            : `⚠️ Could not reach GitHub for live repo data (network issue). Try again shortly.`,
        },
      ]);
    } finally {
      setIsLiveLoading(false);
    }
  };

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

  // 90-Second Guided Demo Auto-Advance Timer Loop
  useEffect(() => {
    if (!isDemoActive || isDemoPaused) return;

    const timer = setInterval(() => {
      setDemoElapsedSeconds((prev) => prev + 1);

      setAutoAdvanceCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Auto-advance to next step
          if (demoStep === 1) {
            handleRunDemoStep(2);
            return 16;
          } else if (demoStep === 2) {
            handleRunDemoStep(3);
            return 18;
          } else if (demoStep === 3) {
            handleRunDemoStep(4);
            return null; // Step 4 requires explicit preview confirmation
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemoActive, isDemoPaused, demoStep]);

  const handleResetToClean = () => {
    setRepoState(CLEAN_HEALTHY_SCENARIO.state);
    setActiveScenarioId(CLEAN_HEALTHY_SCENARIO.id);
  };

  const handleStartDemo = () => {
    setIsDemoActive(true);
    setIsDemoPaused(false);
    setDemoElapsedSeconds(0);
    handleRunDemoStep(1);
  };

  const handleRunDemoStep = (stepNumber: number) => {
    setIsDemoActive(true);
    setDemoStep(stepNumber);

    const demoAction: RecommendedAction = {
      id: 'act_initial_mvp',
      title: 'Stash Local Changes, Pull Upstream & Restore Stash',
      summary:
        'Preserve 2 dirty files in stash, fast-forward pull 3 commits from origin, then cleanly restore your edits.',
      command:
        'git stash push -m "gitpet: preserve cart edits before pull" && git pull origin feature/cart && git stash pop',
      confidence: 'High',
      confidenceScore: 98,
      riskLevel: 'Safe',
      expectedResult:
        'Branch is synchronized with upstream and your local edits to CartDrawer.tsx and pricingService.ts are preserved.',
      reversalStep:
        'git stash (stash index is kept until verified; or git reset --keep HEAD@{1})',
      evidence: [
        'Remote branch has 3 newer commits from teammates (Sarah Chen & Marcus Vance)',
        'Working tree has 2 uncommitted modified files',
        'Stashing eliminates potential checkout/pull overwrites',
      ],
      affectedFiles: [
        'src/components/cart/CartDrawer.tsx',
        'src/services/pricingService.ts',
      ],
      steps: [
        {
          label: '1. Stash uncommitted changes',
          command: 'git stash push -m "gitpet: preserve work"',
          details: 'Saves CartDrawer.tsx and pricingService.ts into local stash stack.',
        },
        {
          label: '2. Pull remote commits',
          command: 'git pull origin feature/cart',
          details: 'Synchronizes 3 remote commits from origin/feature/cart.',
        },
        {
          label: '3. Pop stashed work',
          command: 'git stash pop',
          details: 'Restores your active work cleanly onto the updated branch.',
        },
      ],
    };

    if (stepNumber === 1) {
      setRepoState(CLEAN_HEALTHY_SCENARIO.state);
      setActiveScenarioId(CLEAN_HEALTHY_SCENARIO.id);
      setIsDrawerOpen(false);
      setPreviewAction(null);
      setAutoAdvanceCountdown(12);
      setMessages([
        {
          id: `demo_clean_msg_${Date.now()}`,
          sender: 'assistant',
          role: 'byte_mascot',
          modelUsed: 'gemini-2.5-flash',
          timestamp: 'Just now',
          text: '🟢 **Pristine Repository**: Branch **main** is 100% synchronized with upstream origin/main with a completely clean working tree.\n\nNotice how Byte is completely relaxed, tail is wagging happily, and health is 100%.',
          evidenceSummary: {
            symptom: 'Synchronized & Pristine',
            healthLevel: 'Healthy',
            evidencePoints: [
              '0 commits ahead / 0 commits behind origin/main',
              '0 uncommitted files in working tree',
              'Ready for feature branch development',
            ],
          },
        },
      ]);
    } else if (stepNumber === 2) {
      setRepoState(MVP_SCENARIO.state);
      setActiveScenarioId(MVP_SCENARIO.id);
      setIsDrawerOpen(false);
      setPreviewAction(null);
      setAutoAdvanceCountdown(16);
      setMessages((prev) => [
        ...prev,
        {
          id: `demo_anomaly_${Date.now()}`,
          sender: 'system',
          timestamp: 'Just now',
          text: '⚠️ **Anomaly Injected**: Upstream remote branch **feature/cart** gained 3 new commits from teammates while 2 uncommitted local edits were modified in your working tree.\n\nNotice how Byte immediately reflects this: posture changes to pulling on leash with an overfilled backpack, health drops to 68% Attention level!',
        },
      ]);
    } else if (stepNumber === 3) {
      setIsDrawerOpen(false);
      setPreviewAction(null);
      setAutoAdvanceCountdown(18);
      setMessages((prev) => [
        ...prev,
        {
          id: `demo_report_${Date.now()}`,
          sender: 'assistant',
          role: 'byte_mascot',
          modelUsed: 'gemini-2.5-flash',
          timestamp: 'Just now',
          text: `I noticed **${MVP_SCENARIO.state.currentBranch.name}** is **3 commits behind** ${MVP_SCENARIO.state.currentBranch.upstream} while you have **2 uncommitted files** in your working directory. Stashing your edits before pulling avoids mixing unfinished work with upstream changes and eliminates merge accident risk.`,
          evidenceSummary: {
            symptom: 'Behind remote with local edits',
            healthLevel: 'Attention',
            evidencePoints: [
              'feature/cart is 3 commits behind origin/feature/cart',
              '2 uncommitted modified files in working directory (CartDrawer.tsx, pricingService.ts)',
              'Safe action: Stash local changes, pull upstream, then restore stash',
            ],
          },
          recommendedAction: demoAction,
        },
      ]);
    } else if (stepNumber === 4) {
      setAutoAdvanceCountdown(null);
      // Automatically open diff preview modal so user can inspect and explicitly confirm
      setPreviewAction(demoAction);
    }
  };

  const handleNextDemoStep = () => {
    if (demoStep < 4) {
      handleRunDemoStep(demoStep + 1);
    }
  };

  const handleToggleDemoPause = () => {
    setIsDemoPaused((prev) => !prev);
  };

  const handleRestartDemo = () => {
    setDemoElapsedSeconds(0);
    setIsDemoPaused(false);
    handleRunDemoStep(1);
  };

  const handleExitDemo = () => {
    setIsDemoActive(false);
    setIsDemoPaused(false);
    setAutoAdvanceCountdown(null);
  };

  const isMvpActionExecuted = messages.some(
    (m) => m.recommendedAction?.id === 'act_initial_mvp' && m.executed
  );

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
        onOpenQuickPalette={() => setIsQuickPaletteOpen(true)}
        onStartDemo={handleStartDemo}
        isDemoActive={isDemoActive}
        isDrawerOpen={isDrawerOpen}
        isLiveMode={isLiveMode}
        liveScanState={liveScanState}
        onRefreshLive={handleFetchLiveStatus}
        isAudioMuted={isAudioMutedState}
        onToggleAudio={handleToggleAudio}
      />

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* 🚀 90-Second Guided Demo Bar on Main Canvas */}
        <GuidedDemoBar
          isDemoActive={isDemoActive}
          demoStep={demoStep}
          isDemoPaused={isDemoPaused}
          elapsedSeconds={demoElapsedSeconds}
          totalDurationSeconds={90}
          autoAdvanceCountdown={autoAdvanceCountdown}
          onStartDemo={handleStartDemo}
          onNextStep={handleNextDemoStep}
          onTogglePause={handleToggleDemoPause}
          onRestartDemo={handleRestartDemo}
          onExitDemo={handleExitDemo}
          onJumpToStep={(step) => handleRunDemoStep(step)}
          onOpenPreview={() => {
            const lastWithAction = [...messages].reverse().find((m) => m.recommendedAction && !m.executed);
            if (lastWithAction?.recommendedAction) {
              setPreviewAction(lastWithAction.recommendedAction);
            }
          }}
          isActionExecuted={isMvpActionExecuted}
          isPreviewOpen={!!previewAction}
        />

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
              onPetClick={handlePetByte}
              petTriggerTimestamp={petTriggerTimestamp}
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

      {/* Quick Command Palette Modal (Cmd+K / Ctrl+K) */}
      <QuickPaletteModal
        isOpen={isQuickPaletteOpen}
        onClose={() => setIsQuickPaletteOpen(false)}
        scenarios={ALL_SCENARIOS}
        onSelectScenario={handleSelectScenario}
        onStartDemo={handleStartDemo}
        onRestartDemo={handleRestartDemo}
        onNextDemoStep={handleNextDemoStep}
        isDemoActive={isDemoActive}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
        onOpenPreviewAction={() => {
          const lastWithAction = [...messages].reverse().find((m) => m.recommendedAction && !m.executed);
          if (lastWithAction?.recommendedAction) {
            setPreviewAction(lastWithAction.recommendedAction);
          }
        }}
        hasPendingAction={messages.some((m) => m.recommendedAction && !m.executed)}
        onRollbackLastAction={handleRollbackLastAction}
        hasAuditHistory={auditHistory.length > 0}
        isLiveMode={isLiveMode}
        onToggleLiveMode={handleToggleLiveMode}
        onRefreshLive={handleFetchLiveStatus}
        isAudioMuted={isAudioMutedState}
        onToggleAudio={handleToggleAudio}
        onPetByte={handlePetByte}
      />
    </div>
  );
}
