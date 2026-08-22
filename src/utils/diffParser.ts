/**
 * GitPet Diff Parser Engine
 * Handles unified diffs, Git CLI output, merge conflict markers, binary notices,
 * and metadata comments with full line classification and dual line numbering.
 */

export type DiffLineType =
  | 'file_header'
  | 'hunk_header'
  | 'context'
  | 'addition'
  | 'deletion'
  | 'conflict_start'
  | 'conflict_divider'
  | 'conflict_end'
  | 'conflict_content'
  | 'binary_notice'
  | 'comment'
  | 'malformed';

export interface DiffLine {
  id: string;
  type: DiffLineType;
  content: string;
  rawContent: string;
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
  prefix: string;
  srLabel: string;
  inConflictRegion: boolean;
  conflictSide?: 'ours' | 'theirs' | 'base' | 'marker';
}

export interface DiffHunk {
  id: string;
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
  hasConflicts: boolean;
}

export interface ParsedDiff {
  lines: DiffLine[];
  hunks: DiffHunk[];
  hasConflicts: boolean;
  conflictCount: number;
  isBinary: boolean;
  isEmpty: boolean;
  totalAdditions: number;
  totalDeletions: number;
  fileHeaders: string[];
  rawText: string;
}

const HUNK_REGEX = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;
const CONFLICT_START_REGEX = /^<{7}(?:\s+(.*))?$/;
const CONFLICT_DIVIDER_REGEX = /^={7}$/;
const CONFLICT_BASE_REGEX = /^\|{7}(?:\s+(.*))?$/;
const CONFLICT_END_REGEX = /^>{7}(?:\s+(.*))?$/;
const BINARY_DIFF_REGEX = /^(?:Binary\s+files\s+.+\s+differ|GIT\s+binary\s+patch)/i;

/**
 * Parse raw diff text into a structured token stream with line numbers and conflict tracking.
 */
