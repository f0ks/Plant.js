import type { SceneNode } from "./types";

export function animate(
  node: SceneNode,
  target: { x?: number; y?: number },
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startX = node.x;
    const startY = node.y;
    const dx = (target.x ?? startX) - startX;
    const dy = (target.y ?? startY) - startY;
    const startTime = performance.now();

    if (dx === 0 && dy === 0) {
      resolve();
      return;
    }

    function tick(now: number): void {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t); // ease-out quadratic

      node.x = startX + dx * eased;
      node.y = startY + dy * eased;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        node.x = target.x ?? startX;
        node.y = target.y ?? startY;
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}
