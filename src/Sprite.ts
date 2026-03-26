import type { SceneNode, SpriteOptions } from "./types";

export class Sprite implements SceneNode {
  node: HTMLImageElement;
  src: string;
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

  private _width: number | null;
  private _height: number | null;
  private _frameWidth: number | null;
  private _frameHeight: number | null;

  constructor(options: SpriteOptions) {
    this.node = new Image();
    this.src = options.src;
    this.node.src = options.src;

    this._width = options.width ?? null;
    this._height = options.height ?? null;
    this._frameWidth = options.frameWidth ?? null;
    this._frameHeight = options.frameHeight ?? null;

    this.xFrame = options.xFrame ?? 0;
    this.yFrame = options.yFrame ?? 0;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.opacity = options.opacity ?? 1;
    this.zindex = options.zindex ?? 1;
    this.visible = options.visible ?? true;
  }

  get width(): number {
    return this._width ?? this.node.naturalWidth;
  }

  set width(value: number) {
    this._width = value;
  }

  get height(): number {
    return this._height ?? this.node.naturalHeight;
  }

  set height(value: number) {
    this._height = value;
  }

  get frameWidth(): number {
    return this._frameWidth ?? this.node.naturalWidth;
  }

  set frameWidth(value: number) {
    this._frameWidth = value;
  }

  get frameHeight(): number {
    return this._frameHeight ?? this.node.naturalHeight;
  }

  set frameHeight(value: number) {
    this._frameHeight = value;
  }

  type(): string {
    return "sprite";
  }

  fadeOut(): void {
    this._fadingFrame = 10;
    this._isFadingOut = true;
  }
}
