# Sokoban Level Generation — Design Note

Status: Phases 0-6 complete (design note, XSB/board/state core, the
push-optimal solver with all four planned deadlock/pruning techniques, the
Microban validation gate, metrics/scoring calibration, the generator
itself, and the demo-app integration adapter).

## Phase 6: integration

### 6.1 The gap being closed

Phases 0-5 built a complete, standalone generator/solver toolkit under
`sokoban/` — it speaks XSB and emits scored JSONL batches via
`sokoban/cli/gen.ts` — but none of that output had ever reached
`examples/sokoban`, the actual playable demo. That demo still shipped five
levels hand-authored directly as `string[][][]` literals in
`examples/sokoban/levels.ts`, in a private, non-XSB character set (§1's
"current level representation is not XSB" table). Phase 6 is entirely an
adapter problem, not a generation problem: turn accepted generator output
into the demo's grid format, then run that adapter once and commit the
result in place of the hand-authored levels.

### 6.2 Two new files

`sokoban/demoExport.ts` is the pure, unit-tested conversion logic:
`xsbToDemoGrid(xsb)` parses one XSB level (`parseXSB`), rebuilds it through
`buildBoard` + `boardToRows` to get a normalized full-width rectangular
grid (no ragged rows to special-case), remaps every cell through the
char-mapping table below, and pads the result with a 1-cell `"G"` border on
all four sides. `selectDemoLevels(levels, count)` picks which levels to
export and in what order (§6.4). `sokoban/cli/export-demo.ts` is the thin
CLI wrapper around both: it reads a `gen.ts batch` JSONL file, calls
`selectDemoLevels` then `xsbToDemoGrid` per selected level, and writes a
`.ts` file with the same legend-comment header and
`export const levels: string[][][] = [...]` shape the demo already expects
— to `--out` if given, stdout otherwise, mirroring `gen.ts`'s own
convention. It follows `gen.ts`'s existing `{"error": ...}` / exit-code-3
convention (not a raw stack trace) for two failure modes: fewer than
`count` accepted levels in the input, or a malformed JSONL line. Both files
define their own minimal `DemoSourceLevel` interface (`xsb`, `score`,
`accepted`, `pushes`) rather than importing `gen.ts`'s own JSONL record
type, because `gen.ts` is a CLI entry point that calls `process.exit()` at
module scope and must never be imported as a library.

### 6.3 Char mapping

| XSB | meaning | Demo |
|---|---|---|
| `#` | wall | `D` |
| `@` | player | `@` |
| `+` | player on goal | `%` |
| `$` | box | `B` |
| `*` | box on goal | `$` |
| `.` | goal | `*` |
| ` ` (floor) | floor | `-` |

