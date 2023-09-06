export class Sprite {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  src: string;
  xFrame: number;
  yFrame: number;
  x: number;
  y: number;
  opacity: number;
  _opacityCache: number;
  zindex: number;
  visible: boolean;
  _isFadingOut: boolean;
  _fadingFrame: number | null;
  node: HTMLImageElement;
  constructor(
    width = 100, // todo check
    height = 100, // and all with 100
    frameWidth = 100,
    frameHeight = 100,
    src: string,
    xFrame = 0,
    yFrame = 0,
    x = 0,
    y = 0,
    opacity = 0,
    zindex = 1,
    visible = true,
    _fadingFrame = null
  ) {


    // src option required
    if (src === undefined){
      throw new Error('Plant.js: resource src required');
    } else {
      this.node = new Image();
      this.src = src;
      this.node.src = src;
    }

    this.width = width || this.node.width;
    this.height = height || this.node.height;
    this.frameWidth = frameWidth || this.node.width;
    this.frameHeight = frameHeight || this.node.height;

    // current x and y frames
    this.xFrame = xFrame
    this.yFrame = yFrame;

    this.x = x;
    this.y = y;


    this.opacity = opacity;

    // save previous opacity and angle values, watch for a change
    this._opacityCache = 1;

    this.zindex = zindex;
    this.visible = visible;

    this._isFadingOut = false;
    this._fadingFrame = null;
  }

}
