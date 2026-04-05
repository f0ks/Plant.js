import { describe, it, expect } from "vitest";
import {
  isCollision,
  random,
  sortByZIndex,
  componentToHex,
  rgbToHex,
  hexToRgb,
} from "../utils";

describe("isCollision", () => {
  const makeNode = (x: number, y: number, width: number, height: number) => ({
    x,
    y,
    width,
    height,
    zindex: 1,
    visible: true,
    onClick: null,
    type: () => "rectangle",
  });

  it("detects overlapping rectangles", () => {
    const a = makeNode(0, 0, 50, 50);
    const b = makeNode(25, 25, 50, 50);
    expect(isCollision(a, b)).toBe(true);
  });

  it("detects non-overlapping rectangles", () => {
    const a = makeNode(0, 0, 50, 50);
    const b = makeNode(100, 100, 50, 50);
    expect(isCollision(a, b)).toBe(false);
  });

  it("detects edge-touching rectangles as colliding", () => {
    const a = makeNode(0, 0, 50, 50);
    const b = makeNode(50, 0, 50, 50);
    expect(isCollision(a, b)).toBe(true);
  });

  it("is commutative", () => {
    const a = makeNode(0, 0, 30, 30);
    const b = makeNode(20, 20, 30, 30);
    expect(isCollision(a, b)).toBe(isCollision(b, a));
  });

  it("detects identical positions as colliding", () => {
    const a = makeNode(10, 10, 50, 50);
    const b = makeNode(10, 10, 50, 50);
    expect(isCollision(a, b)).toBe(true);
  });

  it("returns false for horizontally separated", () => {
    const a = makeNode(0, 0, 10, 10);
    const b = makeNode(11, 0, 10, 10);
    expect(isCollision(a, b)).toBe(false);
  });

  it("returns false for vertically separated", () => {
    const a = makeNode(0, 0, 10, 10);
    const b = makeNode(0, 11, 10, 10);
    expect(isCollision(a, b)).toBe(false);
  });
});

describe("random", () => {
  it("returns a value within the specified range", () => {
    for (let i = 0; i < 100; i++) {
      const val = random(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it("returns an integer", () => {
    const val = random(1, 100);
    expect(Number.isInteger(val)).toBe(true);
  });

  it("works when from equals to", () => {
    expect(random(7, 7)).toBe(7);
  });
});

describe("sortByZIndex", () => {
  it("sorts items by zindex ascending", () => {
    const items = [{ zindex: 3 }, { zindex: 1 }, { zindex: 2 }];
    const sorted = sortByZIndex(items);
    expect(sorted.map((i) => i.zindex)).toEqual([1, 2, 3]);
  });

  it("does not mutate the original array", () => {
    const items = [{ zindex: 3 }, { zindex: 1 }];
    sortByZIndex(items);
    expect(items[0].zindex).toBe(3);
  });

  it("handles empty array", () => {
    expect(sortByZIndex([])).toEqual([]);
  });

  it("handles single element", () => {
    const items = [{ zindex: 5 }];
    expect(sortByZIndex(items)).toEqual([{ zindex: 5 }]);
  });
});

describe("componentToHex", () => {
  it("converts single-digit hex with zero padding", () => {
    expect(componentToHex(0)).toBe("00");
    expect(componentToHex(15)).toBe("0f");
  });

  it("converts double-digit hex without padding", () => {
    expect(componentToHex(255)).toBe("ff");
    expect(componentToHex(16)).toBe("10");
  });
});

describe("rgbToHex", () => {
  it("converts RGB to hex string", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
    expect(rgbToHex(255, 0, 128)).toBe("#ff0080");
  });
});

describe("hexToRgb", () => {
  it("parses a valid hex color with #", () => {
    expect(hexToRgb("#ff0080")).toEqual({ r: 255, g: 0, b: 128 });
  });

  it("parses a valid hex color without #", () => {
    expect(hexToRgb("ff0080")).toEqual({ r: 255, g: 0, b: 128 });
  });

  it("parses black", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses white", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns null for invalid hex", () => {
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb("#fff")).toBeNull();
    expect(hexToRgb("")).toBeNull();
  });

  it("roundtrips with rgbToHex", () => {
    const hex = rgbToHex(100, 150, 200);
    const rgb = hexToRgb(hex);
    expect(rgb).toEqual({ r: 100, g: 150, b: 200 });
  });
});