The mapping is by cell *content*, not literal character substitution:
`*`, `.`, and `$` mean different things in the two formats (`$` is a bare
box in XSB but "box on goal" in the demo's set; `*` is "box on goal" in
XSB but a bare goal in the demo's set), so `xsbToDemoGrid` looks up meaning
first and remaps second rather than doing any direct char-to-char swap.

### 6.4 Grass border and selection/ordering

**Grass border.** `xsbToDemoGrid` pads every generated level with a 1-cell
`G` (grass) border on all four sides, matching the decorative style the
five hand-authored levels already used — each of those, per the pre-Phase-6
`examples/sokoban/levels.ts` (git history: commit `a48463f`), was itself
walled on all four edges with `D` and then wrapped in one more `G` ring, the
same shape §6.5's example grid below shows for a generated level. This is a
visual-consistency choice, not a functional necessity, and it requires no
change to `examples/sokoban/sokoban.ts`: `G` is already a wall-equivalent
character there (`move()`'s blocking check is literally
`if (target === "D" || target === "G")`), so the generator's output —
which is already fully enclosed by `#`/`D` walls on its own — just gets one
more decorative ring around the outside, identical in kind to what was
there before.

**Selection and ordering.** `selectDemoLevels(levels, count)` filters to
`accepted: true`, sorts by `score` descending, takes the top `count`, then
re-sorts *that selection* by `pushes` ascending. This is deliberately two
different orderings, not one: score is the generator's own quality signal
(§4.2's formula, roughly favoring more/longer box lines and penalizing
excess boxes or degenerate touching), and it is what decides *which* five
levels make the cut. But score order is not difficulty order — a highly
scored level isn't necessarily the hardest one — and presenting the demo's
levels in raw score order would produce an arbitrary difficulty sequence
rather than the easy-to-hard ramp the old hand-authored set had. Push
count (the push-optimal solution length) is the closer proxy for
difficulty as experienced by a player, so the final file order re-sorts
the already-selected five by `pushes` ascending.

### 6.5 The actual conversion run

Reusing the exact `--box-count 3 --block-cols 2 --block-rows 2` parameters
already validated non-degenerate and non-pre-solved in §5.4, but with
`--count 30` instead of 20 to comfortably clear 5 accepted levels within
budget (per the design spec's own "open risk" note — confirmed by running
it, not assumed):

```
$ node sokoban/cli/gen.ts batch --count 30 --seed 1 --box-count 3 --block-cols 2 --block-rows 2 --out <tmp>/phase6-levels.jsonl
{"requested":30,"generated":30,"attempts":53}
$ node sokoban/cli/export-demo.ts <tmp>/phase6-levels.jsonl --count 5 --out examples/sokoban/levels.ts
```

22 of the 30 generated levels came back `accepted: true` — well above the
5 needed, no retry required. `selectDemoLevels`'s top-5-by-score, then
re-sorted by pushes ascending, produced this file order in the committed
`examples/sokoban/levels.ts` (index 0 = first level array in the file,
index 4 = last):

| File position | score | pushes |
|---|---|---|
| Level 1 (index 0) | 2310 | 14 |
| Level 2 (index 1) | 2670 | 16 |
| Level 3 (index 2) | 2660 | 16 |
| Level 4 (index 3) | 2410 | 16 |
| Level 5 (index 4) | 2700 | 20 |

Pushes ascend 14→16→16→16→20 across the file by construction (that's the
final sort key); Level 5, at 2700 score and 20 pushes, is both the
highest-scored of the five and the hardest by push count — coincidence at
these parameters, not a guarantee the two orderings always agree, which is
exactly why they're computed as two separate sorts rather than one.

Level 1 (index 0), the shortest solve of the five at 14 pushes, as it
actually appears in the committed file — grass border, `D` walls, `*`
goals, `B` boxes, `@` player:

```
["G", "G", "G", "G", "G", "G", "G", "G", "G", "G"],
["G", "D", "D", "D", "D", "D", "D", "D", "D", "G"],
["G", "D", "*", "-", "-", "-", "-", "-", "D", "G"],
["G", "D", "-", "D", "-", "-", "B", "-", "D", "G"],
["G", "D", "-", "-", "-", "D", "D", "-", "D", "G"],
["G", "D", "-", "-", "D", "-", "*", "-", "D", "G"],
["G", "D", "-", "B", "B", "-", "-", "-", "D", "G"],
["G", "D", "D", "@", "-", "-", "*", "-", "D", "G"],
["G", "D", "D", "D", "D", "D", "D", "D", "D", "G"],
["G", "G", "G", "G", "G", "G", "G", "G", "G", "G"],
```

An 8×8 board: `--block-cols 2 --block-rows 2` tiles a 2×2 grid of
`generator.ts`'s 3×3 templates into a 6×6 interior (`BLOCK_SIZE = 3`), then
`buildRoom` encloses that in one cell of `#`/`D` wall on every side, giving
8×8. `xsbToDemoGrid` then adds the 1-cell `G` ring on top of that, for a
10×10 grid overall — matching every other level's dimensions in the file.

`examples/sokoban/levels.ts` now ships these 5 generated levels, replacing
the 5 hand-authored ones outright (no toggle between the two sets).
`examples/sokoban/sokoban.ts` needed no changes at all: the exported
`levels: string[][][]` shape, the legend-comment header, and every
character the runtime already handles (`G`/`D`/`B`/`*`/`$`/`%`/`@`/`-`) are
identical to what it already loaded, so this is a pure data swap, not a
loader change.

## Phase 5: the generator

### 5.1 Pull mechanics: derived algebraically from `applyPush`'s exact inverse

`state.ts`'s `applyPush(board, state, box, direction)` requires the player at
`box - direction` before the push and leaves it at `box` (the box's old
cell) afterward, with the box now at `box + direction`. Inverting this:
`isLegalPull`/`applyPull` (`sokoban/state.ts`) require the box currently at
`box` with the player already at `box - direction` (as if it had just
pushed), move the box to the player's current cell, and step the player back
to `box - 2*direction` — which must be open floor, not a wall, and not
occupied by another box. `legalPulls` is the reverse-search analogue of
`legalPushes`: for every box the player can reach the "just pushed it from
here" side of, in every direction that yields a legal pull.

This isn't just asserted — `sokoban/__tests__/pushes.test.ts`, "applyPull
exactly undoes applyPush for every legal push in a test room", replays every
legal push in a fixture room and confirms `applyPull` on the resulting state
reconstructs the exact original state.

### 5.2 Farthest-state search: one root per player region, and why the dedup is sound

`findFarthestState` (`sokoban/generator.ts`) is a layered BFS over
`legalPulls`, starting at the "boxes on goals" configuration and searching
outward. It dedups visited states with the same `stateKey` normalization
(sorted box multiset + player-reachable-region representative) the forward
solver already uses. That dedup is sound for the same reason it's sound in
`solver.ts`: the pull-graph is the *exact edge-reversal* of the push-graph,
so BFS shortest-path distance in the pull-graph from the goal state to any
state `S` equals `S`'s push-optimal solve distance back to the goal — a
property that only holds because Phase 3's Microban gate already proved the
underlying normalization correct for the forward direction. No new
dedup logic was needed or written; `generator.ts` imports `stateKey`
directly from `state.ts`.

**The edge-reversal argument only delivers that guarantee if the BFS
actually explores the whole pull-graph reachable from "solved" — and that
takes more than one root.** Boxes block the player, so a box on every goal
frequently partitions the room's floor into several player-reachable
regions. "Boxes on goals, player in region A" and "boxes on goals, player in
region B" are genuinely different states with different (often disjoint)
sets of legal pulls, and `stateKey` keeps them apart by design — its player
component is the region's own representative cell. Seeding the search from a
single arbitrary region therefore does not merely deduplicate the other
regions' descendants away; it never discovers them at all, and the search
returns a distance that is too shallow (sometimes 0) with nothing to signal
that anything was missed.

So the search seeds **one root per player-reachable region** of the goal
configuration: `playerRegions(board, boxes)` enumerates them with
`computeReachable` — walking free cells in index order and starting a new
region whenever one isn't covered by an earlier region's mask, mirroring
`isFullyConnected`'s one-shot connectivity walk — and every root goes into
`visited` and the initial frontier at distance 0. Every region is a legal
"solved" player position, so every region is a legitimate root, and the
existing reservoir-sampling tie-break then runs uniformly across all of
them. One consequence worth knowing at the call site: `goalState.player` is
ignored for seeding, and the winning chain's actual root comes back as
`FarthestStateResult.goalState` (which is what `GeneratedLevel.goalState`
now reports), so replaying the recorded solution from the start state ends
in *that* root's region rather than in whichever region the caller happened
to name.

This was a real defect found by the final whole-branch review, not a
hypothetical: single-region seeding understated the push-optimal distance on
1.7-5% of generated levels across seed sweeps, and biased `cli/gen.ts`'s
scoring accordingly. `sokoban/__tests__/generator.test.ts` guards it two
ways. A hand-built board puts the only goal on the single door cell between
a shallow dead-end pocket and a deep room; with a box on that goal the
pocket (which holds the lowest-index floor cell, the one the old seeding
picked) offers *zero* legal pulls, so single-region seeding reports distance
0 where the true answer is 3. That precise case is backed by a 40-seed sweep
over real generator-scale rooms, checking every result against an
independent multi-source reference BFS written directly in the test rather
than against `findFarthestState` itself — and asserting the sweep really did
cover room-splitting configurations, since a single hand-authored fixture is
exactly how this survived ten clean per-task reviews.

The farthest node's solution is reconstructed by `reconstructPullSolution`,
which walks the winning `PullNode` chain back to the root and replays each
pull as its corresponding forward push (walk-to-position + uppercase push
letter) — this is the string `cli/gen.ts` records as `distance`/`pushes`
and that `solve()` cross-validates against in
`sokoban/__tests__/generator.test.ts` (`solved.pushes === result.distance`
passed on the first implementation attempt, no pull-algebra debugging
needed).

### 5.3 `siblingLevels` is finally computable

Taylor & Parberry §3.3's `siblingLevels` term — left as a forced `0`
placeholder in Phase 4 because no generator existed yet to produce it — is
now real: `findFarthestState` naturally visits multiple states tied at the
maximum pull-distance, and reservoir-samples among them (uniform,
reproducible per seed) for the state it returns. The count of *other*
states tied with the chosen one at that same maximum distance is exactly
"how many other levels the generator found at the same search depth",
exposed as `FarthestStateResult.siblingLevels` and threaded unchanged
through `GeneratedLevel.siblingLevels` (Task 7) into `cli/gen.ts`'s
`score()` call (Task 8).

`sokoban/cli/score-microban.ts` is deliberately left as-is, still passing
`siblingLevels: 0`. That's correct there, not a leftover gap: Microban
levels are imported, human-designed levels scored in isolation, not
generator output from a search batch — they have no "search depth" to be
siblings within, so `0` is the right value for that CLI, not a placeholder
waiting to be filled in.

### 5.4 Room-generation success rates and the end-to-end smoke test

**Empirical success-rate table**, measured by a throwaway prototype of the
exact template set and validators (`buildRoom`'s 8 fixed 3×3 wall/floor
templates, connectivity/openness/nook checks) run for 2000 seeded attempts
at each room size, before Task 4 was implemented:

| blocks | per-attempt success rate |
|---|---|
| 2×2 | 11.0% |
| 3×2 | 4.2% |
| 3×3 | 1.1% |

At `buildRoom`'s default `maxAttempts = 300`, the probability of every
attempt failing at the 2×2 default is `0.89^300 ≈ 0` in theory; Task 4's own
test checks this empirically rather than trusting the math alone
(`sokoban/__tests__/generator.test.ts`: asserts at least 48/50 seeds
succeed within budget at 2×2, a threshold rather than a tight bound — in
practice, running the same computation for seeds 1-50 gives 50/50
successes).

**Actual end-to-end smoke test**, run against the built repo (not
predicted numbers). Re-run after the §5.2 multi-region-seeding fix and the
§5.8 box-on-goal-at-start rejection, both of which change the output — the
numbers below supersede an earlier transcript recorded before those fixes:

```
$ node sokoban/cli/gen.ts batch --count 20 --seed 1 --box-count 3 --block-cols 2 --block-rows 2 --out levels.jsonl
{"requested":20,"generated":20,"attempts":37}
$ echo $?
0
```

All 20 requested levels were produced, taking 37 attempts — the 17 rejected
attempts are the box-on-goal-at-start rejection doing its job (see §5.8;
before it, this same command produced 20 levels in 20 attempts but 11 of
those 20 started partially pre-solved). Of the 20 generated levels, 14 were
`accepted` (`score > 0`) and 6 were rejected; scores ranged from -800 to
2700 across all 20, and 50 to 2700 among the accepted ones. Two real values:
the top-ranked level (seed 1, attempt 34) scored 2700 with 20 pushes / 11
box lines / 3 boxes / 0 siblings; the lowest-scoring one (seed 1, attempt 4)
scored -800 with 8 pushes / 6 box lines / 3 boxes / 0 siblings.

`node sokoban/cli/render.ts levels.jsonl --top 5` printed five ranked,
readable XSB levels, highest score first, e.g. the top-ranked one:

```
; rank 1  score 2700  pushes 20  lines 11  boxes 3  seed 1 attempt 34
; generated seed=1 attempt=34
########
## $ .##
#@$  $ #
#  ##  #
#  #   #
#    # #
#.    .#
########
```

Read by eye: an 8×8 room fully enclosed by a `#` border, 3 goals (`.`), 3
boxes (`$`), and a player (`@`) — a real, closed Sokoban room, not
degenerate output, and with no `*` anywhere, i.e. no box starting on a goal
(none of the 20 has one).

The recorded push counts were also re-checked independently rather than
taken on trust: feeding each of these five levels' XSB back through
`solve()` reproduces the recorded number exactly (20, 16, 14, 16, 14),
confirming each is genuinely push-optimal. That check matters here — the
pre-fix version of this section showcased a level claiming 19 pushes whose
true optimum was 13, which is precisely the §5.2 bug showing up in the
scoring.

### 5.5 Goal-spacing rule: `MIN_GOAL_SPACING = 2` (Chebyshev)

`placeGoals` (`sokoban/generator.ts`) keeps every pair of placed goals at
least `MIN_GOAL_SPACING = 2` cells apart by Chebyshev distance. This is this
implementation's own documented choice, not something the source material
specifies beyond "brute-force search over goal-position combinations" —
without it, randomized placement tends to clump goals together, leaving the
reverse farthest-state search little room to spread boxes out into a
non-degenerate level. Search is randomized (seed-shuffled floor-cell order,
first spaced-out combination accepted) rather than true combinatorial brute
force, which is intractable for anything but a tiny floor — consistent with
§7's "seed-shuffle the search order for reproducibility" framing.

### 5.6 `cli/render.ts` invocation correction

§6's module-layout line originally showed `render.ts` invoked as `node
sokoban/cli/gen.ts render levels.jsonl --top 50` — a `gen.ts` subcommand —
while listing it as its own file under `cli/`. That was a typo/inconsistency
in the original design note, caught during Task 9: `render.ts` is its own
CLI entry point, invoked directly as `node sokoban/cli/render.ts
levels.jsonl --top 50`. §6 below is corrected to match; the smoke test in
5.4 above used the corrected form.

### 5.7 A minor plan-execution note

One thing worth recording for completeness, distinct from the design
decisions above: Task 6's plan brief shipped a `findFarthestState` test
fixture (`sokoban/__tests__/generator.test.ts`) whose room rows had no `@`
player marker, which `buildBoard` rejects outright (`"buildBoard: level has
no player"`). The tests construct their own synthetic `goalState` and never
read `buildBoard`'s returned player position, so this was a harmless
fixture bug, not an algorithm bug — fixed by adding `@` to a free interior
cell in the three affected fixtures. No production code was affected.

### 5.8 Known limitations / future work

- **Rejecting box-on-goal-at-start costs yield.** A generated level whose
  *start* state already has a box parked on a goal is partially pre-solved
  and strictly weaker as a puzzle, so `generateLevel` now checks the
  farthest state the reverse search returns with `validateStructure`
  (`sokoban/validate.ts`, the `box-on-goal-at-start` issue — reused, not
  reimplemented) and returns `null` when it hits, the same
  "this attempt didn't produce a level" convention `buildRoom` and
  `placeGoals` already use. `cli/gen.ts`'s existing retry loop absorbs it
  with no new machinery. The tradeoff is real and measured on the §5.4 smoke
  test (`--count 20 --seed 1 --box-count 3`, everything else identical):
  without the rejection, 20 levels in 20 attempts, but 11 of the 20 started
  pre-solved; with it, 20 levels in 37 attempts and none pre-solved. So
  roughly 1.85× the attempts per accepted level at these parameters — cheap
  here (each attempt is a fresh room plus a bounded reverse search), but
  worth remembering when budgeting `--max-attempts` for larger rooms or
  higher box counts, where per-attempt costs are much higher. A cheaper
  future option would be biasing goal placement away from cells the search
  tends to leave boxes on, rather than rejecting after the fact.
- **`findFarthestState`'s budget is wall-clock, not node-count, so seeded
  runs are not reproducible in the strict sense.** `timeoutMs` (default
  5000ms) stops the search by elapsed time, which means a heavily-loaded
  machine could in principle expand fewer layers than an idle one and return
  a different state for the very same seed — in tension with the
  seed-determinism guarantee three tests in
  `sokoban/__tests__/generator.test.ts` assert. This has not been observed
  to actually happen at the tested parameters (the searches there finish far
  inside the budget; `maxNodes`, which *is* deterministic, is the binding
  cap in practice), so it is recorded rather than fixed. A proper fix —
  making the budget purely node-count-based, or making the timeout affect
  only an explicitly-flagged "truncated" result — needs more design thought
  than it was worth spending inline here.
- **Larger rooms have low per-attempt success rates and aren't tuned
  further in this phase.** The 5.4 table shows 3×2 (4.2%) and 3×3+ (1.1%,
  falling further for bigger grids) succeed far less often per attempt than
  the 2×2 default; the retry loop still converges given enough attempts, but
  the template mix itself isn't re-tuned for larger rooms here, same spirit
  as Phase 3's two documented scope cuts.
- **No upper bound is enforced on `boxCount`** beyond whatever `placeGoals`'s
  spacing constraint can actually fit on the generated room. Taylor &
  Parberry's own generator "explodes" past roughly 6 boxes (per Phase 0's
  reading of the paper); this implementation hasn't been stress-tested past
  the smoke test's `--box-count 3` — worth doing before Phase 6 if it needs
  bigger levels.

