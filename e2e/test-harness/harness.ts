import {
  Scene,
  Rectangle,
  Ellipse,
  Text,
  GameLoop,
  isCollision,
  hexToRgb,
  rgbToHex,
} from "../../src";

// Expose everything on window so Playwright can call into it
Object.assign(window, {
  Scene,
  Rectangle,
  Ellipse,
  Text,
  GameLoop,
  isCollision,
  hexToRgb,
  rgbToHex,
});

// Signal that the harness is ready
(window as any).__PLANT_READY = true;