export function parseDiff(rawDiff: string): ParsedDiff {
  if (!rawDiff || rawDiff.trim() === '') {
    return {
      lines: [],
      hunks: [],
      hasConflicts: false,
      conflictCount: 0,
      isBinary: false,
      isEmpty: true,
      totalAdditions: 0,
      totalDeletions: 0,
      fileHeaders: [],
      rawText: rawDiff || '',
    };
  }

  const rawLines = rawDiff.split(/\r?\n/);
  const lines: DiffLine[] = [];
  const hunks: DiffHunk[] = [];
  const fileHeaders: string[] = [];

  let currentHunk: DiffHunk | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;
  let inConflict = false;
  let conflictSide: 'ours' | 'theirs' | 'base' | 'marker' | undefined = undefined;
  let conflictCount = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let isBinary = false;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const lineId = `line_${i}_${Math.random().toString(36).substring(2, 7)}`;

    // Check for binary file notice
    if (BINARY_DIFF_REGEX.test(rawLine) || rawLine.toLowerCase().includes('binary file')) {
      isBinary = true;
      const lineObj: DiffLine = {
        id: lineId,
        type: 'binary_notice',
        content: rawLine,
        rawContent: rawLine,
        prefix: '📦',
        srLabel: 'Binary file notice: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Check for conflict markers
    if (CONFLICT_START_REGEX.test(rawLine)) {
      inConflict = true;
      conflictSide = 'ours';
      conflictCount++;
      const lineObj: DiffLine = {
        id: lineId,
        type: 'conflict_start',
        content: rawLine,
        rawContent: rawLine,
        prefix: '! [CONFLICT: OURS]',
        srLabel: 'Conflict start marker (current HEAD): ',
        inConflictRegion: true,
        conflictSide: 'marker',
      };
      lines.push(lineObj);
      if (currentHunk) {
        currentHunk.lines.push(lineObj);
        currentHunk.hasConflicts = true;
      }
      continue;
    }

    if (CONFLICT_BASE_REGEX.test(rawLine)) {
      conflictSide = 'base';
      const lineObj: DiffLine = {
        id: lineId,
        type: 'conflict_divider',
        content: rawLine,
        rawContent: rawLine,
        prefix: '! [CONFLICT: BASE]',
        srLabel: 'Conflict common base marker: ',
        inConflictRegion: true,
        conflictSide: 'marker',
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    if (CONFLICT_DIVIDER_REGEX.test(rawLine)) {
      conflictSide = 'theirs';
      const lineObj: DiffLine = {
        id: lineId,
        type: 'conflict_divider',
        content: rawLine,
        rawContent: rawLine,
        prefix: '! [CONFLICT: THEIRS]',
        srLabel: 'Conflict divider marker: ',
        inConflictRegion: true,
        conflictSide: 'marker',
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    if (CONFLICT_END_REGEX.test(rawLine)) {
      const lineObj: DiffLine = {
        id: lineId,
        type: 'conflict_end',
        content: rawLine,
        rawContent: rawLine,
        prefix: '! [CONFLICT END]',
        srLabel: 'Conflict end marker: ',
        inConflictRegion: true,
        conflictSide: 'marker',
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      inConflict = false;
      conflictSide = undefined;
      continue;
    }

    // Inside active conflict region but not marker
    if (inConflict) {
      const lineObj: DiffLine = {
        id: lineId,
        type: 'conflict_content',
        content: rawLine,
        rawContent: rawLine,
        prefix: '!',
        srLabel: `Conflict content (${conflictSide || 'unresolved'}): `,
        inConflictRegion: true,
        conflictSide,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Check for Hunk Header
    const hunkMatch = rawLine.match(HUNK_REGEX);
    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newCount = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;

      oldLineCounter = oldStart;
      newLineCounter = newStart;

      const hunkObj: DiffHunk = {
        id: `hunk_${hunks.length}_${oldStart}_${newStart}`,
        header: rawLine,
        oldStart,
        oldCount,
        newStart,
        newCount,
        lines: [],
        hasConflicts: false,
      };

      currentHunk = hunkObj;
      hunks.push(hunkObj);

      const lineObj: DiffLine = {
        id: lineId,
        type: 'hunk_header',
        content: rawLine,
        rawContent: rawLine,
        prefix: '@@',
        srLabel: 'Hunk header: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      hunkObj.lines.push(lineObj);
      continue;
    }

    // Check for File Metadata Headers
    if (
      rawLine.startsWith('diff --git') ||
      rawLine.startsWith('index ') ||
      rawLine.startsWith('--- ') ||
      rawLine.startsWith('+++ ') ||
      rawLine.startsWith('new file mode') ||
      rawLine.startsWith('deleted file mode') ||
      rawLine.startsWith('similarity index') ||
      rawLine.startsWith('rename from') ||
      rawLine.startsWith('rename to')
    ) {
      fileHeaders.push(rawLine);
      const lineObj: DiffLine = {
        id: lineId,
        type: 'file_header',
        content: rawLine,
        rawContent: rawLine,
        prefix: '•',
        srLabel: 'Diff header: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Check for Comment or Summary notice
    if (rawLine.startsWith('//') || rawLine.startsWith('#') || rawLine.startsWith('... (+')) {
      const lineObj: DiffLine = {
        id: lineId,
        type: 'comment',
        content: rawLine,
        rawContent: rawLine,
        prefix: '#',
        srLabel: 'Metadata comment: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Addition line
    if (rawLine.startsWith('+')) {
      totalAdditions++;
      const lineObj: DiffLine = {
        id: lineId,
        type: 'addition',
        content: rawLine.substring(1),
        rawContent: rawLine,
        newLineNumber: newLineCounter > 0 ? newLineCounter++ : null,
        oldLineNumber: null,
        prefix: '+',
        srLabel: 'Added line: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Deletion line
    if (rawLine.startsWith('-')) {
      totalDeletions++;
      const lineObj: DiffLine = {
        id: lineId,
        type: 'deletion',
        content: rawLine.substring(1),
        rawContent: rawLine,
        oldLineNumber: oldLineCounter > 0 ? oldLineCounter++ : null,
        newLineNumber: null,
        prefix: '-',
        srLabel: 'Removed line: ',
        inConflictRegion: false,
      };
      lines.push(lineObj);
      if (currentHunk) currentHunk.lines.push(lineObj);
      continue;
    }

    // Context line (or standard code line starting with space or text)
    const contextContent = rawLine.startsWith(' ') ? rawLine.substring(1) : rawLine;
    const lineObj: DiffLine = {
      id: lineId,
      type: 'context',
      content: contextContent,
      rawContent: rawLine,
      oldLineNumber: oldLineCounter > 0 ? oldLineCounter++ : null,
      newLineNumber: newLineCounter > 0 ? newLineCounter++ : null,
      prefix: ' ',
      srLabel: 'Context line: ',
      inConflictRegion: false,
    };
    lines.push(lineObj);
    if (currentHunk) currentHunk.lines.push(lineObj);
  }

  // If no hunks were explicitly parsed with @@, group lines into a single default hunk
  if (hunks.length === 0 && lines.length > 0) {
    hunks.push({
      id: 'hunk_default',
      header: '@@ Full Diff Snippet @@',
      oldStart: 1,
      oldCount: lines.length,
      newStart: 1,
      newCount: lines.length,
      lines: [...lines],
      hasConflicts: conflictCount > 0,
    });
  }

  return {
    lines,
    hunks,
    hasConflicts: conflictCount > 0,
    conflictCount,
    isBinary,
    isEmpty: lines.length === 0,
    totalAdditions,
    totalDeletions,
    fileHeaders,
    rawText: rawDiff,
  };
}
