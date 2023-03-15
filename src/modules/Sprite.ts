import {PLANT} from "../main";

export function Sprite (this: PLANT, options: any) {
  // src option required
  if (options.src === undefined){
    throw new Error('Plant.js: resource src required');
  } else {
    this.node = new Image();
    this.src = options.src;
    this.node.src = options.src;
  }


  this.width = options.width || this.node.width;
  this.height = options.height || this.node.height;
  this.frameWidth = options.frameWidth || this.node.width;
  this.frameHeight = options.frameHeight || this.node.height;

  // current x and y frames
  this.xFrame = options.xFrame || 0;
  this.xFrame = options.yFrame || 0;

  this.x = options.x || 0;
  this.y = options.y || 0;


  this.opacity = options.opacity || 1;

  // save previous opacity and angle values, watch for a change
  this._opacityCache = 1;

  this.zindex = options.zindex || 1;
  this.visible = options.visible || true;

  this._isFadingOut = false;
  this._fadingFrame = null;
}
