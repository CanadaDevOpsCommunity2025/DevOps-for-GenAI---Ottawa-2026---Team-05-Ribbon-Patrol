import React, { useState } from 'react';
import {
  GitBranch,
  Flame,
  ShieldCheck,
  ChevronDown,
  Layers,
  CheckCircle2,
  Award,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  GitPullRequest,
} from 'lucide-react';
import { RepositoryState, PracticeStats, LiveScanState } from '../types';

interface TopBarProps {
  state: RepositoryState;
  practiceStats: PracticeStats;
  onSelectBranch: (branch: string) => void;
  onToggleDrawer: () => void;
  onOpenQuickPalette?: () => void;
  onStartDemo?: () => void;
  isDemoActive?: boolean;
  isDrawerOpen: boolean;
  isLiveMode?: boolean;
  liveScanState?: LiveScanState;
  onRefreshLive?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  practiceStats,
  onSelectBranch,
  onToggleDrawer,
  onOpenQuickPalette,
  onStartDemo,
  isDemoActive = false,
  isDrawerOpen,
  isLiveMode = false,
  liveScanState,
  onRefreshLive,
  isAudioMuted = false,
  onToggleAudio,
}) => {
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);

  const isHealthy = state.healthLevel === 'Healthy';
  const isAttention = state.healthLevel === 'Attention';
  const isBlocked = state.healthLevel === 'Blocked';
  const isUnsafe = state.healthLevel === 'Unsafe';

  return (
    <header
      id="gitpet-header"
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Section: Brand Logo + Repo & Branch Selector + Status */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base shadow-xs ring-1 ring-slate-800/10">
              <span>🐕</span>
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  isHealthy
                    ? 'bg-emerald-500'
                    : isAttention
                    ? 'bg-amber-500'
                    : isBlocked
                    ? 'bg-rose-500'
                    : 'bg-rose-600 ring-2 ring-rose-300 animate-ping'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">GitPet</span>
                {isLiveMode ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      id="live-mode-badge"
                      className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80 flex items-center gap-1 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Workspace
                    </span>
                    {onRefreshLive && (
                      <button
                        id="refresh-live-btn"
                        onClick={onRefreshLive}
                        disabled={liveScanState?.loading}
                        title="Scan active local repository status"
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 text-[10px] font-semibold px-1.5"
                      >
                        <RefreshCw
                          className={`w-2.5 h-2.5 ${liveScanState?.loading ? 'animate-spin text-emerald-600' : ''}`}
                        />
                        <span className="hidden sm:inline">
                          {liveScanState?.loading ? 'Scanning...' : 'Scan Now'}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${
                      isUnsafe
                        ? 'bg-rose-100 text-rose-800 font-extrabold animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isUnsafe ? 'Hazard Alert' : 'Sandbox Preset'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-slate-400 font-mono hidden md:block leading-tight">
                  {state.repoName}
                </p>
                {isLiveMode && liveScanState?.lastRefreshed && (
                  <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">
                    • {liveScanState.lastRefreshed}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Current Branch Dropdown */}
          <div className="relative">
            <button
              id="branch-selector-button"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100/70 hover:bg-slate-200/70 text-slate-700 border border-slate-200/60 transition-colors cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-slate-500" />
              <span className="max-w-[130px] truncate font-mono text-[11px]">{state.currentBranch.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showBranchMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Active Branch
                </div>
                {state.allBranches.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      onSelectBranch(b);
                      setShowBranchMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      b === state.currentBranch.name ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-mono text-[11px]">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                      {b}
                    </span>
                    {b === state.currentBranch.name && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ahead/Behind Sync Pill */}
          <div
            id="sync-status-pill"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono border ${
              isUnsafe
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-white text-slate-600 border-slate-200/80 shadow-2xs'
            }`}
          >
            <span className={state.currentBranch.aheadCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}>
              ↑{state.currentBranch.aheadCount}
            </span>
            <span className="text-slate-300">/</span>
            <span className={state.currentBranch.behindCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
              ↓{state.currentBranch.behindCount}
            </span>
            {isUnsafe && (
              <span className="text-[9px] font-bold text-rose-700 bg-rose-200/80 px-1 py-0.2 rounded ml-0.5">
                0%
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Streak Popover + Consolidated Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Clean Review Streak Button / Popover */}
          <div className="relative">
            <button
              id="streak-badge-button"
              onClick={() => setShowBadgeMenu(!showBadgeMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">{practiceStats.cleanCommitStreak} Clean Reviews</span>
              <span className="sm:hidden">{practiceStats.cleanCommitStreak}</span>
            </button>

            {showBadgeMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Repository Stewardship
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Safe Git Habits</span>
                </div>
                <div className="space-y-2">
                  {practiceStats.badges.map((b) => (
                    <div
                      key={b.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start gap-2.5 text-left"
                    >
                      <div className="p-1.5 bg-white rounded-md border border-slate-200 text-blue-600 shadow-2xs">
                        {b.id === 'clean_streak' && <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        {b.id === 'branch_steward' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        {b.id === 'verified_sync' && <GitPullRequest className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">{b.name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            {b.progress >= 100 ? 'Unlocked' : `${b.progress}%`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Verified syncs: {practiceStats.verifiedSyncs}</span>
                  <span>Steward score: {practiceStats.stewardshipScore}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Palette Launcher Button */}
          {onOpenQuickPalette && (
            <button
              id="topbar-quick-palette-btn"
              onClick={onOpenQuickPalette}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Open Quick Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden xl:inline">Palette</span>
              <kbd className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-slate-300 text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* 90-Second Guided Demo Quick Launch */}
          {onStartDemo && (
            <button
              id="topbar-launch-demo-btn"
              onClick={onStartDemo}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shadow-2xs cursor-pointer ${
                isDemoActive
                  ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
              }`}
              title="Launch 90-Second Guided Demo"
            >
              <span>🚀</span>
              <span className="font-bold">90s Demo</span>
            </button>
          )}

          {/* Audio Sound Toggle */}
          {onToggleAudio && (
            <button
              id="topbar-audio-toggle-btn"
              onClick={onToggleAudio}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isAudioMuted
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 ring-1 ring-emerald-300/60'
              }`}
              title={isAudioMuted ? 'Unmute Sound Effects (Web Audio)' : 'Mute Sound Effects'}
            >
              {isAudioMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Repository Drawer Toggle */}
          <button
            id="toggle-repo-drawer-button"
            onClick={onToggleDrawer}
            title="Toggle Repository Details Drawer (Cmd+B / Ctrl+B)"
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              isDrawerOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Repo Details</span>
            <kbd
              className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                isDrawerOpen ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              ⌘B
            </kbd>
            {state.workingTree.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isDrawerOpen ? 'bg-slate-700 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {state.workingTree.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
