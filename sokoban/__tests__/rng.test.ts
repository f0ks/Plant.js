import { describe, it, expect } from "vitest";
import { mulberry32, randomInt, shuffle } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a fixed seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });

  it("stays within [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("randomInt", () => {
  it("stays within [min, max] inclusive over many draws", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("returns the only value when min === max", () => {
    const rng = mulberry32(9);
    expect(randomInt(rng, 4, 4)).toBe(4);
  });
});

describe("shuffle", () => {
  it("is a permutation of the input (same multiset, same length)", () => {
    const rng = mulberry32(11);
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(rng, input);
    expect(out.length).toBe(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const rng = mulberry32(11);
    const input = [1, 2, 3];
    shuffle(rng, input);
    expect(input).toEqual([1, 2, 3]);
  });

  it("is deterministic for a fixed seed", () => {
    const out1 = shuffle(mulberry32(5), [1, 2, 3, 4, 5, 6]);
    const out2 = shuffle(mulberry32(5), [1, 2, 3, 4, 5, 6]);
    expect(out1).toEqual(out2);
  });
});
