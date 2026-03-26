import { Scene, Text } from "../../src/index";

const canv1 = new Scene({ htmlNodeId: "canvas1" });
const text1 = new Text({ x: 5, y: 5 });
canv1.add(text1);

const canv2 = new Scene({ htmlNodeId: "canvas2" });
const text2 = new Text({ x: 5, y: 5 });
canv2.add(text2);

const canv3 = new Scene({ htmlNodeId: "canvas3" });
const text3 = new Text({ x: 5, y: 5 });
canv3.add(text3);

const canv4 = new Scene({ htmlNodeId: "canvas4" });
const text4 = new Text({ x: 5, y: 5 });
canv4.add(text4);

setInterval(() => {
  text1.text = `${canv1.mouseX} ${canv1.mouseY}`;
  canv1.update();
  text2.text = `${canv2.mouseX} ${canv2.mouseY}`;
  canv2.update();
  text3.text = `${canv3.mouseX} ${canv3.mouseY}`;
  canv3.update();
  text4.text = `${canv4.mouseX} ${canv4.mouseY}`;
  canv4.update();
}, 50);
