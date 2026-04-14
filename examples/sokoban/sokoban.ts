import { Scene, Sprite, GameLoop, animate } from "../../src";
import { levels as originalLevels } from "./levels";

const CELL_SIZE = 30;
const ANIM_DURATION = 120;

let levels: string[][][];
let level: string[][];
let xLength: number;
let yLength: number;
let curLevel = 0;
let isInitialized = false;
let isLevelChanged = true;
let isAnimating = false;

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
  updateLevelButtons();

  if (isInitialized) {
    setCanvasSize();

    const pos = getPlayerPosition();
    player.x = pos.x * CELL_SIZE;
    player.y = pos.y * CELL_SIZE;

    isLevelChanged = true;
    renderView();
  }
}

function selectLevel(index: number): void {
  loadLevels();
  curLevel = index;
  loadLevel(curLevel);
}

function buildLevelButtons(): void {
  const container = document.getElementById("level-select");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < originalLevels.length; i++) {
    const btn = document.createElement("button");
    btn.textContent = `${i + 1}`;
    btn.addEventListener("click", () => selectLevel(i));
    container.appendChild(btn);
  }
  updateLevelButtons();
}

function updateLevelButtons(): void {
  const container = document.getElementById("level-select");
  if (!container) return;
  const buttons = container.querySelectorAll("button");
  buttons.forEach((btn, i) => {
    btn.classList.toggle("active", i === curLevel);
  });
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

function findBoxSprite(row: number, col: number): Sprite | undefined {
  const px = col * CELL_SIZE;
  const py = row * CELL_SIZE;
  return scene.nodes.find(
    (n) =>
      n.type() === "sprite" &&
      n.x === px &&
      n.y === py &&
      ((n as Sprite).src === "gfx/box.png" || (n as Sprite).src === "gfx/bspot.png"),
  ) as Sprite | undefined;
}

function updateGridPlayer(
  newPos: Position,
  onSpot: boolean,
  pushFromSpot: boolean,
): void {
  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      if (level[i][j] === "@") level[i][j] = "-";
      if (level[i][j] === "%") level[i][j] = "*";
    }
  }

  if (onSpot || pushFromSpot) {
    level[newPos.y][newPos.x] = "%";
  } else {
    level[newPos.y][newPos.x] = "@";
  }
}

function checkWin(): boolean {
  let boxCount = 0;
  for (let i = 0; i < xLength; i++) {
    for (let j = 0; j < yLength; j++) {
      if (level[i][j] === "B") boxCount++;
    }
  }

  if (boxCount < 1) {
    if (curLevel === levels.length - 1) {
      loadLevels();
      curLevel = 0;
    } else {
      curLevel++;
    }
    loadLevel(curLevel);
    return true;
  }
  return false;
}

async function move(dy: number, dx: number): Promise<void> {
  if (isAnimating) return;

  const cur = getPlayerPosition();
  const ny = cur.y + dy;
  const nx = cur.x + dx;

  if (ny < 0 || ny >= xLength || nx < 0 || nx >= yLength) return;

  const target = level[ny][nx];

  let boxFrom: Position | null = null;
  let boxTo: Position | null = null;
  let isOnSpot = false;
  let isPushFromSpot = false;

  if (target === "D" || target === "G") {
    return;
  } else if (target === "B") {
    const by = ny + dy;
    const bx = nx + dx;
    if (by < 0 || by >= xLength || bx < 0 || bx >= yLength) return;
    const beyond = level[by][bx];
    if (beyond === "-") {
      level[ny][nx] = "-";
      level[by][bx] = "B";
      boxFrom = { y: ny, x: nx };
      boxTo = { y: by, x: bx };
    } else if (beyond === "*") {
      level[ny][nx] = "-";
      level[by][bx] = "$";
      boxFrom = { y: ny, x: nx };
      boxTo = { y: by, x: bx };
    } else {
      return;
    }
  } else if (target === "$") {
    const by = ny + dy;
    const bx = nx + dx;
    if (by < 0 || by >= xLength || bx < 0 || bx >= yLength) return;
    const beyond = level[by][bx];
    if (beyond !== "-" && beyond !== "*") return;
    if (beyond === "*") {
      level[by][bx] = "$";
    } else {
      level[by][bx] = "B";
    }
    boxFrom = { y: ny, x: nx };
    boxTo = { y: by, x: bx };
    isPushFromSpot = true;
  } else if (target === "*") {
    isOnSpot = true;
  }

  // Find the box sprite BEFORE rebuilding anything
  let boxSprite: Sprite | undefined;
  if (boxFrom) {
    boxSprite = findBoxSprite(boxFrom.y, boxFrom.x);
  }

  // Update grid for player position
  updateGridPlayer({ y: ny, x: nx }, isOnSpot, isPushFromSpot);

  renderDebugHtml();

  // Animate player and pushed box
  isAnimating = true;
  const animations: Promise<void>[] = [];
  animations.push(
    animate(player, { x: nx * CELL_SIZE, y: ny * CELL_SIZE }, ANIM_DURATION),
  );
  if (boxSprite && boxTo) {
    animations.push(
      animate(
        boxSprite,
        { x: boxTo.x * CELL_SIZE, y: boxTo.y * CELL_SIZE },
        ANIM_DURATION,
      ),
    );
  }
  await Promise.all(animations);
  isAnimating = false;

  if (checkWin()) return;

  isLevelChanged = true;
  renderView();
}

function renderDebugHtml(): void {
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
}

function renderView(): void {
  renderDebugHtml();

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
  if (isAnimating) return;

  switch (e.key) {
    case "ArrowUp":    void move(-1, 0); break;
    case "ArrowLeft":  void move(0, -1); break;
    case "ArrowRight": void move(0, 1); break;
    case "ArrowDown":  void move(1, 0); break;
  }
}

// Initialize
async function init(): Promise<void> {
  await Sprite.preload([
    "gfx/grass.png", "gfx/floor.png", "gfx/block.png",
    "gfx/player.png", "gfx/box.png", "gfx/spot.png", "gfx/bspot.png",
  ]);

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
  buildLevelButtons();

  window.addEventListener("keydown", onKeyDown);
}

void init();
