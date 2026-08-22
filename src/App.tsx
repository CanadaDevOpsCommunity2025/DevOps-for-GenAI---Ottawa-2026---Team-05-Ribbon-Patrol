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
} from './types';

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(MVP_SCENARIO.id);
  const [repoState, setRepoState] = useState<RepositoryState>(MVP_SCENARIO.state);
  const [practiceStats, setPracticeStats] = useState<PracticeStats>(INITIAL_PRACTICE_STATS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState<boolean>(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<ChatRole>('byte_mascot');
  const [selectedTier, setSelectedTier] = useState<ModelTier>('general');

  const [previewAction, setPreviewAction] = useState<RecommendedAction | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);
  const [auditHistory, setAuditHistory] = useState<
    { id: string; command: string; timestamp: string; description: string }[]
  >([]);

  // Initial welcome message with the deterministic MVP action ready for review
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'assistant',
      role: 'byte_mascot',
      modelUsed: 'gemini-3.5-flash',
      timestamp: 'Just now',
      text: `Hello! I'm **Byte**, your ambient repository companion.\n\nI noticed **${MVP_SCENARIO.state.currentBranch.name}** is **3 commits behind** ${MVP_SCENARIO.state.currentBranch.upstream} while you have **2 uncommitted files** in your working directory. Stashing your edits before pulling avoids mixing unfinished work with upstream changes.`,
      evidenceSummary: {
        symptom: 'Behind remote with local edits',
        healthLevel: 'Attention',
        evidencePoints: [
          'feature/cart is 3 commits behind origin/feature/cart',
          '2 uncommitted modified files in working directory',
          'Safe action: Stash local changes, pull upstream, then restore stash',
        ],
      },
      recommendedAction: {
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
      },
    },
  ]);

  // Handler for sending messages to Gemini API backend (/api/chat and /api/gitpet/analyze)
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
      // First try rich multi-turn chat endpoint
      const res = await fetch('/api/chat', {
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
        // Also check if we should pair with a recommended action from state if repo needs attention
        let recAction: RecommendedAction | undefined = undefined;
        if (repoState.healthLevel !== 'Healthy' && !data.reply.includes('```')) {
          // Provide contextual safe action for this scenario
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
        // Fallback to gitpet analyze
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
      console.warn('API call error, creating fallback response:', err);
      // Clean fallback message
      const fallbackMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        role: activeRole,
        modelUsed: 'gemini-3.1-flash-lite',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Based on current repository signals, your branch **${repoState.currentBranch.name}** has ${repoState.currentBranch.behindCount} commits behind upstream with ${repoState.workingTree.length} uncommitted files.\n\nRecommended: Run \`git stash push -m "gitpet: save"\` before pulling.`,
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

    // Multi-step progress simulation
    setTimeout(() => {
      const previousHealth = repoState.healthPercentage;

      // Update repository state to clean / synchronized state
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
                  message: 'Action completed successfully! Repository state rechecked and clean.',
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

    // Restore to attention state
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

  // Scenario selection
  const handleSelectScenario = (scenario: ScenarioPreset) => {
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

    // Automatically trigger analysis for the scenario's sample prompt
    setTimeout(() => {
      handleSendMessage(scenario.samplePrompt, selectedRole, selectedTier);
    }, 300);
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

  const handleResetToClean = () => {
    setRepoState(CLEAN_HEALTHY_SCENARIO.state);
    setActiveScenarioId(CLEAN_HEALTHY_SCENARIO.id);
  };

  // 90-Second Demo Step Flow
  const handleRunDemoStep = (stepNumber: number) => {
    setDemoStep(stepNumber);
    if (stepNumber === 1) {
      // Step 1: Clean State
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
      // Step 2: Trigger Divergence Anomaly (3 Remote Commits + 2 Dirty Files)
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
      // Step 3: Ask Guidance
      handleSendMessage('Status report! What needs attention?', selectedRole, selectedTier);
    } else if (stepNumber === 4) {
      // Step 4: Execute Safe Action
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
      className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900"
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
      />

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
        />

        {/* Core Layout Grid: Pet Stage (Center/Left) + Chat Stream (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left Column: Pet Ambient Canvas & Posture Visualization */}
          <div className="lg:col-span-5 space-y-4">
            <PetStage
              state={repoState}
              customAvatarUrl={customAvatarUrl}
              onOpenImageStudio={() => setIsImageStudioOpen(true)}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onPetClick={() => {
                // Interactive petting
              }}
            />

            {/* Quick Practice Metrics Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <div>
                  <span className="font-bold text-slate-800">Clean Commit Streak</span>
                  <p className="text-[11px] text-slate-500">
                    {practiceStats.cleanCommitStreak} verified reviews in a row
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
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
