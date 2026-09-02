import type { Board } from "../board.ts";

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
 * Precomputes static ("simple") dead squares: floor cells a box can never
 * be pushed off of onto a goal, regardless of any other box or the player's
 * position. Computed by reverse-pulling an imaginary single box backward
 * from every goal — a pull from box cell X in direction (dx, dy) is valid
 * only if both the predecessor box cell (X - dir) and the cell the player
 * would need to stand on to perform the forward push (X - 2*dir) are open
 * floor. Any floor cell never reached this way is dead.
 */
export function computeDeadSquares(board: Board): Uint8Array {
  const size = board.width * board.height;
  const reachable = new Uint8Array(size);
  const queue: number[] = [];

  for (const goal of board.goals) {
    if (!reachable[goal]) {
      reachable[goal] = 1;
      queue.push(goal);
    }
  }

  while (queue.length > 0) {
    const cell = queue.pop()!;
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
      if (reachable[predBox]) continue;
      if (board.walls[predBox] || !board.floor[predBox]) continue;
      if (board.walls[playerStand] || !board.floor[playerStand]) continue;

      reachable[predBox] = 1;
      queue.push(predBox);
    }
  }

  const dead = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (board.floor[i] && !board.walls[i] && !reachable[i]) dead[i] = 1;
  }
  return dead;
}
