import type { Board } from "./board.ts";

const DIRS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

function inBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && x < board.width && y >= 0 && y < board.height;
}

/**
 * Minimum push distance from every cell to `goal`, ignoring all other
 * boxes and the player (an "if this box were alone on the board" bound) --
 * computed by the same reverse-pull BFS as `computeDeadSquares`, but from a
 * single goal and recording distance instead of a single reachable mask.
 * -1 where no box could ever reach the goal from that cell.
 */
export function computePushDistances(board: Board, goal: number): Int32Array {
  const size = board.width * board.height;
  const dist = new Int32Array(size).fill(-1);
  dist[goal] = 0;
  const queue: number[] = [goal];
  let head = 0;

  while (head < queue.length) {
    const cell = queue[head++];
    const x = cell % board.width;
    const y = (cell - x) / board.width;

    for (const { dx, dy } of DIRS) {
      const px = x - dx;
      const py = y - dy;
      const plx = px - dx;
      const ply = py - dy;
      if (!inBounds(board, px, py) || !inBounds(board, plx, ply)) continue;

      const predBox = py * board.width + px;
      const playerStand = ply * board.width + plx;
      if (dist[predBox] !== -1) continue;
      if (board.walls[predBox] || !board.floor[predBox]) continue;
      if (board.walls[playerStand] || !board.floor[playerStand]) continue;

      dist[predBox] = dist[cell] + 1;
      queue.push(predBox);
    }
  }

  return dist;
}

/** One push-distance table per goal, in `board.goals` order. */
export function computeGoalDistanceTables(board: Board): Int32Array[] {
  return board.goals.map((goal) => computePushDistances(board, goal));
}

/**
 * Minimum-cost perfect matching (Kuhn-Munkres / Hungarian algorithm,
 * O(n^3)) of `cost`'s n rows to n or more columns. Ported from the classic
 * 1-indexed shortest-augmenting-path formulation; `assignment[i]` is the
 * column matched to row i.
 */
export function hungarianMinCost(cost: number[][]): { total: number; assignment: number[] } {
  const n = cost.length;
  if (n === 0) return { total: 0, assignment: [] };
  const m = cost[0].length;
  if (n > m) {
    throw new Error("hungarianMinCost: number of rows must not exceed number of columns");
  }

  const INF = Number.POSITIVE_INFINITY;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(INF);
    const used = new Array<boolean>(m + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] !== 0) assignment[p[j] - 1] = j - 1;
  }
  const total = -v[0];
  return { total, assignment };
}

export interface LowerBoundResult {
  value: number;
  deadlock: boolean;
  assignment: number[];
}

/**
 * Admissible lower bound on remaining pushes: minimum-cost perfect
 * matching of boxes to goals by push distance (ignoring box-box
 * interference). As a byproduct, this also certifies whether a perfect
 * matching exists at all -- if some box has no push-path to any goal, the
 * matching is forced to use an "unreachable" pairing and the total comes
 * back at or above the sentinel, which is reported as `deadlock: true`
 * (the wiki's "bipartite deadlock").
 */
export function hungarianLowerBound(
  distanceTables: Int32Array[],
  boxes: readonly number[],
  goals: readonly number[],
): LowerBoundResult {
  if (boxes.length === 0) {
    return { value: 0, deadlock: false, assignment: [] };
  }
  if (boxes.length > goals.length) {
    throw new Error("hungarianLowerBound: more boxes than goals");
  }

  // A real per-pairing distance is always < number of board cells, so a
  // sum of `boxes.length` real distances is always < boxes.length * cellCount.
  // Any total at or above that bound must include at least one sentinel
  // (unreachable) pairing.
  const cellCount = distanceTables.length > 0 ? distanceTables[0].length : 0;
  const sentinel = boxes.length * cellCount + 1;

  const cost: number[][] = boxes.map((box) =>
    goals.map((_goal, j) => {
      const d = distanceTables[j][box];
      return d === -1 ? sentinel : d;
    }),
  );

  const { total, assignment } = hungarianMinCost(cost);
  const deadlock = total >= sentinel;
  return { value: deadlock ? Infinity : total, deadlock, assignment };
}
