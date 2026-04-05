import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/test-harness/");
  await page.waitForFunction(() => (window as any).__PLANT_READY === true);
});

test.describe("Rendering", () => {
  test("renders a rectangle with the correct color", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#000000",
      });
      const rect = new (window as any).Rectangle({
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        color: "#ff0000",
      });
      scene.add(rect);
      scene.update();

      const ctx = scene.context;
      const data = ctx.getImageData(20, 20, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    });
    expect(pixel.r).toBe(255);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
  });

  test("renders background color on empty scene", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#0000ff",
      });
      scene.update();

      const data = scene.context.getImageData(50, 50, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    });
    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(255);
  });

  test("does not render invisible nodes", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#000000",
      });
      const rect = new (window as any).Rectangle({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        color: "#ff0000",
        visible: false,
      });
      scene.add(rect);
      scene.update();

      const data = scene.context.getImageData(50, 50, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    });
    // Should be background (black), not red
    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
  });

  test("renders ellipse onto canvas", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#000000",
      });
      const ellipse = new (window as any).Ellipse({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
        color: "#00ff00",
      });
      scene.add(ellipse);
      scene.update();

      // Sample center of the ellipse
      const data = scene.context.getImageData(50, 50, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    });
    expect(pixel.g).toBe(255);
    expect(pixel.r).toBe(0);
    expect(pixel.b).toBe(0);
  });

  test("renders text onto canvas", async ({ page }) => {
    const hasNonBlack = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 200,
        height: 50,
        background: "#000000",
      });
      const text = new (window as any).Text({
        x: 5,
        y: 5,
        text: "Hello",
        color: "#ffffff",
        font: "20px sans-serif",
      });
      scene.add(text);
      scene.update();

      // Check a region where text should be rendered
      const data = scene.context.getImageData(0, 0, 200, 50).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) {
          return true;
        }
      }
      return false;
    });
    expect(hasNonBlack).toBe(true);
  });

  test("respects z-index ordering", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#000000",
      });
      // Red rect at zindex 2 (should be on top)
      const red = new (window as any).Rectangle({
        x: 0, y: 0, width: 100, height: 100,
        color: "#ff0000", zindex: 2,
      });
      // Blue rect at zindex 1 (should be behind)
      const blue = new (window as any).Rectangle({
        x: 0, y: 0, width: 100, height: 100,
        color: "#0000ff", zindex: 1,
      });
      scene.add(blue);
      scene.add(red);
      scene.update();

      const data = scene.context.getImageData(50, 50, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    });
    // Red should be on top
    expect(pixel.r).toBe(255);
    expect(pixel.b).toBe(0);
  });

  test("renders rectangle with opacity", async ({ page }) => {
    const pixel = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 100,
        height: 100,
        background: "#000000",
      });
      const rect = new (window as any).Rectangle({
        x: 0, y: 0, width: 100, height: 100,
        color: "#ff0000", opacity: 0.5,
      });
      scene.add(rect);
      scene.update();

      const data = scene.context.getImageData(50, 50, 1, 1).data;
      return { r: data[0], a: data[3] };
    });
    // Semi-transparent red over black background ≈ 128
    expect(pixel.r).toBeGreaterThan(100);
    expect(pixel.r).toBeLessThan(180);
  });
});
