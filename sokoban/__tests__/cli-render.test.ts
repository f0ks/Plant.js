import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli/render.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-render-"));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

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

describe("cli/render.ts", () => {
  it("prints levels ranked by score, highest first", () => {
    const file = writeJSONL("levels.jsonl", [
      { seed: 1, attempt: 1, xsb: "LOW", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 10, accepted: true },
      { seed: 1, attempt: 2, xsb: "HIGH", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 500, accepted: true },
    ]);
    const { status, stdout } = run([file]);
    expect(status).toBe(0);
    expect(stdout.indexOf("HIGH")).toBeLessThan(stdout.indexOf("LOW"));
  });

  it("respects --top", () => {
    const file = writeJSONL("levels.jsonl", [
      { seed: 1, attempt: 1, xsb: "A", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 1, accepted: true },
      { seed: 1, attempt: 2, xsb: "B", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 2, accepted: true },
      { seed: 1, attempt: 3, xsb: "C", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 3, accepted: true },
    ]);
    const { stdout } = run([file, "--top", "1"]);
    expect(stdout).toContain("C");
    expect(stdout).not.toContain("B");
    expect(stdout).not.toContain("A");
  });

  it("--accepted-only filters out rejected levels", () => {
    const file = writeJSONL("levels.jsonl", [
      { seed: 1, attempt: 1, xsb: "REJECTED", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: -1, accepted: false },
    ]);
    const { stdout } = run([file, "--accepted-only"]);
    expect(stdout).not.toContain("REJECTED");
  });

  it("exits 3 for a missing file", () => {
    const { status, stdout } = run([join(dir, "missing.jsonl")]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("cannot read file");
  });

  it("exits 3 on a non-numeric --top instead of silently printing nothing", () => {
    const file = writeJSONL("top-arg.jsonl", [
      { seed: 1, attempt: 1, xsb: "A", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 1, accepted: true },
    ]);
    const { status, stdout } = run([file, "--top", "nonsense"]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("--top");
  });

  it("rejects --top 0 and --top -1", () => {
    const file = writeJSONL("top-arg.jsonl", [
      { seed: 1, attempt: 1, xsb: "A", distance: 1, pushes: 1, lines: 1, boxes: 1, siblingLevels: 0, score: 1, accepted: true },
    ]);
    expect(run([file, "--top", "0"]).status).toBe(3);
    expect(run([file, "--top", "-1"]).status).toBe(3);
  });

  it("exits 3 with a clean error on a malformed JSONL line, rather than crashing", () => {
    const file = join(dir, "malformed.jsonl");
    writeFileSync(file, '{"seed":1,"score":1}\nnot json at all\n');
    const { status, stdout } = run([file]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("parse error");
  });

  it("exits 3 on a well-formed JSON line that isn't a level record, rather than crashing", () => {
    const file = join(dir, "non-record.jsonl");
    writeFileSync(file, "null\n");
    const { status, stdout } = run([file]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout).error).toContain("parse error");
  });
});
