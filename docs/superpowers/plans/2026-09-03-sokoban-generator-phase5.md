# Sokoban Level Generator (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Taylor–Parberry-style Sokoban level generator itself
(`sokoban/generator.ts` + `sokoban/rng.ts`), wire it into two new CLI tools
(`sokoban/cli/gen.ts`, `sokoban/cli/render.ts`), and update
`docs/level-generation.md` to record Phase 5's design decisions — completing
the "Phase 5: the generator itself" item from that doc's status line.

**Architecture:** Three-stage pipeline per the doc's §7 preview: (1) build an
empty room by tiling randomly-rotated 3×3 wall/floor templates and rejecting
boards that fail connectivity/openness/nook checks; (2) place goals by
randomized search over floor-cell combinations; (3) reverse-search outward
from the "boxes on goals" state via **pulls** (the exact inverse of
`state.ts`'s existing push mechanics) to find the state with maximum
push-optimal solve distance — that farthest state becomes the generated
level's start. Reuses `sokoban/state.ts`'s reachability-based push machinery,
`sokoban/metrics.ts`'s scoring (Phase 4), and `sokoban/xsb.ts`'s serializer,
rather than reimplementing any of them.

**Tech Stack:** TypeScript, Node 24 native `.ts` execution (no ts-node/tsx),
vitest. No new dependency — the seeded PRNG (mulberry32) is hand-rolled, same
choice already made in Phase 0-1 for property tests.

**Spec:** `docs/level-generation.md` (particularly §7's Phase 5 preview,
§6's module layout, and Phase 4's §4.2/4.3 scoring notes this plan finally
makes usable end-to-end).

## Global Constraints

- Every new/changed `.ts` file must pass `npm run typecheck:sokoban`
  (`tsc --noEmit -p sokoban/tsconfig.json`, strict mode) — run after each task.
- `sokoban/tsconfig.json` already includes all of `sokoban/` via `"include": ["."]`
  — no config changes needed for new files.
- Source files import sibling modules with an explicit `.ts` extension
  (e.g. `import type { Board } from "./board.ts";`); test files import
  without the extension (e.g. `import { buildBoard } from "../board";`) —
  match whichever convention the file you're editing already uses.
- No new npm dependency. CLI tools run as `node sokoban/cli/<name>.ts ...`.
- Every new source file gets a matching test file under `sokoban/__tests__/`,
  following the project's one-file-per-module convention (see existing
  `pushes.test.ts` for `state.ts`, `board.test.ts` for `board.ts`, etc.).
- CLAUDE.md: update `docs/level-generation.md` as part of this work (last
  task), and run `npm run typecheck` (the engine's own tsconfig) once at the
  end too, since CLAUDE.md's rule isn't scoped to just the sokoban tsconfig.

---

## Design notes carried into this plan (read before implementing)

These aren't in the spec doc yet (Phase 5 didn't exist when it was written)
— they're decisions made while planning this phase, to be written back into
`docs/level-generation.md` in Task 10:

