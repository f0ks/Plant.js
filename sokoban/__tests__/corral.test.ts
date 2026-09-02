import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { findCorrals, isPICorral } from "../deadlock/corral";

describe("findCorrals", () => {
  it("finds no corral when every floor cell is player-reachable", () => {
    const { board, state } = buildBoard(["#####", "#   #", "#@  #", "#   #", "#####"]);
    expect(findCorrals(board, state)).toEqual([]);
  });

  it("finds the pocket a box seals off, with that box as its only barrier box", () => {
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const corrals = findCorrals(board, state);

    expect(corrals).toHaveLength(1);
    expect(corrals[0].cells).toEqual([idx(3, 1)]);
    expect(corrals[0].boxes).toEqual([idx(2, 1)]);
  });
});

describe("isPICorral", () => {
  it("is true for the wiki's minimal example: a box in a plain tunnel", () => {
    // per the wiki: "A very simple example of a PI-Corral is a tunnel" --
    // the box's only currently-legal push is inward, and it's the only
    // structurally-possible inward push, and it's currently legal.
    const { board, state } = buildBoard(["#####", "#@$ #", "#####"]);
    const corrals = findCorrals(board, state);
    expect(isPICorral(board, state, corrals[0])).toBe(true);
  });

  it("is false when a barrier box also has a currently-legal push into a different corral", () => {
    // box sits at a junction with two currently-legal pushes: right, into
    // a 1-cell pocket, and down, into a separate branch. Neither pocket's
    // corral is an I-corral, because the box's *other* legal push doesn't
    // lead into that specific corral.
    const { board, state } = buildBoard(["######", "#  # #", "#@$ ##", "## ###", "## ###", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const corrals = findCorrals(board, state);
    const eastPocket = corrals.find((c) => c.cells.includes(idx(3, 2)))!;

    expect(eastPocket.boxes).toEqual([idx(2, 2)]);
    expect(isPICorral(board, state, eastPocket)).toBe(false);
  });

  it("is false (I-corral but not P) when another box blocks the player from the barrier box's push side", () => {
    // the wiki's classic counter-example: the barrier box's only possible
    // push is inward, but a second box sits exactly where the player would
    // need to stand to perform it, so the player can't do it *right now*.
    const { board, state } = buildBoard(["######", "#@$$ #", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const corrals = findCorrals(board, state);

    expect(corrals).toHaveLength(1);
    expect(corrals[0].boxes).toEqual([idx(3, 1)]);
    expect(isPICorral(board, state, corrals[0])).toBe(false);
  });
});
