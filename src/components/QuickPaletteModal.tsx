import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Play,
  RotateCcw,
  Layers,
  Sparkles,
  Mic,
  Presentation,
  Volume2,
  VolumeX,
  Heart,
  GitBranch,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { ScenarioPreset } from '../types';

export interface PaletteAction {
  id: string;
  title: string;
  description: string;
  category: 'Scenarios' | 'Guided Demo' | 'Repository & Safety' | 'Live Workspace' | 'Companion & Studios' | 'Audio & Petting';
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
  keywords?: string[];
  onSelect: () => void;
}

interface QuickPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: ScenarioPreset[];
  onSelectScenario: (scenario: ScenarioPreset) => void;
  onStartDemo: () => void;
  onRestartDemo: () => void;
  onNextDemoStep: () => void;
  isDemoActive: boolean;
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  onOpenPreviewAction?: () => void;
  hasPendingAction?: boolean;
  onRollbackLastAction?: () => void;
  hasAuditHistory?: boolean;
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
  onRefreshLive?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenImageStudio?: () => void;
  onOpenPitchDeck?: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onPetByte: () => void;
}

export const QuickPaletteModal: React.FC<QuickPaletteModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  onSelectScenario,
  onStartDemo,
  onRestartDemo,
  onNextDemoStep,
  isDemoActive,
  onToggleDrawer,
  isDrawerOpen,
  onOpenPreviewAction,
  hasPendingAction,
  onRollbackLastAction,
  hasAuditHistory,
  isLiveMode,
  onToggleLiveMode,
  onRefreshLive,
  onOpenVoiceModal,
  onOpenImageStudio,
  onOpenPitchDeck,
  isAudioMuted,
  onToggleAudio,
  onPetByte,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input automatically whenever palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build the unified list of quick palette actions
  const allActions = useMemo(() => {
    const actions: PaletteAction[] = [];

    // 1. Guided Demo Actions
    if (!isDemoActive) {
      actions.push({
        id: 'start_demo',
        title: 'Start 90-Second Guided Demo',
        description: 'Run the complete deterministic developer story from clean state to resolution',
        category: 'Guided Demo',
        icon: Play,
        badge: '90s Story',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        keywords: ['demo', 'start', 'presentation', 'run', 'story', 'guided'],
        onSelect: onStartDemo,
      });
    } else {
      actions.push({
        id: 'next_demo_step',
        title: 'Advance Demo to Next Step',
        description: 'Move forward in the guided demo sequence',
        category: 'Guided Demo',
        icon: ArrowRight,
        keywords: ['next', 'advance', 'step', 'continue'],
        onSelect: onNextDemoStep,
      });
      actions.push({
        id: 'restart_demo',
        title: 'Restart 90-Second Demo',
        description: 'Reset to step 1 (clean repository state)',
        category: 'Guided Demo',
        icon: RotateCcw,
        keywords: ['restart', 'reset', 'again', 'redo'],
        onSelect: onRestartDemo,
      });
    }

    // 2. Repository & Safety Actions
    actions.push({
      id: 'toggle_drawer',
      title: isDrawerOpen ? 'Close Repository Drawer' : 'Open Repository Drawer (DAG & Tree)',
      description: 'Inspect full commit history, DAG topology, active diffs, and stashes',
      category: 'Repository & Safety',
      icon: Layers,
      shortcut: '⌘B',
      keywords: ['drawer', 'graph', 'dag', 'tree', 'commits', 'stashes', 'diff'],
      onSelect: onToggleDrawer,
    });

    if (hasPendingAction && onOpenPreviewAction) {
      actions.push({
        id: 'preview_action',
        title: 'Preview Pending Recommended Action',
        description: 'Inspect file diffs and command details before confirming',
        category: 'Repository & Safety',
        icon: Sparkles,
        badge: 'Action Pending',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        keywords: ['preview', 'diff', 'action', 'confirm', 'recommended'],
        onSelect: onOpenPreviewAction,
      });
    }

    if (hasAuditHistory && onRollbackLastAction) {
      actions.push({
        id: 'rollback_last',
        title: 'Rollback Last Executed Action',
        description: 'Revert working tree and references to prior state',
        category: 'Repository & Safety',
        icon: RotateCcw,
        badge: 'Undo',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        keywords: ['rollback', 'undo', 'revert', 'history'],
        onSelect: onRollbackLastAction,
      });
    }

    // 3. Live Workspace Scanner Actions
    actions.push({
      id: 'toggle_live_mode',
      title: isLiveMode ? 'Switch to Sandbox Presets' : 'Switch to Live Workspace Scanner',
      description: isLiveMode
        ? 'Return to simulated repository anomalies for safe testing'
        : 'Connect directly to your local Git work tree for real-time inspection',
      category: 'Live Workspace',
      icon: isLiveMode ? Layers : Radio,
      badge: isLiveMode ? 'Sandbox' : 'Live Git',
      badgeColor: isLiveMode
        ? 'bg-slate-100 text-slate-700 border-slate-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      keywords: ['live', 'workspace', 'local', 'scanner', 'sandbox', 'real'],
      onSelect: onToggleLiveMode,
    });

    if (isLiveMode && onRefreshLive) {
      actions.push({
        id: 'refresh_live_status',
        title: 'Scan Live Workspace Now',
        description: 'Re-run local Git status, branch, ahead/behind, and dirty file inspection',
        category: 'Live Workspace',
        icon: RefreshCw,
        keywords: ['scan', 'refresh', 'status', 'live', 'git'],
        onSelect: onRefreshLive,
      });
    }

    // 4. Scenarios
    scenarios.forEach((sc) => {
      let icon = GitBranch;
      if (sc.state.healthLevel === 'Unsafe') icon = ShieldAlert;
      else if (sc.state.healthLevel === 'Blocked') icon = AlertTriangle;
      else if (sc.state.healthLevel === 'Healthy') icon = CheckCircle2;

      actions.push({
        id: `scenario_${sc.id}`,
        title: `Load Scenario: ${sc.title}`,
        description: sc.description,
        category: 'Scenarios',
        icon,
        badge: sc.state.healthLevel,
        badgeColor:
          sc.state.healthLevel === 'Healthy'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : sc.state.healthLevel === 'Attention'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : sc.state.healthLevel === 'Blocked'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-rose-100 text-rose-800 border-rose-300',
        keywords: ['scenario', sc.title.toLowerCase(), sc.state.primarySymptom, sc.id],
        onSelect: () => onSelectScenario(sc),
      });
    });

    // 5. Companion & Studios
    if (onOpenVoiceModal) {
      actions.push({
        id: 'studio_voice',
        title: 'Talk to Byte (Live Voice Preview)',
        description: 'Open real-time conversational voice assistant with audio streaming',
        category: 'Companion & Studios',
        icon: Mic,
        badge: 'Live Voice',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        keywords: ['voice', 'speech', 'audio', 'talk', 'mic', 'gemini live'],
        onSelect: onOpenVoiceModal,
      });
    }

    if (onOpenImageStudio) {
      actions.push({
        id: 'studio_avatar',
        title: 'Custom Mascot Avatar Studio',
        description: 'Generate and edit custom mascot skins with Gemini Imagen',
        category: 'Companion & Studios',
        icon: Sparkles,
        keywords: ['avatar', 'image', 'skin', 'mascot', 'studio', 'imagen'],
        onSelect: onOpenImageStudio,
      });
    }

    if (onOpenPitchDeck) {
      actions.push({
        id: 'modal_pitch',
        title: 'Pitch Deck & Architecture Rehearsal',
        description: 'View the 5-slide project overview and delivery roadmap',
        category: 'Companion & Studios',
        icon: Presentation,
        keywords: ['pitch', 'deck', 'slides', 'roadmap', 'presentation'],
        onSelect: onOpenPitchDeck,
      });
    }

    // 6. Audio & Petting
    actions.push({
      id: 'audio_toggle',
      title: isAudioMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects',
      description: isAudioMuted
        ? 'Enable Web Audio synthesized companion sound effects'
        : 'Mute all companion chimes and alerts for quiet environments',
      category: 'Audio & Petting',
      icon: isAudioMuted ? VolumeX : Volume2,
      badge: isAudioMuted ? 'Muted' : 'Sound On',
      badgeColor: isAudioMuted ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      keywords: ['sound', 'audio', 'mute', 'unmute', 'volume', 'chime'],
      onSelect: onToggleAudio,
    });

    actions.push({
      id: 'pet_mascot',
      title: 'Pet Byte Mascot',
      description: 'Give Byte some love and trigger ambient reaction hearts',
      category: 'Audio & Petting',
      icon: Heart,
      shortcut: 'Space',
      keywords: ['pet', 'heart', 'purr', 'mascot', 'dog', 'byte', 'pat'],
      onSelect: onPetByte,
    });

    return actions;
  }, [
    scenarios,
    isDemoActive,
    isDrawerOpen,
    hasPendingAction,
    hasAuditHistory,
    isLiveMode,
    isAudioMuted,
    onNextDemoStep,
    onStartDemo,
    onRestartDemo,
    onToggleDrawer,
    onOpenPreviewAction,
    onRollbackLastAction,
    onToggleLiveMode,
    onRefreshLive,
    onSelectScenario,
    onOpenVoiceModal,
    onOpenImageStudio,
    onOpenPitchDeck,
    onToggleAudio,
    onPetByte,
  ]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    const lowerQuery = query.toLowerCase().trim();
    return allActions.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(lowerQuery);
      const matchDesc = item.description.toLowerCase().includes(lowerQuery);
      const matchCategory = item.category.toLowerCase().includes(lowerQuery);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));
      return matchTitle || matchDesc || matchCategory || matchKeywords;
    });
  }, [allActions, query]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [filteredActions.length, selectedIndex]);

  // Keyboard navigation within the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredActions[selectedIndex];
      if (selected) {
        onClose();
        selected.onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelectAction = (action: PaletteAction) => {
    onClose();
    action.onSelect();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="quick-palette-backdrop"
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-2xs"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Command Palette"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              id="quick-palette-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search actions (e.g., conflict, demo, drawer, voice)..."
              className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 outline-none font-medium"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-md hover:bg-slate-200/60"
              >
                Clear
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200 shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* Action List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100/60"
            style={{ maxHeight: 'calc(80vh - 110px)' }}
          >
            {filteredActions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">No actions matching "{query}"</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for "demo", "conflict", "drawer", "voice", or "clean"
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActions.map((action, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleSelectAction(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-300/70 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200/80'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                              {action.title}
                            </span>
                            {action.badge && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border leading-none ${
                                  action.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">
                            {action.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {action.shortcut && (
                          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-2xs">
                            {action.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Shortcuts Hint */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                  ↓
                </kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                  ↵
                </kbd>
                <span>to select</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                  ESC
                </kbd>
                <span>to close</span>
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {filteredActions.length} action{filteredActions.length === 1 ? '' : 's'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
