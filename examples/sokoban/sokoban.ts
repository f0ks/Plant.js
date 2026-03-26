import { Scene, Sprite, GameLoop } from "../../src/index";
import { levels as originalLevels } from "./levels";

const CELL_SIZE = 30;

let levels: string[][][];
let level: string[][];
let xLength: number;
let yLength: number;
let curLevel = 0;
let isInitialized = false;
let isLevelChanged = true;
let isOnSpot = false;
let isPushFromSpot = false;

let scene: Scene;
let player: Sprite;
let gameLoop: GameLoop;

interface Position {
  x: number;
  y: number;
}

function deepCopyLevels(): string[][][] {
  return originalLevels.map((lvl) => lvl.map((row) => [...row]));
}

function loadLevels(): void {
  levels = deepCopyLevels();
}

function loadLevel(index: number): void {
  level = levels[index];
  xLength = level.length;
  yLength = level[0].length;

  if (isInitialized) {
    setCanvasSize();
    isLevelChanged = true;
    renderView();
  }
}

function getPlayerPosition(): Position {
  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      if (level[i][j] === "@" || level[i][j] === "%") {
        return { x: j, y: i };
      }
    }
  }
  throw new Error("Player not found on level");
}

function setPlayerPosition(position: Position): void {
  let numberOfBoxes = 0;
  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      if (level[i][j] === "B") numberOfBoxes++;
      if (level[i][j] === "@") level[i][j] = "-";
      if (level[i][j] === "%") level[i][j] = "*";
    }
  }

  // check for win
  if (numberOfBoxes < 1) {
    if (curLevel === levels.length - 1) {
      loadLevels();
      curLevel = 0;
      loadLevel(0);
    } else {
      curLevel++;
      loadLevel(curLevel);
      const positionNewLevel = getPlayerPosition();
      setPlayerPosition(positionNewLevel);
    }
  }

  // set new position
  if (isOnSpot || isPushFromSpot) {
    level[position.y][position.x] = "%";
  } else {
    level[position.y][position.x] = "@";
  }

  isOnSpot = false;
  isPushFromSpot = false;

  renderView();
}

function goUp(): void {
  isLevelChanged = true;
  const cur = getPlayerPosition();
  let isPushed = false;

  if (cur.y > 0) {
    const above = level[cur.y - 1][cur.x];

    if (above !== "-" && above !== "*" && above !== "$") {
      // push box to empty space
      if (above === "B" && cur.y - 1 > 0 && level[cur.y - 2][cur.x] === "-") {
        level[cur.y - 1][cur.x] = "-";
        level[cur.y - 2][cur.x] = "B";
        cur.y--;
        setPlayerPosition(cur);
        isPushed = true;
      }
      // push box to spot
      if (above === "B" && cur.y - 1 > 0 && level[cur.y - 2][cur.x] === "*" && !isPushed) {
        level[cur.y - 1][cur.x] = "-";
        level[cur.y - 2][cur.x] = "$";
        cur.y--;
        setPlayerPosition(cur);
      }
    } else {
      if (above === "*") isOnSpot = true;
      if (above === "$" && level[cur.y - 2][cur.x] !== "D") {
        level[cur.y - 2][cur.x] = "B";
        isPushFromSpot = true;
      }
      if (above === "$" && level[cur.y - 2][cur.x] === "D") {
        cur.y++;
      }
      cur.y--;
      setPlayerPosition(cur);
    }
  }

  isLevelChanged = true;
  renderView();
}

function goDown(): void {
  const cur = getPlayerPosition();
  let isPushed = false;

  if (cur.y < xLength - 1) {
    const below = level[cur.y + 1][cur.x];

    if (below !== "-" && below !== "*" && below !== "$") {
      if (below === "B" && cur.y + 1 < xLength - 1 && level[cur.y + 2][cur.x] === "-") {
        level[cur.y + 1][cur.x] = "-";
        level[cur.y + 2][cur.x] = "B";
        cur.y++;
        setPlayerPosition(cur);
        isPushed = true;
      }
      if (below === "B" && cur.y + 1 < xLength - 1 && level[cur.y + 2][cur.x] === "*" && !isPushed) {
        level[cur.y + 1][cur.x] = "-";
        level[cur.y + 2][cur.x] = "$";
        cur.y++;
        setPlayerPosition(cur);
        renderView();
      }
    } else {
      if (below === "*") isOnSpot = true;
      if (below === "$" && level[cur.y + 2][cur.x] !== "D") {
        if (level[cur.y + 2][cur.x] === "*") level[cur.y + 2][cur.x] = "$";
        if (level[cur.y + 2][cur.x] === "-") level[cur.y + 2][cur.x] = "B";
        isPushFromSpot = true;
      }
      if (below === "$" && level[cur.y + 2][cur.x] === "D") {
        cur.y--;
      }
      cur.y++;
      setPlayerPosition(cur);
    }
  }

  isLevelChanged = true;
  renderView();
}

