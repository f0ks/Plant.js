import './style.css'
import {Scene} from "./modules/Scene";
import {Rectangle} from "./modules/Rectangle";
import {Ellipse} from "./modules/Ellipse";
import {Sprite} from "./modules/Sprite";
import {Text} from "./modules/Text";
import {GameLoop} from "./modules/GameLoop";
import {isCollision} from "./modules/methods/isCollision";
import {Random} from "./modules/methods/Random";
import {_sortBy, _componentToHex, _hexToRgb, _rgbToHex} from "./modules/helpers/helpers";

export const PLANT =  {
  Scene,
  Text: Text,
  Rectangle,
  Ellipse,
  Sprite,
  GameLoop,
  isCollision,
  Random,
  _sortBy,
  _componentToHex,
  _rgbToHex,
  _hexToRgb,
  useTimer: false,
  width: 0,
  height: 0,
  background: '',
  htmlNode: null,
  _processingCanvasNode: null,
  nodes: [],
  mouseX: 0,
  mouseY:  0,
  onClick: null,
  context: null,
  _changeImageOpacity: null,
  _processingCanvasCtx: null,
  color: null,
  x: null,
  y: null,
  zindex: null,
  visible: null,
  opacity: null,
  node: null,
  src: null,
  frameWidth: null,
  frameHeight: null,
  xFrame: null,
  _opacityCache: null,
  _isFadingOut: null,
  _fadingFrame: null,
  font: null,
  text: null,
  scene: null,
  interval: null,
  _isActive: null,
}


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  Plant Next
`
