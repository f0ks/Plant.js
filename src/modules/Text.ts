import {PLANT} from "../main";

export function Text (this: PLANT, options: any) {
  options = options || {};
  this.font = options.font || '10pt sans-serif';
  this.color = options.color || '#ffffff';
  this.x = options.x || 0;
  this.y = options.y || 0;

  this.text = options.text || 'Sample text';

  this.zindex = options.zindex || 1;
  this.visible = options.visible || true;
}