## Phase 4: metrics and scoring calibration

### 4.1 Module-layout correction: only two of the four originally-listed metrics exist in the cited source

§6's module layout (written in Phase 0, before the source paper's actual text
had been re-checked closely) listed `metrics.ts` as covering
"box_lines/box_changes/pushing_sessions/congestion/forced_ratio". Re-reading
Taylor & Parberry (LARC-2011-01) §3.3 directly for this phase: the paper
defines exactly three difficulty metrics -- move count, push count, and
**box lines** -- and separately proposes **box changes** as a fourth,
easy-to-define candidate it did not end up using ("this may be an even
better measure of difficulty, and may improve the overall speed of the
generator, but it is more difficult to implement" -- difficult to fold into
their *generator's* forward search, not difficult to define). "Pushing
sessions", "congestion", and "forced_ratio" do not appear anywhere in the
paper; there's no other cited source in this project defining them either.
Rather than invent definitions for terms that don't trace back to any
source, `sokoban/metrics.ts` implements exactly the two the paper defines
precisely enough to test: **box lines** and **box changes**.

- **Box lines**: "how many times the player pushes a box, but any number of
  pushes of the same box in the same direction only count as a single box
  line." Implemented as `pushEvents()` (replays a solution string into an
  ordered, stably-box-identified push sequence) plus `boxLines()`, which
  counts runs of consecutive same-box-same-direction events.
