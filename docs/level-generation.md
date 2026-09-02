# Sokoban Level Generation — Design Note

Status: Phases 0-2 complete (design note, XSB/board/state core, and the
push-optimal solver with all four planned deadlock/pruning techniques).
Not yet started: Phase 3 (Microban validation gate), Phase 4 (metrics and
scoring calibration), Phase 5 (the generator itself), Phase 6 (integration).

## Phase 2 scoping decisions (recorded here per §6's promise to update this note)

Two deliberate scope cuts, both performance-only (neither affects
correctness — the solver's push-optimality guarantee doesn't depend on
either):

- **Corral detection does not combine adjacent corrals into multi-room
  PI-corrals.** `sokoban/deadlock/corral.ts` finds single connected
  unreachable regions only. The wiki notes multi-room combination matters
  "rather" often in practice; `findCorrals`/`isPICorral` are implemented and
  tested as sound standalone building blocks, so this is a bounded
  follow-up if Phase 3 timing shows it's needed, not a redesign.
- **Tunnel "no-influence push" detection (`sokoban/deadlock/tunnel.ts`) is
  implemented and tested but not wired into `solver.ts`'s search loop.**
  It's available (`isNoInfluencePush`) for a future search-macro pass. Given
  the choice between rushing a change into the A* successor-generation loop
  (real risk of a subtle push-optimality bug in the load-bearing part of
  this project) versus shipping it as a verified-correct, ready-to-integrate
  module, I chose the latter. Whether it's worth the integration risk is a
  question Phase 3's actual timing data should answer, not a guess made now.

Everything else from the original plan — static dead squares, freeze
deadlocks (including the recursive frozen-box case), PI-corral pruning
(single-region), and the Hungarian-matching heuristic/bipartite-deadlock
check — is implemented, tested, and wired into `solve()`.

## 1. Orientation: current state of the repo

**Stack.** Plant.js is a small canvas game engine: TypeScript, Vite, ESM
(`"type": "module"`), vitest for unit tests. No other runtime dependencies.
Node 24 is available and runs `.ts` files directly (unflagged type-stripping
— confirmed with a throwaway file), so CLI tools under a new `sokoban/`
directory can run as `node sokoban/cli/solve.ts ...` with **no new
dependency**. `tsconfig.json` currently only includes `src/` and targets
`ES2024` + `DOM` libs (it's the engine's browser build config).

**Where level data lives today.** `examples/sokoban/levels.ts` exports
`levels: string[][][]` — five levels, hand-authored directly as nested
string arrays, one string per cell. `examples/sokoban/sokoban.ts` is the demo
app: it mutates that grid in place inside `move()`, which inlines push
legality checks, and renders it with Plant.js sprites. There is no separate
board/state model, no parser, no solver, nothing reusable — the grid *is*
the game state.

**Current level representation is not XSB.** It uses a private character set
and *includes decorative tiles*, which XSB has no concept of:

| Char | Meaning |
|---|---|
| `@` | player |
| `%` | player on goal |
| `G` | grass (decorative, outside the playable room) |
| `D` | wall/block |
| `B` | box |
| `*` | goal |
| `$` | box on goal |
| `-` | empty floor |

This confirms the brief: nothing here should be reused as-is. The generator
pipeline needs its own board/state representation and its own XSB
parser/serializer; only at Phase 6 does the output get adapted into
something `examples/sokoban` can load, and that adapter is new code too, not
a reuse of this format.

**Sources read before writing any code:**
- `sokobano.de/wiki` — `Level_format`, `Deadlocks`, `Solver` pages. The live
  site is currently down (its host returns 404 for every path, including
  `/`), so these were fetched from Wayback Machine snapshots (2021 for
  `Level_format`, 2017 for `Deadlocks`, 2020 for `Solver`).
- Taylor, J. and Parberry, I., *Procedural Generation of Sokoban Levels*,
  UNT LARC-2011-01, 2011 (fetched directly, PDF parsed fine).

## 2. XSB format summary (from Level_format)

Canonical character set:

| Element | Char | Also accepted for floor |
|---|---|---|
| Wall | `#` | |
| Player | `@` | |
| Player on goal | `+` | |
| Box | `$` | |
| Box on goal | `*` | |
| Goal | `.` | |
| Floor | ` ` (space) | `-` or `_` (required for an *interior* empty row, since a literal blank line means "end of level block") |

Rules that matter for the parser:
- A level is a block of non-blank lines; blocks are separated by one or more
  blank lines in a multi-level file.
- Lines starting with `;` immediately before a block are title/comment
  lines and belong to the level that follows.
- The board must be fully enclosed by walls — if, with all boxes removed,
  the player could walk off the edge of the given lines, the level is
  "not closed" (some tools accept this; we will not — see §5 structural
  checks).
- Trailing floor characters at the end of a row may be omitted (ragged
  right edge) — parser must not assume a rectangular grid, must pad missing
  trailing cells as floor and record actual width per row up to the board's
  max width.
- RLE variant exists (`7#` = seven walls, rows joined with `|`) but Phase 1
  scope is explicitly RLE-free plain text only, per the brief.
