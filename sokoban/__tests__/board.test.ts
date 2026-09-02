import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";

describe("buildBoard", () => {
  it("builds walls, floor and dimensions from a simple grid", () => {
    const { board } = buildBoard(["#####", "#@$.#", "#####"]);

    expect(board.width).toBe(5);
    expect(board.height).toBe(3);
    // corners are walls
    expect(board.walls[0]).toBe(1);
    expect(board.walls[4]).toBe(1);
    // interior floor cells are not walls
    const idx = (x: number, y: number) => y * board.width + x;
    expect(board.walls[idx(1, 1)]).toBe(0);
    expect(board.floor[idx(1, 1)]).toBe(1);
  });

  it("records the goal cell from '.'", () => {
    const { board } = buildBoard(["#####", "#@$.#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(board.goals).toEqual([idx(3, 1)]);
    expect(board.isGoal[idx(3, 1)]).toBe(1);
    expect(board.isGoal[idx(1, 1)]).toBe(0);
  });

  it("records the player position, including from '+' (player on goal)", () => {
    const idx = (x: number, y: number, width: number) => y * width + x;
    const onFloor = buildBoard(["#####", "#@$.#", "#####"]);
    expect(onFloor.state.player).toBe(idx(1, 1, 5));

    const onGoal = buildBoard(["#####", "#+$.#", "#####"]);
    expect(onGoal.state.player).toBe(idx(1, 1, 5));
    expect(onGoal.board.isGoal[idx(1, 1, 5)]).toBe(1);
  });

  it("records box positions, including from '*' (box on goal)", () => {
    const idx = (x: number, y: number, width: number) => y * width + x;
    const { board, state } = buildBoard(["######", "#@$*.#", "######"]);
    expect(state.boxes).toEqual([idx(2, 1, 6), idx(3, 1, 6)].sort((a, b) => a - b));
    expect(board.isGoal[idx(3, 1, 6)]).toBe(1);
  });

  it("treats '-' and '_' as floor, not walls or goals", () => {
    const { board } = buildBoard(["#####", "#@-_#", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(board.walls[idx(2, 1)]).toBe(0);
    expect(board.walls[idx(3, 1)]).toBe(0);
    expect(board.isGoal[idx(2, 1)]).toBe(0);
  });

  it("pads ragged rows with floor, taking the widest row as board width", () => {
    const { board } = buildBoard(["#####", "#.@ #", "#  $#", "#####"]);
    expect(board.width).toBe(5);
    expect(board.height).toBe(4);
  });

  it("keeps the box multiset sorted for canonical ordering", () => {
    const { state } = buildBoard(["######", "#$@ $#", "######"]);
    expect(state.boxes).toEqual([...state.boxes].sort((a, b) => a - b));
  });

  it("throws if there is no player", () => {
    expect(() => buildBoard(["#####", "#$$.#", "#####"])).toThrow();
  });

  it("throws on an unrecognized character", () => {
    expect(() => buildBoard(["#####", "#@X.#", "#####"])).toThrow();
  });
});
