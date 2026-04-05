import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/test-harness/");
  await page.waitForFunction(() => (window as any).__PLANT_READY === true);
});

test.describe("Click handling", () => {
  test("scene onClick fires on canvas click", async ({ page }) => {
    await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 200,
        height: 200,
      });
      (window as any).__sceneClicked = false;
      scene.onClick = () => {
        (window as any).__sceneClicked = true;
      };
      scene.update();
    });

    await page.click("#test-canvas");

    const clicked = await page.evaluate(() => (window as any).__sceneClicked);
    expect(clicked).toBe(true);
  });

  test("node onClick fires when clicking within node bounds", async ({ page }) => {
    await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 200,
        height: 200,
      });
      const rect = new (window as any).Rectangle({
        x: 50, y: 50, width: 100, height: 100,
        color: "#ff0000",
      });
      (window as any).__nodeClicked = false;
      rect.onClick = () => {
        (window as any).__nodeClicked = true;
      };
      scene.add(rect);
      scene.update();
    });

    // Click in the center of the rectangle
    await page.click("#test-canvas", { position: { x: 100, y: 100 } });

    const clicked = await page.evaluate(() => (window as any).__nodeClicked);
    expect(clicked).toBe(true);
  });

  test("node onClick does not fire when clicking outside node bounds", async ({ page }) => {
    await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 200,
        height: 200,
      });
      const rect = new (window as any).Rectangle({
        x: 50, y: 50, width: 20, height: 20,
        color: "#ff0000",
      });
      (window as any).__nodeClicked = false;
      rect.onClick = () => {
        (window as any).__nodeClicked = true;
      };
      scene.add(rect);
      scene.update();
    });

    // Click far from the rectangle
    await page.click("#test-canvas", { position: { x: 190, y: 190 } });

    const clicked = await page.evaluate(() => (window as any).__nodeClicked);
    expect(clicked).toBe(false);
  });
});

test.describe("Mouse tracking", () => {
  test("tracks mouse position on mousemove", async ({ page }) => {
    await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        width: 200,
        height: 200,
      });
      (window as any).__testScene = scene;
      scene.update();
    });

    const canvas = page.locator("#test-canvas");
    await canvas.hover({ position: { x: 75, y: 125 } });

    const pos = await page.evaluate(() => {
      const s = (window as any).__testScene;
      return { x: s.mouseX, y: s.mouseY };
    });
    expect(pos.x).toBe(75);
    expect(pos.y).toBe(125);
  });
});

test.describe("Node management", () => {
  test("add single node", async ({ page }) => {
    const count = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
      });
      scene.add(new (window as any).Rectangle());
      return scene.nodes.length;
    });
    expect(count).toBe(1);
  });

  test("add array of nodes", async ({ page }) => {
    const count = await page.evaluate(() => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
      });
      scene.add([
        new (window as any).Rectangle(),
        new (window as any).Ellipse(),
        new (window as any).Text(),
      ]);
      return scene.nodes.length;
    });
    expect(count).toBe(3);
  });
});
