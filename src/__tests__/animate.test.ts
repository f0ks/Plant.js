import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { animate } from "../animate";

let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  return id;
});

function flushRAF(timestamp: number): void {
  const cbs = [...rafCallbacks.values()];
  rafCallbacks.clear();
  cbs.forEach((cb) => cb(timestamp));
}

function makeNode(x = 0, y = 0) {
  return {
    x,
    y,
    width: 30,
    height: 30,
    zindex: 1,
    visible: true,
    onClick: null,
    type() {
      return "test";
    },
  };
}

describe("animate", () => {
  let nowValue: number;

  beforeEach(() => {
    rafId = 0;
    rafCallbacks.clear();
    nowValue = 0;
    vi.spyOn(performance, "now").mockImplementation(() => nowValue);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves immediately when already at target", async () => {
    const node = makeNode(100, 200);
    const promise = animate(node, { x: 100, y: 200 }, 120);
    // Should resolve without any rAF call
    expect(rafCallbacks.size).toBe(0);
    await promise;
    expect(node.x).toBe(100);
    expect(node.y).toBe(200);
  });

  it("resolves immediately when target matches current position (partial target)", async () => {
    const node = makeNode(50, 50);
    await animate(node, { x: 50 }, 120);
    expect(node.x).toBe(50);
    expect(node.y).toBe(50);
  });

  it("animates x from start to target", async () => {
    const node = makeNode(0, 0);
    const promise = animate(node, { x: 90 }, 100);

    // Mid animation: 50% through
    nowValue = 50;
    flushRAF(50);
    // ease-out quad at t=0.5: 0.5*(2-0.5) = 0.75
    expect(node.x).toBeCloseTo(67.5);
    expect(node.y).toBe(0);

    // Complete animation
    nowValue = 100;
    flushRAF(100);
    await promise;
    expect(node.x).toBe(90);
    expect(node.y).toBe(0);
  });

  it("animates y from start to target", async () => {
    const node = makeNode(0, 0);
    const promise = animate(node, { y: 60 }, 100);

    nowValue = 100;
    flushRAF(100);
    await promise;
    expect(node.y).toBe(60);
  });

  it("animates both x and y simultaneously", async () => {
    const node = makeNode(10, 20);
    const promise = animate(node, { x: 40, y: 50 }, 100);

    nowValue = 100;
    flushRAF(100);
    await promise;
    expect(node.x).toBe(40);
    expect(node.y).toBe(50);
  });

  it("snaps to exact target on completion", async () => {
    const node = makeNode(0, 0);
    const promise = animate(node, { x: 30, y: 30 }, 100);

    // Overshoot time slightly
    nowValue = 150;
    flushRAF(150);
    await promise;
    expect(node.x).toBe(30);
    expect(node.y).toBe(30);
  });

  it("applies ease-out easing", async () => {
    const node = makeNode(0, 0);
    animate(node, { x: 100 }, 100);

    // At 25%: t=0.25, eased = 0.25*(2-0.25) = 0.4375
    nowValue = 25;
    flushRAF(25);
    expect(node.x).toBeCloseTo(43.75);

    // At 75%: t=0.75, eased = 0.75*(2-0.75) = 0.9375
    nowValue = 75;
    flushRAF(75);
    expect(node.x).toBeCloseTo(93.75);
  });
});
