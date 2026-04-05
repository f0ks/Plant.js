import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/test-harness/");
  await page.waitForFunction(() => (window as any).__PLANT_READY === true);
});

test.describe("GameLoop", () => {
  test("runs code repeatedly in timer mode", async ({ page }) => {
    const count = await page.evaluate(async () => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        useTimer: true,
      });
      let counter = 0;
      const loop = new (window as any).GameLoop({ scene, interval: 20 });
      loop.code = () => { counter++; };
      loop.start();
      await new Promise((r) => setTimeout(r, 150));
      loop.stop();
      return counter;
    });
    // Should have ticked multiple times in 150ms at 20ms interval
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("runs code in rAF mode", async ({ page }) => {
    const count = await page.evaluate(async () => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        useTimer: false,
      });
      let counter = 0;
      const loop = new (window as any).GameLoop({ scene });
      loop.code = () => { counter++; };
      loop.start();
      await new Promise((r) => setTimeout(r, 200));
      loop.stop();
      return counter;
    });
    expect(count).toBeGreaterThan(0);
  });

  test("stop prevents further execution", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const scene = new (window as any).Scene({
        htmlNodeId: "test-canvas",
        useTimer: true,
      });
      let counter = 0;
      const loop = new (window as any).GameLoop({ scene, interval: 20 });
      loop.code = () => { counter++; };
      loop.start();
      await new Promise((r) => setTimeout(r, 60));
      loop.stop();
      const countAtStop = counter;
      await new Promise((r) => setTimeout(r, 100));
      return { countAtStop, countAfter: counter };
    });
    expect(result.countAfter).toBe(result.countAtStop);
  });
});
