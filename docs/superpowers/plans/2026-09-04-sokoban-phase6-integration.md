# Sokoban Phase 6 (Integration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an adapter that converts accepted `sokoban/cli/gen.ts` batch output into the demo's level format, run it once, and replace `examples/sokoban`'s five hand-authored levels with five generated ones.

**Architecture:** A pure logic module (`sokoban/demoExport.ts`) handles XSB→demo char mapping, grass-border padding, and level selection/ordering; a thin CLI wrapper (`sokoban/cli/export-demo.ts`) follows the exact same shape as the existing `sokoban/cli/render.ts` (arg parsing, JSONL read, `{"error":...}`/exit-3 convention). `examples/sokoban/sokoban.ts` is not touched — it keeps loading `string[][][]` exactly as today.

**Tech Stack:** TypeScript (Node 24 native `.ts` execution, no ts-node/tsx), vitest, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-04-sokoban-phase6-integration-design.md`

## Global Constraints

- No changes to `examples/sokoban/sokoban.ts`'s runtime loading logic.
- No new npm dependency — reuse Node 24's native `.ts` execution, matching every other `sokoban/cli/*.ts` tool.
- CLI errors use the existing `{"error": "..."}` to stdout + exit code 3 convention (see `render.ts`, `gen.ts`).
- `demoExport.ts` must import `xsb.ts`/`board.ts` with explicit `.ts` extensions (Node ESM requirement — see `generator.ts`'s own imports); test files import without extensions (vitest resolves them), matching `board.test.ts`.
- Char mapping XSB → demo: `#`→`D`, `@`→`@`, `+`→`%`, `$`→`B`, `*`→`$`, `.`→`*`, floor→`-` (note the `*`/`.`/`$` swap between the two formats — this is not a literal substitution).
- After implementation: `npm run typecheck`, `npm run typecheck:sokoban`, and `npm test` must all pass (per `CLAUDE.md`).
- `docs/level-generation.md` must be updated with a Phase 6 section per `CLAUDE.md`'s "always update documentation" rule.

---

### Task 1: `sokoban/demoExport.ts` — char mapping, border, and level selection

**Files:**
- Create: `sokoban/demoExport.ts`
- Test: `sokoban/__tests__/demoExport.test.ts`

**Interfaces:**
- Consumes: `parseXSB(text: string): XSBLevel` and `XSBLevel.rows: string[]` from `sokoban/xsb.ts`; `buildBoard(rows: string[]): { board: Board; state: State }` and `boardToRows(board: Board, state: State): string[]` from `sokoban/board.ts`.
- Produces (used by Task 2):
  - `export interface DemoSourceLevel { xsb: string; score: number; accepted: boolean; pushes: number; }`
  - `export function xsbToDemoGrid(xsb: string): string[][]`
  - `export function selectDemoLevels(levels: DemoSourceLevel[], count: number): DemoSourceLevel[]`

- [ ] **Step 1: Write the failing tests for `selectDemoLevels`**

Create `sokoban/__tests__/demoExport.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { selectDemoLevels, xsbToDemoGrid } from "../demoExport";
import type { DemoSourceLevel } from "../demoExport";

describe("selectDemoLevels", () => {
  it("drops rejected levels, keeps only accepted ones", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "A", score: 100, accepted: true, pushes: 5 },
      { xsb: "B", score: 900, accepted: false, pushes: 1 },
    ];
    const selected = selectDemoLevels(levels, 1);
    expect(selected.map((l) => l.xsb)).toEqual(["A"]);
  });

  it("selects the top `count` accepted levels by score, then re-sorts the selection by pushes ascending", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "L1-high-score-high-pushes", score: 500, accepted: true, pushes: 20 },
      { xsb: "L2-low-score", score: 10, accepted: true, pushes: 1 },
      { xsb: "L3-mid-score-low-pushes", score: 300, accepted: true, pushes: 5 },
    ];
    const selected = selectDemoLevels(levels, 2);
    // L2 (score 10) is excluded by the score cutoff even though it has the
    // fewest pushes; among the two selected (L1, L3), output order is by
    // pushes ascending, not by score.
    expect(selected.map((l) => l.xsb)).toEqual([
      "L3-mid-score-low-pushes",
      "L1-high-score-high-pushes",
    ]);
  });

  it("returns fewer than `count` levels if fewer accepted levels exist", () => {
    const levels: DemoSourceLevel[] = [
      { xsb: "A", score: 100, accepted: true, pushes: 5 },
    ];
    const selected = selectDemoLevels(levels, 5);
    expect(selected.length).toBe(1);
  });
});

describe("xsbToDemoGrid", () => {
  it("maps walls, player, box, box-on-goal, goal and floor to the demo char set", () => {
    const grid = xsbToDemoGrid("#####\n#@$.#\n#####");
    // Interior row (index 2 of 5 after the +1 border row) is:
    // border G, D (wall), @, B (box), * (goal), D (wall), border G
    expect(grid[2]).toEqual(["G", "D", "@", "B", "*", "D", "G"]);
  });

  it("maps box-on-goal ('*' in XSB) to '$' and player-on-goal ('+' in XSB) to '%'", () => {
    const grid = xsbToDemoGrid("#####\n#@*.#\n#####");
    expect(grid[2]).toEqual(["G", "D", "@", "$", "*", "D", "G"]);

    const onGoalGrid = xsbToDemoGrid("#####\n#+  #\n#####");
    expect(onGoalGrid[2]).toEqual(["G", "D", "%", "-", "-", "D", "G"]);
  });

  it("pads the parsed board with a 1-cell grass border on all four sides", () => {
    const grid = xsbToDemoGrid("#####\n#@$.#\n#####");
    // 5 wide x 3 tall board -> 7 wide x 5 tall grid after the border.
    expect(grid.length).toBe(5);
    for (const row of grid) expect(row.length).toBe(7);
    expect(grid[0]).toEqual(["G", "G", "G", "G", "G", "G", "G"]);
    expect(grid[4]).toEqual(["G", "G", "G", "G", "G", "G", "G"]);
    for (const row of grid) {
      expect(row[0]).toBe("G");
      expect(row[row.length - 1]).toBe("G");
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/demoExport.test.ts`
Expected: FAIL — `../demoExport` has no exported members (module doesn't exist yet).

- [ ] **Step 3: Implement `sokoban/demoExport.ts`**

```ts
import { parseXSB } from "./xsb.ts";
import { buildBoard, boardToRows } from "./board.ts";

export interface DemoSourceLevel {
  xsb: string;
  score: number;
  accepted: boolean;
  pushes: number;
}

const XSB_TO_DEMO: Record<string, string> = {
  "#": "D",
  "@": "@",
  "+": "%",
  "$": "B",
  "*": "$",
  ".": "*",
  " ": "-",
};

/**
 * Converts one XSB level into the demo's `string[][]` grid format,
 * remapping the char set (note '*'/'.'/'$' mean different things in each
 * format) and padding with a 1-cell 'G' (grass) border on all sides to
 * match the demo's existing decorative style.
 */
