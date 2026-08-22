import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  ShieldCheck,
  Zap,
  RefreshCw,
  Eye,
  Award,
} from 'lucide-react';

export interface DemoStepInfo {
  stepNumber: number;
  title: string;
  shortTitle: string;
  stage: 'Notice' | 'Understand' | 'Resolve' | 'Celebrate';
  description: string;
  expectedOutcome: string;
  durationSeconds: number;
}

export const DEMO_STEPS: DemoStepInfo[] = [
  {
    stepNumber: 1,
    title: '1. Clean & Synchronized State',
    shortTitle: 'Clean State',
    stage: 'Notice',
    description: 'Repository is 100% healthy and synchronized with upstream. Byte is relaxed and tail is wagging.',
    expectedOutcome: '100% Health, 0 ahead/behind, pristine working tree.',
    durationSeconds: 15,
  },
  {
    stepNumber: 2,
    title: '2. Anomaly Injected (Behind Remote + Dirty Tree)',
    shortTitle: 'Anomaly Injected',
    stage: 'Notice',
    description: 'Remote branch gained 3 commits while 2 uncommitted files exist locally. Byte pulls on leash with backpack.',
    expectedOutcome: '68% Health Attention level, 3 commits behind, 2 uncommitted files.',
    durationSeconds: 20,
  },
  {
    stepNumber: 3,
    title: '3. Evidence-Backed Status Report',
    shortTitle: 'Status Report',
    stage: 'Understand',
    description: 'Byte cites exact behind commit hashes, dirty files, and provides a bounded, reversible recovery proposal.',
    expectedOutcome: 'Plain-English evidence breakdown with safe stash & pull action card.',
    durationSeconds: 25,
  },
  {
    stepNumber: 4,
    title: '4. Safe Action Approved & Verified',
    shortTitle: 'Safe Action & Tidy',
    stage: 'Resolve',
    description: 'Inspect diff preview, require explicit human confirmation, execute safe recovery, and verify pristine health.',
    expectedOutcome: 'Diff preview modal, confirmation gate, confetti celebration, and streak +1.',
    durationSeconds: 30,
  },
];

interface GuidedDemoBarProps {
  isDemoActive: boolean;
  demoStep: number;
  isDemoPaused: boolean;
  elapsedSeconds: number;
  totalDurationSeconds?: number;
  autoAdvanceCountdown: number | null;
  onStartDemo: () => void;
  onNextStep: () => void;
  onPrevStep?: () => void;
  onTogglePause: () => void;
  onRestartDemo: () => void;
  onExitDemo: () => void;
  onJumpToStep: (stepNumber: number) => void;
  onOpenPreview?: () => void;
  isActionExecuted?: boolean;
  isPreviewOpen?: boolean;
}

export const GuidedDemoBar: React.FC<GuidedDemoBarProps> = ({
  isDemoActive,
  demoStep,
  isDemoPaused,
  elapsedSeconds,
  totalDurationSeconds = 90,
  autoAdvanceCountdown,
  onStartDemo,
  onNextStep,
  onPrevStep,
  onTogglePause,
  onRestartDemo,
  onExitDemo,
  onJumpToStep,
  onOpenPreview,
  isActionExecuted = false,
  isPreviewOpen = false,
}) => {
  const currentStepInfo = DEMO_STEPS[demoStep - 1] || DEMO_STEPS[0];
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalDurationSeconds) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isDemoActive) {
    return (
      <div
        id="guided-demo-banner"
        className="w-full bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-lg shrink-0">
            🚀
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                90-Second Guided Hackathon Demo
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-mono font-semibold uppercase">
                Notice → Understand → Resolve
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Experience the complete deterministic developer walkthrough in under 90 seconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="start-guided-demo-btn"
            onClick={onStartDemo}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Start Guided Demo</span>
            <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.2 rounded text-slate-800">
              90s
            </span>
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = demoStep === 4 && isActionExecuted;

  return (
    <div
      id="guided-demo-active-bar"
      role="region"
      aria-label="90-Second Guided Demo Bar"
      className="w-full bg-white rounded-2xl border-2 border-indigo-500/40 shadow-md p-3 sm:p-4 space-y-3 relative overflow-hidden text-left"
    >
      {/* Top Bar: Title, Step Badges, Timer, and Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        {/* Left: Indicator & Step Tracker */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Guided Demo</span>
                <span className="px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                  Step {demoStep} of {DEMO_STEPS.length}
                </span>
                <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">
                  Stage: {currentStepInfo.stage}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {DEMO_STEPS.map((step) => {
              const isActive = step.stepNumber === demoStep;
              const isPast = step.stepNumber < demoStep || (step.stepNumber === 4 && isCompleted);

              return (
                <button
                  key={step.stepNumber}
                  onClick={() => onJumpToStep(step.stepNumber)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : isPast
                      ? 'bg-white text-emerald-700 border border-slate-200 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[9px] flex items-center justify-center font-bold">
                      {step.stepNumber}
                    </span>
                  )}
                  <span>{step.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Timer & Interactive Actions */}
        <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
          {/* Elapsed Timer Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-800">{formatTime(elapsedSeconds)}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">{formatTime(totalDurationSeconds)}</span>
            {autoAdvanceCountdown !== null && !isDemoPaused && !isCompleted && (
              <span className="ml-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 animate-pulse">
                Next in {autoAdvanceCountdown}s
              </span>
            )}
          </div>

          {/* Pause / Resume Button */}
          <button
            id="demo-toggle-pause-btn"
            onClick={onTogglePause}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isDemoPaused
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isDemoPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            {isDemoPaused ? (
              <>
                <Play className="w-3 h-3 fill-amber-700 text-amber-700" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-slate-600" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Restart Button */}
          <button
            id="demo-restart-btn"
            onClick={onRestartDemo}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset demo to Step 1"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Restart</span>
          </button>

          {/* Next Step Button (if not completed) */}
          {demoStep < 4 ? (
            <button
              id="demo-next-step-btn"
              onClick={onNextStep}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : !isActionExecuted && onOpenPreview ? (
            <button
              id="demo-open-preview-btn"
              onClick={onOpenPreview}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Inspect & Confirm Diff</span>
            </button>
          ) : null}

          {/* Exit Demo Button */}
          <button
            id="demo-exit-btn"
            onClick={onExitDemo}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Exit Guided Demo Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Active Step Narrative & Instructions Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs">
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center gap-2 font-bold text-indigo-950">
            <span>{currentStepInfo.title}</span>
            {isDemoPaused && (
              <span className="text-[10px] font-normal text-amber-700 bg-amber-100 px-2 py-0.2 rounded-full font-sans">
                Paused — manual control active
              </span>
            )}
          </div>
          <p className="text-slate-600 leading-normal">{currentStepInfo.description}</p>
        </div>

        {/* Expected Callout / Action Reminder */}
        <div className="shrink-0 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200/80 shadow-2xs">
          <span className="font-semibold text-slate-700 text-[11px]">Expected:</span>
          <span className="text-indigo-900 font-medium text-[11px]">
            {currentStepInfo.expectedOutcome}
          </span>
        </div>
      </div>

      {/* Step 4 Special Completion Banner */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950">
                🎉 90-Second Demo Complete in {formatTime(elapsedSeconds)}!
              </h4>
              <p className="text-emerald-800 text-[11px] mt-0.5">
                Notice → Understand → Resolve full story verified. Clean review streak awarded!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRestartDemo}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-200 text-xs transition-colors cursor-pointer"
            >
              Re-run Demo
            </button>
            <button
              onClick={onExitDemo}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
