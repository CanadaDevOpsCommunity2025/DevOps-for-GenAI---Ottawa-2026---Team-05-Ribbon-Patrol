import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Heart,
  GitBranch,
  Flame,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDemoStep: (stepNumber: number) => void;
  demoStep: number;
}

export const PitchDeckModal: React.FC<PitchDeckModalProps> = ({
  isOpen,
  onClose,
  onRunDemoStep,
  demoStep,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: '1. The Hidden Context Problem',
      subtitle: 'Why Developers Fear Blind Git Pulls & Rebases',
      tag: 'Problem & Opportunity',
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Repository divergence happens silently in the background: teammates push upstream, working directories accumulate untracked edits, and merge conflicts lurk unannounced until a terminal pull breaks in-flight work.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/80">
              <span className="text-xs font-bold text-rose-900 block mb-1">Terminal-First Fatigue</span>
              <p className="text-[11px] text-rose-800 leading-normal">
                Developers must manually run <code className="font-mono bg-white px-1 rounded">git fetch</code>, <code className="font-mono bg-white px-1 rounded">git status</code>, and inspect log divergence before knowing if it's safe to pull.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
              <span className="text-xs font-bold text-amber-900 block mb-1">Work Contamination</span>
              <p className="text-[11px] text-amber-800 leading-normal">
                Pulling while holding uncommitted local changes frequently creates untracked merge accidents, dirty stashes, and lost focus.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '2. The GitPet Solution: Ambient Awareness',
      subtitle: 'Notice → Understand → Resolve in Seconds',
      tag: 'Core Loop',
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            GitPet transforms complex repository graph telemetry into an intuitive ambient companion that sits beside your editor.
          </p>
          <div className="grid grid-cols-3 gap-2.5 mt-2 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-lg mb-1">🐕</div>
              <span className="text-xs font-bold text-emerald-900 block">1. Notice</span>
              <p className="text-[10px] text-emerald-700 mt-1">
                Pet posture & aura convey urgency and repository symptoms at a glance.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-lg mb-1">💡</div>
              <span className="text-xs font-bold text-blue-900 block">2. Understand</span>
              <p className="text-[10px] text-blue-700 mt-1">
                Evidence-based plain-English explanation citing commits & file diffs.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-lg mb-1">🛡️</div>
              <span className="text-xs font-bold text-slate-900 block">3. Resolve</span>
              <p className="text-[10px] text-slate-600 mt-1">
                Human-approved bounded action with guaranteed rollback steps.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '3. State Machine & Pet Expression Matrix',
      subtitle: 'Mapping Git Signals to Posture, Mood, and Aura',
      tag: 'Architecture & UX',
      content: (
        <div className="space-y-3 text-left">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-rose-100 border-2 border-rose-300">
              <div className="font-bold text-rose-950 flex items-center gap-1">
                <span>⚠️ Unsafe (0%)</span>
              </div>
              <p className="text-[10px] text-rose-800 mt-0.5 font-medium">
                Frozen still, grayscale & crimson alert pulse
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="font-bold text-emerald-900">Synchronized (100%)</div>
              <p className="text-[10px] text-emerald-700 mt-0.5">Playful, bouncy tail & emerald glow</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="font-bold text-amber-900">Behind Remote</div>
              <p className="text-[10px] text-amber-700 mt-0.5">Pulling on leash toward upstream</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="font-bold text-amber-900">Unpushed Work</div>
              <p className="text-[10px] text-amber-700 mt-0.5">Carrying heavy commit backpack</p>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
              <div className="font-bold text-rose-900">Merge Conflict</div>
              <p className="text-[10px] text-rose-700 mt-0.5">Tangled in red conflict yarn</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-300">
              <div className="font-bold text-slate-900">Detached HEAD</div>
              <p className="text-[10px] text-slate-600 mt-0.5">Looking lost with wandering compass</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '4. The Human-Approved Action Gate',
      subtitle: 'Bounded, Reversible Write Operations Only',
      tag: 'Safety Guardrail',
      content: (
        <div className="space-y-4 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            GitPet never performs autonomous writes. Every suggested command passes through an explicit approval card featuring:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800">1. Evidence Citation</span>
              <span className="text-[11px] text-slate-500">Cites exact behind commit count & modified files</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800">2. Diff Preview Modal</span>
              <span className="text-[11px] text-slate-500">Inspect line-by-line additions & deletions before approval</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800">3. Reversible Rollback Step</span>
              <span className="text-[11px] font-mono text-amber-800">git stash pop / git reset --keep</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '5. Practice Mechanics & Target Metrics',
      subtitle: 'Rewarding Review Rigor & Clean Repository Handoffs',
      tag: 'Habit Formation',
      content: (
        <div className="space-y-4 text-left">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-amber-950 block">Clean Review Streak</span>
              <p className="text-[10px] text-amber-800 mt-1">
                Increments every time a proposed diff is verified before pushing.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="text-xs font-bold text-emerald-950 block">Branch Stewardship</span>
              <p className="text-[10px] text-emerald-800 mt-1">
                Awards safe merging and archiving of completed branches.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <GitBranch className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-xs font-bold text-blue-950 block">Verified Sync Master</span>
              <p className="text-[10px] text-blue-800 mt-1">
                Zero unhandled upstream conflicts across development sprints.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <Presentation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">GitPet Pitch Deck & Demo Guide</h3>
                <p className="text-xs text-slate-400">Hackathon Pitch Slides & 90-Second Walkthrough</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive 90-Second Demo Bar */}
          <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800">90-Sec Demo:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => onRunDemoStep(1)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  demoStep === 1
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                1. Clean State
              </button>
              <button
                onClick={() => onRunDemoStep(2)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  demoStep === 2
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                2. Trigger Anomaly
              </button>
              <button
                onClick={() => onRunDemoStep(3)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  demoStep === 3
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                3. Ask Guidance
              </button>
              <button
                onClick={() => onRunDemoStep(4)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  demoStep === 4
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                4. Confirm & Tidy
              </button>
            </div>
          </div>

          {/* Slide Body */}
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                  {current.tag}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Slide {currentSlide + 1} of {slides.length}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">{current.title}</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5">{current.subtitle}</p>

              {current.content}
            </div>

            {/* Slide Navigation footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      i === currentSlide ? 'bg-slate-900 w-5' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlide === slides.length - 1}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
