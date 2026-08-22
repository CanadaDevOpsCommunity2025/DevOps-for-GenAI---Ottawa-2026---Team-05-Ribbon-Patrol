import React from 'react';
import {
  Play,
  Sparkles,
  Plus,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Layers,
  Sliders,
  Github,
  Loader2,
} from 'lucide-react';
import { ScenarioPreset, RepositoryState, LiveScanState } from '../types';
import { Activity } from 'lucide-react';
import { LIVE_REPO, LIVE_REPO_BRANCHES } from '../data/liveRepoConfig';

interface ScenarioSwitcherProps {
  scenarios: ScenarioPreset[];
  activeScenarioId: string;
  onSelectScenario: (scenario: ScenarioPreset) => void;
  onInjectRemoteCommit: () => void;
  onInjectLocalEdit: () => void;
  onInjectConflict: () => void;
  onInjectUnsafeRisk: () => void;
  onResetToClean: () => void;
  isLiveMode?: boolean;
  onToggleLiveMode?: () => void;
  onRefreshLive?: () => void;
  liveScanState?: LiveScanState;
  activeLiveBranch: string | null;
  isLiveLoading: boolean;
  onSelectLiveBranch: (branch: string) => void;
}

export const ScenarioSwitcher: React.FC<ScenarioSwitcherProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onInjectRemoteCommit,
  onInjectLocalEdit,
  onInjectConflict,
  onInjectUnsafeRisk,
  onResetToClean,
  isLiveMode = false,
  onToggleLiveMode,
  onRefreshLive,
  liveScanState,
  activeLiveBranch,
  isLiveLoading,
  onSelectLiveBranch,
}) => {
  return (
    <div
      id="scenario-switcher-bar"
      className="w-full bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-2.5 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Mode & Preset Scenarios Segmented Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 px-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Mode:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            {/* Live Workspace Mode Toggle */}
            <button
              id="live-workspace-mode-btn"
              onClick={onToggleLiveMode}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                isLiveMode
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isLiveMode ? 'animate-pulse text-white' : 'text-emerald-600'}`} />
              <span>Live Workspace</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  isLiveMode ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Local Git
              </span>
            </button>

            <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />

            {/* Sandbox Presets */}
            {scenarios.map((sc) => {
              const isActive = !isLiveMode && sc.id === activeScenarioId;
              const isUnsafePreset = sc.id.includes('unsafe') || sc.badge.includes('Unsafe');

              return (
                <button
                  key={sc.id}
                  onClick={() => onSelectScenario(sc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? isUnsafePreset
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                      : isUnsafePreset
                      ? 'text-rose-700 hover:bg-rose-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span>{sc.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? isUnsafePreset
                          ? 'bg-rose-800 text-white'
                          : 'bg-slate-100 text-slate-700'
                        : isUnsafePreset
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {sc.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Anomaly Sandbox Simulator Tools OR Live Refresh Action */}
        {isLiveMode ? (
          <div className="flex items-center gap-2 shrink-0 flex-wrap pt-1.5 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <span className="text-[11px] font-medium text-slate-500">
              Inspecting active local repository (read-only)
            </span>
            <button
              id="refresh-live-git-btn"
              onClick={onRefreshLive}
              disabled={liveScanState?.loading}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${liveScanState?.loading ? 'animate-spin' : ''}`} />
              <span>{liveScanState?.loading ? 'Scanning...' : 'Scan Live Repo'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap pt-1.5 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Simulate:
            </span>

          <button
            onClick={onInjectRemoteCommit}
            title="Add +1 remote commit on origin"
            className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-amber-500" />
            <span>+1 Remote</span>
          </button>

          <button
            onClick={onInjectLocalEdit}
            title="Create an uncommitted file in working tree"
            className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-blue-500" />
            <span>+1 Local Edit</span>
          </button>

          <button
            onClick={onInjectConflict}
            title="Trigger merge conflict markers in payment service"
            className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 border border-slate-200/80 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Conflict</span>
          </button>

          <button
            id="inject-unsafe-hazard-btn"
            onClick={onInjectUnsafeRisk}
            title="Simulate upstream force-push divergence with uncommitted local work (0% Unsafe State)"
            className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Hazard (0%)</span>
          </button>

            <button
              onClick={onResetToClean}
              title="Reset repository to 100% clean & synchronized"
              className="px-2 py-1 text-xs font-medium rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-emerald-600" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Repo: real GitHub data from the public test fixture */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0">
          <Github className="w-3.5 h-3.5 text-slate-800" />
          <span>Live Repo:</span>
        </div>

        <select
          value={activeLiveBranch || ''}
          onChange={(e) => e.target.value && onSelectLiveBranch(e.target.value)}
          disabled={isLiveLoading}
          className={`text-xs font-semibold rounded-lg border px-2 py-1.5 bg-white ${
            activeLiveBranch
              ? 'border-blue-300 text-blue-800'
              : 'border-slate-200 text-slate-600'
          }`}
        >
          <option value="" disabled>
            Select a branch…
          </option>
          {LIVE_REPO_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {isLiveLoading && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}

        <a
          href={`https://github.com/${LIVE_REPO.owner}/${LIVE_REPO.repo}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-slate-400 hover:text-blue-600 underline decoration-dotted ml-1"
        >
          {LIVE_REPO.owner}/{LIVE_REPO.repo}
        </a>
      </div>
    </div>
  );
};
