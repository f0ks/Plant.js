import type { SceneNode, SceneOptions } from "./types";
import type { Rectangle } from "./Rectangle";
import type { Ellipse } from "./Ellipse";
import type { Sprite } from "./Sprite";
import type { Text } from "./Text";
import { hexToRgb, sortByZIndex } from "./utils";

type RenderableNode = Rectangle | Ellipse | Sprite | Text;

export class Scene {
  useTimer: boolean;
  width: number;
  height: number;
  background: string;
  htmlNode: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  nodes: SceneNode[] = [];
  mouseX: number = 0;
  mouseY: number = 0;
  onClick: (() => void) | null = null;

  private processingCanvas: HTMLCanvasElement;
  private processingCtx: CanvasRenderingContext2D;

  constructor(options: SceneOptions = {}) {
    this.useTimer = options.useTimer ?? false;
    this.width = options.width ?? 320;
    this.height = options.height ?? 320;
    this.background = options.background ?? "black";

    if (options.htmlNodeId !== undefined) {
      const el = document.getElementById(options.htmlNodeId);
      if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(
          `Plant.js: Element "${options.htmlNodeId}" is not a canvas.`,
        );
      }
      this.htmlNode = el;
    } else {
      this.htmlNode = document.createElement("canvas");
      document.body.appendChild(this.htmlNode);
    }

    const ctx = this.htmlNode.getContext("2d");
    if (!ctx) {
      throw new Error("Plant.js: Unable to get canvas context.");
    }
    this.context = ctx;
    this.htmlNode.width = this.width;
    this.htmlNode.height = this.height;

    // Hidden canvas for image processing (sprite opacity)
    this.processingCanvas = document.createElement("canvas");
    this.processingCanvas.style.display = "none";
    document.body.appendChild(this.processingCanvas);

    const pCtx = this.processingCanvas.getContext("2d");
    if (!pCtx) {
      throw new Error("Plant.js: Unable to get processing canvas context.");
    }
    this.processingCtx = pCtx;

    this.htmlNode.addEventListener("mousemove", (e: MouseEvent) => {
      this.mouseX = e.clientX - this.htmlNode.offsetLeft;
      this.mouseY = e.clientY - this.htmlNode.offsetTop;
    });

    this.htmlNode.addEventListener("click", (e: MouseEvent) => {
      this.onClick?.();

      const curX = e.clientX - this.htmlNode.offsetLeft;
      const curY = e.clientY - this.htmlNode.offsetTop;

      for (const node of this.nodes) {
        const r1 = curX + 1;
        const b1 = curY + 1;
        const r2 = node.x + node.width;
        const b2 = node.y + node.height;

        const hit =
          node.x <= r1 && curX <= r2 && node.y <= b1 && curY <= b2;

        if (hit) {
          node.onClick?.();
        }
      }
    });
  }

  add(toAdd: SceneNode | SceneNode[]): void {
    if (Array.isArray(toAdd)) {
      this.nodes.push(...toAdd);
    } else {
      this.nodes.push(toAdd);
    }
  }

  update(): void {
    const { context: ctx } = this;

    // Clear canvas
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);

    // Sort by z-index
    this.nodes = sortByZIndex(this.nodes);

    for (const node of this.nodes) {
      if (!node.visible) continue;

      const T = node as RenderableNode;

      switch (T.type()) {
        case "rectangle":
          this.renderRectangle(ctx, T as Rectangle);
          break;
        case "ellipse":
          this.renderEllipse(ctx, T as Ellipse);
          break;
        case "sprite":
          this.renderSprite(ctx, T as Sprite);
          break;
        case "text":
          this.renderText(ctx, T as Text);
          break;
      }
    }
  }

  private applyColorWithOpacity(
    ctx: CanvasRenderingContext2D,
    color: string,
    opacity: number,
  ): void {
    if (opacity < 0 || opacity > 1) {
      throw new Error("Plant.js: Invalid opacity value.");
    }
    if (opacity < 1) {
      const rgb = hexToRgb(color);
      if (!rgb) {
        throw new Error(`Plant.js: Invalid hex color "${color}".`);
      }
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    } else {
      ctx.fillStyle = color;
    }
  }

  private renderRectangle(
    ctx: CanvasRenderingContext2D,
    T: Rectangle,
  ): void {
    this.applyColorWithOpacity(ctx, T.color, T.opacity);
    ctx.fillRect(T.x, T.y, T.width, T.height);
  }

  private renderEllipse(ctx: CanvasRenderingContext2D, T: Ellipse): void {
    this.applyColorWithOpacity(ctx, T.color, T.opacity);

    const kappa = 0.5522848;
    const ox = (T.width / 2) * kappa;
    const oy = (T.height / 2) * kappa;
    const xe = T.x + T.width;
    const ye = T.y + T.height;
    const xm = T.x + T.width / 2;
    const ym = T.y + T.height / 2;

    ctx.beginPath();
    ctx.moveTo(T.x, ym);
    ctx.bezierCurveTo(T.x, ym - oy, xm - ox, T.y, xm, T.y);
    ctx.bezierCurveTo(xm + ox, T.y, xe, ym - oy, xe, ym);
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    ctx.bezierCurveTo(xm - ox, ye, T.x, ym + oy, T.x, ym);
    ctx.closePath();
    ctx.fill();
  }

  private renderSprite(ctx: CanvasRenderingContext2D, T: Sprite): void {
    if (T.opacity !== T._opacityCache) {
      T.node.src = this.changeImageOpacity(T.node, T.opacity);
      T._opacityCache = T.opacity;
    }

    const sx = T.frameWidth * T.xFrame;
    const sy = T.frameHeight * T.yFrame;

    ctx.save();
    ctx.drawImage(
      T.node,
      sx,
      sy,
      T.frameWidth,
      T.frameHeight,
      T.x,
      T.y,
      T.width,
      T.height,
    );
    ctx.restore();
  }

  private renderText(ctx: CanvasRenderingContext2D, T: Text): void {
    ctx.font = T.font;
    ctx.fillStyle = T.color;
    ctx.textBaseline = "top";
    ctx.fillText(T.text, T.x, T.y);
  }

  private changeImageOpacity(
    imageNode: HTMLImageElement,
    opacity: number,
  ): string {
    this.processingCanvas.width = imageNode.width;
    this.processingCanvas.height = imageNode.height;
    this.processingCtx.globalAlpha = opacity;
    this.processingCtx.drawImage(imageNode, 0, 0);
    return this.processingCanvas.toDataURL("image/png");
  }
}
