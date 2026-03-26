import type { RGB, SceneNode } from "./types";

export function isCollision(obj1: SceneNode, obj2: SceneNode): boolean {
  const r1 = obj1.x + obj1.width;
  const b1 = obj1.y + obj1.height;
  const r2 = obj2.x + obj2.width;
  const b2 = obj2.y + obj2.height;

  return obj1.x <= r2 && obj2.x <= r1 && obj1.y <= b2 && obj2.y <= b1;
}

export function random(from: number, to: number): number {
  return Math.floor(Math.random() * (to - from + 1) + from);
}

export function sortByZIndex<T extends { zindex: number }>(arr: T[]): T[] {
  return arr.toSorted((a, b) => a.zindex - b.zindex);
}

export function componentToHex(c: number): string {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
