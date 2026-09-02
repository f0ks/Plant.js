import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBoard } from "../board";
import { solve } from "../solver";
import { pushEvents, boxLines, countTouching, score as computeScore } from "../metrics";
import { hasFreezeDeadlock } from "../deadlock/freezeDeadlock";

const CLI = new URL("../cli/score-microban.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-sm-"));

function writeFixture(name: string, text: string): string {
  const file = join(dir, name);
  writeFileSync(file, text);
  return file;
}

function run(args: string[]): { status: number; json: unknown } {
  let stdout: string;
  let status = 0;
  try {
    stdout = execFileSync("node", [CLI, ...args], { encoding: "utf8" });
  } catch (err) {
    const e = err as { stdout: string; status: number };
    stdout = e.stdout;
    status = e.status;
  }
  return { status, json: JSON.parse(stdout) };
}

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("cli/score-microban.ts", () => {
  it("reports a score for a solved level that matches the metrics module's own computation", () => {
    const file = writeFixture("clean.txt", ["; 1", "", "#####", "#@$.#", "#####"].join("\n"));
    const { status, json } = run([file, "--timeout", "2000"]);

    expect(status).toBe(0);

    const { board, state } = buildBoard(["#####", "#@$.#", "#####"]);
    const result = solve(board, state, { timeoutMs: 2000 });
    const events = pushEvents(board, state, result.solution);
    const expectedScore = computeScore({
      pushes: result.pushes,
      lines: boxLines(events),
      boxes: state.boxes.length,
      siblingLevels: 0,
      trapped: hasFreezeDeadlock(board, state.boxes),
      touching: countTouching(board, state),
      random: 0,
    });

    const report = json as { scored: { level: number; score: number; accepted: boolean }[] };
    expect(report.scored).toHaveLength(1);
    expect(report.scored[0]).toMatchObject({ level: 1, score: expectedScore, accepted: expectedScore > 0 });
  });

  it("excludes unsolved and structurally-invalid levels from the scored list, but still counts them", () => {
    const file = writeFixture(
      "mixed.txt",
      [
        "; 1",
        "",
        "#####",
        "#@$.#",
        "#####",
        "",
        "; 2 (box/goal mismatch)",
        "",
        "######",
        "#@$$.#",
        "######",
      ].join("\n"),
    );
    const { status, json } = run([file, "--timeout", "2000"]);

    expect(status).toBe(0);
    const report = json as { total: number; scored: unknown[]; structural_failures: number };
    expect(report.total).toBe(2);
    expect(report.scored).toHaveLength(1);
    expect(report.structural_failures).toBe(1);
  });

  it("exits 3 for a missing file", () => {
    const { status, json } = run([join(dir, "does-not-exist.txt")]);
    expect(status).toBe(3);
    expect((json as { error: string }).error).toBeTruthy();
  });
});