- Solutions are separate strings using `u d l r` (push = uppercase), not
  part of the level file itself — not needed for Phase 1 parsing, but the
  same direction-letter convention will be reused for our own solution
  serialization in Phase 2's solver output.

## 3. Internal level representation

Two separate types, deliberately: one immutable per-level, one mutable
per-search-node.

```ts
// Cell index = y * width + x (1D, per Solver page's recommendation —
// faster indexing, and box sets become plain number arrays).

interface Board {
  width: number;
  height: number;
  walls: Uint8Array;     // 1 = wall, indexed by cell
  floor: Uint8Array;     // 1 = walkable cell (wall or interior floor/goal)
  goals: number[];       // sorted goal cell indices
  isGoal: Uint8Array;    // O(1) membership, parallel to floor
}

interface State {
  boxes: number[];        // sorted box cell indices (canonical order = the "multiset")
  player: number;         // raw player cell index
}
```

Why boxes stay a *sorted* array rather than a Set/bitset: box count tops out
around single digits to low tens for anything we'll generate (Taylor–
Parberry cap out around 6 boxes before their own generator's runtime
explodes), so a sorted array is cheap to keep canonical and cheap to hash.

**Deduplication key** (for the transposition table and for "is this state
already visited"): per the Solver page's "normalizing the player position"
technique, two states with identical box multisets are equivalent for a
push-optimal search if their player positions lie in the same
player-reachable region. So the dedup key is:

```
key(state) = boxes.join(',') + '|' + normalize(player, boxes, board)
```

where `normalize` runs a BFS over floor cells reachable from `player`
(blocked by walls and by the current boxes) and returns the *minimum* cell
index in that reachable region — a canonical representative, not the actual
player position. This is exactly the "player reachable-region
representative" the brief asks for.

Push mechanics (`applyPush`, `legalPushes`) operate on `(Board, State)` and
return new `State` objects — no in-place mutation, so the search can hold
many states in a frontier/transposition table safely.

## 4. Deadlock classes (Phase 2 build order, per the brief)

All four target the same goal: prune states that cannot lead to a solution,
as cheaply as possible, checked in order from cheapest/most-static to most
expensive/most-dynamic.

1. **Static dead squares** (precomputed once per board, before search
   starts). Reverse-pull BFS from every goal square: starting with a single
   imaginary box on each goal, repeatedly try to "pull" it (the inverse of a
   push — requires floor on both the square behind the box and the square
   the player would stand on) to neighboring squares, ignoring all other
   boxes. Any square reached by this BFS from *some* goal is safe; any
   square never reached is a static dead square — pushing a box there is an
   immediate, context-free deadlock, so `legalPushes` filters these out
   before they're even added as candidate moves. This is the wiki's
   "simple deadlock" — one box, static, independent of the rest of the
   board.

2. **Freeze deadlocks** (checked after every push, on the pushed box).
   Recursive frozen-box test: a box is frozen on an axis if it's blocked on
   *both* sides of that axis by a wall, board edge, or another box that is
   *itself* frozen. A box frozen on both axes while not on a goal is a
   deadlock. The recursion needs a "currently assumed frozen" guard set
   passed down through the check to avoid infinite mutual recursion when
   two boxes freeze each other (the wiki's "deadlocks due to frozen boxes"
   example is exactly this — pushing one box freezes a second one, and the
   second one is the one off-goal).

3. **Corral / PI-corral pruning.** A corral is a player-unreachable region
   bounded by boxes and walls. Compute the player's reachable region; every
   maximal unreachable region touching at least one box is a candidate
   corral. Classify it as a **PI-corral** if every box on its barrier has
   *all* of its legal first pushes going inward, and the player can reach
   every one of those boxes from the necessary side to make each such push
   — per the wiki, this is checkable by "remove all boxes not on the
   barrier, compare reachable pushes." When a PI-corral exists and it isn't
   fully satisfied (some barrier box isn't on a goal, or some goal inside
   it is empty), the search only needs to generate pushes for the
   PI-corral's barrier boxes — everything else is deferred without losing
   push-optimality, since pushing into the corral can't affect box
   reachability outside it. This is a **pruning** technique first and a
   deadlock detector second: per the wiki's own worked examples, a
   PI-corral where every barrier box turns out to have zero legal pushes
   (because each would itself be a freeze deadlock) is how the solver
   *finds* certain deadlocks early, as a side effect of the pruning.

4. **Tunnel macro moves.** A "no-influence push" — after a push, if the
   moved box now sits in a 1-wide corridor (blocked left+right or up+down
   by walls/frozen boxes) such that no other box's reachable-square set
   changed and the player's access didn't open or close anything, then the
   box has to be pushed further in the same direction eventually and doing
   so *now* can't foreclose any option. The solver commits to that follow-up
   push immediately instead of branching, which is the main branching-factor
   reducer for corridor-heavy levels.

A fifth check falls out of Phase 2's heuristic almost for free rather than
being implemented as its own pass: the Hungarian minimum-cost matching used
for the A* lower bound also certifies whether a *perfect* matching of boxes
to goals exists at all (ignoring other boxes as obstacles). If it doesn't —
some box has no push-path to any unfilled goal — that's an immediate
deadlock (the wiki's "bipartite deadlock"), caught as a byproduct of
computing the heuristic rather than as separate deadlock code.

Not planned for Phase 2, noted as future work if solve rate on Microban
falls short: closed diagonal deadlocks (checkerboard-pattern levels) and
full pattern-database deadlocks. These are called out on the wiki as real
but rarer categories; Microban is a beginner-oriented set and unlikely to
need them, so building them speculatively would be premature.

## 5. Structural checks (independent of deadlock detection)

Per the brief's Phase 3/4 requirements, validated at parse/generation time,
not search time:
- board fully enclosed (walls surround all floor reachable by the player
  with boxes removed — same "closed level" rule from §2)
- no isolated floor regions unreachable from the player's start
- box count equals goal count
- no box starts already on a goal (Phase 4's structural rule — distinct
  from "box on goal" being a valid *mid-solve* state, this is about the
  *initial* state specifically)
- every box must move at least once in the stored solution

## 6. Proposed module layout

New top-level `sokoban/` directory, sibling to `src/` — this is Node-side
generation/solving tooling and game data, not part of the browser engine
bundle, so it stays out of `src/`.

```
sokoban/
  xsb.ts              parseXSB, parseXSBFile (multi-level), serializeXSB
  board.ts            Board type, buildBoard()
  state.ts            State type, applyPush, legalPushes, stateKey (dedup)
  reachability.ts      shared player-reachable-region BFS
  deadlock/
    staticDeadlock.ts  precomputeDeadSquares() — reverse-pull BFS from goals
    freezeDeadlock.ts  recursive frozen-box test
    corral.ts          corral/PI-corral detection + pruning
    tunnel.ts          no-influence-push / tunnel macro detection
  heuristic.ts         per-goal push-distance tables, Hungarian matching lower bound
  solver.ts            pushOptimalAStar() — CLI-facing solve(board, state, opts)
  metrics.ts           box_lines/box_changes/pushing_sessions/congestion/
                       forced_ratio, structural checks, scoring function
  rng.ts               seeded PRNG (mulberry32), no crypto dependency
  generator.ts         Taylor–Parberry room templates, goal placement,
                       reverse "farthest state" search
  cli/
    solve.ts           node sokoban/cli/solve.ts solve <file.xsb> --json
    gen.ts             node sokoban/cli/gen.ts batch --count N --seed S ... --out levels.jsonl
    render.ts          node sokoban/cli/gen.ts render levels.jsonl --top 50
  tsconfig.json         separate from the engine's tsconfig (Node lib, no DOM)
  __tests__/
    xsb.test.ts, state.test.ts, solver.test.ts, deadlock.test.ts,
    metrics.test.ts, generator.test.ts

fixtures/
  microban/            Skinner's Microban set (Phase 3), credited README
  broken/              deliberately-invalid levels for rejection tests

docs/
  level-generation.md  this note, updated across phases
```

`package.json` gets a `typecheck:sokoban` script pointed at
`sokoban/tsconfig.json`, run alongside the existing `typecheck` per
CLAUDE.md's rule. `examples/sokoban/levels.ts` is untouched until Phase 6,
where accepted levels get adapted into whatever format the demo app loads
(not the app's current ad hoc grid format — that adapter is new code).

## 7. Taylor–Parberry algorithm, as I'll implement it (Phase 5 preview)

Their three-step pipeline, which the brief's Phase 5 already specifies and
this note just confirms against the source:
1. **Build an empty room**: partition a random width×height board into a
   grid of 3×3 blocks, fill each from a small library of wall/floor
   templates (randomly rotated/flipped), reject boards with connectivity
   failures, 4×3-or-larger open floor patches, or any floor tile enclosed on
   three sides. Determinism: template choice and rotation/flip driven by the
   seeded PRNG, tried in a seeded-shuffled order so failures are
   reproducible.
2. **Place goals** by brute-force search over goal-position combinations
   (their paper does full brute force; we can seed-shuffle the search order
   for reproducibility and stop at the first accepted arrangement per the
   timer budget).
3. **Reverse-solve outward**: from the goal state, BFS/iterative-deepening
   backward (pulls, not pushes) to find the state with maximum solve
   distance from the goal — that farthest state becomes the generated
   level's start position. This is our Phase 2 solver's search machinery
   run in reverse, not a separate implementation.

Their scoring formula (`100·(pushes − sibling_levels + 4·lines − 12·boxes) +
random jitter`, with hard penalties for trapped boxes, walls/boxes/players
touching, etc.) is a *starting point* for Phase 4, not something to copy
uncritically — the brief requires calibrating weights against Microban's
actual score distribution and getting sign-off before Phase 5 uses them.

## 8. Open questions / things to confirm before Phase 1 code

- None block starting Phase 1. The one dependency-shaped decision (how to
  run CLI TypeScript without `ts-node`/`tsx`) is resolved: Node 24 runs
  `.ts` natively, so no new package is needed.
