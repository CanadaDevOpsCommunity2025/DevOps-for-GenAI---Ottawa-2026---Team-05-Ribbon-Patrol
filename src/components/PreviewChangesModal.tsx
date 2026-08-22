import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GitCommit,
  FileText,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  FileCode,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { RecommendedAction, RepositoryState, FileChange } from '../types';
import { DiffViewer } from './DiffViewer';

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
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    state.workingTree.length > 0 ? state.workingTree[0].path : null
  );
  const [viewMode, setViewMode] = useState<'tabs' | 'all'>('tabs');

  if (!isOpen) return null;

  const currentFile =
    state.workingTree.find((f) => f.path === selectedFilePath) ||
    state.workingTree[0] ||
    null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-changes-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 id="preview-changes-title" className="text-sm font-bold text-slate-900">
                  Pre-Action Impact & Diff Preview
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect syntax-colored bounded changes before giving human approval
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close preview modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-left flex-1">
            {/* Destructive Hazard Warning Banner (If Unsafe 0% Health) */}
            {(state.healthLevel === 'Unsafe' ||
              action.riskLevel === 'Hazard' ||
              state.destructiveRiskWarning) && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0 animate-pulse" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                      Destructive Work-Loss Warning
                    </h4>
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[10px] font-bold">
                      UNSAFE 0%
                    </span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed font-medium">
                    {state.destructiveRiskWarning ||
                      'Immediate work-loss risk: In-flight local modifications will be permanently destroyed if an automatic pull, merge, or hard reset is executed without safety isolation.'}
                  </p>
                  <p className="text-[11px] text-rose-800">
                    <strong>Recovery Guarantee:</strong> This action first snapshots your active files into a protected stash before performing any upstream reconciliation.
                  </p>
                </div>
              </div>
            )}

            {/* Action Summary Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                state.healthLevel === 'Unsafe'
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  state.healthLevel === 'Unsafe' ? 'text-amber-700' : 'text-slate-800'
                }`}
              />
              <div className="min-w-0 flex-1">
                <h4
                  className={`text-xs font-bold ${
                    state.healthLevel === 'Unsafe' ? 'text-amber-950' : 'text-slate-900'
                  }`}
                >
                  {action.title}
                </h4>
                <p
                  className={`text-xs mt-0.5 ${
                    state.healthLevel === 'Unsafe' ? 'text-amber-900/90' : 'text-slate-600'
                  }`}
                >
                  {action.summary}
                </p>
                <div className="mt-2 font-mono text-[11px] bg-white text-slate-900 px-2.5 py-1 rounded border border-slate-200 inline-block select-all max-w-full overflow-x-auto">
                  {action.command}
                </div>
              </div>
            </div>

            {/* Branch Movement Visualizer */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
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

            {/* 🔍 Syntax-Colored Affected Files & Diffs */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Affected Files & Syntax-Colored Diffs ({state.workingTree.length})
                  </span>
                </h4>
                {state.workingTree.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold text-slate-600">
                    <button
                      onClick={() => setViewMode('tabs')}
                      className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'tabs' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                      }`}
                    >
                      Tabbed View
                    </button>
                    <button
                      onClick={() => setViewMode('all')}
                      className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        viewMode === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                      }`}
                    >
                      All Files Stack
                    </button>
                  </div>
                )}
              </div>

              {state.workingTree.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>No uncommitted working tree file diffs for this metadata/branch operation.</span>
                </div>
              ) : viewMode === 'tabs' && state.workingTree.length > 1 ? (
                <div className="space-y-3">
                  {/* File Selector Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {state.workingTree.map((file) => {
                      const isSelected = file.path === (currentFile?.path || selectedFilePath);
                      const isConflicted = file.status === 'conflicted';

                      return (
                        <button
                          key={file.path}
                          onClick={() => setSelectedFilePath(file.path)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                              : isConflicted
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5 opacity-80" />
                          <span className="font-mono text-[11px]">{file.path.split('/').pop()}</span>
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            {file.additions > 0 && (
                              <span className={isSelected ? 'text-emerald-300 font-bold' : 'text-emerald-600 font-bold'}>
                                +{file.additions}
                              </span>
                            )}
                            {file.deletions > 0 && (
                              <span className={isSelected ? 'text-rose-300 font-bold' : 'text-rose-600 font-bold'}>
                                -{file.deletions}
                              </span>
                            )}
                            {isConflicted && (
                              <span className="px-1 py-0.2 bg-rose-600 text-white rounded text-[9px] font-bold">
                                !
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active File Diff Viewer */}
                  {currentFile && (
                    <DiffViewer
                      diff={currentFile.diffSnippet}
                      filePath={currentFile.path}
                      fileStatus={currentFile.status}
                      additions={currentFile.additions}
                      deletions={currentFile.deletions}
                      showFileHeader={true}
                      maxInitialLines={40}
                    />
                  )}
                </div>
              ) : (
                /* Stack of all files */
                <div className="space-y-3">
                  {state.workingTree.map((file) => (
                    <DiffViewer
                      key={file.path}
                      diff={file.diffSnippet}
                      filePath={file.path}
                      fileStatus={file.status}
                      additions={file.additions}
                      deletions={file.deletions}
                      showFileHeader={true}
                      maxInitialLines={35}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Step-by-Step Sequence */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Atomic Execution Plan
              </h4>
              <div className="space-y-2">
                {action.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
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
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-preview-action-button"
              onClick={() => {
                onClose();
                onConfirmAction();
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                state.healthLevel === 'Unsafe'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/10'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {state.healthLevel === 'Unsafe'
                  ? 'Confirm Safe Work Preservation'
                  : 'Confirm & Tidy Repository'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
