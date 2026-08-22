import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  GitBranch,
  GitCommit,
  GitFork,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Minimize2,
  Maximize2,
  Unlink,
  Radio,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
} from 'lucide-react';
import { RepositoryState, DagGraph, DagCommitNode, DagEdge, DagLane } from '../types';
import { buildGitDagTopology } from '../utils/gitDagNormalizer';

interface GitDagVisualizerProps {
  state: RepositoryState;
  onSelectCommit?: (node: DagCommitNode) => void;
  selectedCommitId?: string | null;
  onClearSelection?: () => void;
}

export const GitDagVisualizer: React.FC<GitDagVisualizerProps> = ({
  state,
  onSelectCommit,
  selectedCommitId: externalSelectedId,
  onClearSelection,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [enableCollapse, setEnableCollapse] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dag' | 'linear'>('dag');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedNodeId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  // Build DAG Graph using our pure normalizer
  const graph: DagGraph = useMemo(() => {
    return buildGitDagTopology(state, {
      drawerWidth: 420,
      expandedGroups,
      enableLinearCollapse: enableCollapse,
    });
  }, [state, expandedGroups, enableCollapse]);

  // Determine active inspection node (selected > hovered > HEAD > first)
  const inspectedNode: DagCommitNode | undefined = useMemo(() => {
    if (selectedNodeId) {
      const found = graph.nodes.find((n) => n.id === selectedNodeId);
      if (found) return found;
    }
    if (hoveredNodeId) {
      const found = graph.nodes.find((n) => n.id === hoveredNodeId);
      if (found) return found;
    }
    // Default to HEAD or first node
    return graph.nodes.find((n) => n.isHead) || graph.nodes[0];
  }, [graph.nodes, selectedNodeId, hoveredNodeId]);

  // Set of related parent and child node IDs for highlighting
  const highlightedRelationships = useMemo(() => {
    if (!inspectedNode) return { parents: new Set<string>(), children: new Set<string>() };
    const parents = new Set<string>(inspectedNode.parents);
    const children = new Set<string>(inspectedNode.children);
    return { parents, children };
  }, [inspectedNode]);

  // Handle keyboard navigation across commit nodes
  const handleKeyDown = (e: React.KeyboardEvent, node: DagCommitNode, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectNode(node);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClearSelection();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(graph.nodes.length - 1, index + 1);
      handleSelectNode(graph.nodes[nextIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(0, index - 1);
      handleSelectNode(graph.nodes[prevIndex]);
    }
  };

  const handleSelectNode = (node: DagCommitNode) => {
    if (node.isCollapsedGroup) {
      toggleCollapseGroup(node.id);
      return;
    }
    setInternalSelectedId(node.id === selectedNodeId ? null : node.id);
    if (onSelectCommit) onSelectCommit(node);
  };

  const handleClearSelection = () => {
    setInternalSelectedId(null);
    if (onClearSelection) onClearSelection();
  };

  const toggleCollapseGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Graceful empty/unavailable state
  if (graph.hasIncompleteHistory || graph.nodes.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-700/60 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-amber-400">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Incomplete History State</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {graph.incompleteHistoryReason || 'Commit topology could not be derived from the current repository snapshot.'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg inline-block border border-slate-800">
          Branch: {state.currentBranch?.name || 'unknown'} • Tracking: {state.currentBranch?.upstream || 'none'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Header controls & View Switcher */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <GitBranch className="w-3.5 h-3.5 text-blue-600" />
          <span>Interactive Commit DAG</span>
          <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
            {graph.nodes.length} nodes
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {graph.collapsedGroupCount > 0 && (
            <button
              onClick={() => setEnableCollapse(!enableCollapse)}
              className="text-[10px] px-2 py-0.5 rounded-md font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Toggle linear run collapsing"
            >
              {enableCollapse ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{enableCollapse ? 'Collapsed' : 'Expanded'}</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
            <button
              onClick={() => setViewMode('dag')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'dag'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              DAG Graph
            </button>
            <button
              onClick={() => setViewMode('linear')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'linear'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Stream
            </button>
          </div>
        </div>
      </div>

      {/* Screen Reader Summary */}
      <div className="sr-only" aria-live="polite">
        Git Commit DAG Visualizer for {state.repoName}. Current checked out branch is {state.currentBranch?.name},
        with {state.currentBranch?.aheadCount || 0} local commits ahead and {state.currentBranch?.behindCount || 0} incoming
        remote commits behind. {graph.nodes.length} total nodes displayed.
      </div>

      {/* MAIN VIEW: DAG GRAPH */}
      {viewMode === 'dag' ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 overflow-hidden shadow-inner flex flex-col">
          {/* Lane Header Bar */}
          <div className="grid grid-cols-2 px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-[11px] font-mono tracking-tight text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-semibold truncate">
                {graph.lanes[0]?.name || 'main / upstream'}
              </span>
            </div>
            {graph.lanes.length > 1 ? (
              <div className="flex items-center gap-1.5 justify-end truncate">
                <span
                  className={`w-2 h-2 rounded-full ${
                    state.primarySymptom === 'destructive_hazard'
                      ? 'bg-rose-500 animate-pulse'
                      : state.currentBranch?.isDetached
                      ? 'bg-amber-400'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="font-semibold text-blue-300 truncate">
                  {graph.lanes[1]?.name || state.currentBranch?.name}
                </span>
              </div>
            ) : (
              <div className="text-right text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3" /> Synchronized
              </div>
            )}
          </div>

          {/* SVG Canvas Area */}
          <div className="relative overflow-x-auto overflow-y-visible px-2 py-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 min-h-[220px]">
            <svg
              width="100%"
              height={graph.height}
              viewBox={`0 0 390 ${graph.height}`}
              className="w-full h-auto overflow-visible select-none"
              role="region"
              aria-label="Git commit graph topology"
            >
              <defs>
                {/* Glow Filter for Active / Selected Edges */}
                <filter id="dag-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Conflict / Hazard Striped Pattern */}
                <pattern id="hazard-stripe" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#f43f5e" strokeWidth="1.5" />
                </pattern>

                {/* Arrowhead Markers */}
                <marker
                  id="dag-arrow-slate"
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#64748b" />
                </marker>
                <marker
                  id="dag-arrow-blue"
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#3b82f6" />
                </marker>
                <marker
                  id="dag-arrow-emerald"
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Background Lane Guides */}
              <line
                x1={graph.lanes[0]?.x ?? 54}
                y1="20"
                x2={graph.lanes[0]?.x ?? 54}
                y2={graph.height - 20}
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.4"
              />
              {graph.lanes.length > 1 && (
                <line
                  x1={graph.lanes[1]?.x ?? 180}
                  y1="20"
                  x2={graph.lanes[1]?.x ?? 180}
                  y2={graph.height - 20}
                  stroke="#1e3a8a"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.35"
                />
              )}

              {/* EDGES (Connecting Lines) */}
              {graph.edges.map((edge) => {
                const isSelectedEdge =
                  inspectedNode &&
                  (edge.fromId === inspectedNode.id || edge.toId === inspectedNode.id);

                // Bezier Curve Path from parent (fromX, fromY) to child (toX, toY)
                const pathData =
                  edge.fromX === edge.toX
                    ? `M ${edge.fromX} ${edge.fromY} L ${edge.toX} ${edge.toY}`
                    : `M ${edge.fromX} ${edge.fromY} C ${edge.fromX} ${(edge.fromY + edge.toY) / 2}, ${edge.toX} ${(edge.fromY + edge.toY) / 2}, ${edge.toX} ${edge.toY}`;

                let strokeColor = '#475569';
                let strokeWidth = 2;
                let strokeDash = undefined;

                if (edge.isHazard) {
                  strokeColor = '#f43f5e';
                  strokeDash = '4 3';
                } else if (edge.isConflicted) {
                  strokeColor = '#fb7185';
                  strokeDash = '4 3';
                } else if (edge.isDivergent) {
                  strokeColor = '#60a5fa';
                } else if (edge.fromX === 180 && edge.toX === 180) {
                  strokeColor = '#3b82f6';
                }

                if (isSelectedEdge) {
                  strokeColor = edge.fromId === inspectedNode?.id ? '#a855f7' : '#10b981';
                  strokeWidth = 3;
                }

                return (
                  <path
                    key={edge.id}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    filter={isSelectedEdge ? 'url(#dag-glow)' : undefined}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* NODES (Interactive Commit Circles & Collapsed Pills) */}
              {graph.nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isInspected = inspectedNode?.id === node.id;
                const isParentOfInspected = highlightedRelationships.parents.has(node.id);
                const isChildOfInspected = highlightedRelationships.children.has(node.id);

                // Role colors and shapes
                let nodeFill = '#1e293b';
                let nodeStroke = '#64748b';
                let nodeRadius = 7;

                if (node.isHead) {
                  nodeFill = '#2563eb';
                  nodeStroke = '#93c5fd';
                  nodeRadius = 9;
                } else if (node.isUpstreamHead) {
                  nodeFill = '#0f766e';
                  nodeStroke = '#2dd4bf';
                  nodeRadius = 8;
                } else if (node.isConflicted) {
                  nodeFill = '#e11d48';
                  nodeStroke = '#fda4af';
                  nodeRadius = 8;
                } else if (node.isDetached) {
                  nodeFill = '#d97706';
                  nodeStroke = '#fde68a';
                  nodeRadius = 8;
                } else if (node.isLocalAhead) {
                  nodeFill = '#3b82f6';
                  nodeStroke = '#60a5fa';
                } else if (node.isRemoteBehind) {
                  nodeFill = '#d97706';
                  nodeStroke = '#fcd34d';
                } else if (node.isMergeBase || node.isForkPoint) {
                  nodeFill = '#475569';
                  nodeStroke = '#cbd5e1';
                }

                if (isSelected || isInspected) {
                  nodeStroke = '#ffffff';
                } else if (isParentOfInspected) {
                  nodeStroke = '#34d399';
                } else if (isChildOfInspected) {
                  nodeStroke = '#c084fc';
                }

                // Render Collapsed Group Pill
                if (node.isCollapsedGroup) {
                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer group"
                      tabIndex={0}
                      role="button"
                      aria-label={`${node.collapsedCount} linear commits collapsed. Click to expand.`}
                      onClick={() => handleSelectNode(node)}
                      onKeyDown={(e) => handleKeyDown(e, node, index)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      <rect
                        x={node.x - 12}
                        y={node.y - 12}
                        width={24}
                        height={24}
                        rx={12}
                        fill="#1e293b"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        className="group-hover:stroke-white transition-all"
                      />
                      <text
                        x={node.x}
                        y={node.y + 3.5}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#cbd5e1"
                        className="pointer-events-none"
                      >
                        +{node.collapsedCount}
                      </text>

                      {/* Label beside pill */}
                      <text
                        x={node.x + 18}
                        y={node.y + 4}
                        fontSize="10"
                        fontWeight="500"
                        fill="#94a3b8"
                        className="group-hover:fill-slate-200 transition-colors pointer-events-none font-mono"
                      >
                        {node.collapsedCount} linear commits (click to expand)
                      </text>
                    </g>
                  );
                }

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    tabIndex={0}
                    role="button"
                    aria-label={`Commit ${node.shortHash}: ${node.message}. Author: ${node.author}. Role: ${node.role}.`}
                    onClick={() => handleSelectNode(node)}
                    onKeyDown={(e) => handleKeyDown(e, node, index)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {/* Active Pulsing Ring for HEAD */}
                    {node.isHead && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeRadius + 6}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        opacity="0.6"
                        className="animate-ping origin-center"
                      />
                    )}

                    {/* Relationship Highlight Ring (Parent = Green, Child = Purple, Selected = White) */}
                    {(isSelected || isInspected || isParentOfInspected || isChildOfInspected) && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeRadius + 4}
                        fill="none"
                        stroke={
                          isSelected || isInspected
                            ? '#ffffff'
                            : isParentOfInspected
                            ? '#10b981'
                            : '#a855f7'
                        }
                        strokeWidth="2"
                        strokeDasharray={isParentOfInspected || isChildOfInspected ? '3 2' : undefined}
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeRadius}
                      fill={nodeFill}
                      stroke={nodeStroke}
                      strokeWidth={isSelected || isInspected ? 2.5 : 1.5}
                      className="group-hover:stroke-white transition-all"
                    />

                    {/* Inner Shape Indicator */}
                    {node.isForkPoint && (
                      <circle cx={node.x} cy={node.y} r="2.5" fill="#f8fafc" />
                    )}

                    {/* Commit Hash Label */}
                    <text
                      x={node.x + 15}
                      y={node.y - 2}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={
                        node.isHead
                          ? '#93c5fd'
                          : node.isConflicted
                          ? '#fda4af'
                          : node.isUpstreamHead
                          ? '#5eead4'
                          : '#cbd5e1'
                      }
                      className="pointer-events-none"
                    >
                      {node.shortHash}
                    </text>

                    {/* Role Tag Pill */}
                    {node.isHead && (
                      <g transform={`translate(${node.x + 68}, ${node.y - 10})`}>
                        <rect x="0" y="0" width="38" height="13" rx="3" fill="#2563eb" />
                        <text x="19" y="9.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">
                          HEAD
                        </text>
                      </g>
                    )}

                    {node.isUpstreamHead && !node.isHead && (
                      <g transform={`translate(${node.x + 68}, ${node.y - 10})`}>
                        <rect x="0" y="0" width="44" height="13" rx="3" fill="#0f766e" />
                        <text x="22" y="9.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#5eead4" fontFamily="monospace">
                          UPSTREAM
                        </text>
                      </g>
                    )}

                    {node.isConflicted && (
                      <g transform={`translate(${node.x + 68}, ${node.y - 10})`}>
                        <rect x="0" y="0" width="56" height="13" rx="3" fill="#e11d48" />
                        <text x="28" y="9.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">
                          CONFLICT
                        </text>
                      </g>
                    )}

                    {node.isDetached && (
                      <g transform={`translate(${node.x + 68}, ${node.y - 10})`}>
                        <rect x="0" y="0" width="52" height="13" rx="3" fill="#d97706" />
                        <text x="26" y="9.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">
                          DETACHED
                        </text>
                      </g>
                    )}

                    {/* Commit Message Snippet */}
                    {(() => {
                      const maxChars = node.laneIndex === 0 && graph.lanes.length > 1 ? 16 : 30;
                      const displayMsg =
                        node.message.length > maxChars
                          ? node.message.slice(0, maxChars - 1) + '…'
                          : node.message;
                      return (
                        <text
                          x={node.x + 14}
                          y={node.y + 11}
                          fontSize="9.5"
                          fill={isInspected ? '#f1f5f9' : '#94a3b8'}
                          className="pointer-events-none"
                        >
                          {displayMsg}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : (
        /* ALTERNATIVE VIEW: LINEAR COMMIT STREAM */
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {graph.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id || inspectedNode?.id === node.id;
            return (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <span className="text-slate-900">{node.shortHash}</span>
                    {node.isHead && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                        HEAD
                      </span>
                    )}
                    {node.isUpstreamHead && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-700 text-teal-100 font-bold">
                        UPSTREAM
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{node.timestamp}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 line-clamp-1">{node.message}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>{node.author.split('<')[0]}</span>
                  <span className="font-mono text-slate-400">{node.laneName}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* COMMIT INSPECTOR PANEL (Hover / Selection details) */}
      {inspectedNode && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2.5 text-xs shadow-md">
          {/* Top Bar: Short Hash, Full Hash copy, and Role Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-400 text-sm">
                {inspectedNode.shortHash}
              </span>
              <button
                onClick={() => handleCopyHash(inspectedNode.hash)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy full commit SHA"
              >
                {copiedHash === inspectedNode.hash ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Status & Divergence Role Pill */}
            <div className="flex items-center gap-1.5">
              {inspectedNode.isHead && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-blue-400" /> Checked-out HEAD
                </span>
              )}
              {inspectedNode.isUpstreamHead && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  Remote Upstream
                </span>
              )}
              {inspectedNode.isLocalAhead && !inspectedNode.isHead && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 flex items-center gap-1">
                  <ArrowUp className="w-2.5 h-2.5" /> Local Unpushed
                </span>
              )}
              {inspectedNode.isRemoteBehind && !inspectedNode.isUpstreamHead && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <ArrowDown className="w-2.5 h-2.5" /> Incoming Remote
                </span>
              )}
              {inspectedNode.isMergeBase && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1">
                  <GitFork className="w-2.5 h-2.5" /> Common Merge Base
                </span>
              )}
              {inspectedNode.isConflicted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Conflicted Rebase
                </span>
              )}
              {inspectedNode.isDetached && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <Unlink className="w-2.5 h-2.5 text-amber-400" /> Detached Ref
                </span>
              )}
            </div>
          </div>

          {/* Commit Message */}
          <div className="font-semibold text-slate-100 text-[12px] leading-snug">
            {inspectedNode.message}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Author</span>
              <span className="text-slate-300 font-medium truncate block">
                {inspectedNode.author}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Timestamp</span>
              <span className="text-slate-300 font-medium block">
                {inspectedNode.timestamp}
              </span>
            </div>
          </div>

          {/* Parents & Children Relationship Links */}
          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-emerald-400 font-mono text-[10px]">Parents ({inspectedNode.parents.length}):</span>
              {inspectedNode.parents.length === 0 ? (
                <span className="text-slate-600">None (root)</span>
              ) : (
                inspectedNode.parents.map((pId) => {
                  const parentNode = graph.nodes.find((n) => n.id === pId);
                  return (
                    <button
                      key={pId}
                      onClick={() => parentNode && handleSelectNode(parentNode)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-[10px] cursor-pointer transition-colors"
                    >
                      {parentNode ? parentNode.shortHash : pId.slice(0, 7)}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-purple-400 font-mono text-[10px]">Children ({inspectedNode.children.length}):</span>
              {inspectedNode.children.length === 0 ? (
                <span className="text-slate-600">None (tip)</span>
              ) : (
                inspectedNode.children.map((cId) => {
                  const childNode = graph.nodes.find((n) => n.id === cId);
                  return (
                    <button
                      key={cId}
                      onClick={() => childNode && handleSelectNode(childNode)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono text-[10px] cursor-pointer transition-colors"
                    >
                      {childNode ? childNode.shortHash : cId.slice(0, 7)}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Selection Dismiss */}
          {selectedNodeId && (
            <div className="pt-1 text-right">
              <button
                onClick={handleClearSelection}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Clear Node Selection (Esc)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
