import type { RectangleOptions, SceneNode } from "./types";

export class Rectangle implements SceneNode {
  width: number;
  height: number;
  color: string;
  x: number;
  y: number;
  zindex: number;
  visible: boolean;
  opacity: number;
  onClick: (() => void) | null = null;

  constructor(options: RectangleOptions = {}) {
    this.width = options.width ?? 50;
    this.height = options.height ?? 50;
    this.color = options.color ?? "#ffffff";
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.zindex = options.zindex ?? 1;
    this.visible = options.visible ?? true;
    this.opacity = options.opacity ?? 1;
  }

  type(): string {
    return "rectangle";
  }
}