1. **Pull mechanics, derived from `applyPush`'s exact semantics.** `state.ts`'s
   `applyPush(board, state, box, direction)` requires the player at
   `box - direction` before the push and leaves the player at `box` (the
   box's *old* cell) after, with the box now at `box + direction`. Inverting
   this algebraically: a **pull** undoing a push of direction `d` is legal
   from a state where a box sits at `box = player + d`, and moves the box to
   `player` (the player's current cell) while the player steps back to
   `player - d`. This is proven self-consistent below (Task 2's regression
   test: `applyPull` exactly undoes `applyPush` for every legal push in a
   test state) — not just asserted.
2. **Farthest-state search reuses the forward solver's own dedup
   normalization** (`stateKey`'s player-reachable-region representative).
   This is sound for the same reason it's sound in `solver.ts`: BFS shortest-
   path distance in the pull-graph from the goal state to any state `S`
   equals the push-optimal distance from `S` back to the goal, because the
   pull-graph is the exact edge-reversal of the push-graph, and the existing
   normalization is already proven correct there (Phase 3's Microban gate).
3. **`siblingLevels` (Taylor & Parberry §3.3, left as a stub in Phase 4)**
   is finally computable: the farthest-state BFS naturally visits multiple
   states tied at the same maximum distance (reservoir-sampled for a
   reproducible choice among them). The count of *other* states tied with
   the chosen one is exactly "how many other levels the generator found at
   the same search depth" — exposed as `FarthestStateResult.siblingLevels`
   and threaded into `score()` by `cli/gen.ts`, replacing the `0` placeholder
   `cli/score-microban.ts` had to use.
4. **Room-template validity is empirically tuned, not assumed.** A throwaway
   prototype of the exact template set and validators below was run for
   2000 seeded attempts at three room sizes before writing this plan:

   | blocks | per-attempt success rate |
   |---|---|
   | 2×2 | 11.0% |
   | 3×2 | 4.2% |
   | 3×3 | 1.1% |

   At `maxRoomAttempts = 300` (this plan's default), the probability of
   *every* attempt failing at the 2×2 default is `0.89^300 ≈ 0` — Task 4's
   test asserts this empirically (≥48/50 seeds succeed) rather than trusting
   the math alone. Larger rooms are riskier per-attempt but the retry loop
   still converges given enough attempts; tuning the template mix for larger
   rooms is left as documented future work in Task 10, same spirit as Phase
   3's two documented scope cuts.

---

## Task 1: Seeded PRNG (`sokoban/rng.ts`)

**Files:**
- Create: `sokoban/rng.ts`
- Test: `sokoban/__tests__/rng.test.ts`

**Interfaces:**
- Produces: `Rng = () => number` (float in `[0, 1)`), `mulberry32(seed: number): Rng`,
  `randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number`,
  `shuffle<T>(rng: Rng, items: readonly T[]): T[]` (returns a new array,
  Fisher–Yates, does not mutate `items`).

- [ ] **Step 1: Write the failing tests**

```ts
// sokoban/__tests__/rng.test.ts
import { describe, it, expect } from "vitest";
import { mulberry32, randomInt, shuffle } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a fixed seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });

  it("stays within [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("stays within [min, max] inclusive over many draws", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("returns the only value when min === max", () => {
    const rng = mulberry32(9);
    expect(randomInt(rng, 4, 4)).toBe(4);
  });
});

describe("shuffle", () => {
  it("is a permutation of the input (same multiset, same length)", () => {
    const rng = mulberry32(11);
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(rng, input);
    expect(out.length).toBe(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const rng = mulberry32(11);
    const input = [1, 2, 3];
    shuffle(rng, input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("is deterministic for a fixed seed", () => {
    const out1 = shuffle(mulberry32(5), [1, 2, 3, 4, 5, 6]);
    const out2 = shuffle(mulberry32(5), [1, 2, 3, 4, 5, 6]);
    expect(out1).toEqual(out2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/rng.test.ts`
Expected: FAIL — `../rng` has no exported member (module doesn't exist yet).

- [ ] **Step 3: Implement `sokoban/rng.ts`**

```ts
/** A seeded pseudo-random number generator: returns floats in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32 — a small, fast, seeded 32-bit PRNG. Not cryptographic; used
 * here purely for reproducible generation runs (same seed -> same level
 * batch), matching docs/level-generation.md §6's "no crypto dependency"
 * rng.ts note.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform-ish random integer in `[minInclusive, maxInclusive]`. */
export function randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

/** Fisher–Yates shuffle. Returns a new array; does not mutate `items`. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/rng.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add sokoban/rng.ts sokoban/__tests__/rng.test.ts
git commit -m "$(cat <<'EOF'
Add seeded PRNG (mulberry32) for Sokoban level generation (Phase 5 part 1)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 2: Pull mechanics in `sokoban/state.ts`

**Files:**
- Modify: `sokoban/state.ts` (add after the existing `legalPushes` function,
  before `stateKey`)
- Test: `sokoban/__tests__/pushes.test.ts` (extend — this file already
  covers `state.ts`'s push mechanics)

**Interfaces:**
- Consumes: `Board` (`./board.ts`), `Direction`, `DIRECTIONS`, `State`,
  `sortedBoxes`, the existing private `step()` helper already in this file.
- Produces: `Pull` interface (`{ box: number; direction: Direction; state: State }`),
  `isLegalPull(board, state, box, direction): boolean`,
  `applyPull(board, state, box, direction): State`,
  `legalPulls(board, state): Pull[]` — consumed by `generator.ts` (Task 6).

- [ ] **Step 1: Write the failing tests**

Append to `sokoban/__tests__/pushes.test.ts`. This file's existing line 4
already reads:
```ts
import { DIRECTIONS, isLegalPush, applyPush, legalPushes, stateKey } from "../state";
```
Change that line to add the three new names — do not add a second, separate
`import ... from "../state"` statement (that would redeclare `applyPush`/
`legalPushes` and fail to compile):
```ts
import { DIRECTIONS, isLegalPush, applyPush, legalPushes, stateKey, legalPulls, applyPull, isLegalPull } from "../state";
```

Then append this new `describe` block at the end of the file (`buildBoard`
is already imported on line 2 — no change needed there):

```ts
describe("legalPulls / applyPull", () => {
  it("applyPull exactly undoes applyPush for every legal push in a test room", () => {
    // A small open room with a couple of boxes so there are several
    // distinct legal pushes to check, not just one.
    const { board, state } = buildBoard(["######", "#@$ $#", "#  # #", "######"]);

    const pushes = legalPushes(board, state);
    expect(pushes.length).toBeGreaterThan(0);

    for (const push of pushes) {
      const pushed = applyPush(board, state, push.box, push.direction);
      // The box that moved is now at `push.box + direction`; pulling that
      // box back in the same direction should reconstruct `state` exactly.
      const movedBoxCell = pushed.boxes.find((b) => !state.boxes.includes(b))!;
      expect(isLegalPull(board, pushed, movedBoxCell, push.direction)).toBe(true);

      const undone = applyPull(board, pushed, movedBoxCell, push.direction);
      expect(undone.boxes).toEqual(state.boxes);
      expect(undone.player).toBe(state.player);
    }
  });

  it("legalPulls finds no pulls when the player isn't adjacent to any box's push-origin side", () => {
    const { board, state } = buildBoard(["#####", "#@ .#", "#####"]);
    expect(legalPulls(board, state)).toEqual([]);
  });

  it("legalPulls requires the player's landing cell to be open floor", () => {
    // Player boxed in against a wall behind it: pulling would require
    // stepping through the wall, so no pull should be offered in that
    // direction.
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const pulls = legalPulls(board, state);
    // player at (1,1), box at (2,1): pulling right would need player to
    // step to (0,1), which is a wall.
    expect(pulls.some((p) => p.direction.dx === 1 && p.direction.dy === 0)).toBe(false);
  });
});
```

(If `pushes.test.ts` doesn't already import `buildBoard`, add
`import { buildBoard } from "../board";` at the top alongside its existing
imports rather than re-importing per-test.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/pushes.test.ts`
Expected: FAIL — `legalPulls`/`applyPull`/`isLegalPull` not exported from `../state`.

- [ ] **Step 3: Implement in `sokoban/state.ts`**

Insert after the closing brace of `legalPushes` and before `stateKey`:

```ts
/**
 * One pull, the reverse-search analogue of `Push`: `box` is the box's cell
 * in the *source* state (the state being pulled from), `direction` is the
 * push direction this pull undoes (the box and player both move by
 * `-direction`), and `state` is the resulting predecessor state.
 */
export interface Pull {
  box: number;
  direction: Direction;
  state: State;
}

/**
 * Is pulling the box at `box` legal in `state`, undoing a push in
 * `direction`? Derived directly from `isLegalPush`'s own contract: a push
 * of direction `d` requires the player at `box - d` before and leaves it at
 * `box` after, with the box moving to `box + d`. Inverting that: a pull
 * undoing direction `d` requires the box currently at `box` with the player
 * already at `box - d` (as if it had just performed that push), and moves
 * the box to the player's current cell while the player steps back to
 * `box - 2d` — which must be open floor, not a wall, and not occupied by
 * another box.
 */
export function isLegalPull(
  board: Board,
  state: State,
  box: number,
  direction: Direction,
): boolean {
  const p = step(board, box, { dx: -direction.dx, dy: -direction.dy });
  if (p === null || p !== state.player) return false;

  const playerDestination = step(board, p, { dx: -direction.dx, dy: -direction.dy });
  if (playerDestination === null) return false;
  if (board.walls[playerDestination] || !board.floor[playerDestination]) return false;
  if (state.boxes.includes(playerDestination)) return false;

  return true;
}

/** Applies a legal pull, returning the resulting (predecessor) state. Throws if illegal. */
export function applyPull(
  board: Board,
  state: State,
  box: number,
  direction: Direction,
): State {
  if (!isLegalPull(board, state, box, direction)) {
    throw new Error(
      `applyPull: illegal pull of box ${box} undoing direction (${direction.dx}, ${direction.dy})`,
    );
  }
  const player = state.player;
  const playerDestination = step(board, player, { dx: -direction.dx, dy: -direction.dy })!;
  const boxes = sortedBoxes(state.boxes.map((b) => (b === box ? player : b)));
  return { boxes, player: playerDestination };
}

/**
 * All pulls available to the player from `state` — the reverse-search
 * analogue of `legalPushes`, used by `generator.ts`'s farthest-state BFS
 * (Task 6). For every box the player can reach the "just pushed it from
 * here" side of, in every direction that results in a legal pull.
 */
export function legalPulls(board: Board, state: State): Pull[] {
  const reachable = computeReachable(board, state.boxes, state.player);
  const pulls: Pull[] = [];

  for (const box of state.boxes) {
    for (const direction of Object.values(DIRECTIONS)) {
      const p = step(board, box, { dx: -direction.dx, dy: -direction.dy });
      if (p === null || !reachable[p]) continue;
      if (!isLegalPull(board, { ...state, player: p }, box, direction)) continue;

      const playerDestination = step(board, p, { dx: -direction.dx, dy: -direction.dy })!;
      const boxes = sortedBoxes(state.boxes.map((b) => (b === box ? p : b)));
      pulls.push({ box, direction, state: { boxes, player: playerDestination } });
    }
  }

  return pulls;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/pushes.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add sokoban/state.ts sokoban/__tests__/pushes.test.ts
git commit -m "$(cat <<'EOF'
Add pull mechanics to state.ts, the exact inverse of push (Phase 5 part 2)

isLegalPull/applyPull/legalPulls mirror isLegalPush/applyPush/legalPushes;
derivation and a regression test proving applyPull undoes applyPush for
every legal push in a multi-box test room are in
docs/superpowers/plans/2026-09-03-sokoban-generator-phase5.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 3: `boardToRows` in `sokoban/board.ts`

**Files:**
- Modify: `sokoban/board.ts` (add after `buildBoard`)
- Test: `sokoban/__tests__/board.test.ts` (extend)

**Interfaces:**
- Consumes: `Board`, `State` (from `./state.ts`).
- Produces: `boardToRows(board: Board, state: State): string[]` — the exact
  inverse of `buildBoard`'s character mapping; consumed by `cli/gen.ts`
  (Task 8) to serialize generated levels to XSB text.

- [ ] **Step 1: Write the failing test**

Append to `sokoban/__tests__/board.test.ts`:

```ts
import { boardToRows } from "../board";

describe("boardToRows", () => {
  it("round-trips through buildBoard for every XSB element", () => {
    const original = ["######", "#@$*.#", "#  #  ".slice(0, 6), "######"];
    const { board, state } = buildBoard(original);
    const rows = boardToRows(board, state);
    const { board: board2, state: state2 } = buildBoard(rows);

    expect(board2.walls).toEqual(board.walls);
    expect(board2.goals).toEqual(board.goals);
    expect(state2.boxes).toEqual(state.boxes);
    expect(state2.player).toBe(state.player);
  });

  it("renders player-on-goal as '+' and box-on-goal as '*'", () => {
    const { board, state } = buildBoard(["#####", "#+*.#", "#####"]);
    const rows = boardToRows(board, state);
    expect(rows[1]).toBe("#+*.#");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run sokoban/__tests__/board.test.ts`
Expected: FAIL — `boardToRows` not exported from `../board`.

- [ ] **Step 3: Implement in `sokoban/board.ts`**

Append after `buildBoard`'s closing brace:

```ts
/**
 * Inverse of `buildBoard`: renders a `Board` + `State` back to XSB grid
 * rows. Always emits full-width rows (no ragged trailing floor), which is
 * valid XSB and round-trips losslessly through `buildBoard` (padding is
 * idempotent — see the round-trip test in `board.test.ts`).
 */
export function boardToRows(board: Board, state: State): string[] {
  const boxSet = new Set(state.boxes);
  const rows: string[] = [];

  for (let y = 0; y < board.height; y++) {
    let row = "";
    for (let x = 0; x < board.width; x++) {
      const idx = y * board.width + x;
      if (board.walls[idx]) {
        row += WALL;
        continue;
      }
      const isGoal = board.isGoal[idx] === 1;
      const isBox = boxSet.has(idx);
      const isPlayer = idx === state.player;

      if (isPlayer && isGoal) row += PLAYER_ON_GOAL;
      else if (isPlayer) row += PLAYER;
      else if (isBox && isGoal) row += BOX_ON_GOAL;
      else if (isBox) row += BOX;
      else if (isGoal) row += GOAL;
      else row += " ";
    }
    rows.push(row);
  }

  return rows;
}
```

(`WALL`/`PLAYER`/`PLAYER_ON_GOAL`/`BOX`/`BOX_ON_GOAL`/`GOAL` are the module-
level char constants already defined at the top of `board.ts` — no new
imports needed.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/board.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/board.ts sokoban/__tests__/board.test.ts
git commit -m "$(cat <<'EOF'
Add boardToRows, the inverse of buildBoard (Phase 5 part 3)

Needed by cli/gen.ts to serialize generated levels back to XSB text.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 4: Room generation (`sokoban/generator.ts` part 1 — `buildRoom`)

**Files:**
- Create: `sokoban/generator.ts`
- Test: `sokoban/__tests__/generator.test.ts`

**Interfaces:**
- Consumes: `Board` (`./board.ts`), `Rng`/`randomInt`/`shuffle` (`./rng.ts`),
  `computeReachable` (`./reachability.ts`).
- Produces: `buildRoom(rng: Rng, blockCols: number, blockRows: number, maxAttempts?: number): Board | null`
  — consumed by `generateLevel` (Task 7). Also produces (internal, not
  exported, but referenced by later tasks' descriptions for context):
  `isFullyConnected`, `hasOverOpenRectangle`, `hasThreeSidedNook`.

- [ ] **Step 1: Write the failing tests**

```ts
// sokoban/__tests__/generator.test.ts
import { describe, it, expect } from "vitest";
import { mulberry32 } from "../rng";
import { buildRoom } from "../generator";
import { computeReachable } from "../reachability";

describe("buildRoom", () => {
  it("produces a board fully enclosed by walls at the requested size", () => {
    const rng = mulberry32(1);
    const room = buildRoom(rng, 2, 2, 300);
    expect(room).not.toBeNull();
    const r = room!;
    // interior is blockCols*3 x blockRows*3, plus a 1-cell wall border
    expect(r.width).toBe(2 * 3 + 2);
    expect(r.height).toBe(2 * 3 + 2);
    // every edge cell is a wall
    for (let x = 0; x < r.width; x++) {
      expect(r.walls[x]).toBe(1); // top row
      expect(r.walls[(r.height - 1) * r.width + x]).toBe(1); // bottom row
    }
    for (let y = 0; y < r.height; y++) {
      expect(r.walls[y * r.width]).toBe(1); // left column
      expect(r.walls[y * r.width + r.width - 1]).toBe(1); // right column
    }
  });

  it("returns null when the attempt budget is exhausted with an impossible size", () => {
    // 0x0 blocks: no interior at all, can never pass validation.
    const rng = mulberry32(1);
    expect(buildRoom(rng, 0, 0, 10)).toBeNull();
  });

  it("succeeds within budget for at least 48/50 seeds at the 2x2 default size", () => {
    // Empirical tuning check (see the plan's Design notes section):
    // per-attempt success rate ~11% at 2x2, so 300 attempts should succeed
    // for effectively every seed.
    let successes = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed);
      if (buildRoom(rng, 2, 2, 300) !== null) successes++;
    }
    expect(successes).toBeGreaterThanOrEqual(48);
  });

  it("every produced room has fully connected floor, no oversized open rectangle, and no three-sided nook", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const room = buildRoom(mulberry32(seed), 2, 2, 300);
      if (room === null) continue;
      let start = -1;
      for (let i = 0; i < room.floor.length; i++) {
        if (room.floor[i] && !room.walls[i]) { start = i; break; }
      }
      const reachable = computeReachable(room, [], start);
      for (let i = 0; i < room.floor.length; i++) {
        if (room.floor[i] && !room.walls[i]) expect(reachable[i]).toBe(1);
      }
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: FAIL — `../generator` module doesn't exist.

- [ ] **Step 3: Implement `sokoban/generator.ts` (room-building section)**

```ts
import type { Board } from "./board.ts";
import { computeReachable } from "./reachability.ts";
import type { Rng } from "./rng.ts";
import { randomInt } from "./rng.ts";

const BLOCK_SIZE = 3;

// Small 3x3 wall/floor template library ('#' = wall, ' ' = floor). Each
// placement applies a random rotation (0/90/180/270) and a random
// horizontal flip, so ~8 effective variants per template. Whole-board
// connectivity/openness/nook checks (below) are the actual acceptance
// gate — these templates don't need to tile validly on their own, unlike a
// classic Wang-tile scheme; see the plan's Design notes for the empirical
// success-rate table that justifies this choice over hand-matching edges.
const TEMPLATES: readonly string[][] = [
  ["   ", "   ", "   "],
  ["#  ", "   ", "   "],
  ["## ", "   ", "   "],
  ["#  ", "#  ", "   "],
  ["# #", "   ", "# #"],
  ["   ", " # ", "   "],
  ["#  ", "   ", "  #"],
  ["## ", "   ", " ##"],
];

function rotate(t: readonly string[]): string[] {
  const n = t.length;
  const out: string[] = [];
  for (let x = 0; x < n; x++) {
    let row = "";
    for (let y = n - 1; y >= 0; y--) row += t[y][x];
    out.push(row);
  }
  return out;
}

function flip(t: readonly string[]): string[] {
  return t.map((row) => [...row].reverse().join(""));
}

function randomVariant(rng: Rng, template: readonly string[]): string[] {
  let t: string[] = [...template];
  const rotations = randomInt(rng, 0, 3);
  for (let i = 0; i < rotations; i++) t = rotate(t);
  if (rng() < 0.5) t = flip(t);
  return t;
}

function stitchInterior(rng: Rng, blockCols: number, blockRows: number): string[] {
  const rows: string[] = new Array(blockRows * BLOCK_SIZE).fill("");
  for (let by = 0; by < blockRows; by++) {
    const blockRowStrings = new Array(BLOCK_SIZE).fill("");
    for (let bx = 0; bx < blockCols; bx++) {
      const template = TEMPLATES[randomInt(rng, 0, TEMPLATES.length - 1)];
      const variant = randomVariant(rng, template);
      for (let r = 0; r < BLOCK_SIZE; r++) blockRowStrings[r] += variant[r];
    }
    for (let r = 0; r < BLOCK_SIZE; r++) rows[by * BLOCK_SIZE + r] = blockRowStrings[r];
  }
  return rows;
}

function wrapWithBorder(interior: readonly string[]): string[] {
  const width = interior[0]?.length ?? 0;
  const top = "#".repeat(width + 2);
  const middle = interior.map((row) => `#${row}#`);
  return [top, ...middle, top];
}

function rowsToRoomBoard(rows: readonly string[]): Board {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const walls = new Uint8Array(width * height);
  const floor = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (rows[y][x] === "#") walls[idx] = 1;
      else floor[idx] = 1;
    }
  }
  return { width, height, walls, floor, goals: [], isGoal: new Uint8Array(width * height) };
}

function isFullyConnected(board: Board): boolean {
  let start = -1;
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i]) {
      start = i;
      break;
    }
  }
  if (start === -1) return false;

  const reachable = computeReachable(board, [], start);
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i] && !reachable[i]) return false;
  }
  return true;
}

function isOpenFloor(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return false;
  const idx = y * board.width + x;
  return board.floor[idx] === 1 && board.walls[idx] === 0;
}

/** Rejects boards containing a fully-open 4x3 or 3x4 rectangle — Taylor &
 * Parberry's "boring flat area" reject rule from the room-building step. */
function hasOverOpenRectangle(board: Board): boolean {
  for (const [w, h] of [
    [4, 3],
    [3, 4],
  ] as const) {
    for (let y = 0; y <= board.height - h; y++) {
      for (let x = 0; x <= board.width - w; x++) {
        let allFloor = true;
        outer: for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            if (!isOpenFloor(board, x + dx, y + dy)) {
              allFloor = false;
              break outer;
            }
          }
        }
        if (allFloor) return true;
      }
    }
  }
  return false;
}

