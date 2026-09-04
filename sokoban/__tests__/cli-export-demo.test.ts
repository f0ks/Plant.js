import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli/export-demo.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-export-demo-"));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// A known-good minimal room, reused across fixtures — same one board.test.ts
// already exercises against buildBoard.
const SMALL_ROOM = "#####\n#@$.#\n#####";

function writeJSONL(name: string, levels: object[]): string {
  const file = join(dir, name);
  writeFileSync(file, levels.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return file;
}

function run(args: string[]): { status: number; stdout: string } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], { encoding: "utf8" });
    return { status: 0, stdout };
  } catch (err) {
    const e = err as { status: number; stdout: string };
    return { status: e.status, stdout: e.stdout };
  }
}

describe("cli/export-demo.ts", () => {
  it("writes a levels.ts file with the legend header and --count level blocks", () => {
    const input = writeJSONL("levels.jsonl", [
      { xsb: SMALL_ROOM, score: 500, accepted: true, pushes: 5 },
      { xsb: SMALL_ROOM, score: 300, accepted: true, pushes: 1 },
    ]);
    const out = join(dir, "levels.ts");
    const { status } = run([input, "--count", "2", "--out", out]);
    expect(status).toBe(0);

    const text = readFileSync(out, "utf8");
    expect(text).toContain("export const levels: string[][][] = [");
    expect(text).toContain("// @ player");
    // Each level block's top-level array opens with a 2-space-indented '['.
    expect(text.match(/^ {2}\[$/gm)?.length).toBe(2);
    // Grass border: every level's first row is all "G".
    expect(text).toContain('["G", "G", "G", "G", "G", "G", "G"],');
  });

  it("writes to stdout when --out is omitted", () => {
    const input = writeJSONL("levels-stdout.jsonl", [
      { xsb: SMALL_ROOM, score: 500, accepted: true, pushes: 5 },
    ]);
    const { status, stdout } = run([input, "--count", "1"]);
    expect(status).toBe(0);
    expect(stdout).toContain("export const levels: string[][][] = [");
  });

  it("exits 3 when fewer accepted levels exist than --count", () => {
    const input = writeJSONL("levels-short.jsonl", [
      { xsb: SMALL_ROOM, score: 500, accepted: true, pushes: 5 },
    ]);
    const { status, stdout } = run([input, "--count", "5"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("not enough accepted levels");
  });

  it("exits 3 on a malformed JSONL line", () => {
    const file = join(dir, "malformed.jsonl");
    writeFileSync(file, "{not valid json\n");
    const { status, stdout } = run([file, "--count", "1"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("parse error");
  });

  it("exits 3 for a missing input file", () => {
    const { status, stdout } = run([join(dir, "missing.jsonl"), "--count", "1"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("cannot read file");
  });

  it("exits 3 on malformed XSB data (e.g., grid with no player)", () => {
    const input = writeJSONL("levels-bad-xsb.jsonl", [
      { xsb: "###\n#.#\n###", score: 500, accepted: true, pushes: 5 },
    ]);
    const { status, stdout } = run([input, "--count", "1"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("cannot build demo grid");
  });

  it("exits 3 on a well-formed JSON line that isn't a level record, rather than crashing", () => {
    const file = join(dir, "non-record.jsonl");
    writeFileSync(file, "null\n");
    const { status, stdout } = run([file, "--count", "1"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("parse error");
  });

  it("exits 3 when --out is the last argument, instead of silently writing to stdout", () => {
    const input = writeJSONL("levels-out-arg.jsonl", [
      { xsb: SMALL_ROOM, score: 500, accepted: true, pushes: 5 },
    ]);
    const { status, stdout } = run([input, "--count", "1", "--out"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("--out");
  });
});
