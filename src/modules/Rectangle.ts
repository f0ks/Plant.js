import {PLANT} from "../main";

export function Rectangle (this: PLANT, options: any) {
  options = options || {};
  this.width = options.width || 50;
  this.height = options.height || 50;

  // plan works with hex colors, in full notation
  this.color = options.color || '#ffffff';

  this.x = options.x || 0;
  this.y = options.y || 0;
  this.zindex = options.zindex || 1;
  this.visible = options.visible || true;


  this.opacity = options.opacity || 1;

}
