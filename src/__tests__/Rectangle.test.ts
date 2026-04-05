import { describe, it, expect } from "vitest";
import { Rectangle } from "../Rectangle";

describe("Rectangle", () => {
  it("uses default values when no options given", () => {
    const r = new Rectangle();
    expect(r.width).toBe(50);
    expect(r.height).toBe(50);
    expect(r.color).toBe("#ffffff");
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.zindex).toBe(1);
    expect(r.visible).toBe(true);
    expect(r.opacity).toBe(1);
    expect(r.onClick).toBeNull();
  });

  it("accepts custom options", () => {
    const r = new Rectangle({
      width: 100,
      height: 200,
      color: "#ff0000",
      x: 10,
      y: 20,
      zindex: 5,
      visible: false,
      opacity: 0.5,
    });
    expect(r.width).toBe(100);
    expect(r.height).toBe(200);
    expect(r.color).toBe("#ff0000");
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.zindex).toBe(5);
    expect(r.visible).toBe(false);
    expect(r.opacity).toBe(0.5);
  });

  it("returns correct type", () => {
    expect(new Rectangle().type()).toBe("rectangle");
  });

  it("allows setting onClick handler", () => {
    const r = new Rectangle();
    const handler = () => {};
    r.onClick = handler;
    expect(r.onClick).toBe(handler);
  });

  it("properties are mutable", () => {
    const r = new Rectangle();
    r.x = 100;
    r.y = 200;
    r.width = 300;
    r.height = 400;
    expect(r.x).toBe(100);
    expect(r.y).toBe(200);
    expect(r.width).toBe(300);
    expect(r.height).toBe(400);
  });
});
