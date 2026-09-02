import type { Board } from "./board";

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
