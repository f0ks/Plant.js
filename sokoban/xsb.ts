export interface XSBLevel {
  /** Leading `;` lines that precede the level's grid, verbatim, in order. */
  comments: string[];
  /** Grid rows, verbatim (ragged lengths preserved, no padding). */
  rows: string[];
}

export interface XSBFile {
  levels: XSBLevel[];
}

function isCommentLine(line: string): boolean {
  return line.startsWith(";");
}

/**
 * Parses an XSB/.sok style text file (RLE-free plain text) into one or more
 * levels. Levels are separated by blank lines; `;`-prefixed lines
 * immediately preceding a level's grid are captured as that level's
 * comments/title.
 */
export function parseXSBFile(text: string): XSBFile {
  const lines = text.split("\n");
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    blocks.push(current);
  }

  if (blocks.length === 0) {
    throw new Error("parseXSBFile: no level found in input");
  }

  const levels: XSBLevel[] = blocks.map((block) => {
    let splitIndex = 0;
    while (splitIndex < block.length && isCommentLine(block[splitIndex])) {
      splitIndex++;
    }
    const comments = block.slice(0, splitIndex);
    const rows = block.slice(splitIndex);
    if (rows.length === 0) {
      throw new Error("parseXSBFile: level block has no grid rows");
    }
    return { comments, rows };
  });

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
