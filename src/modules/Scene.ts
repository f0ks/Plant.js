import {PLANT} from "../main";


export function Scene (this: PLANT, options: any) { // TODO

  options = options || {};
  this.useTimer = options.useTimer || false;
  this.width = options.width || 320;
  this.height = options.height || 320;
  this.background = options.background || 'black';

  // create canvas if not specified existing
  if (options.htmlNodeId === undefined) {
    this.htmlNode = document.createElement('canvas');
    document.body.appendChild(this.htmlNode);
  } else {
    this.htmlNode = document.getElementById(options.htmlNodeId) as HTMLCanvasElement;
  }

  // create additional hidden canvas for image processing
  this._processingCanvasNode = document.createElement('canvas');
  this._processingCanvasNode.style.display = 'none';
  document.body.appendChild(this._processingCanvasNode);

  // all scene's objects goes here
  // this.nodes = [];

  // mouse position on scene
  this.mouseX = 0;
  this.mouseY = 0;

  // function expected
  // this.onClick = null;

  if (this.htmlNode.getContext) {
    this.context = this.htmlNode.getContext('2d');
    this.htmlNode.width = this.width;
    this.htmlNode.height = this.height;
  } else {
    throw new Error('Plant.js: Unable to get canvas context.');
  }


  // update mouse position on scene
  this.htmlNode.addEventListener('mousemove', (e) => {
    this.mouseX = e.clientX - this.htmlNode!.offsetLeft;
    this.mouseY = e.clientY - this.htmlNode!.offsetTop;
  }, false);

  this._changeImageOpacity = function (imagenode, opacity) {
    if (this._processingCanvasNode) {
      this._processingCanvasCtx = this._processingCanvasNode.getContext('2d');

      // set canvas width and height to match image's size
      this._processingCanvasNode.width = imagenode.width;
      this._processingCanvasNode.height = imagenode.height;

      // set canvas opacity
      this._processingCanvasCtx!.globalAlpha = opacity;

      // draw image
      this._processingCanvasCtx!.drawImage(imagenode, 0, 0);

      // export base64 encoded image data
      return this._processingCanvasNode.toDataURL('image/png');

    } else {
      throw new Error('Plant.js: Unable to get canvas context');
    }
  };


  // Check for click on canvas itself
  // or on any object attached to current scene
  this.htmlNode.addEventListener('click', (e) => {

    // scene itself
    // if function set to onClick call it
    if (typeof(this.onClick) === 'function') {
      this.onClick();
    }

    // check for "collision" between mouse pointer and any other object
    // on current scene

    let curX = e.clientX - this.htmlNode!.offsetLeft;
    let curY = e.clientY - this.htmlNode!.offsetTop;
    let x1 = curX;
    let y1 = curY;
    let w1;
    let h1;

    var length = this.nodes.length;
    for (let i = 0; i < length; i++) {
      const T = this.nodes[i];

      // mouse pointer
      w1 = 1;
      h1 = 1;

      let x2 = T.x;
      let y2 = T.y;
      let w2 = T.width;
      let h2 = T.height;
      let isCollision = true;

      w2 += x2;
      w1 += x1;

      if (x2 > w1 || x1 > w2) {
        isCollision = false;
      }

      h2 += y2;
      h1 += y1;

      if (y2 > h1 || y1 > h2) {
        isCollision = false;
      }

      // if there is any collision, execute onClick function of
      // scene's child object clicked, if it defined (not null)
      if (isCollision && T.onClick !== null) {
        T.onClick();
      }
    }
  }, false);

}