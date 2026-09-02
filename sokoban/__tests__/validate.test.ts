import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { validateStructure, everyBoxMovedInSolution } from "../validate";

function build(rows: string[]) {
  return buildBoard(rows);
}

describe("validateStructure", () => {
  it("accepts a well-formed closed level", () => {
    const { board, state } = build(["#####", "#@$.#", "#####"]);
    expect(validateStructure(board, state)).toEqual([]);
  });

  it("flags a board that is not fully enclosed by walls", () => {
    // Bottom row is missing its wall, so the padded floor there touches the
    // grid edge and the player could walk off it if the grid extended.
    const { board, state } = build(["#####", "#@$.#", "#   #"]);
    const issues = validateStructure(board, state);
    expect(issues.some((i) => i.code === "not-closed")).toBe(true);
  });

  it("flags an isolated floor region unreachable from the player's start", () => {
    const { board, state } = build([
      "#######",
      "#@$.#.#",
      "#######",
    ]);
    const issues = validateStructure(board, state);
    expect(issues.some((i) => i.code === "isolated-floor")).toBe(true);
  });

  it("flags a box/goal count mismatch", () => {
    const { board, state } = build(["######", "#@$$.#", "######"]);
    const issues = validateStructure(board, state);
    expect(issues.some((i) => i.code === "box-goal-mismatch")).toBe(true);
  });

  it("flags a box that starts already on a goal", () => {
    const { board, state } = build(["#####", "#@*.#", "#####"]);
    const issues = validateStructure(board, state);
    expect(issues.some((i) => i.code === "box-on-goal-at-start")).toBe(true);
  });

  it("reports multiple independent issues at once", () => {
    const { board, state } = build(["#####", "#@**#", "#####"]);
    const issues = validateStructure(board, state);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("box-on-goal-at-start");
  });
});

describe("everyBoxMovedInSolution", () => {
  it("is true when the solution pushes every original box at least once", () => {
    const { board, state } = build(["#####", "#@$.#", "#####"]);
    // one push: right (uppercase R)
    expect(everyBoxMovedInSolution(board, state, "R")).toBe(true);
  });

  it("is false when a box is never pushed", () => {
    const { board, state } = build([
      "#######",
      "#@$..$#",
      "#######",
    ]);
    // Only push the left box onto the near goal; the right box never moves.
    expect(everyBoxMovedInSolution(board, state, "R")).toBe(false);
  });
});
