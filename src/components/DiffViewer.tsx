import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  ChevronDown,
  ChevronUp,
  WrapText,
  FileQuestion,
  Layers,
  Sparkles,
} from 'lucide-react';
import { parseDiff, DiffLine, ParsedDiff } from '../utils/diffParser';

interface DiffViewerProps {
  diff: string;
  filePath?: string;
  fileStatus?: string;
  additions?: number;
  deletions?: number;
  maxInitialLines?: number;
  showFileHeader?: boolean;
  hideHeader?: boolean;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  filePath,
  fileStatus,
  additions,
  deletions,
  maxInitialLines = 35,
  showFileHeader = false,
  hideHeader = false,
  className = '',
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  // Parse diff memoized
  const parsed: ParsedDiff = useMemo(() => parseDiff(diff), [diff]);

  // Handle copying original raw diff without UI line numbers or tags
  const handleCopyRawDiff = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!diff) return;
    navigator.clipboard.writeText(diff).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Determine lines to render based on collapse/expand state
  const shouldTruncate = parsed.lines.length > maxInitialLines;
  const visibleLines = isExpanded || !shouldTruncate
    ? parsed.lines
    : parsed.lines.slice(0, maxInitialLines);
  const remainingCount = parsed.lines.length - maxInitialLines;

  // Empty diff fallback
  if (parsed.isEmpty) {
    return (
      <div
        className={`p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono flex items-center justify-center gap-2 ${className}`}
        role="region"
        aria-label={`Diff for ${filePath || 'file'}: No line-level changes`}
      >
        <FileCode className="w-4 h-4 text-slate-500" />
        <span>No line-level changes detected (metadata or branch-only action)</span>
      </div>
    );
  }

  // Binary file notice fallback
  if (parsed.isBinary) {
    return (
      <div
        className={`p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono space-y-2 ${className}`}
        role="region"
        aria-label={`Binary file diff for ${filePath || 'file'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <FileQuestion className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Binary File Modification</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Non-text asset
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Visual line-by-line diff is not applicable for binary assets. Changes will be preserved securely via Git object storage.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-800/90 bg-slate-950 overflow-hidden text-left shadow-sm ${className}`}
      role="region"
      aria-label={`Diff view for ${filePath || 'file'}`}
      tabIndex={0}
    >
      {/* Top Header / Action Toolbar */}
      {!hideHeader ? (
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs select-none">
          <div className="flex items-center gap-2 min-w-0">
            {showFileHeader && filePath && (
              <span className="font-mono font-medium text-slate-200 truncate text-[11px]">
                {filePath}
              </span>
            )}
            {fileStatus && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase tracking-wider ${
                  fileStatus === 'conflicted'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : fileStatus === 'staged'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {fileStatus}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
              {(additions !== undefined || parsed.totalAdditions > 0) && (
                <span className="text-emerald-400 font-semibold">
                  +{additions !== undefined ? additions : parsed.totalAdditions}
                </span>
              )}
              {(deletions !== undefined || parsed.totalDeletions > 0) && (
                <span className="text-rose-400 font-semibold">
                  -{deletions !== undefined ? deletions : parsed.totalDeletions}
                </span>
              )}
            </div>
          </div>

          {/* Toolbar Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setWrapLines(!wrapLines)}
              title={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'}
              aria-label={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'}
              className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                wrapLines
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <WrapText className="w-3 h-3" />
              <span className="hidden sm:inline">Wrap</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRawDiff}
              title="Copy original diff to clipboard"
              aria-label="Copy diff to clipboard"
              className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 text-xs select-none gap-1.5">
          <button
            type="button"
            onClick={() => setWrapLines(!wrapLines)}
            title={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'}
            aria-label={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'}
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
              wrapLines
                ? 'bg-slate-700 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap</span>
          </button>
          <button
            type="button"
            onClick={handleCopyRawDiff}
            title="Copy original diff to clipboard"
            aria-label="Copy diff to clipboard"
            className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Conflict Warning Summary Banner */}
      {parsed.hasConflicts && (
        <div className="px-3.5 py-2.5 bg-amber-950/60 border-b border-amber-700/60 flex items-start gap-2.5 text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
          <div className="text-xs space-y-0.5">
            <div className="font-bold flex items-center gap-2">
              <span>Unresolved Merge Conflict Region Detected</span>
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded text-[10px]">
                ! ACTION REQUIRED
              </span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-normal font-sans">
              Contains Git conflict markers (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>). Must be reconciled prior to clean merge.
            </p>
          </div>
        </div>
      )}

      {/* Diff Lines Container */}
      <div
        className={`font-mono text-[11px] leading-relaxed select-text ${
          wrapLines ? 'whitespace-pre-wrap break-all' : 'overflow-x-auto whitespace-pre'
        }`}
      >
        <table className="w-full border-collapse">
          <tbody>
            {visibleLines.map((line, idx) => {
              // Line type treatments
              let rowBg = 'bg-slate-950 hover:bg-slate-900/60';
              let textColor = 'text-slate-300';
              let prefixColor = 'text-slate-600';
              let borderLeft = 'border-l-2 border-transparent';

              if (line.type === 'addition') {
                rowBg = 'bg-emerald-950/40 hover:bg-emerald-900/50';
                textColor = 'text-emerald-300';
                prefixColor = 'text-emerald-400 font-bold';
                borderLeft = 'border-l-2 border-emerald-500';
              } else if (line.type === 'deletion') {
                rowBg = 'bg-rose-950/40 hover:bg-rose-900/50';
                textColor = 'text-rose-300';
                prefixColor = 'text-rose-400 font-bold';
                borderLeft = 'border-l-2 border-rose-500';
              } else if (
                line.type === 'conflict_start' ||
                line.type === 'conflict_divider' ||
                line.type === 'conflict_end'
              ) {
                rowBg = 'bg-amber-900/60 hover:bg-amber-900/80';
                textColor = 'text-amber-100 font-bold';
                prefixColor = 'text-amber-300 font-extrabold';
                borderLeft = 'border-l-2 border-amber-400';
              } else if (line.type === 'conflict_content') {
                rowBg = 'bg-amber-950/30 hover:bg-amber-900/40';
                textColor = 'text-amber-200';
                prefixColor = 'text-amber-400 font-semibold';
                borderLeft = 'border-l-2 border-amber-500/60';
              } else if (line.type === 'hunk_header') {
                rowBg = 'bg-cyan-950/50 hover:bg-cyan-900/60';
                textColor = 'text-cyan-300 font-medium italic';
                prefixColor = 'text-cyan-400 font-semibold not-italic';
                borderLeft = 'border-l-2 border-cyan-500';
              } else if (line.type === 'file_header') {
                rowBg = 'bg-slate-900/90 text-slate-400';
                textColor = 'text-indigo-300 font-semibold';
                prefixColor = 'text-indigo-400';
                borderLeft = 'border-l-2 border-indigo-500/50';
              } else if (line.type === 'comment') {
                rowBg = 'bg-slate-900/40';
                textColor = 'text-slate-400 italic';
                prefixColor = 'text-slate-500';
              }

              return (
                <tr
                  key={line.id || idx}
                  className={`transition-colors group ${rowBg} ${borderLeft}`}
                >
                  {/* Screen Reader Announcement */}
                  <td className="sr-only">
                    {line.srLabel}
                  </td>

                  {/* Old Line Number */}
                  <td className="w-8 py-0.5 px-1.5 text-right text-[10px] text-slate-600 select-none border-r border-slate-800/60 font-mono">
                    {line.oldLineNumber !== null && line.oldLineNumber !== undefined
                      ? line.oldLineNumber
                      : ''}
                  </td>

                  {/* New Line Number */}
                  <td className="w-8 py-0.5 px-1.5 text-right text-[10px] text-slate-600 select-none border-r border-slate-800/60 font-mono">
                    {line.newLineNumber !== null && line.newLineNumber !== undefined
                      ? line.newLineNumber
                      : ''}
                  </td>

                  {/* Visual Prefix Symbol (+, -, !, @@, etc.) */}
                  <td className={`w-6 py-0.5 pl-2 pr-1 text-center select-none ${prefixColor}`}>
                    {line.type === 'conflict_start' ||
                    line.type === 'conflict_divider' ||
                    line.type === 'conflict_end' ? (
                      <span className="inline-flex items-center justify-center px-1 rounded bg-amber-500 text-slate-950 text-[9px] font-black tracking-tighter">
                        !
                      </span>
                    ) : line.type === 'conflict_content' ? (
                      <span className="text-amber-400 font-bold text-[10px]">!</span>
                    ) : (
                      line.prefix
                    )}
                  </td>

                  {/* Line Text Content */}
                  <td className={`py-0.5 px-2 font-mono ${textColor}`}>
                    {line.content || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Large Diff Expand / Collapse Control */}
      {shouldTruncate && (
        <div className="px-3.5 py-2 bg-slate-900/80 border-t border-slate-800 text-center select-none">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-all cursor-pointer"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse diff' : `Show all ${parsed.lines.length} lines`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse diff view</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show all {parsed.lines.length} lines (+{remainingCount} more)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
