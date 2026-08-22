import React, { useState } from 'react';
import {
  GitBranch,
  GitPullRequest,
  Flame,
  ShieldCheck,
  FolderGit2,
  ChevronDown,
  Layers,
  Presentation,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Wand2,
  Mic,
} from 'lucide-react';
import { RepositoryState, PracticeStats } from '../types';

interface TopBarProps {
  state: RepositoryState;
  practiceStats: PracticeStats;
  onSelectBranch: (branch: string) => void;
  onToggleDrawer: () => void;
  onOpenPitchDeck: () => void;
  onOpenImageStudio: () => void;
  onOpenVoiceModal: () => void;
  isDrawerOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  practiceStats,
  onSelectBranch,
  onToggleDrawer,
  onOpenPitchDeck,
  onOpenImageStudio,
  onOpenVoiceModal,
  isDrawerOpen,
}) => {
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);

  const isHealthy = state.healthLevel === 'Healthy';
  const isAttention = state.healthLevel === 'Attention';
  const isBlocked = state.healthLevel === 'Blocked';

  return (
    <header
      id="gitpet-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand + Repo + Branch Selector */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Logo & Pet Avatar */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100">
              <span className="text-base">🐕</span>
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  isHealthy ? 'bg-emerald-500' : isAttention ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-sm">GitPet</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Ambient
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono hidden md:block">
                {state.repoName}
              </p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Current Branch Dropdown */}
          <div className="relative">
            <button
              id="branch-selector-button"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[140px] truncate">{state.currentBranch.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showBranchMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Branch
                </div>
                {state.allBranches.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      onSelectBranch(b);
                      setShowBranchMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      b === state.currentBranch.name ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-3 h-3 text-slate-400" />
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
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200/80"
          >
            <span className={state.currentBranch.aheadCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}>
              ↑{state.currentBranch.aheadCount}
            </span>
            <span className="text-slate-300">/</span>
            <span className={state.currentBranch.behindCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
              ↓{state.currentBranch.behindCount}
            </span>
          </div>
        </div>

        {/* Right: Practice Streak + Badges + Pitch Deck & Drawer Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Clean Review Streak Button / Popover */}
          <div className="relative">
            <button
              id="streak-badge-button"
              onClick={() => setShowBadgeMenu(!showBadgeMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100/80 text-orange-800 border border-orange-200 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{practiceStats.cleanCommitStreak} Clean Reviews</span>
            </button>

            {showBadgeMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-orange-500" /> Repository Stewardship
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Safe Git Habits</span>
                </div>
                <div className="space-y-2">
                  {practiceStats.badges.map((b) => (
                    <div
                      key={b.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start gap-2.5 text-left"
                    >
                      <div className="p-1.5 bg-white rounded-md border border-slate-200 text-blue-600 shadow-xs">
                        {b.id === 'clean_streak' && <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />}
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

          {/* Avatar Studio Trigger */}
          <button
            id="open-image-studio-button"
            onClick={onOpenImageStudio}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            title="Design & Edit Custom Mascot Skins (gemini-3.1-flash-image)"
          >
            <Wand2 className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden lg:inline">Avatar Studio</span>
          </button>

          {/* Live Voice Trigger */}
          <button
            id="open-live-voice-button"
            onClick={onOpenVoiceModal}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
            title="Real-time Live Voice (gemini-3.1-flash-live-preview)"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden lg:inline">Live Voice</span>
          </button>

          {/* 90-sec Demo / Pitch Deck Trigger */}
          <button
            id="open-pitch-deck-button"
            onClick={onOpenPitchDeck}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Pitch Deck</span>
          </button>

          {/* Repository Drawer Toggle */}
          <button
            id="toggle-repo-drawer-button"
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              isDrawerOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Repo Details</span>
            {state.workingTree.length > 0 && (
              <span
                className={`text-[10px] px-1 rounded-full font-bold ${
                  isDrawerOpen ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
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
