import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameLoop } from "../GameLoop";

function makeScene(useTimer = false) {
  return { useTimer } as any;
}

// Stub rAF/cAF for Node environment
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  return id;
});
vi.stubGlobal("cancelAnimationFrame", (id: number) => {
  rafCallbacks.delete(id);
});

describe("GameLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rafId = 0;
    rafCallbacks.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets default interval to 50", () => {
    const loop = new GameLoop({ scene: makeScene() });
    expect(loop.interval).toBe(50);
  });

  it("accepts custom interval", () => {
    const loop = new GameLoop({ scene: makeScene(), interval: 100 });
    expect(loop.interval).toBe(100);
  });

  it("code is null by default", () => {
    const loop = new GameLoop({ scene: makeScene() });
    expect(loop.code).toBeNull();
  });

  describe("timer mode (useTimer = true)", () => {
    it("start returns true on first call", () => {
      const loop = new GameLoop({ scene: makeScene(true) });
      expect(loop.start()).toBe(true);
      loop.stop();
    });

    it("start returns false if already active", () => {
      const loop = new GameLoop({ scene: makeScene(true) });
      loop.start();
      expect(loop.start()).toBe(false);
      loop.stop();
    });

    it("stop returns true when active", () => {
      const loop = new GameLoop({ scene: makeScene(true) });
      loop.start();
      expect(loop.stop()).toBe(true);
    });

    it("stop returns false when not active", () => {
      const loop = new GameLoop({ scene: makeScene(true) });
      expect(loop.stop()).toBe(false);
    });

    it("calls code on each interval tick", () => {
      const loop = new GameLoop({ scene: makeScene(true), interval: 100 });
      const fn = vi.fn();
      loop.code = fn;
      loop.start();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(3);

      loop.stop();
    });

    it("stops calling code after stop", () => {
      const loop = new GameLoop({ scene: makeScene(true), interval: 50 });
      const fn = vi.fn();
      loop.code = fn;
      loop.start();
      vi.advanceTimersByTime(50);
      loop.stop();
      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("rAF mode (useTimer = false)", () => {
    it("start returns true on first call", () => {
      const loop = new GameLoop({ scene: makeScene(false) });
      expect(loop.start()).toBe(true);
      loop.stop();
    });

    it("start returns false if already active", () => {
      const loop = new GameLoop({ scene: makeScene(false) });
      loop.start();
      expect(loop.start()).toBe(false);
      loop.stop();
    });

    it("stop returns true when active", () => {
      const loop = new GameLoop({ scene: makeScene(false) });
      loop.start();
      expect(loop.stop()).toBe(true);
    });

    it("stop returns false when not active", () => {
      const loop = new GameLoop({ scene: makeScene(false) });
      expect(loop.stop()).toBe(false);
    });
  });

  it("can restart after stop", () => {
    const loop = new GameLoop({ scene: makeScene(true), interval: 50 });
    const fn = vi.fn();
    loop.code = fn;

    loop.start();
    vi.advanceTimersByTime(50);
    loop.stop();
    expect(fn).toHaveBeenCalledTimes(1);

    loop.start();
    vi.advanceTimersByTime(50);
    loop.stop();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
