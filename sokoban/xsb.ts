export interface XSBLevel {
  /** Leading title/comment lines that precede the level's grid, verbatim, in order. */
  comments: string[];
  /** Grid rows, verbatim (ragged lengths preserved, no padding). */
  rows: string[];
}

export interface XSBFile {
  levels: XSBLevel[];
}

// Valid XSB grid-row characters (Level_format's canonical set plus the two
// accepted floor stand-ins for interior blank rows). Any line containing a
// character outside this set can't be a grid row, so it's title/comment
// metadata instead — this is how real Skinner/Microban files' bare quoted
// titles (e.g. 'Duh!', no leading `;`) get recognized without a fixed prefix.
const ROW_CHARS = new Set([" ", "#", "@", "+", "$", "*", ".", "-", "_"]);

function looksLikeRow(line: string): boolean {
  if (line.length === 0) return false;
  for (const ch of line) {
    if (!ROW_CHARS.has(ch)) return false;
  }
  return true;
}

/**
 * Parses an XSB/.sok style text file (RLE-free plain text) into one or more
 * levels. Levels are separated by blank lines. Leading lines that don't look
 * like grid rows (either `;`-prefixed, or any other line containing a
 * non-grid character, such as a bare quoted title) are captured as that
 * level's comments — including when a blank line separates a title-only
 * block from the grid block that follows it, as real Microban files do.
 */
export function parseXSBFile(text: string): XSBFile {
  const lines = text.split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    chunks.push(current);
  }

  if (chunks.length === 0) {
    throw new Error("parseXSBFile: no level found in input");
  }

  const levels: XSBLevel[] = [];
  let pendingComments: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.some(looksLikeRow)) {
      // Metadata-only chunk (e.g. a title block separated from its grid by
      // a blank line): carry it forward onto the next chunk instead of
      // treating it as its own (grid-less) level.
      pendingComments.push(...chunk);
      continue;
    }

    let splitIndex = 0;
    while (splitIndex < chunk.length && !looksLikeRow(chunk[splitIndex])) {
      splitIndex++;
    }
    const comments = [...pendingComments, ...chunk.slice(0, splitIndex)];
    const rows = chunk.slice(splitIndex);
    pendingComments = [];
    levels.push({ comments, rows });
  }

  if (pendingComments.length > 0) {
    throw new Error(
      "parseXSBFile: trailing metadata block has no following grid",
    );
  }
  if (levels.length === 0) {
    throw new Error("parseXSBFile: no level found in input");
  }

  return { levels };
}

/** Parses a file expected to contain exactly one level. */
export function parseXSB(text: string): XSBLevel {
  const file = parseXSBFile(text);
  if (file.levels.length !== 1) {
    throw new Error(
      `parseXSB: expected exactly one level, found ${file.levels.length}`,
    );
  }
  return file.levels[0];
}

/** Serializes a multi-level file back to XSB text, exact round-trip. */
export function serializeXSBFile(file: XSBFile): string {
  return file.levels
    .map((level) => [...level.comments, ...level.rows].join("\n"))
    .join("\n\n");
}

/** Serializes a single level back to XSB text, exact round-trip. */
export function serializeXSB(level: XSBLevel): string {
  return serializeXSBFile({ levels: [level] });
}
