import { describe, it, expect } from "vitest";
import { Ellipse } from "../Ellipse";

describe("Ellipse", () => {
  it("uses default values when no options given", () => {
    const e = new Ellipse();
    expect(e.width).toBe(50);
    expect(e.height).toBe(50);
    expect(e.color).toBe("#ffffff");
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
    expect(e.zindex).toBe(1);
    expect(e.visible).toBe(true);
    expect(e.opacity).toBe(1);
    expect(e.onClick).toBeNull();
  });

  it("accepts custom options", () => {
    const e = new Ellipse({
      width: 80,
      height: 60,
      color: "#00ff00",
      x: 5,
      y: 15,
      zindex: 3,
      visible: false,
      opacity: 0.7,
    });
    expect(e.width).toBe(80);
    expect(e.height).toBe(60);
    expect(e.color).toBe("#00ff00");
    expect(e.x).toBe(5);
    expect(e.y).toBe(15);
    expect(e.zindex).toBe(3);
    expect(e.visible).toBe(false);
    expect(e.opacity).toBe(0.7);
  });

  it("returns correct type", () => {
    expect(new Ellipse().type()).toBe("ellipse");
  });
});
