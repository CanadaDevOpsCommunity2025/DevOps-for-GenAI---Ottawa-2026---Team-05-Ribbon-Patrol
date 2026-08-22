import React from 'react';
import { Play, Sparkles, Plus, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import { ScenarioPreset, RepositoryState } from '../types';

interface ScenarioSwitcherProps {
  scenarios: ScenarioPreset[];
  activeScenarioId: string;
  onSelectScenario: (scenario: ScenarioPreset) => void;
  onInjectRemoteCommit: () => void;
  onInjectLocalEdit: () => void;
  onInjectConflict: () => void;
  onInjectUnsafeRisk: () => void;
  onResetToClean: () => void;
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
}) => {
  return (
    <div
      id="scenario-switcher-bar"
      className="w-full bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Preset Scenarios */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-700 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Scenarios:</span>
          </div>

          {scenarios.map((sc) => {
            const isActive = sc.id === activeScenarioId;
            const isUnsafePreset = sc.id.includes('unsafe') || sc.badge.includes('Unsafe');
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? isUnsafePreset
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                      : 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : isUnsafePreset
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span>{sc.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? isUnsafePreset
                        ? 'bg-rose-800 text-white'
                        : 'bg-blue-700 text-white'
                      : isUnsafePreset
                      ? 'bg-white text-rose-700 border border-rose-200'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {sc.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Sandbox Anomaly Injectors */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Inject Anomaly:
          </span>

          <button
            onClick={onInjectRemoteCommit}
            title="Add +1 remote commit on origin"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-amber-600" />
            <span>+1 Remote Commit</span>
          </button>

          <button
            onClick={onInjectLocalEdit}
            title="Create an uncommitted file in working tree"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-blue-600" />
            <span>+1 Local Edit</span>
          </button>

          <button
            onClick={onInjectConflict}
            title="Trigger merge conflict markers in payment service"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Simulate Conflict</span>
          </button>

          <button
            id="inject-unsafe-hazard-btn"
            onClick={onInjectUnsafeRisk}
            title="Simulate upstream force-push divergence with uncommitted local work (0% Unsafe State)"
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3 text-white" />
            <span>+ Unsafe Hazard (0%)</span>
          </button>

          <button
            onClick={onResetToClean}
            title="Reset repository to 100% clean & synchronized"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-emerald-600" />
            <span>Reset Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
};

