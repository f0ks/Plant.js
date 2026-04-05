import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/test-harness/");
  await page.waitForFunction(() => (window as any).__PLANT_READY === true);
});

test.describe("Scene", () => {
  test("creates a canvas with specified dimensions", async ({ page }) => {
    const size = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 400,
        height: 300,
      });
      return { w: scene.htmlNode.width, h: scene.htmlNode.height };
    });
    expect(size.w).toBe(400);
    expect(size.h).toBe(300);
  });

  test("creates a canvas element when no htmlNodeId given", async ({ page }) => {
    const count = await page.evaluate(() => {
      const before = document.querySelectorAll("canvas").length;
      new (window as any).Scene({ width: 100, height: 100 });
      // Scene creates both a visible canvas and a hidden processing canvas
      return document.querySelectorAll("canvas").length - before;
    });
    expect(count).toBe(2);
  });

  test("uses default dimensions (320x320)", async ({ page }) => {
    const size = await page.evaluate(() => {
      const scene = new (window as any).Scene({ htmlNodeId: "test-canvas" });
      return { w: scene.htmlNode.width, h: scene.htmlNode.height };
    });
    expect(size.w).toBe(320);
    expect(size.h).toBe(320);
  });

  test("throws for non-canvas element id", async ({ page }) => {
    const error = await page.evaluate(() => {
      try {
        new (window as any).Scene({ htmlNodeId: "nonexistent" });
        return null;
      } catch (e: any) {
        return e.message;
      }
    });
    expect(error).toContain("is not a canvas");
  });

  test("sets background color", async ({ page }) => {
    const bg = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        background: "#ff0000",
      });
      return scene.background;
    });
    expect(bg).toBe("#ff0000");
  });
});
