import { Scene, Text, Sprite, Rectangle } from "../../src/index";

const txtMouse = new Text({
  x: 3,
  y: 3,
  color: "#cef",
});

const canvas = new Scene({
  htmlNodeId: "canvas",
  width: 320,
  height: 480,
});

const crystal = new Sprite({
  src: "crystal.png",
  x: 100,
  y: 100,
});

const cube1 = new Rectangle({
  x: 120,
  y: 120,
  width: 30,
  height: 30,
  opacity: 0.5,
  color: "#00ff00",
});

const cube2 = new Rectangle({
  x: 80,
  y: 10,
  width: 60,
  height: 40,
  opacity: 0.5,
  color: "#ff77aa",
});

const cube3 = new Rectangle({
  x: 110,
  y: 30,
  width: 50,
  height: 60,
  opacity: 0.5,
  color: "#cceeff",
});

canvas.add(txtMouse);
canvas.add(cube1);
canvas.add(cube2);
canvas.add(cube3);
canvas.add(crystal);
canvas.update();

cube1.onClick = () => {
  cube1.visible = false;
  canvas.update();
};

cube2.onClick = () => {
  cube2.color = "#66ffbb";
  canvas.update();
};

cube3.onClick = () => {
  cube3.color = "#22ff55";
  canvas.update();
};
