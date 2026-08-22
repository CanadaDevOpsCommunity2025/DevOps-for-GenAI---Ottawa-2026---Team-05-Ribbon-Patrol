import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GitBranch,
  GitCommit,
  FileCode,
  Archive,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowDown,
  ArrowUp,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { RepositoryState, FileChange } from '../types';

interface RepositoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: RepositoryState;
  onSelectFile?: (file: FileChange) => void;
  auditHistory: {
    id: string;
    command: string;
    timestamp: string;
    description: string;
  }[];
  onRollbackLastAction?: () => void;
}

export const RepositoryDrawer: React.FC<RepositoryDrawerProps> = ({
  isOpen,
  onClose,
  state,
  auditHistory,
  onRollbackLastAction,
}) => {
  const [activeTab, setActiveTab] = useState<'working_tree' | 'divergence' | 'stashes' | 'audit'>(
    'working_tree'
  );
  const [expandedFile, setExpandedFile] = useState<string | null>(
    state.workingTree.length > 0 ? state.workingTree[0].path : null
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="absolute inset-y-0 right-0 max-w-full flex pl-10"
        >
          <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Repository Details & Graph</h3>
                  <p className="text-xs text-slate-500 font-mono">{state.repoName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('working_tree')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'working_tree'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Working Tree</span>
                {state.workingTree.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                    {state.workingTree.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('divergence')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'divergence'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Divergence Graph</span>
              </button>

              <button
                onClick={() => setActiveTab('stashes')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'stashes'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Stashes</span>
                {state.stashes.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                    {state.stashes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'audit'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Log</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-left">
              {/* TAB 1: WORKING TREE */}
              {activeTab === 'working_tree' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Uncommitted changes ({state.workingTree.length} files)</span>
                    <span className="font-mono text-[11px]">HEAD: {state.currentBranch.lastCommitHash}</span>
                  </div>

                  {state.workingTree.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800">Working tree clean</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        No untracked or modified files present in workspace.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {state.workingTree.map((file) => (
                        <div
                          key={file.path}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                        >
                          <button
                            onClick={() =>
                              setExpandedFile(expandedFile === file.path ? null : file.path)
                            }
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2 font-mono text-slate-800">
                              {expandedFile === file.path ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="font-semibold">{file.path}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  file.status === 'conflicted'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {file.status}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600">
                                +{file.additions}
                              </span>
                              <span className="text-[10px] font-semibold text-rose-600">
                                -{file.deletions}
                              </span>
                            </div>
                          </button>

                          {expandedFile === file.path && (
                            <div className="p-3 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed border-t border-slate-200">
                              {file.diffSnippet}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DIVERGENCE GRAPH */}
              {activeTab === 'divergence' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800">Branch Tracking Topology</span>
                      <span className="text-[10px] font-mono text-blue-600">
                        {state.currentBranch.name} ↔ {state.currentBranch.upstream || 'no-upstream'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-white border border-slate-200/80 flex items-center gap-2">
                        <ArrowUp className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-bold text-slate-800">
                            {state.currentBranch.aheadCount} Ahead
                          </span>
                          <p className="text-[10px] text-slate-500">Unpushed local commits</p>
                        </div>
                      </div>
                      <div className="p-2 rounded bg-white border border-slate-200/80 flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="font-bold text-slate-800">
                            {state.currentBranch.behindCount} Behind
                          </span>
                          <p className="text-[10px] text-slate-500">Remote commits on origin</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remote Commits Behind */}
                  {state.remoteCommitsBehind.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        <span>Incoming Remote Commits ({state.remoteCommitsBehind.length})</span>
                      </h4>
                      <div className="space-y-2 border-l-2 border-amber-300 ml-2 pl-3">
                        {state.remoteCommitsBehind.map((c) => (
                          <div key={c.hash} className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/70 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-amber-900">{c.shortHash}</span>
                              <span className="text-[10px] text-slate-500">{c.timestamp}</span>
                            </div>
                            <p className="font-semibold text-slate-800 mt-0.5">{c.message}</p>
                            <span className="text-[10px] text-slate-500">{c.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Local Commits Ahead */}
                  {state.localCommitsAhead.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                        <span>Local Commits Ahead ({state.localCommitsAhead.length})</span>
                      </h4>
                      <div className="space-y-2 border-l-2 border-blue-300 ml-2 pl-3">
                        {state.localCommitsAhead.map((c) => (
                          <div key={c.hash} className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/70 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-blue-900">{c.shortHash}</span>
                              <span className="text-[10px] text-slate-500">{c.timestamp}</span>
                            </div>
                            <p className="font-semibold text-slate-800 mt-0.5">{c.message}</p>
                            <span className="text-[10px] text-slate-500">{c.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STASHES */}
              {activeTab === 'stashes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Local Stash Stack ({state.stashes.length} items)</span>
                  </div>

                  {state.stashes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800">No stashed changes</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Git stashes are created automatically during safe pull actions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {state.stashes.map((s) => (
                        <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-blue-600">stash@&#123;{s.index}&#125;</span>
                            <span className="text-[10px] text-slate-400">{s.timestamp}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{s.message}</p>
                          <div className="text-[11px] text-slate-500">
                            Preserves {s.fileCount} file(s): {s.files.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT LOG */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Safe Actions Executed ({auditHistory.length})</span>
                    {auditHistory.length > 0 && onRollbackLastAction && (
                      <button
                        onClick={onRollbackLastAction}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                      >
                        <RotateCcw className="w-3 h-3" /> Rollback Last Action
                      </button>
                    )}
                  </div>

                  {auditHistory.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800">No actions executed yet</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Approved safe Git commands will be audited here with instant rollback.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Approved & Executed
                            </span>
                            <span>{item.timestamp}</span>
                          </div>
                          <div className="font-semibold text-slate-800">{item.description}</div>
                          <div className="font-mono text-[10px] bg-slate-900 text-slate-200 p-1.5 rounded overflow-x-auto">
                            {item.command}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
