# Sokoban Phase 6: Integration — Design

Status: approved, not yet implemented.

## Purpose

Phases 0-5 built a standalone generator/solver toolkit under `sokoban/`
(XSB parsing, board/state model, push-optimal solver, Microban validation,
metrics/scoring, the Taylor-Parberry generator itself) that speaks XSB and
emits JSONL batches via `sokoban/cli/gen.ts`. None of that output has ever
reached `examples/sokoban`, the actual playable demo, which still ships five
hand-authored levels in a private, non-XSB grid format
(`examples/sokoban/levels.ts`). Phase 6 closes that gap: an adapter that
turns accepted generator output into the demo's level format, and a
concrete run of that adapter that replaces the five hand-authored levels
with five generated ones.

## Non-goals

- No changes to `examples/sokoban/sokoban.ts`'s runtime. It keeps loading
  `string[][][]` exactly as it does today — this is a build-time/dev-time
  conversion, not a runtime XSB loader in the browser.
- No UI for switching between hand-authored and generated level sets. The
  generated set replaces the hand-authored one outright.
- No new generation logic. Level generation is entirely `gen.ts`'s job;
  the adapter only consumes its JSONL output.

## Components

### `sokoban/demoExport.ts` (pure logic, unit-testable)

```ts
interface DemoSourceLevel {
  xsb: string;
  score: number;
  accepted: boolean;
  pushes: number;
}

function xsbToDemoGrid(xsb: string): string[][];
function selectDemoLevels(levels: DemoSourceLevel[], count: number): DemoSourceLevel[];
```

`DemoSourceLevel` is a local, minimal duck-typed interface over the JSONL
records `gen.ts` writes (not an import of `gen.ts`'s own `JSONLLevel` type —
`gen.ts` is a CLI entry point that calls `process.exit()` at module scope,
so it must never be imported as a library).

**`xsbToDemoGrid`**: parses the XSB text (`parseXSB` from `xsb.ts`), runs it
through `buildBoard` + `boardToRows` (`board.ts`) to normalize to a
full-width rectangular grid, maps each character to the demo's set (table
below), and pads the result with a 1-cell `"G"` border on all four sides.

Char mapping (XSB → demo), by cell content, not by literal character
substitution — the two formats assign `*`/`.`/`$` to different meanings:

| XSB | meaning | Demo |
|---|---|---|
| `#` | wall | `D` |
| `@` | player | `@` |
| `+` | player on goal | `%` |
| `$` | box | `B` |
| `*` | box on goal | `$` |
| `.` | goal | `*` |
| ` ` | floor | `-` |

**`selectDemoLevels`**: filters to `accepted: true`, sorts by `score`
descending, takes the top `count`, then re-sorts *that selection* by
`pushes` ascending. Two-step because "best levels" (by score) and "levels
in a sensible playing order" (easy to hard) are different orderings —
selecting by score and then presenting in score order would produce an
arbitrary difficulty sequence, not the ramp the demo has today.

### `sokoban/cli/export-demo.ts` (CLI wrapper)

```
node sokoban/cli/export-demo.ts <levels.jsonl> --count 5 --out examples/sokoban/levels.ts
```

Reads the JSONL file (one JSON object per line, `gen.ts batch`'s output
format), parses each line, calls `selectDemoLevels` then `xsbToDemoGrid` per
selected level, and emits a `.ts` file with the same legend-comment header
and `export const levels: string[][][] = [...]` shape
`examples/sokoban/levels.ts` has today. Writes to `--out` if given,
otherwise stdout — mirroring `gen.ts`'s own `--out`-or-stdout convention.

**Error handling**, matching `gen.ts`'s existing `{"error": ...}` /
exit-code-3 convention rather than a raw stack trace:
- Fewer than `count` accepted levels in the input → error, exit 3.
- A malformed JSONL line → error, exit 3.

### The actual conversion run (the deliverable, not just the tool)

```
node sokoban/cli/gen.ts batch --count 30 --seed 1 --box-count 3 \
  --block-cols 2 --block-rows 2 --out <tmp>/levels.jsonl
node sokoban/cli/export-demo.ts <tmp>/levels.jsonl --count 5 \
  --out examples/sokoban/levels.ts
```

Reuses the exact batch parameters already documented in §5.4's smoke test
(known to produce valid, non-degenerate, non-pre-solved levels). The
resulting `examples/sokoban/levels.ts` — five generated levels, hardest
last — gets committed, replacing the five hand-authored ones.

## Testing

`sokoban/__tests__/demoExport.test.ts`:
- `xsbToDemoGrid`: correct char mapping including the `*`/`.`/`$` swap,
  grass border present on all four sides, output dimensions are
  `(width+2) x (height+2)` relative to the parsed board.
- `selectDemoLevels`: filters out `accepted: false`, respects `count`,
  final order is ascending by `pushes` even though selection was by
  `score` — exercised with a small synthetic fixture array (no real
  generation needed).

Plus, per `CLAUDE.md`: `npm run typecheck`, `npm run typecheck:sokoban`,
`npm test` after implementation, and documentation updated
(`docs/level-generation.md` gets a new "Phase 6: integration" section in
the same evidence-based style as Phases 3-5 — real command, real output,
not predicted numbers).

## Open risk

`buildRoom`'s per-attempt success rate at `--box-count 3, --block-cols 2,
--block-rows 2` is documented (§5.4) as producing 20/20 requested levels in
37 attempts including the box-on-goal-at-start rejection. `--count 30`
should comfortably clear 5 accepted levels within default `maxAttempts`
budget, but this is confirmed by actually running it, not assumed.
