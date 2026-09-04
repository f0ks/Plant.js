import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli/gen.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-gen-"));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(args: string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], { encoding: "utf8" });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string };
    return { status: e.status, stdout: e.stdout, stderr: e.stderr };
  }
}

describe("cli/gen.ts", () => {
  it("writes the requested count of scored levels as JSONL and exits 0", () => {
    const out = join(dir, "levels.jsonl");
    const { status } = run([
      "batch", "--count", "3", "--seed", "1", "--box-count", "2",
      "--block-cols", "2", "--block-rows", "2", "--out", out,
    ]);
    expect(status).toBe(0);

    const lines = readFileSync(out, "utf8").trim().split("\n");
    expect(lines.length).toBe(3);
    for (const line of lines) {
      const level = JSON.parse(line);
      expect(level.xsb).toContain("#");
      expect(level.pushes).toBeGreaterThan(0);
      expect(typeof level.score).toBe("number");
      expect(typeof level.accepted).toBe("boolean");
    }
  });

  it("is deterministic for a fixed seed", () => {
    const out1 = join(dir, "a.jsonl");
    const out2 = join(dir, "b.jsonl");
    run(["batch", "--count", "2", "--seed", "7", "--box-count", "2", "--block-cols", "2", "--block-rows", "2", "--out", out1]);
    run(["batch", "--count", "2", "--seed", "7", "--box-count", "2", "--block-cols", "2", "--block-rows", "2", "--out", out2]);
    expect(readFileSync(out1, "utf8")).toBe(readFileSync(out2, "utf8"));
  });

  it("exits 3 on an unrecognized argument", () => {
    const { status } = run(["batch", "--nonsense", "1"]);
    expect(status).toBe(3);
  });

  it("reports an unwritable --out path as a clean JSON error, not a stack trace", () => {
    const out = join(dir, "no-such-directory", "levels.jsonl");
    const { status, stdout, stderr } = run([
      "batch", "--count", "1", "--seed", "1", "--box-count", "2",
      "--block-cols", "2", "--block-rows", "2", "--out", out,
    ]);
    expect(status).toBe(3);
    expect(JSON.parse(stdout.trim()).error).toContain("cannot write");
    expect(stderr).not.toContain("ENOENT");
  });
});
