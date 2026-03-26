import { Scene, Sprite, Rectangle, Ellipse, GameLoop, isCollision } from "../../src";

const scene = new Scene();

const player = new Sprite({
  src: "megaman.png",
  x: 300,
  y: 300,
});

const dragon = new Sprite({
  src: "dragon.png",
  x: 100,
  y: 50,
});

const crystal = new Sprite({
  src: "crystal.png",
  x: 200,
  y: 200,
});

const pikachu = new Sprite({
  src: "pikachu.png",
  x: 100,
  y: 220,
});

const rect = new Rectangle({ color: "#22aa44", x: 200, y: 120 });
scene.add(rect);

const el = new Ellipse({ color: "#ccee22", opacity: 0.6, x: 10, y: 10, width: 30, height: 60 });
scene.add(el);

scene.add([dragon, crystal, pikachu, player]);

const myLoop = new GameLoop({
  scene,
  interval: 30,
});

myLoop.code = () => {
  player.x = scene.mouseX;
  player.y = scene.mouseY;
  if (isCollision(player, crystal)) {
    crystal.opacity = 0.25;
  }
  scene.update();
};

myLoop.start();
