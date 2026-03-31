export interface SceneOptions {
  htmlNodeId?: string;
  useTimer?: boolean;
  width?: number;
  height?: number;
  background?: string;
}

export interface RectangleOptions {
  width?: number;
  height?: number;
  color?: string;
  x?: number;
  y?: number;
  zindex?: number;
  visible?: boolean;
  opacity?: number;
}

export interface EllipseOptions {
  width?: number;
  height?: number;
  color?: string;
  x?: number;
  y?: number;
  zindex?: number;
  visible?: boolean;
  opacity?: number;
}

export interface SpriteOptions {
  src: string;
  width?: number;
  height?: number;
  frameWidth?: number;
  frameHeight?: number;
  xFrame?: number;
  yFrame?: number;
  x?: number;
  y?: number;
  opacity?: number;
  zindex?: number;
  visible?: boolean;
}

export interface TextOptions {
  font?: string;
  color?: string;
  x?: number;
  y?: number;
  text?: string;
  zindex?: number;
  visible?: boolean;
}

export interface GameLoopOptions {
  scene: import("./Scene").Scene;
  interval?: number;
}

export interface SceneNode {
  x: number;
  y: number;
  width: number;
  height: number;
  zindex: number;
  visible: boolean;
  onClick: (() => void) | null;
  type(): string;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}
