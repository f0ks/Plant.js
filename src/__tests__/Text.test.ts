import { describe, it, expect } from "vitest";
import { Text } from "../Text";

describe("Text", () => {
  it("uses default values when no options given", () => {
    const t = new Text();
    expect(t.font).toBe("10pt sans-serif");
    expect(t.color).toBe("#ffffff");
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
    expect(t.text).toBe("Sample text");
    expect(t.zindex).toBe(1);
    expect(t.visible).toBe(true);
    expect(t.width).toBe(0);
    expect(t.height).toBe(0);
    expect(t.onClick).toBeNull();
  });

  it("accepts custom options", () => {
    const t = new Text({
      font: "20pt Arial",
      color: "#ff0000",
      x: 50,
      y: 100,
      text: "Hello",
      zindex: 10,
      visible: false,
    });
    expect(t.font).toBe("20pt Arial");
    expect(t.color).toBe("#ff0000");
    expect(t.x).toBe(50);
    expect(t.y).toBe(100);
    expect(t.text).toBe("Hello");
    expect(t.zindex).toBe(10);
    expect(t.visible).toBe(false);
  });

  it("returns correct type", () => {
    expect(new Text().type()).toBe("text");
  });

  it("text is mutable", () => {
    const t = new Text();
    t.text = "Updated";
    expect(t.text).toBe("Updated");
  });
});
