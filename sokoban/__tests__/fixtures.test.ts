import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { parseXSBFile } from "../xsb";
import { buildBoard } from "../board";
import { validateStructure } from "../validate";

const FIXTURES_ROOT = new URL("../../fixtures", import.meta.url).pathname;

describe("fixtures/broken", () => {
  const dir = join(FIXTURES_ROOT, "broken");
  const files = readdirSync(dir).filter((f) => f.endsWith(".xsb"));

  it("has at least one fixture per structural issue code", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    const expectedCode = basename(file, extname(file));

    it(`${file} triggers "${expectedCode}"`, () => {
      const text = readFileSync(join(dir, file), "utf8");
      const level = parseXSBFile(text).levels[0];
      const { board, state } = buildBoard(level.rows);
      const issues = validateStructure(board, state);

      expect(issues.some((i) => i.code === expectedCode)).toBe(true);
    });
  }
});

describe("fixtures/microban structural validity", () => {
  // Only "not-closed" and "box-goal-mismatch" are universal invariants of a
  // well-formed level. "isolated-floor" and "box-on-goal-at-start" are real,
  // correctly-detected conditions that legitimately occur in professionally
  // designed levels (Microban level 1 starts a box on its goal; "The
  // Dungeon" has decorative disconnected rooms) — see docs/level-generation.md's
  // Phase 3 note. They're useful for Phase 5's generator to self-check
  // against, not a rejection filter for imported third-party levels.
  const HARD_CODES = new Set(["not-closed", "box-goal-mismatch"]);

  it("all 155 levels parse and satisfy the universal structural invariants", () => {
    const text = readFileSync(join(FIXTURES_ROOT, "microban", "m1.txt"), "utf8");
    const levels = parseXSBFile(text).levels;

    expect(levels).toHaveLength(155);

    const hardFailures: { level: number; codes: string[] }[] = [];
    levels.forEach((level, i) => {
      const { board, state } = buildBoard(level.rows);
      const issues = validateStructure(board, state).filter((issue) => HARD_CODES.has(issue.code));
      if (issues.length > 0) {
        hardFailures.push({ level: i + 1, codes: issues.map((issue) => issue.code) });
      }
    });

    expect(hardFailures).toEqual([]);
  });
});
