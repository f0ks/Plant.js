import { describe, it, expect } from "vitest";
import { buildBoard } from "../board";
import { DIRECTIONS, applyPush, legalPushes } from "../state";
import { isInTunnel, isTunnelPush, isNoInfluencePush } from "../deadlock/tunnel";

describe("isInTunnel", () => {
  it("is true for a cell in a 1-wide horizontal corridor", () => {
    const { board } = buildBoard(["#####", "#####", "#@$ #", "#####", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(isInTunnel(board, idx(2, 2), DIRECTIONS.right)).toBe(true);
  });

  it("is false for a cell in an open room", () => {
    const { board } = buildBoard(["#####", "#   #", "#@$ #", "#   #", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(isInTunnel(board, idx(2, 2), DIRECTIONS.right)).toBe(false);
  });
});

describe("isTunnelPush", () => {
  it("is true when both source and destination are inside the corridor", () => {
    const { board } = buildBoard(["#####", "#####", "#@$ #", "#####", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    expect(isTunnelPush(board, idx(2, 2), idx(3, 2), DIRECTIONS.right)).toBe(true);
  });

  it("is false when the destination cell is not itself tunnel-shaped", () => {
    const { board } = buildBoard(["######", "##   #", "#@$  #", "######", "######"]);
    const idx = (x: number, y: number) => y * board.width + x;
    // box moves from a corridor cell into a wider room cell
    expect(isTunnelPush(board, idx(2, 2), idx(3, 2), DIRECTIONS.right)).toBe(false);
  });
});

describe("isNoInfluencePush", () => {
  // A left room (player + box A) and a right room (box B) joined by a
  // 1-wide tunnel that runs directly past B's west side. Pushing A through
  // the *middle* of the tunnel doesn't affect B; pushing A into the tunnel
  // cell immediately adjacent to B blocks B's one legal push (west, into
  // what is now A's cell) -- a real, detectable influence.
  const rows = ["#########", "#@$   $ #", "#  ###  #", "#       #", "#########"];

  it("is false when the destination cell is a goal", () => {
    const { board, state } = buildBoard(["#####", "#####", "#@$.#", "#####", "#####"]);
    const idx = (x: number, y: number) => y * board.width + x;
    const box = idx(2, 2);
    const after = applyPush(board, state, box, DIRECTIONS.right);
    expect(isNoInfluencePush(board, state, after, box, idx(3, 2), DIRECTIONS.right)).toBe(false);
  });

  it("is true for a tunnel push that doesn't yet reach the other box", () => {
    const { board, state } = buildBoard(rows);
    const idx = (x: number, y: number) => y * board.width + x;

    const afterFirstPush = applyPush(board, state, idx(2, 1), DIRECTIONS.right);
    const before = afterFirstPush;
    const after = applyPush(board, before, idx(3, 1), DIRECTIONS.right);

    expect(isTunnelPush(board, idx(3, 1), idx(4, 1), DIRECTIONS.right)).toBe(true);
    expect(
      isNoInfluencePush(board, before, after, idx(3, 1), idx(4, 1), DIRECTIONS.right),
    ).toBe(true);
  });

  it("is false when the push lands adjacent to another box and blocks its only legal push", () => {
    const { board, state } = buildBoard(rows);
    const idx = (x: number, y: number) => y * board.width + x;

    let cur = applyPush(board, state, idx(2, 1), DIRECTIONS.right); // A: 2,1 -> 3,1
    const before = applyPush(board, cur, idx(3, 1), DIRECTIONS.right); // A: 3,1 -> 4,1
    cur = before;

    // box B (6,1) currently has exactly one legal push: west, into (5,1)
    const boxB = idx(6, 1);
    expect(legalPushes(board, cur).filter((p) => p.box === boxB)).toHaveLength(1);

    const after = applyPush(board, cur, idx(4, 1), DIRECTIONS.right); // A: 4,1 -> 5,1, now next to B

    expect(isTunnelPush(board, idx(4, 1), idx(5, 1), DIRECTIONS.right)).toBe(true);
    expect(
      isNoInfluencePush(board, before, after, idx(4, 1), idx(5, 1), DIRECTIONS.right),
    ).toBe(false);
    expect(legalPushes(board, after).filter((p) => p.box === boxB)).toHaveLength(0);
  });
});