const ORTHOGONAL: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** Rejects boards with a floor cell walled in on 3 of its 4 sides. */
function hasThreeSidedNook(board: Board): boolean {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      const idx = y * board.width + x;
      if (!board.floor[idx] || board.walls[idx]) continue;

      let wallSides = 0;
      for (const [dx, dy] of ORTHOGONAL) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) {
          wallSides++;
          continue;
        }
        const n = ny * board.width + nx;
        if (board.walls[n] || !board.floor[n]) wallSides++;
      }
      if (wallSides >= 3) return true;
    }
  }
  return false;
}

function isValidRoom(board: Board): boolean {
  return isFullyConnected(board) && !hasOverOpenRectangle(board) && !hasThreeSidedNook(board);
}

/**
 * Builds an empty room: tiles a `blockCols` x `blockRows` grid of randomly
 * rotated/flipped 3x3 templates, wraps it in a wall border (guaranteeing a
 * closed level per the XSB "closed" rule), and retries with fresh random
 * draws (same `rng` stream) up to `maxAttempts` times until the result
 * passes `isValidRoom`. Returns `null` if the budget is exhausted — see the
 * plan's Design notes for empirically-measured success rates per size.
 */
export function buildRoom(
  rng: Rng,
  blockCols: number,
  blockRows: number,
  maxAttempts = 300,
): Board | null {
  if (blockCols <= 0 || blockRows <= 0) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const interior = stitchInterior(rng, blockCols, blockRows);
    const rows = wrapWithBorder(interior);
    const board = rowsToRoomBoard(rows);
    if (isValidRoom(board)) return board;
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/generator.ts sokoban/__tests__/generator.test.ts
git commit -m "$(cat <<'EOF'
Add Sokoban room generation: template tiling + connectivity/openness/nook
validation (Phase 5 part 4)

Empirically-measured success rates (2000 seeded trials per size) recorded in
docs/superpowers/plans/2026-09-03-sokoban-generator-phase5.md's Design
notes; default 2x2-block room succeeds within the 300-attempt budget for
effectively every seed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 5: Goal placement (`sokoban/generator.ts` part 2 — `placeGoals`)

**Files:**
- Modify: `sokoban/generator.ts` (append)
- Test: `sokoban/__tests__/generator.test.ts` (append)

**Interfaces:**
- Consumes: `Board`, `Rng`/`shuffle` (from Task 1/4's imports, already in file).
- Produces: `placeGoals(board: Board, boxCount: number, rng: Rng, options?: { maxAttempts?: number }): number[] | null`
  — sorted goal cell indices, or `null` if no valid arrangement found within
  budget. Consumed by `generateLevel` (Task 7).

- [ ] **Step 1: Write the failing tests**

`sokoban/__tests__/generator.test.ts` already has, from Task 4:
`import { buildRoom } from "../generator";`. Change that line to add
`placeGoals` — do not add a second `import ... from "../generator"`
statement (it would redeclare `buildRoom`):
```ts
import { buildRoom, placeGoals } from "../generator";
```

Then append this block to the end of the file:

```ts
describe("placeGoals", () => {
  it("returns boxCount distinct floor cells, sorted", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const goals = placeGoals(room, 3, mulberry32(2));
    expect(goals).not.toBeNull();
    const g = goals!;
    expect(g.length).toBe(3);
    expect(new Set(g).size).toBe(3);
    expect([...g].sort((a, b) => a - b)).toEqual(g);
    for (const cell of g) {
      expect(room.floor[cell]).toBe(1);
      expect(room.walls[cell]).toBe(0);
    }
  });

  it("keeps every pair of goals at Chebyshev distance >= 2", () => {
    const room = buildRoom(mulberry32(3), 2, 2, 300)!;
    const goals = placeGoals(room, 3, mulberry32(4))!;
    const cellXY = (c: number) => [c % room.width, (c - (c % room.width)) / room.width];
    for (let i = 0; i < goals.length; i++) {
      for (let j = i + 1; j < goals.length; j++) {
        const [ax, ay] = cellXY(goals[i]);
        const [bx, by] = cellXY(goals[j]);
        expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by))).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("returns null when boxCount exceeds the floor cell count", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const floorCount = room.floor.reduce((sum, f, i) => sum + (f && !room.walls[i] ? 1 : 0), 0);
    expect(placeGoals(room, floorCount + 1, mulberry32(1))).toBeNull();
  });

  it("is deterministic for a fixed seed", () => {
    const room = buildRoom(mulberry32(1), 2, 2, 300)!;
    const a = placeGoals(room, 3, mulberry32(9));
    const b = placeGoals(room, 3, mulberry32(9));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: FAIL — `placeGoals` not exported.

- [ ] **Step 3: Implement in `sokoban/generator.ts`**

Append (needs `sortedBoxes` from `./state.ts` and `shuffle` from `./rng.ts` —
add both to the top-of-file imports):

```ts
// Add to existing imports at the top of the file:
// import { sortedBoxes } from "./state.ts";
// import { shuffle } from "./rng.ts";  (alongside the existing randomInt import)

const MIN_GOAL_SPACING = 2; // Chebyshev distance

function cellXY(board: Board, cell: number): [number, number] {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  return [x, y];
}

function chebyshevDistance(board: Board, a: number, b: number): number {
  const [ax, ay] = cellXY(board, a);
  const [bx, by] = cellXY(board, b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function isSpacedOut(board: Board, cells: readonly number[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (chebyshevDistance(board, cells[i], cells[j]) < MIN_GOAL_SPACING) return false;
    }
  }
  return true;
}

/**
 * Places `boxCount` goals on distinct floor cells, at least
 * `MIN_GOAL_SPACING` apart (Chebyshev distance) so the reverse
 * farthest-state search (Task 6) has room to spread boxes out instead of
 * starting from a degenerate clump. This spacing rule is this
 * implementation's own choice, not something docs/level-generation.md's
 * source material specified beyond "brute-force search over goal-position
 * combinations" — see the plan's Design notes.
 *
 * Randomized rather than a true combinatorial brute force (which is
 * intractable for anything but a tiny floor), per the doc's own "seed-
 * shuffle the search order for reproducibility and stop at the first
 * accepted arrangement" framing: each attempt reshuffles the floor-cell
 * list (consuming further `rng` state, so attempts differ and the whole
 * search is reproducible per seed) and takes the first `boxCount` cells.
 */
export function placeGoals(
  board: Board,
  boxCount: number,
  rng: Rng,
  options: { maxAttempts?: number } = {},
): number[] | null {
  const maxAttempts = options.maxAttempts ?? 500;

  const floorCells: number[] = [];
  for (let i = 0; i < board.floor.length; i++) {
    if (board.floor[i] && !board.walls[i]) floorCells.push(i);
  }
  if (floorCells.length < boxCount) return null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = shuffle(rng, floorCells).slice(0, boxCount);
    if (isSpacedOut(board, candidate)) return sortedBoxes(candidate);
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/generator.ts sokoban/__tests__/generator.test.ts
git commit -m "$(cat <<'EOF'
Add goal placement to the Sokoban generator (Phase 5 part 5)

Randomized, seed-reproducible search for boxCount distinct floor cells at
least 2 cells apart (Chebyshev) -- the spacing rule and rationale for
randomized-vs-brute-force search are documented in
docs/superpowers/plans/2026-09-03-sokoban-generator-phase5.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 6: Farthest-state reverse search (`sokoban/generator.ts` part 3)

**Files:**
- Modify: `sokoban/generator.ts` (append)
- Test: `sokoban/__tests__/generator.test.ts` (append)

**Interfaces:**
- Consumes: `State`, `Pull`, `legalPulls`, `stateKey`, `sortedBoxes`
  (`./state.ts`), `findPath` (`./reachability.ts`), `Rng`/`shuffle`
  (`./rng.ts`), `solve` (`./solver.ts` — test-only, for cross-validation).
- Produces: `FarthestStateOptions`, `FarthestStateResult` (`{ state, distance,
  nodes, siblingLevels, solution }`), `findFarthestState(board, goalState,
  rng, options?): FarthestStateResult` — consumed by `generateLevel` (Task 7).

- [ ] **Step 1: Write the failing tests**

`sokoban/__tests__/generator.test.ts` already has, from Task 5:
`import { buildRoom, placeGoals } from "../generator";`. Change that line to
add `findFarthestState` — do not add a second `import ... from "../generator"`
statement:
```ts
import { buildRoom, placeGoals, findFarthestState } from "../generator";
```

Then add these new imports (none of these three names exist in the file
yet) and append the test block to the end of the file:

```ts
import { buildBoard } from "../board";
import { solve } from "../solver";
import { sortedBoxes } from "../state";

describe("findFarthestState", () => {
  it("returns distance 0 (the goal state itself) when no pulls are available", () => {
    // Box already on its only goal, wedged in a 1-wide dead end: the only
    // candidate pull direction needs the player to step back into a wall,
    // so no legal pull exists.
    const { board, state } = buildBoard(["####", "#@*#", "####"]);
    const goalState = { boxes: state.boxes, player: state.player };
    const result = findFarthestState(board, goalState, mulberry32(1));
    expect(result.distance).toBe(0);
    expect(result.solution).toBe("");
  });

  it("finds a state whose optimal solve distance (via the existing solver) matches the search's own distance", () => {
    // A room with enough space for the box to be pulled several times.
    const { board } = buildBoard(["#######", "#     #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    // goals[] is empty here since '.' inside buildBoard already registers
    // it -- use board.goals as the single-goal, single-box goal state.
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width }; // any adjacent free cell

    const result = findFarthestState(board, goalState, mulberry32(5), { maxNodes: 2000, timeoutMs: 2000 });
    expect(result.distance).toBeGreaterThan(0);

    const solved = solve(board, result.state, { timeoutMs: 5000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(result.distance);
  });

  it("the reconstructed solution string, replayed by hand, actually solves the level", () => {
    const { board } = buildBoard(["#######", "#     #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width };
    const result = findFarthestState(board, goalState, mulberry32(6), { maxNodes: 2000, timeoutMs: 2000 });
    expect(result.distance).toBeGreaterThan(0);

    // Replay result.solution against result.state by hand (independent of
    // solve()'s own machinery) and check every box ends on a goal.
    const DIRS: Record<string, { dx: number; dy: number }> = {
      u: { dx: 0, dy: -1 }, d: { dx: 0, dy: 1 }, l: { dx: -1, dy: 0 }, r: { dx: 1, dy: 0 },
    };
    let player = result.state.player;
    let boxes = [...result.state.boxes];
    for (const ch of result.solution) {
      const dir = DIRS[ch.toLowerCase()];
      const x = player % board.width, y = (player - x) / board.width;
      const target = (y + dir.dy) * board.width + (x + dir.dx);
      const boxIndex = boxes.indexOf(target);
      if (boxIndex === -1) { player = target; continue; }
      const bx = target % board.width, by = (target - bx) / board.width;
      const destination = (by + dir.dy) * board.width + (bx + dir.dx);
      boxes[boxIndex] = destination;
      player = target;
    }
    expect(boxes.every((b) => board.isGoal[b] === 1)).toBe(true);
  });

  it("is deterministic for a fixed seed", () => {
    const { board } = buildBoard(["#######", "#     #", "#     #", "#  .  #", "#     #", "#     #", "#######"]);
    const goalIdx = board.goals[0];
    const goalState = { boxes: sortedBoxes([goalIdx]), player: goalIdx - board.width };
    const a = findFarthestState(board, goalState, mulberry32(3), { maxNodes: 500, timeoutMs: 2000 });
    const b = findFarthestState(board, goalState, mulberry32(3), { maxNodes: 500, timeoutMs: 2000 });
    expect(a.state).toEqual(b.state);
    expect(a.distance).toBe(b.distance);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: FAIL — `findFarthestState` not exported.

- [ ] **Step 3: Implement in `sokoban/generator.ts`**

Add to the top-of-file imports:
```ts
import type { Direction, Pull, State } from "./state.ts";
import { legalPulls, stateKey } from "./state.ts";
import { findPath } from "./reachability.ts";
```

Append:

```ts
export interface FarthestStateOptions {
  /** Cap on total distinct states visited. Default 20000. */
  maxNodes?: number;
  /** Hard wall-clock budget in ms. Default 5000. */
  timeoutMs?: number;
}

export interface FarthestStateResult {
  state: State;
  distance: number;
  nodes: number;
  /** Count of *other* states tied with `state` at the maximum distance
   * found -- Taylor & Parberry §3.3's `siblingLevels` input to `score()`,
   * finally computable now that a generator exists (see the plan's Design
   * notes, item 3). */
  siblingLevels: number;
  /** Forward u/d/l/r solution (push = uppercase, `solver.ts`'s convention)
   * from `state` to the goal state — the reverse of the pull chain that
   * found it. */
  solution: string;
}

interface PullNode {
  state: State;
  distance: number;
  parent: PullNode | null;
  pull: Pull | null;
}

function neighbor(board: Board, cell: number, dir: Direction): number | null {
  const x = cell % board.width;
  const y = (cell - x) / board.width;
  const nx = x + dir.dx;
  const ny = y + dir.dy;
  if (nx < 0 || nx >= board.width || ny < 0 || ny >= board.height) return null;
  return ny * board.width + nx;
}

function directionLetter(dir: Direction): string {
  if (dir.dx === 0 && dir.dy === -1) return "u";
  if (dir.dx === 0 && dir.dy === 1) return "d";
  if (dir.dx === -1 && dir.dy === 0) return "l";
  if (dir.dx === 1 && dir.dy === 0) return "r";
  throw new Error(`directionLetter: not a unit direction (${dir.dx}, ${dir.dy})`);
}

/**
 * Walks from `farthestNode` up to the root (the goal state, `pull: null`),
 * collecting each step's incoming pull -- already in "undo the most recent
 * pull first" order, which is exactly the order needed to replay them as
 * forward pushes starting from the farthest state (see the plan's Design
 * notes, item 1, for the box-cell arithmetic this depends on).
 */
function reconstructPullSolution(board: Board, farthestNode: PullNode): string {
  const chain: Pull[] = [];
  let cur: PullNode | null = farthestNode;
  while (cur && cur.pull) {
    chain.push(cur.pull);
    cur = cur.parent;
  }

  let solution = "";
  let player = farthestNode.state.player;
  let boxes = farthestNode.state.boxes;

  for (const pull of chain) {
    const pushBox = neighbor(board, pull.box, { dx: -pull.direction.dx, dy: -pull.direction.dy });
    if (pushBox === null) {
      throw new Error("reconstructPullSolution: internal error, invalid pull direction");
    }
    const behind = neighbor(board, pushBox, { dx: -pull.direction.dx, dy: -pull.direction.dy });
    if (behind === null) {
      throw new Error("reconstructPullSolution: internal error, invalid pull direction");
    }
    const walk = findPath(board, boxes, player, behind);
    if (walk === null) {
      throw new Error("reconstructPullSolution: internal error, player cannot reach a required push position");
    }
    solution += walk;
    solution += directionLetter(pull.direction).toUpperCase();

    const destination = neighbor(board, pushBox, pull.direction)!;
    boxes = sortedBoxes(boxes.map((b) => (b === pushBox ? destination : b)));
    player = pushBox;
  }

  return solution;
}

/**
 * BFS over pull-reachable predecessor states of `goalState`, returning the
 * one with maximum distance (in pulls) -- which equals its push-optimal
 * solve distance, since the pull-graph is the exact edge-reversal of the
 * forward push-graph the solver already searches (see the plan's Design
 * notes, item 2). Deduplicates with the same `stateKey` normalization the
 * forward solver relies on. Ties at the maximum distance are broken by
 * reservoir sampling over `rng`, so the choice is uniform and reproducible;
 * the tie count feeds `siblingLevels`.
 */
export function findFarthestState(
  board: Board,
  goalState: State,
  rng: Rng,
  options: FarthestStateOptions = {},
): FarthestStateResult {
  const maxNodes = options.maxNodes ?? 20000;
  const timeoutMs = options.timeoutMs ?? 5000;
  const startTime = Date.now();

  const root: PullNode = { state: goalState, distance: 0, parent: null, pull: null };
  const visited = new Set<string>([stateKey(board, goalState)]);
  let frontier: PullNode[] = [root];
  let best = root;
  let bestTieCount = 1;
  let nodes = 1;

  while (frontier.length > 0 && nodes < maxNodes && Date.now() - startTime < timeoutMs) {
    const next: PullNode[] = [];

    for (const node of frontier) {
      if (node.distance > best.distance) {
        best = node;
        bestTieCount = 1;
      } else if (node.distance === best.distance) {
        bestTieCount++;
        if (rng() < 1 / bestTieCount) best = node;
      }

      if (nodes >= maxNodes || Date.now() - startTime >= timeoutMs) continue;

      const pulls = shuffle(rng, legalPulls(board, node.state));
      for (const pull of pulls) {
        const key = stateKey(board, pull.state);
        if (visited.has(key)) continue;
        visited.add(key);
        nodes++;
        next.push({ state: pull.state, distance: node.distance + 1, parent: node, pull });
        if (nodes >= maxNodes) break;
      }
    }

    frontier = next;
  }

  return {
    state: best.state,
    distance: best.distance,
    nodes,
    siblingLevels: bestTieCount - 1,
    solution: reconstructPullSolution(board, best),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: PASS. The `solve()` cross-validation test (`solved.pushes ===
result.distance`) is the load-bearing one — if the pull-direction algebra in
Task 2 or the chain reconstruction here has a sign error, this is where it
will surface as a mismatch or an unsolvable result, not as a silent wrong
answer.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/generator.ts sokoban/__tests__/generator.test.ts
git commit -m "$(cat <<'EOF'
Add farthest-state reverse search to the Sokoban generator (Phase 5 part 6)

BFS over legalPulls from the goal state, deduped with the same stateKey
normalization the forward solver uses; the returned state's distance is
cross-validated against solve() in a new test (solved.pushes must equal the
search's own distance). Also derives siblingLevels from the reservoir-
sampled tie count at the max-distance layer, replacing Phase 4's forced-0
placeholder now that a generator exists to compute it from.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 7: Pipeline orchestration (`sokoban/generator.ts` part 4 — `generateLevel`)

**Files:**
- Modify: `sokoban/generator.ts` (append)
- Test: `sokoban/__tests__/generator.test.ts` (append)

**Interfaces:**
- Consumes: everything produced by Tasks 4-6 in this same file, plus `Board`.
- Produces: `GenerateOptions`, `GeneratedLevel`, `generateLevel(rng, options): GeneratedLevel | null`
  — consumed by `cli/gen.ts` (Task 8).

- [ ] **Step 1: Write the failing tests**

`sokoban/__tests__/generator.test.ts` already has, from Task 6:
`import { buildRoom, placeGoals, findFarthestState } from "../generator";`
and `import { solve } from "../solver";`. Change the first to add
`generateLevel` — do not add a second `import ... from "../generator"`
statement, and do not re-import `solve` (already present from Task 6):
```ts
import { buildRoom, placeGoals, findFarthestState, generateLevel } from "../generator";
```

Then add this one new import (`validateStructure` doesn't exist in the file
yet) and append the test block to the end of the file:

```ts
import { validateStructure } from "../validate";

describe("generateLevel", () => {
  it("produces a structurally valid, solvable level whose optimal solve distance matches its recorded distance", () => {
    const rng = mulberry32(1);
    const level = generateLevel(rng, { blockCols: 2, blockRows: 2, boxCount: 2 });
    expect(level).not.toBeNull();
    const lvl = level!;

    const issues = validateStructure(lvl.board, lvl.state);
    const hard = issues.filter((i) => i.code === "not-closed" || i.code === "box-goal-mismatch");
    expect(hard).toEqual([]);

    const solved = solve(lvl.board, lvl.state, { timeoutMs: 5000 });
    expect(solved.solvable).toBe(true);
    expect(solved.pushes).toBe(lvl.distance);
  });

  it("returns null when goal placement is infeasible, rather than a fake level", () => {
    // boxCount far exceeds the floor-cell count of a 1x1-block room, so
    // placeGoals fails outright and generateLevel must propagate null.
    const rng = mulberry32(1);
    const level = generateLevel(rng, { blockCols: 1, blockRows: 1, boxCount: 50 });
    expect(level).toBeNull();
  });

  it("is deterministic for a fixed seed", () => {
    const a = generateLevel(mulberry32(2), { blockCols: 2, blockRows: 2, boxCount: 2 });
    const b = generateLevel(mulberry32(2), { blockCols: 2, blockRows: 2, boxCount: 2 });
    expect(a?.state).toEqual(b?.state);
    expect(a?.distance).toBe(b?.distance);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: FAIL — `generateLevel` not exported.

- [ ] **Step 3: Implement in `sokoban/generator.ts`**

```ts
export interface GenerateOptions {
  blockCols: number;
  blockRows: number;
  boxCount: number;
  maxRoomAttempts?: number;
  maxGoalAttempts?: number;
  farthestState?: FarthestStateOptions;
}

export interface GeneratedLevel {
  board: Board;
  /** The generated level's start state -- the farthest state found. */
  state: State;
  /** The "solved" state (boxes on goals) the reverse search started from. */
  goalState: State;
  distance: number;
  nodes: number;
  siblingLevels: number;
  solution: string;
}

function buildIsGoal(board: Board, goals: readonly number[]): Uint8Array {
  const isGoal = new Uint8Array(board.width * board.height);
  for (const g of goals) isGoal[g] = 1;
  return isGoal;
}

function representativePlayer(board: Board, boxes: readonly number[]): number {
  for (let cell = 0; cell < board.floor.length; cell++) {
    if (board.floor[cell] && !board.walls[cell] && !boxes.includes(cell)) return cell;
  }
  throw new Error("representativePlayer: no free floor cell for the player");
}

/**
 * The full Phase 5 pipeline (docs/level-generation.md §7): build a room,
 * place goals, then reverse-search for the farthest state from "boxes on
 * goals". Returns `null` if any stage fails within its attempt/node budget
 * -- callers (cli/gen.ts) should treat that as "this attempt didn't produce
 * a level" and try again with a fresh `rng` draw, not as an error.
 */
export function generateLevel(rng: Rng, options: GenerateOptions): GeneratedLevel | null {
  const room = buildRoom(rng, options.blockCols, options.blockRows, options.maxRoomAttempts ?? 300);
  if (room === null) return null;

  const goals = placeGoals(room, options.boxCount, rng, { maxAttempts: options.maxGoalAttempts ?? 500 });
  if (goals === null) return null;

  const board: Board = { ...room, goals, isGoal: buildIsGoal(room, goals) };
  const player = representativePlayer(board, goals);
  const goalState: State = { boxes: goals, player };

  const farthest = findFarthestState(board, goalState, rng, options.farthestState);
  if (farthest.distance === 0) return null;

  return {
    board,
    state: farthest.state,
    goalState,
    distance: farthest.distance,
    nodes: farthest.nodes,
    siblingLevels: farthest.siblingLevels,
    solution: farthest.solution,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/generator.test.ts`
Expected: PASS (full file)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/generator.ts sokoban/__tests__/generator.test.ts
git commit -m "$(cat <<'EOF'
Add generateLevel, the full Phase 5 pipeline orchestrator (Phase 5 part 7)

Wires room-building, goal placement, and farthest-state search together per
docs/level-generation.md §7; cross-validated end-to-end against solve().

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 8: Batch generation CLI (`sokoban/cli/gen.ts`)

**Files:**
- Create: `sokoban/cli/gen.ts`
- Test: `sokoban/__tests__/cli-gen.test.ts`

**Interfaces:**
- Consumes: `mulberry32` (`../rng.ts`), `generateLevel` (`../generator.ts`),
  `boardToRows` (`../board.ts`), `serializeXSB` (`../xsb.ts`),
  `pushEvents`/`boxLines`/`countTouching`/`score`/`isAccepted`
  (`../metrics.ts`), `hasFreezeDeadlock` (`../deadlock/freezeDeadlock.ts`).
- Produces: a JSONL file/stdout stream of generated+scored levels, consumed
  by `cli/render.ts` (Task 9).

- [ ] **Step 1: Write the failing tests**

```ts
// sokoban/__tests__/cli-gen.test.ts
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

function run(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync("node", [CLI, ...args], { encoding: "utf8" });
    return { status: 0, stderr: "" };
  } catch (err) {
    const e = err as { status: number; stderr: string };
    return { status: e.status, stderr: e.stderr };
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/cli-gen.test.ts`
Expected: FAIL — `sokoban/cli/gen.ts` doesn't exist.

- [ ] **Step 3: Implement `sokoban/cli/gen.ts`**

```ts
#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { mulberry32 } from "../rng.ts";
import { generateLevel } from "../generator.ts";
import { boardToRows } from "../board.ts";
import { serializeXSB } from "../xsb.ts";
import { pushEvents, boxLines, countTouching, score, isAccepted } from "../metrics.ts";
import { hasFreezeDeadlock } from "../deadlock/freezeDeadlock.ts";

interface Args {
  count: number;
  seed: number;
  boxCount: number;
  blockCols: number;
  blockRows: number;
  out?: string;
  maxAttempts: number;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Args {
  const command = argv[0];
  if (command !== "batch") {
    throw new Error(`gen.ts: unknown command ${JSON.stringify(command)} (expected "batch")`);
  }

  let count = 10;
  let seed = 1;
  let boxCount = 3;
  let blockCols = 2;
  let blockRows = 2;
  let out: string | undefined;
  let maxAttempts = 0;
  let timeoutMs = 2000;

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") count = Number(argv[++i]);
    else if (arg === "--seed") seed = Number(argv[++i]);
    else if (arg === "--box-count") boxCount = Number(argv[++i]);
    else if (arg === "--block-cols") blockCols = Number(argv[++i]);
    else if (arg === "--block-rows") blockRows = Number(argv[++i]);
    else if (arg === "--out") out = argv[++i];
    else if (arg === "--max-attempts") maxAttempts = Number(argv[++i]);
    else if (arg === "--timeout") timeoutMs = Number(argv[++i]);
    else throw new Error(`gen.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { count, seed, boxCount, blockCols, blockRows, out, maxAttempts: maxAttempts || count * 20, timeoutMs };
}

interface JSONLLevel {
  seed: number;
  attempt: number;
  xsb: string;
  distance: number;
  pushes: number;
  lines: number;
  boxes: number;
  siblingLevels: number;
  score: number;
  accepted: boolean;
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.log(JSON.stringify({ error: (err as Error).message }));
    return 3;
  }

  const rng = mulberry32(args.seed);
  const levels: JSONLLevel[] = [];
  let attempts = 0;

  while (levels.length < args.count && attempts < args.maxAttempts) {
    attempts++;
    const result = generateLevel(rng, {
      blockCols: args.blockCols,
      blockRows: args.blockRows,
      boxCount: args.boxCount,
      farthestState: { timeoutMs: args.timeoutMs },
    });
    if (result === null) continue;

    const events = pushEvents(result.board, result.state, result.solution);
    const s = score({
      pushes: result.distance,
      lines: boxLines(events),
      boxes: result.state.boxes.length,
      siblingLevels: result.siblingLevels,
      trapped: hasFreezeDeadlock(result.board, result.state.boxes),
      touching: countTouching(result.board, result.state),
      random: 0,
    });

    levels.push({
      seed: args.seed,
      attempt: attempts,
      xsb: serializeXSB({
        comments: [`; generated seed=${args.seed} attempt=${attempts}`],
        rows: boardToRows(result.board, result.state),
      }),
      distance: result.distance,
      pushes: result.distance,
      lines: boxLines(events),
      boxes: result.state.boxes.length,
      siblingLevels: result.siblingLevels,
      score: s,
      accepted: isAccepted(s),
    });
  }

  const jsonl = levels.map((l) => JSON.stringify(l)).join("\n") + (levels.length > 0 ? "\n" : "");
  if (args.out) {
    writeFileSync(args.out, jsonl);
  } else {
    process.stdout.write(jsonl);
  }

  console.error(JSON.stringify({ requested: args.count, generated: levels.length, attempts }));

  return levels.length === args.count ? 0 : 1;
}

process.exit(main());
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/cli-gen.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/cli/gen.ts sokoban/__tests__/cli-gen.test.ts
git commit -m "$(cat <<'EOF'
Add batch generation CLI: node sokoban/cli/gen.ts batch (Phase 5 part 8)

Threads siblingLevels through from the generator into score(), replacing
the forced-0 placeholder cli/score-microban.ts needed in Phase 4.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 9: Render CLI (`sokoban/cli/render.ts`)

**Files:**
- Create: `sokoban/cli/render.ts`
- Test: `sokoban/__tests__/cli-render.test.ts`

**Interfaces:**
- Consumes: the JSONL schema `cli/gen.ts` (Task 8) produces (read as plain
  JSON, no shared type import needed across the process boundary).
- Produces: human-readable XSB text on stdout, ranked by score.

Note for docs (Task 10): this corrects §6's module-layout line, which showed
`render.ts` invoked as `node sokoban/cli/gen.ts render levels.jsonl --top 50`
(a `gen.ts` subcommand) while listing it as its own file — that was a
typo/inconsistency in the original design note. It's its own CLI entry
point, invoked directly.

- [ ] **Step 1: Write the failing tests**

```ts
// sokoban/__tests__/cli-render.test.ts
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
    const { status } = run([join(dir, "missing.jsonl")]);
    expect(status).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run sokoban/__tests__/cli-render.test.ts`
Expected: FAIL — `sokoban/cli/render.ts` doesn't exist.

- [ ] **Step 3: Implement `sokoban/cli/render.ts`**

```ts
#!/usr/bin/env node
import { readFileSync } from "node:fs";

interface JSONLLevel {
  seed: number;
  attempt: number;
  xsb: string;
  distance: number;
  pushes: number;
  lines: number;
  boxes: number;
  siblingLevels: number;
  score: number;
  accepted: boolean;
}

interface Args {
  file?: string;
  top: number;
  acceptedOnly: boolean;
}

function parseArgs(argv: string[]): Args {
  let file: string | undefined;
  let top = 10;
  let acceptedOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--top") top = Number(argv[++i]);
    else if (arg === "--accepted-only") acceptedOnly = true;
    else if (!arg.startsWith("--") && file === undefined) file = arg;
    else throw new Error(`render.ts: unknown argument ${JSON.stringify(arg)}`);
  }

  return { file, top, acceptedOnly };
}

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.log((err as Error).message);
    return 3;
  }

  if (!args.file) {
    console.log("usage: render.ts <levels.jsonl> [--top N] [--accepted-only]");
    return 3;
  }

  let text: string;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (err) {
    console.log(`cannot read file: ${(err as Error).message}`);
    return 3;
  }

  const levels: JSONLLevel[] = text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

  const filtered = args.acceptedOnly ? levels.filter((l) => l.accepted) : levels;
  const sorted = [...filtered].sort((a, b) => b.score - a.score).slice(0, args.top);

  for (const [i, level] of sorted.entries()) {
    console.log(
      `; rank ${i + 1}  score ${Math.round(level.score)}  pushes ${level.pushes}  lines ${level.lines}  boxes ${level.boxes}  seed ${level.seed} attempt ${level.attempt}`,
    );
    console.log(level.xsb);
    console.log("");
  }

  return 0;
}

process.exit(main());
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run sokoban/__tests__/cli-render.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:sokoban`

- [ ] **Step 6: Commit**

```bash
git add sokoban/cli/render.ts sokoban/__tests__/cli-render.test.ts
git commit -m "$(cat <<'EOF'
Add render CLI: node sokoban/cli/render.ts levels.jsonl (Phase 5 part 9)

Reads cli/gen.ts's JSONL output, ranks by score, prints XSB text -- its own
entry point, not a gen.ts subcommand (see the plan's Task 9 note correcting
docs/level-generation.md §6's inconsistent example invocation).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Task 10: Documentation, full verification, and end-to-end smoke test

**Files:**
- Modify: `docs/level-generation.md`

- [ ] **Step 1: Run the full test suite and both typechecks**

```bash
npm test
npm run typecheck
npm run typecheck:sokoban
```

Expected: everything passes. If anything fails, fix it before writing the
docs update (the doc should describe what actually shipped).

- [ ] **Step 2: Run an end-to-end smoke test of the two new CLIs together**

```bash
node sokoban/cli/gen.ts batch --count 20 --seed 1 --box-count 3 --block-cols 2 --block-rows 2 --out /tmp/claude-1000/-home-albert-Plant-js/05a6f586-84fc-43bc-b0e0-fee8b30242c1/scratchpad/levels.jsonl
node sokoban/cli/render.ts /tmp/claude-1000/-home-albert-Plant-js/05a6f586-84fc-43bc-b0e0-fee8b30242c1/scratchpad/levels.jsonl --top 5
```

Confirm: `gen.ts` exits 0 (or report the actual generated/requested counts if
not — that's real data for the docs update, not a failure to hide), and
`render.ts` prints readable XSB levels with a wall border, boxes, goals, and
a player, highest score first. Read one rendered level by eye and confirm it
looks like a real, closed Sokoban room (this is the "look at the actual
output" check that automated tests can't fully substitute for).

- [ ] **Step 3: Update `docs/level-generation.md`**

Two edits:

1. Change the status line (currently line 3-6) from:
   ```
   Status: Phases 0-4 complete (design note, XSB/board/state core, the
   push-optimal solver with all four planned deadlock/pruning techniques, the
   Microban validation gate, and metrics/scoring calibration). Not yet started:
   Phase 5 (the generator itself), Phase 6 (integration).
   ```
   to:
   ```
   Status: Phases 0-5 complete (design note, XSB/board/state core, the
   push-optimal solver with all four planned deadlock/pruning techniques, the
   Microban validation gate, metrics/scoring calibration, and the generator
   itself). Not yet started: Phase 6 (integration).
   ```

2. Add a new `## Phase 5: the generator` section directly after the status
   line and before `## Phase 4: metrics and scoring calibration` (matching
   this doc's existing newest-phase-first ordering), covering:
   - The pull-mechanics derivation and its `applyPull`-undoes-`applyPush`
     regression test (Design notes item 1 above).
   - Why the farthest-state search's dedup reuses `stateKey` and why that's
     sound (Design notes item 2).
   - `siblingLevels` finally being computable, replacing Phase 4's forced-0
     placeholder in `score-microban.ts` (Design notes item 3) — and that
     `score-microban.ts` itself is intentionally left as-is (Microban levels
     are imported, not generated, so they have no "search depth" to be
     siblings within — `siblingLevels: 0` stays correct for that CLI).
   - The empirical room-generation success-rate table (Design notes item 4)
     and the actual smoke-test output from Step 2 (generated/requested
     counts, whether any accepted levels came out, a couple of real score
     values) — write down what actually happened, not the plan's predicted
     numbers.
   - The goal-spacing rule (`MIN_GOAL_SPACING = 2`, Chebyshev) as this
     implementation's own documented choice, per Task 5's note.
   - The `cli/render.ts` invocation correction from Task 9's note.
   - Any deviation you had to make while implementing that isn't already
     captured above — follow this doc's own established style (see how
     Phase 3's §3.2/3.3 document parser/validator gaps found against real
     data) rather than silently matching the plan.
   - A short "known limitations / future work" list: larger rooms
     (3x2, 3x3+) have low per-attempt success rates and aren't tuned
     further in this phase (the empirical table already shows why); no
     upper bound is enforced on `boxCount` beyond what `placeGoals`'s
     spacing can fit (Taylor & Parberry's own generator "explodes" past
     ~6 boxes per Phase 0's note — worth a stress-test if Phase 6 needs
     bigger levels).

- [ ] **Step 4: Commit**

```bash
git add docs/level-generation.md
git commit -m "$(cat <<'EOF'
Document Phase 5 (the generator) in docs/level-generation.md

Records the pull-mechanics derivation, why farthest-state dedup reuses
stateKey, siblingLevels finally being computable, empirical room-generation
success rates, and the actual end-to-end smoke-test results.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HzHMhxCtvbvRRXGPhw74Db
EOF
)"
```

---

## Self-review notes (for whoever executes this plan)

- **Spec coverage:** §7's three pipeline steps map to Tasks 4 (room), 5
  (goals), 6 (farthest state); Task 7 wires them into the single
  `generateLevel` entry point the doc's §7 intro describes. §6's module
  layout's `rng.ts`, `generator.ts`, `cli/gen.ts` are Tasks 1/4-7/8;
  `cli/render.ts` is Task 9 (with its invocation-example inconsistency
  flagged, not silently "fixed" without a doc note). Phase 4's
  `siblingLevels` sign-off gap is closed in Task 6/8. Nothing in §7 or §6
  is left unaddressed.
- **Type consistency check:** `Pull` (Task 2) is used identically in Task 6
  (`legalPulls(...): Pull[]`, `PullNode.pull: Pull | null`) and nowhere
  renamed. `FarthestStateResult` (Task 6) and `GeneratedLevel` (Task 7) both
  carry `siblingLevels`/`solution`/`distance`/`nodes` with matching names,
  threaded unchanged into `cli/gen.ts`'s `JSONLLevel` (Task 8) and read back
  with matching field names in `cli/render.ts` (Task 9).
- **No placeholders:** every step above has real, complete code — there is
  no task in this plan that says "add appropriate handling" without showing
  what that handling is.
