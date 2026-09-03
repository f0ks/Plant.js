/** A seeded pseudo-random number generator: returns floats in [0, 1). */
export type Rng = () => number;

/**
 * mulberry32 — a small, fast, seeded 32-bit PRNG. Not cryptographic; used
 * here purely for reproducible generation runs (same seed -> same level
 * batch), matching docs/level-generation.md §6's "no crypto dependency"
 * rng.ts note.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform-ish random integer in `[minInclusive, maxInclusive]`. */
export function randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

/** Fisher–Yates shuffle. Returns a new array; does not mutate `items`. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
