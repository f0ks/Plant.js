import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../cli/validate-microban.ts", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "sokoban-cli-vm-"));

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

describe("cli/validate-microban.ts", () => {
  it("reports a clean run for a file of well-formed, easily solved levels", () => {
    const file = writeFixture(
      "clean.txt",
      ["; 1", "", "#####", "#@$.#", "#####", "", "; 2", "", "######", "#@$ .#", "######"].join(
        "\n",
      ),
    );
    const { status, json } = run([file, "--timeout", "2000"]);

    expect(status).toBe(0);
    expect(json).toMatchObject({
      total: 2,
      structural_failures: [],
      solved: 2,
    });
  });

  it("reports structural failures without crashing, and exits nonzero", () => {
    const file = writeFixture(
      "broken.txt",
      ["; 1", "", "######", "#@$$.#", "######"].join("\n"),
    );
    const { status, json } = run([file, "--timeout", "2000"]);

    expect(status).toBe(1);
    const failures = (json as { structural_failures: unknown[] }).structural_failures;
    expect(failures.length).toBe(1);
  });

  it("exits 3 for a missing file", () => {
    const { status, json } = run([join(dir, "does-not-exist.txt")]);
    expect(status).toBe(3);
    expect((json as { error: string }).error).toBeTruthy();
  });
});
