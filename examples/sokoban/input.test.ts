import { describe, expect, it } from "vitest";
import { getMoveDirection } from "./input";

describe("getMoveDirection", () => {
  it("returns the direction for an orthogonally adjacent cell", () => {
    expect(getMoveDirection({ x: 3, y: 3 }, { x: 3, y: 2 })).toEqual({ dy: -1, dx: 0 });
    expect(getMoveDirection({ x: 3, y: 3 }, { x: 4, y: 3 })).toEqual({ dy: 0, dx: 1 });
  });

  it("ignores diagonal and distant cells", () => {
    expect(getMoveDirection({ x: 3, y: 3 }, { x: 4, y: 4 })).toBeNull();
    expect(getMoveDirection({ x: 3, y: 3 }, { x: 3, y: 5 })).toBeNull();
  });
});
