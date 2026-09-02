import type { Board } from "./board.ts";

const PATH_DIRS: [number, number, string][] = [
  [0, -1, "u"],
  [0, 1, "d"],
  [-1, 0, "l"],
  [1, 0, "r"],
];

/**
 * BFS over floor cells reachable by the player from `from`, given the
 * current box positions as obstacles (a box occupies its cell — the player
 * can stand next to one but not on it). Returns a boolean mask, 1 = reachable
 * (including `from` itself), parallel to `board.floor`.
 */
export function computeReachable(
  board: Board,
  boxes: readonly number[],
  from: number,
): Uint8Array {
  const { width, height, walls, floor } = board;
  const blocked = new Uint8Array(walls.length);
  for (const box of boxes) blocked[box] = 1;

  const reachable = new Uint8Array(walls.length);
  if (walls[from] || blocked[from]) {
    return reachable;
  }

  const queue: number[] = [from];
  reachable[from] = 1;

  while (queue.length > 0) {
    const cell = queue.pop()!;
    const x = cell % width;
    const y = (cell - x) / width;

    const neighbors: number[] = [];
    if (x > 0) neighbors.push(cell - 1);
    if (x < width - 1) neighbors.push(cell + 1);
    if (y > 0) neighbors.push(cell - width);
    if (y < height - 1) neighbors.push(cell + width);

    for (const next of neighbors) {
      if (reachable[next]) continue;
      if (!floor[next] || walls[next] || blocked[next]) continue;
      reachable[next] = 1;
      queue.push(next);
    }
  }

  return reachable;
}

/**
 * Shortest walk (u/d/l/r) for the player from `from` to `to`, treating box
 * positions as obstacles. Null if unreachable. Empty string if already
 * there.
 */
export function findPath(
  board: Board,
  boxes: readonly number[],
  from: number,
  to: number,
): string | null {
  if (from === to) return "";

  const { width, height, walls, floor } = board;
  const blocked = new Uint8Array(walls.length);
  for (const box of boxes) blocked[box] = 1;
  if (walls[from] || blocked[from] || walls[to] || blocked[to]) return null;

  const prevCell = new Int32Array(walls.length).fill(-2);
  const prevLetter = new Array<string>(walls.length).fill("");
  prevCell[from] = -1;

  const queue: number[] = [from];
  let head = 0;

  while (head < queue.length) {
    const cell = queue[head++];
    if (cell === to) break;
    const x = cell % width;
    const y = (cell - x) / width;

    for (const [dx, dy, letter] of PATH_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (prevCell[next] !== -2) continue;
      if (!floor[next] || walls[next] || blocked[next]) continue;
      prevCell[next] = cell;
      prevLetter[next] = letter;
      queue.push(next);
    }
  }

  if (prevCell[to] === -2) return null;

  let path = "";
  let cur = to;
  while (cur !== from) {
    path = prevLetter[cur] + path;
    cur = prevCell[cur];
  }
  return path;
}
