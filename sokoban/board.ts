import type { State } from "./state";
import { sortedBoxes } from "./state";

/** Cell index = y * width + x. */
export interface Board {
  width: number;
  height: number;
  walls: Uint8Array;
  floor: Uint8Array;
  goals: number[];
  isGoal: Uint8Array;
}

const WALL = "#";
const PLAYER = "@";
const PLAYER_ON_GOAL = "+";
const BOX = "$";
const BOX_ON_GOAL = "*";
const GOAL = ".";
const FLOOR_CHARS = new Set([" ", "-", "_"]);

const VALID_CHARS = new Set([
  WALL,
  PLAYER,
  PLAYER_ON_GOAL,
  BOX,
  BOX_ON_GOAL,
  GOAL,
  ...FLOOR_CHARS,
]);

/**
 * Converts raw XSB grid rows (as produced by `parseXSBFile`) into an
 * immutable `Board` plus the level's initial `State`. Ragged rows are
 * padded with floor up to the widest row, per the XSB convention that
 * trailing floor characters may be omitted.
 */
export function buildBoard(rows: string[]): { board: Board; state: State } {
  const height = rows.length;
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  const walls = new Uint8Array(width * height);
  const floor = new Uint8Array(width * height);
  const isGoal = new Uint8Array(width * height);
  const goals: number[] = [];
  const boxes: number[] = [];
  let player: number | undefined;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = x < row.length ? row[x] : " ";
      if (!VALID_CHARS.has(ch)) {
        throw new Error(
          `buildBoard: unrecognized level character ${JSON.stringify(ch)} at (${x}, ${y})`,
        );
      }

      const idx = y * width + x;

      if (ch === WALL) {
        walls[idx] = 1;
        continue;
      }

      floor[idx] = 1;

      if (ch === GOAL || ch === PLAYER_ON_GOAL || ch === BOX_ON_GOAL) {
        isGoal[idx] = 1;
        goals.push(idx);
      }
      if (ch === PLAYER || ch === PLAYER_ON_GOAL) {
        player = idx;
      }
      if (ch === BOX || ch === BOX_ON_GOAL) {
        boxes.push(idx);
      }
    }
  }

  if (player === undefined) {
    throw new Error("buildBoard: level has no player");
  }

  const board: Board = { width, height, walls, floor, goals, isGoal };
  const state: State = { boxes: sortedBoxes(boxes), player };
  return { board, state };
}
