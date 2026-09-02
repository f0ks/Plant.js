import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli/solve.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-"));

function writeLevel(name: string, text: string): string {
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

describe("cli/solve.ts", () => {
  it("solves a trivial level and exits 0", () => {
    const file = writeLevel("solvable.xsb", "#####\n#@$.#\n#####");
    const { status, json } = run([file, "--json"]);

    expect(status).toBe(0);
    expect(json).toMatchObject({
      solvable: true,
      push_optimal: true,
      pushes: 1,
      deadlock_reason: null,
    });
    expect((json as { solution: string }).solution.length).toBeGreaterThan(0);
  });

  it("exits 1 and reports a deadlock reason for an unsolvable level", () => {
    // two disconnected rooms: the box can never reach either goal
    const file = writeLevel("deadlock.xsb", "#####\n#@$ #\n#####\n#. .#\n#####");
    const { status, json } = run([file, "--json"]);

    expect(status).toBe(1);
    expect((json as { solvable: boolean }).solvable).toBe(false);
    expect((json as { deadlock_reason: string }).deadlock_reason).toBeTruthy();
  });

  it("exits 2 on timeout", () => {
    const file = writeLevel("timeout.xsb", "######\n#    #\n#@$ .#\n#    #\n######");
    const { status, json } = run([file, "--json", "--timeout", "0"]);

    expect(status).toBe(2);
    expect((json as { deadlock_reason: string }).deadlock_reason).toBe("timeout");
  });

  it("exits 3 for a missing file", () => {
    const { status, json } = run([join(dir, "does-not-exist.xsb"), "--json"]);
    expect(status).toBe(3);
    expect((json as { error: string }).error).toBeTruthy();
  });
});
