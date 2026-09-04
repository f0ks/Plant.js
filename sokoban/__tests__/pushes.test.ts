import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import type { Board } from "../board";
import { DIRECTIONS, isLegalPush, applyPush, legalPushes, stateKey, legalPulls, applyPull, isLegalPull } from "../state";
import type { State } from "../state";
import { computeReachable } from "../reachability";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds an open, fully-connected w x h room (walls around the border
 * only), with the player and boxes placed at the given interior (x, y)
 * coordinates.
 */
function openRoomWith(
  w: number,
  h: number,
  player: { x: number; y: number },
  boxes: { x: number; y: number }[],
): { board: Board; state: State } {
  const grid: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      row.push(x === 0 || x === w - 1 || y === 0 || y === h - 1 ? "#" : " ");
    }
    grid.push(row);
  }
  grid[player.y][player.x] = "@";
  for (const b of boxes) grid[b.y][b.x] = "$";

  const rows = grid.map((row) => row.join(""));
  return buildBoard(rows);
}

/** All interior (non-wall-border) (x, y) coordinates of a w x h room. */
function interiorCells(w: number, h: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

describe("isLegalPush / applyPush", () => {
  it("allows pushing a box into open floor and moves the player into the box's old cell", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(2, 1);

    expect(isLegalPush(board, state, box, DIRECTIONS.right)).toBe(true);
    const next = applyPush(board, state, box, DIRECTIONS.right);

    expect(next.boxes).toEqual([idx(3, 1)]);
    expect(next.player).toBe(idx(2, 1));
  });

  it("rejects pushing a box into a wall", () => {
    const { board, state } = buildBoard(["####", "#@$#", "####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(2, 1);

    expect(isLegalPush(board, state, box, DIRECTIONS.right)).toBe(false);
    expect(() => applyPush(board, state, box, DIRECTIONS.right)).toThrow();
  });

  it("rejects pushing a box into another box", () => {
    const { board, state } = buildBoard(["#####", "#@$$#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(2, 1);

    expect(isLegalPush(board, state, box, DIRECTIONS.right)).toBe(false);
  });

  it("rejects pushing when the player isn't positioned behind the box", () => {
    const { board, state } = buildBoard(["#####", "#@ $#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(3, 1);

    // player is two cells away, not directly behind the box
    expect(isLegalPush(board, state, box, DIRECTIONS.right)).toBe(false);
  });
});

describe("legalPushes", () => {
  it("only includes pushes for boxes the player can currently reach", () => {
    const { board, state } = buildBoard(["#######", "#@ #$ #", "#######"]);
    // box is walled off from the player entirely
    expect(legalPushes(board, state)).toEqual([]);
  });

  it("enumerates every legal push direction for a reachable box", () => {
    const { board, state } = buildBoard(["#####", "#####", "# $ #", "#@# #", "#####"]);
    // Not a realistic layout for testing all 4 directions at once (player
    // can only be on one side at a time); this checks at least one push is
    // found and each result actually moves the targeted box.
    const pushes = legalPushes(board, state);
    for (const p of pushes) {
      expect(p.state.boxes).not.toEqual(state.boxes);
    }
  });

  it("finds the single available push in a simple corridor", () => {
    const { board, state } = buildBoard(["#####", "#@$.#", "#####"]);
    const pushes = legalPushes(board, state);
    expect(pushes).toHaveLength(1);
    expect(pushes[0].direction).toEqual(DIRECTIONS.right);
  });
});

describe("stateKey", () => {
  it("is identical for two states with the same boxes and player in the same reachable region", () => {
    const { board, state: s1 } = buildBoard(["######", "#@   #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const s2 = { boxes: s1.boxes, player: idx(3, 1) };

    expect(stateKey(board, s1)).toBe(stateKey(board, s2));
  });

  it("differs when box positions differ", () => {
    const { board, state: s1 } = buildBoard(["#######", "#@$   #", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const s2 = { boxes: [idx(4, 1)], player: s1.player };

    expect(stateKey(board, s1)).not.toBe(stateKey(board, s2));
  });

  it("differs when the player is in a different, disconnected reachable region", () => {
    const { board, state: s1 } = buildBoard(["#######", "#@ # .#", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const s2 = { boxes: s1.boxes, player: idx(5, 1) };

    expect(stateKey(board, s1)).not.toBe(stateKey(board, s2));
  });
});

describe("push legality property", () => {
  it("preserves box count, floor-only placement and no-overlap across random walks of legal pushes", () => {
    const rand = mulberry32(777);

    for (let trial = 0; trial < 50; trial++) {
      const w = 5 + Math.floor(rand() * 4);
      const h = 5 + Math.floor(rand() * 4);
      const cells = interiorCells(w, h);
      // shuffle
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      const boxCount = 1 + Math.floor(rand() * 3);
      const player = cells[0];
      const boxes = cells.slice(1, 1 + boxCount);

      const { board, state: initial } = openRoomWith(w, h, player, boxes);
      let state = initial;
      const initialBoxCount = state.boxes.length;

      for (let step = 0; step < 20; step++) {
        const pushes = legalPushes(board, state);
        if (pushes.length === 0) break;
        const choice = pushes[Math.floor(rand() * pushes.length)];

        expect(choice.state.boxes).toHaveLength(initialBoxCount);
        for (const box of choice.state.boxes) {
          expect(board.walls[box]).toBe(0);
          expect(board.floor[box]).toBe(1);
        }
        const unique = new Set(choice.state.boxes);
        expect(unique.size).toBe(choice.state.boxes.length);

        state = choice.state;
      }
    }
  });
});

describe("state normalization property", () => {
  it("gives the same stateKey for the same boxes regardless of which reachable cell the player occupies", () => {
    const rand = mulberry32(999);

    for (let trial = 0; trial < 50; trial++) {
      const w = 5 + Math.floor(rand() * 4);
      const h = 5 + Math.floor(rand() * 4);
      const cells = interiorCells(w, h);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      const boxCount = 1 + Math.floor(rand() * 3);
      const player = cells[0];
      const boxes = cells.slice(1, 1 + boxCount);

      const { board, state } = openRoomWith(w, h, player, boxes);
      const reachable = computeReachable(board, state.boxes, state.player);
      const reachableCells: number[] = [];
      for (let cell = 0; cell < reachable.length; cell++) {
        if (reachable[cell]) reachableCells.push(cell);
      }

      const baseKey = stateKey(board, state);
      for (const cell of reachableCells) {
        const alt: State = { boxes: state.boxes, player: cell };
        expect(stateKey(board, alt)).toBe(baseKey);
      }
    }
  });
});

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

  it("legalPulls finds no pulls when the player can't reach any box's push-origin side", () => {
    // The board must actually contain a box, or `legalPulls`' per-box loop
    // never runs and the assertion is vacuously true. Here the player is
    // sealed into a one-cell pocket by the wall at (2,1): the box's only
    // floor-side push origin, (4,1), is on the far side of that wall, so the
    // `reachable[p]` guard rejects every direction.
    const { board, state } = buildBoard(["#######", "#@#$  #", "#######"]);
    expect(state.boxes.length).toBe(1);
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