- **Box changes**: "how many times the player stopped pushing one box, in
  any direction, and began pushing another." Implemented as `boxChanges()`
  over the same event sequence. Available for future use (the paper leaves
  open whether it or box lines correlates better with difficulty) but not
  currently part of the scoring formula, matching the paper (which scores
  with lines, not changes).

### 4.2 Scoring formula and the touching/trapped adjustments

`sokoban/metrics.ts`'s `score()` implements §3.3's formula verbatim:
`100 * (pushes - siblingLevels + 4*lines - 12*boxes) + Random(0, 300)`, plus
its post-score adjustments, applied at face value per the paper's own
stated signs (not all penalties -- two are bonuses):

| Condition | Points |
|---|---|
| Any box permanently stuck (interpreted here as `hasFreezeDeadlock`, since the paper doesn't define "trapped" further and this reuses Phase 2's already-tested check) | -100000 |
| Box touching a wall | -150 |
| Box touching the player | +50 |
| Box touching another box | +30 |
| Goal touching a goal | +30 |

`isAccepted()` implements "any level with a final score of 0 or less is
rejected." `countTouching()` counts each adjacent pair once per side (a box
between two other boxes contributes 2 to `boxTouchingBox`), which is the
simplest reading of "worth N points" per occurrence and is what's exercised
by the calibration below.

