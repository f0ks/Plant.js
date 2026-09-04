import type { Board } from "./board.ts";
import { computeReachable, findPath } from "./reachability.ts";
import type { Rng } from "./rng.ts";
import { randomInt, shuffle } from "./rng.ts";
import type { Direction, Pull, State } from "./state.ts";
import { legalPulls, sortedBoxes, stateKey, step } from "./state.ts";
import { validateStructure } from "./validate.ts";

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

export interface FarthestStateOptions {
  /** Cap on total distinct states *discovered* (enqueued), the seed roots
   * included -- not on states expanded, which can be fewer when the cap or
   * the timeout stops the search mid-layer. Default 20000. */
  maxNodes?: number;
  /** Hard wall-clock budget in ms. Default 5000. */
  timeoutMs?: number;
}

export interface FarthestStateResult {
  state: State;
  distance: number;
  /** Distinct states discovered (enqueued) during the search, including the
   * seed roots -- the quantity `maxNodes` caps. Not every discovered state
   * is necessarily expanded. */
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
  /** The seed root the winning pull chain traces back to. Boxes are always
   * the goal cells; the *player* is that root's region representative, i.e.
   * replaying `solution` from `state` lands the player somewhere in this
   * same region (not necessarily on this exact cell — under `stateKey` those
   * are the same state). With multi-region seeding (see `findFarthestState`)
   * the region need not be the one the caller's `goalState.player` was in. */
  goalState: State;
}

interface PullNode {
  state: State;
  distance: number;
  parent: PullNode | null;
  pull: Pull | null;
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
    const pushBox = step(board, pull.box, { dx: -pull.direction.dx, dy: -pull.direction.dy });
    if (pushBox === null) {
      throw new Error("reconstructPullSolution: internal error, invalid pull direction");
    }
    const behind = step(board, pushBox, { dx: -pull.direction.dx, dy: -pull.direction.dy });
    if (behind === null) {
      throw new Error("reconstructPullSolution: internal error, invalid pull direction");
    }
    const walk = findPath(board, boxes, player, behind);
    if (walk === null) {
      throw new Error("reconstructPullSolution: internal error, player cannot reach a required push position");
    }
    solution += walk;
    solution += directionLetter(pull.direction).toUpperCase();

    const destination = step(board, pushBox, pull.direction)!;
    boxes = sortedBoxes(boxes.map((b) => (b === pushBox ? destination : b)));
    player = pushBox;
  }

  return solution;
}

/**
 * One representative cell per connected component of *free* floor (on the
 * floor, not a wall, not occupied by a box) given `boxes`, in ascending
 * cell order. Boxes act as obstacles for the player, so a box placement can
 * partition an otherwise-connected room into several player-reachable
 * regions — each of which is a distinct legal player position for the same
 * box multiset, and therefore a distinct state the reverse search has to
 * start from (see `findFarthestState`).
 *
 * Mirrors `isFullyConnected`'s one-shot use of `computeReachable`: walk the
 * free cells in index order and, whenever one isn't already covered by a
 * previously-computed region's reachable mask, record it as a new region's
 * representative and mark that whole region covered.
 */
export function playerRegions(board: Board, boxes: readonly number[]): number[] {
  const boxSet = new Set(boxes);
  const covered = new Uint8Array(board.floor.length);
  const representatives: number[] = [];

  for (let cell = 0; cell < board.floor.length; cell++) {
    if (!board.floor[cell] || board.walls[cell] || boxSet.has(cell)) continue;
    if (covered[cell]) continue;

    representatives.push(cell);
    const reachable = computeReachable(board, boxes, cell);
    for (let i = 0; i < reachable.length; i++) {
      if (reachable[i]) covered[i] = 1;
    }
  }

  return representatives;
}

