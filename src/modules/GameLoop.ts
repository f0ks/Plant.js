import {PLANT} from "../main";

export function GameLoop (this: PLANT, options: any) {
  // scene is required
  if (options.scene === undefined){
    throw new Error('Plant.js: scene is required');
  } else {
    this.scene = options.scene;
  }

  // 50ms default
  this.interval = options.interval || 50;
  this._isActive = false;
}