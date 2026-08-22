import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GitCommit, FileText, CheckCircle2, ShieldCheck, ArrowRight, CornerDownRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { RecommendedAction, RepositoryState } from '../types';

interface PreviewChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: RecommendedAction;
  state: RepositoryState;
  onConfirmAction: () => void;
}

export const PreviewChangesModal: React.FC<PreviewChangesModalProps> = ({
  isOpen,
  onClose,
  action,
  state,
  onConfirmAction,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pre-Action Impact & Diff Preview</h3>
                <p className="text-xs text-slate-500">Inspect bounded changes before giving human approval</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-left">
            {/* Action Summary Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-blue-950">{action.title}</h4>
                <p className="text-xs text-blue-800/90 mt-0.5">{action.summary}</p>
                <div className="mt-2 font-mono text-[11px] bg-white text-blue-900 px-2.5 py-1 rounded border border-blue-200 inline-block select-all">
                  {action.command}
                </div>
              </div>
            </div>

            {/* Branch Movement Visualizer */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                <span>Branch Pointer Trajectory</span>
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Current HEAD</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {state.currentBranch.lastCommitHash} ({state.currentBranch.name})
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Target Synchronized HEAD</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {state.remoteCommitsBehind.length > 0
                        ? state.remoteCommitsBehind[0].shortHash
                        : state.currentBranch.lastCommitHash}{' '}
                      (Clean & In-Sync)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Affected Files & Diffs */}
            {state.workingTree.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Affected Files in Working Tree ({state.workingTree.length})</span>
                </h4>
                <div className="space-y-2.5">
                  {state.workingTree.map((file) => (
                    <div key={file.path} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-100/70 border-b border-slate-200 text-xs">
                        <span className="font-mono font-medium text-slate-800">{file.path}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            +{file.additions}
                          </span>
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            -{file.deletions}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed">
                        {file.diffSnippet}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-Step Sequence */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Atomic Execution Plan
              </h4>
              <div className="space-y-2">
                {action.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{step.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{step.details}</div>
                      <div className="mt-1 font-mono text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {step.command}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reversible Guarantee */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-amber-900">Reversal Guarantee</h5>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  If needed, this operation can be completely rolled back using:
                </p>
                <div className="mt-1 font-mono text-[11px] bg-white text-amber-950 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold">
                  {action.reversalStep}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-preview-action-button"
              onClick={() => {
                onClose();
                onConfirmAction();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Tidy Repository</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