/**
 * BFS over pull-reachable predecessor states of the "boxes on goals"
 * configuration `goalState.boxes`, returning the one with maximum distance
 * (in pulls) -- which equals its push-optimal solve distance, since the
 * pull-graph is the exact edge-reversal of the forward push-graph the
 * solver already searches (see the plan's Design notes, item 2).
 * Deduplicates with the same `stateKey` normalization the forward solver
 * relies on. Ties at the maximum distance are broken by reservoir sampling
 * over `rng`, so the choice is uniform and reproducible; the tie count feeds
 * `siblingLevels`.
 *
 * The search is seeded with **one root per player-reachable region** of the
 * goal configuration, all at distance 0. That matters for soundness: boxes
 * block the player, so "boxes on goals" frequently splits the room into
 * several regions, and `stateKey` normalizes the player to its region's
 * representative — so a state whose only pull-path back to the goal runs
 * through a region the search never seeded is not deduplicated away, it is
 * never discovered at all, and the reported distance comes out too shallow.
 * Every region is a legal "solved" position for the player, so every region
 * is a legitimate root.
 *
 * Consequently `goalState.player` is **ignored** — it is not used to pick a
 * root, and the winning chain's actual root is reported back as
 * `FarthestStateResult.goalState`. The parameter keeps its `State` type so
 * every existing call site still passes one well-formed value.
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

  for (const box of goalState.boxes) {
    if (box < 0 || box >= board.floor.length || board.walls[box] || !board.floor[box]) {
      throw new Error(`findFarthestState: box at cell ${box} is not on open floor`);
    }
  }

  const roots: PullNode[] = playerRegions(board, goalState.boxes).map((player) => ({
    state: { boxes: goalState.boxes, player },
    distance: 0,
    parent: null,
    pull: null,
  }));
  if (roots.length === 0) {
    throw new Error("findFarthestState: no free floor cell for the player in the goal state");
  }

  // Distinct regions have distinct `stateKey`s by construction (the key's
  // player component is the region's own minimum cell index), so this seeds
  // `visited` with exactly `roots.length` entries.
  const visited = new Set<string>(roots.map((root) => stateKey(board, root.state)));
  let frontier: PullNode[] = [...roots];
  let best = roots[0];
  // Seeded at 0 (not 1) so that when the roots are processed as the first
  // frontier elements inside the loop below, `roots[0]`'s own distance-0 tie
  // against `best` (itself) increments this to 1 rather than 2 -- avoiding a
  // double-count of that root. Every other root then ties through the same
  // reservoir-sampling branch, so all roots are weighted uniformly.
  let bestTieCount = 0;
  let nodes = roots.length;

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

  let winningRoot: PullNode = best;
  while (winningRoot.parent !== null) winningRoot = winningRoot.parent;

  return {
    state: best.state,
    distance: best.distance,
    nodes,
    siblingLevels: bestTieCount - 1,
    solution: reconstructPullSolution(board, best),
    goalState: winningRoot.state,
  };
}

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
  /** The "solved" state (boxes on goals) the reverse search started from —
   * specifically the region root the winning pull chain traces back to, so
   * replaying `solution` from `state` ends in this state's player region. */
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

/**
 * Lowest-index free floor cell — a single, always-legal player position for
 * the goal state `generateLevel` hands to `findFarthestState`. It is *not*
 * where the search starts from (the search seeds every region itself, see
 * `playerRegions`); it only makes `generateLevel`'s `goalState` a
 * well-formed `State`.
 */
function representativePlayer(board: Board, boxes: readonly number[]): number {
  for (let cell = 0; cell < board.floor.length; cell++) {
    if (board.floor[cell] && !board.walls[cell] && !boxes.includes(cell)) return cell;
  }
  // Unreachable from `generateLevel`: `buildRoom` only returns rooms whose
  // floor is fully connected and nook-free (so a 2x2-block room has >= 20
  // floor cells), and `placeGoals` fails outright unless it can place
  // `boxCount` goals MIN_GOAL_SPACING apart — together those guarantee at
  // least one floor cell is left over for the player. The invariant is real,
  // just non-local, so this throw stays a hard assertion rather than growing
  // defensive handling.
  throw new Error("representativePlayer: no free floor cell for the player");
}

/**
 * The full Phase 5 pipeline (docs/level-generation.md §7): build a room,
 * place goals, then reverse-search for the farthest state from "boxes on
 * goals". Returns `null` if any stage fails within its attempt/node budget,
 * or if the farthest state found would make a degenerate level (zero pushes,
 * or a box already sitting on a goal at the start) -- callers (cli/gen.ts)
 * should treat that as "this attempt didn't produce a level" and try again
 * with a fresh `rng` draw, not as an error.
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

  // A start state with a box already parked on a goal is a partially
  // pre-solved, strictly weaker puzzle. `validateStructure` already detects
  // exactly this, so reuse it rather than re-deriving the check; a hit means
  // this attempt didn't produce a usable level, handled the same way as the
  // room/goal failures above.
  const issues = validateStructure(board, farthest.state);
  if (issues.some((issue) => issue.code === "box-on-goal-at-start")) return null;

  return {
    board,
    state: farthest.state,
    goalState: farthest.goalState,
    distance: farthest.distance,
    nodes: farthest.nodes,
    siblingLevels: farthest.siblingLevels,
    solution: farthest.solution,
  };
}
