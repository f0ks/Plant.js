import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { findPath } from "../reachability";

describe("findPath", () => {
  it("returns an empty string when already at the destination", () => {
    const { board, state } = buildBoard(["#####", "#@  #", "#####"]);
    expect(findPath(board, state.boxes, state.player, state.player)).toBe("");
  });

  it("returns a single-letter move for an adjacent cell", () => {
    const { board, state } = buildBoard(["#####", "#@  #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(findPath(board, state.boxes, state.player, idx(2, 1))).toBe("r");
  });

  it("returns null when the destination is unreachable", () => {
    const { board, state } = buildBoard(["#######", "#@ # .#", "#######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(findPath(board, state.boxes, state.player, idx(5, 1))).toBeNull();
  });

  it("routes around a box obstacle and the path replays back to the destination", () => {
    const { board, state } = buildBoard(["#####", "#@#.#", "#   #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const target = idx(3, 1);
    const path = findPath(board, state.boxes, state.player, target);
    expect(path).not.toBeNull();

    // replay the path and confirm it actually lands on the target
    let x = state.player % board.width;
    let y = (state.player - x) / board.width;
    for (const ch of path!) {
      if (ch === "u") y--;
      else if (ch === "d") y++;
      else if (ch === "l") x--;
      else if (ch === "r") x++;
      const cell = y * board.width + x;
      expect(board.walls[cell]).toBe(0);
      expect(state.boxes.includes(cell)).toBe(false);
    }
    expect(y * board.width + x).toBe(target);
  });
});