function goRight(): void {
  const cur = getPlayerPosition();
  let isPushed = false;

  if (cur.x < yLength - 1) {
    const right = level[cur.y][cur.x + 1];

    if (right !== "-" && right !== "*" && right !== "$") {
      if (right === "B" && cur.x + 1 > 0 && level[cur.y][cur.x + 2] === "-") {
        level[cur.y][cur.x + 1] = "-";
        level[cur.y][cur.x + 2] = "B";
        cur.x++;
        setPlayerPosition(cur);
        isPushed = true;
      }
      if (right === "B" && cur.x + 1 > 0 && level[cur.y][cur.x + 2] === "*" && !isPushed) {
        level[cur.y][cur.x + 1] = "-";
        level[cur.y][cur.x + 2] = "$";
        cur.x++;
        setPlayerPosition(cur);
      }
    } else {
      if (right === "*") isOnSpot = true;
      if (right === "$" && level[cur.y][cur.x + 2] !== "D") {
        level[cur.y][cur.x + 2] = "B";
        isPushFromSpot = true;
      }
      if (right === "$" && level[cur.y][cur.x + 2] === "D") {
        cur.x--;
      }
      cur.x++;
      setPlayerPosition(cur);
    }
  }

  isLevelChanged = true;
  renderView();
}

function goLeft(): void {
  const cur = getPlayerPosition();
  let isPushed = false;

  if (cur.x > 0) {
    const left = level[cur.y][cur.x - 1];

    if (left !== "-" && left !== "*" && left !== "$") {
      if (left === "B" && cur.x - 1 > 0 && level[cur.y][cur.x - 2] === "-" && level[cur.y][cur.x - 2] !== "*") {
        level[cur.y][cur.x - 1] = "-";
        level[cur.y][cur.x - 2] = "B";
        cur.x--;
        isPushed = true;
        setPlayerPosition(cur);
      }
      if (left === "B" && level[cur.y][cur.x - 2] === "*" && !isPushed) {
        level[cur.y][cur.x - 1] = "-";
        level[cur.y][cur.x - 2] = "$";
        cur.x--;
        setPlayerPosition(cur);
      }
    } else {
      if (left === "*") isOnSpot = true;
      if (left === "$" && level[cur.y][cur.x - 2] !== "D") {
        level[cur.y][cur.x - 2] = "B";
        isPushFromSpot = true;
      }
      if (left === "$" && level[cur.y][cur.x - 2] === "D") {
        cur.x++;
      }
      cur.x--;
      setPlayerPosition(cur);
    }
  }

  isLevelChanged = true;
  renderView();
}

function renderView(): void {
  // render debug HTML view
  let htmlView = "";
  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      htmlView += level[i][j] + " ";
      if (j === level[i].length - 1) {
        htmlView += "<br>";
      }
    }
  }
  const codeEl = document.querySelector("code");
  if (codeEl) codeEl.innerHTML = htmlView;

  // render canvas view
  const curPosition = getPlayerPosition();
  player.x = curPosition.x * CELL_SIZE;
  player.y = curPosition.y * CELL_SIZE;

  if (isLevelChanged) {
    updateCanvasView();
  }
}

function updateCanvasView(): void {
  isLevelChanged = false;
  scene.nodes = [];
  scene.add(player);

  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      const curX = j * CELL_SIZE;
      const curY = i * CELL_SIZE;

      // floor background
      scene.add(new Sprite({ src: "gfx/floor.png", x: curX, y: curY }));

      const cell = level[i][j];

      if (cell === "B") {
        scene.add(new Sprite({ src: "gfx/box.png", zindex: 10, x: curX, y: curY }));
      }
      if (cell === "G") {
        scene.add(new Sprite({ src: "gfx/grass.png", zindex: 10, x: curX, y: curY }));
      }
      if (cell === "D") {
        scene.add(new Sprite({ src: "gfx/block.png", zindex: 10, x: curX, y: curY }));
      }
      if (cell === "*") {
        scene.add(new Sprite({ src: "gfx/spot.png", x: curX, y: curY, width: CELL_SIZE, height: CELL_SIZE }));
      }
      if (cell === "$") {
        scene.add(new Sprite({ src: "gfx/bspot.png", x: curX, y: curY, zindex: 100, width: CELL_SIZE, height: CELL_SIZE }));
      }
    }
  }
}

function setCanvasSize(): void {
  scene.htmlNode.width = CELL_SIZE * yLength;
  scene.htmlNode.height = CELL_SIZE * xLength;
}

function onKeyDown(e: KeyboardEvent): void {
  switch (e.key) {
    case "ArrowUp":    goUp(); break;
    case "ArrowLeft":  goLeft(); break;
    case "ArrowRight": goRight(); break;
    case "ArrowDown":  goDown(); break;
  }
}

// Initialize
loadLevels();
loadLevel(curLevel);

scene = new Scene();
setCanvasSize();

const curPosition = getPlayerPosition();
player = new Sprite({
  src: "gfx/player.png",
  zindex: 101,
  width: CELL_SIZE,
  height: CELL_SIZE,
  x: curPosition.x * CELL_SIZE,
  y: curPosition.y * CELL_SIZE,
});

gameLoop = new GameLoop({ scene, interval: 50 });
gameLoop.code = () => scene.update();
gameLoop.start();

renderView();
isInitialized = true;

window.addEventListener("keydown", onKeyDown);
