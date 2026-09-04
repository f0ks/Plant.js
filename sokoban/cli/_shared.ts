/** Helpers shared by sokoban/cli/*.ts entry points that read JSONL batches. */

/** Positive-integer argv value, or a thrown parse error. */
export function parsePositiveInt(tool: string, flag: string, raw: string | undefined): number {
  const value = Number(raw);
  if (raw === undefined || raw === "" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${tool}: ${flag} expects a positive integer, got ${JSON.stringify(raw)}`);
  }
  return value;
}

/** Same `{"error": ...}` / exit 3 shape used by every sokoban CLI tool. */
export function emitError(message: string): number {
  console.log(JSON.stringify({ error: message }));
  return 3;
}

/**
 * Parses one-JSON-object-per-line input. Rejects lines that are valid JSON
 * but not a record (`null`, a number, a string, an array) so callers get a
 * clean parse error instead of an uncaught TypeError the first time they
 * read a property off a non-object.
 */
export function parseJSONLRecords(text: string): Record<string, unknown>[] {
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line, i) => {
      const rec: unknown = JSON.parse(line);
      if (typeof rec !== "object" || rec === null || Array.isArray(rec)) {
        throw new Error(`line ${i + 1} is not a level record: ${line}`);
      }
      return rec as Record<string, unknown>;
    });
}