Two inputs the formula needs aren't available outside a generator batch and
are out of scope until Phase 5: `siblingLevels` (how many other levels the
generator found at the same search depth) and the tie-breaking `Random(0,
300)` jitter (fixed at `0` by `sokoban/cli/score-microban.ts` for a
reproducible report). Both are exposed as explicit parameters rather than
defaulted away, so Phase 5's generator can supply real values once it
exists.

### 4.3 Calibration against Microban

`node sokoban/cli/score-microban.ts fixtures/microban/m1.txt --timeout 8000`
scores every level Phase 3 already found solvable (141/155), using each
level's push-optimal solution for `pushes`/`lines`, `siblingLevels: 0`, and
`random: 0` (per 4.2's limitations).

| | value |
|---|---|
| Scored (solved) levels | 141 |
| Accepted (`score > 0`) | 123 (87%) |
| Rejected | 18 |
| Score range | -7800 to 24430 |
| Mean / median | 5038 / 4010 |
| Trapped-box count among solved levels | 0 |

The paper's weights (100 / 4 / -12, and the touching constants) work
reasonably as-is on Microban -- no recalibration was needed. Every
rejection is a many-box level where `-12*boxes` dominates a comparatively
low push/line count (e.g. level 107: 11 boxes, 10 pushes, 8 lines, score
-7800), which is exactly the tradeoff the paper describes wanting ("the
number of lines needs to exceed the number of boxes by a certain factor for
the level to have a better chance of being a good level"). Zero trapped
boxes among solved levels is the expected sanity check, not a finding: a
genuinely frozen box would make the level unsolvable, and Phase 3 already
confirmed the solver has no false-negative solvability bugs left, so this
number should be (and is) zero. No level's fate flips on the touching
bonuses/penalties alone -- they shift scores by a few hundred points against
a formula whose base term spans tens of thousands.

**Sign-off note for Phase 5**: this calibration is against imported,
human-designed levels scored in isolation (`siblingLevels: 0`), not
generator output scored within a batch. It establishes that the formula
produces a sane, non-degenerate spread (not all-accept, not all-reject) on
real data -- it does not yet prove the weights are right for comparing
sibling levels from the same generation run, which can only be checked once
Phase 5 exists.

## Phase 3: Microban validation gate

### 3.1 Fixtures

`fixtures/microban/m1.txt` — David W. Skinner's Microban set, 155 levels,
fetched verbatim from a mirror of his original page and credited per its
distribution terms (`fixtures/microban/README.md`). `fixtures/broken/` holds
one deliberately-invalid level per universal structural rule (see 3.3), used
to test that `sokoban/validate.ts` rejects each failure mode
(`sokoban/__tests__/fixtures.test.ts`).

### 3.2 Parser gap found against real data

The real Microban file doesn't match the format §2/§6 assumed: every level
puts a **blank line** between its `; N` title and its grid (not adjacent),
and some levels have a second title line in bare single quotes with no `;`
prefix (e.g. `'Duh!'` on level 44). `parseXSBFile` threw on the whole file
under the original "leading `;` lines, no blank line" assumption. Fixed by
(a) classifying any line containing a character outside the valid XSB grid
set as metadata regardless of a `;` prefix, and (b) merging a metadata-only
block forward into the next block instead of treating it as its own
(grid-less) level. `comments` no longer round-trips byte-for-byte through
`serializeXSBFile` for files using this convention (the blank line is
dropped) — round-trip fidelity was only ever demonstrated against the
adjacent-comment style, and nothing downstream needs the original text back;
see `sokoban/xsb.ts` and the added `parseXSBFile` tests.

### 3.3 Structural checks (§5): two of the four are not universal — corrected against real data

`sokoban/validate.ts` implements all four §5 checks, but running them
against all 155 real Microban levels falsified two of them as blanket
rejection rules:

- **`box-on-goal-at-start`**: 72 hits across 40 levels — including level 1,
  the very first tutorial level. Professionally designed levels routinely
  start a box already on its goal (a legitimate framing choice); this is not
  a defect.
- **`isolated-floor`**, as originally written (any floor cell unreachable
  from the player, boxes ignored): 147/155 levels hit this — hand-drawn XSB
  ragged-edge padding (blank alignment space outside the walls) is floor by
  the parser's own padding rule (§2) but is essentially never fully
  connected. Redefined to only flag a **goal or box** cell that's
  unreachable (padding with no goal/box in it doesn't matter to solving).
  That drops the false-positive rate to 1/155: level 155, "The Dungeon",
  which has several small walled-off rooms containing a pre-matched
  box+goal pair purely as decoration — a real, deliberate exception, not a
  bug in the check.

Both checks are kept in `validateStructure` (correct, tested, useful for
Phase 5's generator to self-check its own output) but are no longer treated
as hard gates for imported/third-party levels. `not-closed` and
`box-goal-mismatch` are the two checks that hold universally — 0 failures
across all 155 Microban levels — and are what actually gates
`sokoban/cli/validate-microban.ts`'s exit code and the fixtures test.

### 3.4 Solver correctness bugs found and fixed (two)

Running the solver against Microban (not just structural checks) is what
actually earns "validation gate" in this phase's name — it surfaced two
real bugs, not performance limits.

#### 3.4.1 Freeze-deadlock cache poisoning

Level 3 — a beginner-tier level —
returned `no_solution` after exhausting a 48-state search space, despite a
brute-force search (no deadlock pruning at all) finding a solution in 169
states. Bisecting the four pruning mechanisms individually against level 3
isolated it to `hasFreezeDeadlock`.

Root cause (`sokoban/deadlock/freezeDeadlock.ts`): `checkFrozen`'s
cycle-breaking recursion (temporarily assuming a box on the call stack is
frozen, to resolve mutual box-on-box dependencies) unconditionally cached
(`resolved.set`) whatever answer it computed — including an answer computed
*while* that assumption was active for some other box still higher up the
stack. When the assumed-frozen box later resolved to **not** frozen after
all, the nested answer computed under that now-false assumption stayed
cached as if it were unconditional truth. Concretely: two boxes stacked
vertically, the lower one pinned against a wall on one side but not
genuinely frozen (the upper box can still slide sideways) — checking the
upper box first correctly resolves it to "not frozen," but along the way it
nested-computes and poisons the lower box's cache entry as "frozen," so a
direct query of the lower box afterwards (exactly what `hasFreezeDeadlock`'s
box loop does) returns the wrong answer.

Fix: only write into the `resolved` memo when the call is a "root" query —
`assumed` is empty once the current cell is popped back off it, meaning no
other box's cycle-breaking assumption was active on the stack while this
answer was computed. A nested answer computed mid-assumption is still
returned to its immediate caller (needed for that caller's own
computation) but never persisted as a global fact. Regression test:
`sokoban/__tests__/freezeDeadlock.test.ts`, "is not frozen when a
mutual-dependency cycle resolves false for the box actually being asked
about."

#### 3.4.2 Corral pruning forced a pointless move, starving every other box

Level 96 (and 97) returned `no_solution` after exhausting a few thousand
states, despite a brute-force search finding a solution. Bisection (same
method as 3.4.1) isolated it to corral pruning specifically, and it
reproduced from the level's very first move — not deep in the search.

Root cause (`sokoban/solver.ts`'s corral loop, using
`sokoban/deadlock/corral.ts`): a corral (player-unreachable pocket) was
treated as needing attention ("unsatisfied") if *either* it contained an
unfilled goal, *or* one of its barrier boxes wasn't currently sitting on
*any* goal — anywhere on the board, not necessarily inside this corral.
Level 96 has a small dead-end room with no goal in it at all, whose sole
barrier box (not yet on its own goal, which lies elsewhere entirely) still
satisfied that second, meaningless disjunct. Once `isPICorral` also
confirmed the room as pushable-into (correctly — it really is a one-way
dead end with no other currently-legal escape), the solver restricted
*every* candidate push at that state down to just that one pointless box,
forever — the other two boxes never got a single move. The branch
freeze-deadlocked once the box was fully pushed in, and since it was the
only branch, the whole search reported unsolvable immediately.

Fix: dropped the "barrier box isn't on a goal" disjunct. A corral is only
ever a reason to restrict search if pushing into it can make progress,
which requires an actual unfilled goal *inside the corral* — extracted as
`isCorralUnsatisfied` (`sokoban/deadlock/corral.ts`), used by both
`solver.ts` and `sokoban/__tests__/corral.test.ts`. Regression test:
`sokoban/__tests__/solver.test.ts`, "solves a level with a goal-less
dead-end pocket next to a box that also has a real escape (Microban #96
regression)".

### 3.5 Solve-rate results

Full run: `node sokoban/cli/validate-microban.ts fixtures/microban/m1.txt --timeout 8000`
(≈3 min wall-clock for all 155 levels; not part of `npm test` — see 3.6).

| | count |
|---|---|
| Total levels | 155 |
| Structurally valid (`not-closed` / `box-goal-mismatch`) | 155/155 |
| Solved | 141 (91%) |
| Failed — `timeout` | 14 |
| Failed — `no_solution` | **0** |

Zero `no_solution` failures is the meaningful number here: every level the
solver reports unsolvable actually *is* (verified per-level during
debugging above), and every remaining gap is a performance limit on the 14
hardest levels, not a correctness bug — both of Phase 2's own scope cuts
(§ "Phase 2 scoping decisions": multi-room corral combination, and the
tunnel no-influence-push macro) target exactly this kind of case. Given
that, and that this is a beginner-oriented set, treating 91% at an 8s/level
budget as sufficient to proceed to Phase 4 rather than integrating either
deferred technique now — revisit if a harder level set in a later phase
shows a materially worse rate.

### 3.6 Why the full run isn't part of `npm test`

`sokoban/__tests__/fixtures.test.ts` checks structural validity (fast, all
155 levels, no solving) and `sokoban/__tests__/solver.test.ts` carries
targeted regressions for both bugs above, but a full 155-level solve is
~3 minutes — too slow for a test suite run on every change. Use
`sokoban/cli/validate-microban.ts` directly (3.5) when solver internals
change and a full-set check is warranted.


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
  metrics.ts           box lines/box changes (Phase 4 note: the only two
                       per-solution metrics Taylor–Parberry actually define),
                       touching/trapped checks, scoring function
  rng.ts               seeded PRNG (mulberry32), no crypto dependency
  generator.ts         Taylor–Parberry room templates, goal placement,
                       reverse "farthest state" search
  cli/
    solve.ts           node sokoban/cli/solve.ts solve <file.xsb> --json
    gen.ts             node sokoban/cli/gen.ts batch --count N --seed S ... --out levels.jsonl
    render.ts          node sokoban/cli/render.ts levels.jsonl --top 50
                       (its own entry point, not a gen.ts subcommand --
                       corrected from this line's original text; see
                       Phase 5 §5.6)
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
random jitter`, with a hard penalty for a trapped box and mixed-sign
adjustments for walls/boxes/players/goals touching — see Phase 4's §4.2 for
the exact, corrected signs) was implemented and calibrated against Microban
in Phase 4 (§4.3): the paper's weights held up without adjustment, so
Phase 5 can use them as-is, with the sign-off caveat noted there about
`siblingLevels` only being testable once a generator batch exists.

## 8. Open questions / things to confirm before Phase 1 code

- None block starting Phase 1. The one dependency-shaped decision (how to
  run CLI TypeScript without `ts-node`/`tsx`) is resolved: Node 24 runs
  `.ts` natively, so no new package is needed.
