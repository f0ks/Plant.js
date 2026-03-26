import type { SceneNode, SpriteOptions } from "./types";

export class Sprite implements SceneNode {
  node: HTMLImageElement;
  src: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  xFrame: number;
  yFrame: number;
  x: number;
  y: number;
  opacity: number;
  zindex: number;
  visible: boolean;
  onClick: (() => void) | null = null;

  /** @internal */
  _opacityCache: number = 1;
  /** @internal */
  _isFadingOut: boolean = false;
  /** @internal */
  _fadingFrame: number | null = null;

  constructor(options: SpriteOptions) {
    this.node = new Image();
    this.src = options.src;
    this.node.src = options.src;

    this.width = options.width ?? this.node.width;
    this.height = options.height ?? this.node.height;
    this.frameWidth = options.frameWidth ?? this.node.width;
    this.frameHeight = options.frameHeight ?? this.node.height;

    this.xFrame = options.xFrame ?? 0;
    this.yFrame = options.yFrame ?? 0;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.opacity = options.opacity ?? 1;
    this.zindex = options.zindex ?? 1;
    this.visible = options.visible ?? true;
  }

  type(): string {
    return "sprite";
  }

  fadeOut(): void {
    this._fadingFrame = 10;
    this._isFadingOut = true;
  }
}