export function xsbToDemoGrid(xsb: string): string[][] {
  const { rows } = parseXSB(xsb);
  const { board, state } = buildBoard(rows);
  const normalized = boardToRows(board, state);

  const border = new Array(board.width + 2).fill("G") as string[];
  const grid: string[][] = [border];

  for (const row of normalized) {
    const mapped = [...row].map((ch) => {
      const demo = XSB_TO_DEMO[ch];
      if (demo === undefined) {
        throw new Error(`xsbToDemoGrid: unmapped XSB character ${JSON.stringify(ch)}`);
      }
      return demo;
    });
    grid.push(["G", ...mapped, "G"]);
  }

  grid.push([...border]);
  return grid;
}

/**
 * Filters to accepted levels, takes the top `count` by score, then
 * re-sorts that selection by push count ascending so the demo still
 * ramps up in difficulty the way its hand-authored levels did — "best by
 * score" and "presented easiest-to-hardest" are different orderings.
 */
export function selectDemoLevels(
  levels: DemoSourceLevel[],
  count: number,
): DemoSourceLevel[] {
  const accepted = levels.filter((l) => l.accepted);
  const byScore = [...accepted].sort((a, b) => b.score - a.score);
  const top = byScore.slice(0, count);
  return top.sort((a, b) => a.pushes - b.pushes);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/demoExport.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck:sokoban`
Expected: no errors

```bash
git add sokoban/demoExport.ts sokoban/__tests__/demoExport.test.ts
git commit -m "$(cat <<'EOF'
Add demoExport: XSB-to-demo char mapping and level selection (Phase 6 part 1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQv2ajfEDgqQrRgqHZXQ9z
EOF
)"
```

---

### Task 2: `sokoban/cli/export-demo.ts` — CLI wrapper

**Files:**
- Create: `sokoban/cli/export-demo.ts`
- Test: `sokoban/__tests__/cli-export-demo.test.ts`

**Interfaces:**
- Consumes: `DemoSourceLevel`, `xsbToDemoGrid`, `selectDemoLevels` from `sokoban/demoExport.ts` (Task 1).
- Produces: a runnable CLI, `node sokoban/cli/export-demo.ts <levels.jsonl> --count N [--out path]`, invoked by Task 3.

- [ ] **Step 1: Write the failing CLI tests**

Create `sokoban/__tests__/cli-export-demo.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/cli-export-demo.test.ts`
Expected: FAIL — `sokoban/cli/export-demo.ts` does not exist (`ENOENT`/module not found from `execFileSync`).

- [ ] **Step 3: Implement `sokoban/cli/export-demo.ts`**

```ts
#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { selectDemoLevels, xsbToDemoGrid } from "../demoExport.ts";
import type { DemoSourceLevel } from "../demoExport.ts";

interface Args {
  file?: string;
  count: number;
  out?: string;
}

function parsePositiveInt(flag: string, raw: string | undefined): number {
  const value = Number(raw);
  if (raw === undefined || raw === "" || !Number.isInteger(value) || value < 1) {
    throw new Error(`export-demo.ts: ${flag} expects a positive integer, got ${JSON.stringify(raw)}`);
  }
  return value;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let count = 5;
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") count = parsePositiveInt("--count", argv[++i]);
    else if (arg === "--out") out = argv[++i];
    else if (!arg.startsWith("--") && file === undefined) file = arg;
    else throw new Error(`export-demo.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { file, count, out };
}

/** Same `{"error": ...}` / exit 3 shape as the other sokoban CLI tools. */
function emitError(message: string): number {
  console.log(JSON.stringify({ error: message }));
  return 3;
}

function formatGrid(grid: string[][]): string {
  const rows = grid.map((row) => `    [${row.map((c) => JSON.stringify(c)).join(", ")}],`);
  return `  [\n${rows.join("\n")}\n  ],`;
}

function formatLevelsFile(levels: DemoSourceLevel[]): string {
  const header = [
    "// @ player",
    "// G grass",
    "// D block (wall)",
    "// B box",
    "// * spot (target)",
    "// $ box on spot",
    "// % player on spot",
    "// - empty floor",
    "",
    "export const levels: string[][][] = [",
  ].join("\n");

  const body = levels.map((l) => formatGrid(xsbToDemoGrid(l.xsb))).join("\n");

  return `${header}\n${body}\n];\n`;
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    return emitError((err as Error).message);
  }

  if (!args.file) {
    return emitError("usage: export-demo.ts <levels.jsonl> [--count N] [--out path]");
  }

  let text: string;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (err) {
    return emitError(`cannot read file: ${(err as Error).message}`);
  }

  let levels: DemoSourceLevel[];
  try {
    levels = text
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  } catch (err) {
    return emitError(`parse error: ${(err as Error).message}`);
  }

  const selected = selectDemoLevels(levels, args.count);
  if (selected.length < args.count) {
    return emitError(
      `not enough accepted levels: found ${selected.length}, need ${args.count}`,
    );
  }

  const output = formatLevelsFile(selected);

  if (args.out) {
    try {
      writeFileSync(args.out, output);
    } catch (err) {
      return emitError(`cannot write ${args.out}: ${(err as Error).message}`);
    }
  } else {
    process.stdout.write(output);
  }

  return 0;
}

process.exit(main());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/cli-export-demo.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck:sokoban`
Expected: no errors

```bash
git add sokoban/cli/export-demo.ts sokoban/__tests__/cli-export-demo.test.ts
git commit -m "$(cat <<'EOF'
Add export-demo CLI: node sokoban/cli/export-demo.ts levels.jsonl (Phase 6 part 2)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQv2ajfEDgqQrRgqHZXQ9z
EOF
)"
```

---

### Task 3: Run the pipeline and replace the demo's levels

**Files:**
- Modify: `examples/sokoban/levels.ts` (fully regenerated content — this task replaces the file, it doesn't hand-edit it)

**Interfaces:**
- Consumes: `node sokoban/cli/gen.ts batch ...` (existing, Phase 5) and `node sokoban/cli/export-demo.ts ...` (Task 2), run as CLI commands — no code-level interface.

- [ ] **Step 1: Generate a batch**

Create a temp working directory and generate into it (the intermediate JSONL is not committed):

```bash
WORKDIR=$(mktemp -d)
node sokoban/cli/gen.ts batch --count 30 --seed 1 --box-count 3 \
  --block-cols 2 --block-rows 2 \
  --out "$WORKDIR/phase6-levels.jsonl"
```

Expected: stderr prints `{"requested":30,"generated":30,"attempts":N}` and exit code 0. Note the actual `attempts` value and at least the top few scores/pushes for the docs update in Task 4 — this must be the real output, not a predicted number.

- [ ] **Step 2: Confirm at least 5 accepted levels exist**

```bash
grep -c '"accepted":true' "$WORKDIR/phase6-levels.jsonl"
```

Expected: 5 or more. If fewer than 5, re-run Step 1 with a higher `--count` (e.g. 60) before proceeding — do not lower `--count` on `export-demo.ts` to work around it, since the design calls for exactly 5 demo levels.

- [ ] **Step 3: Export the top 5 into the demo**

```bash
node sokoban/cli/export-demo.ts "$WORKDIR/phase6-levels.jsonl" --count 5 \
  --out examples/sokoban/levels.ts
```

Expected: exit code 0, `examples/sokoban/levels.ts` overwritten.

- [ ] **Step 4: Verify the file is well-formed TypeScript**

```bash
npm run typecheck
```

Expected: no errors (this compiles `examples/sokoban/levels.ts` along with the rest of `src`/`examples` under the root `tsconfig.json`).

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including the new `demoExport.test.ts` and `cli-export-demo.test.ts` from Tasks 1-2.

- [ ] **Step 6: Manually verify the demo in a browser**

```bash
npm run dev
```

Open the printed local URL's `/examples/sokoban/` path. Confirm:
- The level-select bar shows 5 buttons.
- Level 1 renders a fully enclosed room with a grass border, walls, at least one box, and at least one goal spot — no missing sprites, no console errors.
- Arrow keys move the player; pushing a box onto a goal changes its sprite (per `sokoban.ts`'s existing `bspot.png` swap).
- Click through levels 2-5 and confirm each renders as a closed room (no visibly broken/degenerate layout).

Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add examples/sokoban/levels.ts
git commit -m "$(cat <<'EOF'
Replace hand-authored demo levels with 5 generated ones (Phase 6 part 3)

node sokoban/cli/gen.ts batch --count 30 --seed 1 --box-count 3 \
  --block-cols 2 --block-rows 2, then node sokoban/cli/export-demo.ts
--count 5, per docs/superpowers/specs/2026-09-04-sokoban-phase6-integration-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQv2ajfEDgqQrRgqHZXQ9z
EOF
)"
```

---

### Task 4: Document Phase 6 in `docs/level-generation.md`

**Files:**
- Modify: `docs/level-generation.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Update the top status line**

Find the line near the top of the file (currently line 3-6):

```
Status: Phases 0-5 complete (design note, XSB/board/state core, the
push-optimal solver with all four planned deadlock/pruning techniques, the
Microban validation gate, metrics/scoring calibration, and the generator
itself). Not yet started: Phase 6 (integration).
```

Replace with:

```
Status: Phases 0-6 complete (design note, XSB/board/state core, the
push-optimal solver with all four planned deadlock/pruning techniques, the
Microban validation gate, metrics/scoring calibration, the generator
itself, and the demo-app integration adapter).
```

- [ ] **Step 2: Add a "Phase 6: integration" section**

Insert a new `## Phase 6: integration` section directly above the existing `## Phase 5: the generator` heading, containing:
- What the gap was (generator output never reached `examples/sokoban`, which shipped a private non-XSB grid format).
- The two new files (`sokoban/demoExport.ts`, `sokoban/cli/export-demo.ts`) and what each does — one paragraph, cross-referencing the char-mapping table below.
- The char-mapping table (copy from the spec — `#`→`D`, `@`→`@`, `+`→`%`, `$`→`B`, `*`→`$`, `.`→`*`, floor→`-`), with a one-line note that `*`/`.`/`$` mean different things in the two formats.
- The grass-border decision (1-cell `G` padding on all sides, matching the demo's existing decorative style) and why (visual consistency, no `sokoban.ts` changes needed since `G` is already a wall-equivalent character there).
- The selection/ordering rule (`selectDemoLevels`: top N accepted by score, then re-sorted by push count ascending) and why score-order and difficulty-order are different orderings.
- **The actual command run and its real output** (per this doc's own established style in Phases 3-5 — real numbers, not predicted ones): the exact `gen.ts batch` invocation from Task 3 Step 1, its real `{"requested":...,"generated":...,"attempts":...}` output, and the 5 selected levels' real `score`/`pushes` values (from the JSONL, matched to what ended up in `examples/sokoban/levels.ts`).
- One line noting `examples/sokoban/levels.ts` now ships 5 generated levels, replacing the 5 hand-authored ones, and that `examples/sokoban/sokoban.ts` needed no changes since the output format is identical to what it already loads.

- [ ] **Step 3: Commit**

```bash
git add docs/level-generation.md
git commit -m "$(cat <<'EOF'
Document Phase 6 (integration) in docs/level-generation.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQv2ajfEDgqQrRgqHZXQ9z
EOF
)"
```
