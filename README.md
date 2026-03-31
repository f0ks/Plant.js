# Plant.js

Lightweight 2D canvas game engine written in TypeScript.

## Installation

```bash
npm install plant.js
```

## Quick Start

```typescript
import { Scene, Rectangle, Sprite, GameLoop, isCollision } from "plant.js";

// Create a scene (auto-creates a canvas element)
const scene = new Scene({ width: 320, height: 480, background: "black" });

// Add objects
const player = new Sprite({ src: "player.png", x: 100, y: 200 });
const wall = new Rectangle({ x: 50, y: 50, width: 40, height: 40, color: "#fff" });
scene.add([player, wall]);

// Game loop
const loop = new GameLoop({ scene });
loop.code = () => {
  if (isCollision(player, wall)) {
    // handle collision
  }
  scene.update();
};
loop.start();
```

## API

### Scene

The main canvas container and renderer. Every Plant.js game needs at least one scene.

```typescript
const scene = new Scene({
  htmlNodeId?: string,  // existing <canvas> element ID (auto-creates one if omitted)
  width?: number,       // canvas width in pixels (default: 320)
  height?: number,      // canvas height in pixels (default: 320)
  background?: string,  // background color (default: "black")
  useTimer?: boolean,   // use setInterval instead of requestAnimationFrame (default: false)
});
```

**Properties:**
- `mouseX`, `mouseY` - current mouse position on the canvas
- `nodes` - array of all added objects
- `onClick` - callback for canvas click events

**Methods:**
- `add(child)` / `add([children])` - add one or more objects to the scene
- `update()` - redraw the scene (call this each frame)

### Rectangle

```typescript
const rect = new Rectangle({
  x?: number,        // default: 0
  y?: number,        // default: 0
  width?: number,    // default: 0
  height?: number,   // default: 0
  color?: string,    // hex color (default: "#000000")
  opacity?: number,  // 0 to 1 (default: 1)
  zindex?: number,   // draw order (default: 1)
  visible?: boolean, // default: true
});
```

### Ellipse

```typescript
const ellipse = new Ellipse({
  x?: number,        // default: 0
  y?: number,        // default: 0
  width?: number,    // default: 0
  height?: number,   // default: 0
  color?: string,    // hex color (default: "#000000")
  opacity?: number,  // 0 to 1 (default: 1)
  zindex?: number,   // draw order (default: 1)
  visible?: boolean, // default: true
});
```

### Sprite

Renders images with sprite sheet support.

```typescript
const sprite = new Sprite({
  src: string,          // image path (required)
  x?: number,           // default: 0
  y?: number,           // default: 0
  width?: number,       // display width (defaults to image natural width)
  height?: number,      // display height (defaults to image natural height)
  frameWidth?: number,  // sprite sheet frame width (defaults to image natural width)
  frameHeight?: number, // sprite sheet frame height (defaults to image natural height)
  xFrame?: number,      // horizontal frame index (default: 0)
  yFrame?: number,      // vertical frame index (default: 0)
  opacity?: number,     // 0 to 1 (default: 1)
  zindex?: number,      // draw order (default: 1)
  visible?: boolean,    // default: true
});
```

**Static Methods:**
- `Sprite.preload(sources)` - preload one or more image URLs, returns a `Promise<void>`. Preloaded images are cached and used automatically when creating new Sprite instances, ensuring dimensions are available immediately.

```typescript
await Sprite.preload(["player.png", "enemy.png", "tiles.png"]);
```

**Methods:**
- `fadeOut()` - begins a fade out animation

### Text

```typescript
const text = new Text({
  text?: string,     // text content
  x?: number,        // default: 0
  y?: number,        // default: 0
  font?: string,     // CSS font string (default: "12pt Arial")
  color?: string,    // default: "#000000"
  zindex?: number,   // draw order (default: 1)
  visible?: boolean, // default: true
});
```

### GameLoop

Controls the game loop using `requestAnimationFrame` (default) or `setInterval`.

```typescript
const loop = new GameLoop({
  scene: Scene,      // the scene instance (required)
  interval?: number, // interval in ms for timer mode (default: 50)
});

loop.code = () => {
  // update game state here
  scene.update();
};

loop.start(); // returns true on success, false if already running
loop.stop();  // returns true on success, false if already stopped
```

### Utility Functions

```typescript
isCollision(obj1, obj2)    // AABB collision detection between two scene objects
random(from, to)           // random integer in [from, to] range
hexToRgb(hex)              // "#ff0000" -> { r: 255, g: 0, b: 0 }
rgbToHex(r, g, b)          // (255, 0, 0) -> "#ff0000"
```

### Common Properties

All scene objects (Rectangle, Ellipse, Sprite, Text) share:

- `x`, `y` - position
- `zindex` - draw order (lower draws first)
- `visible` - show/hide
- `onClick` - click handler callback (set to a function or `null`)

## Events

Click handling works on individual objects:

```typescript
const button = new Rectangle({ x: 10, y: 10, width: 100, height: 40, color: "#333" });
button.onClick = () => console.log("clicked!");
scene.add(button);
```

Mouse position is tracked on the scene:

```typescript
loop.code = () => {
  player.x = scene.mouseX;
  player.y = scene.mouseY;
  scene.update();
};
```

## Examples

See the [`examples/`](examples/) directory:

- **click** - click event handling on objects
- **collision** - AABB collision detection
- **multiple_canvas** - multiple independent scenes
- **sokoban** - a complete Sokoban puzzle game ([play online](https://f0ks.github.io/sokoban.html))

## Development

```bash
npm run dev        # start Vite dev server
npm run build      # build library (ES module + UMD)
npm run typecheck  # TypeScript type checking
```

## License

MIT
