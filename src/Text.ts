import type { SceneNode, TextOptions } from "./types";

export class Text implements SceneNode {
  font: string;
  color: string;
  x: number;
  y: number;
  text: string;
  zindex: number;
  visible: boolean;
  onClick: (() => void) | null = null;

  // Text nodes need width/height for collision detection
  width: number = 0;
  height: number = 0;

  constructor(options: TextOptions = {}) {
    this.font = options.font ?? "10pt sans-serif";
    this.color = options.color ?? "#ffffff";
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.text = options.text ?? "Sample text";
    this.zindex = options.zindex ?? 1;
    this.visible = options.visible ?? true;
  }

  type(): string {
    return "text";
  }
}
