import {PLANT} from "../../main";
import * as icon from './crystal.png' ;

const example = {
  onPageLoad: function() {

    const txtMouse = new (PLANT.Text({
      x: 3,
      y: 3,
      color: '#cef'
    }) as any);

    const canvas = new (PLANT.Scene({
      htmlNodeId: 'canvas',
      width: 320,
      height: 480
    }) as any);

    const crystal = new (PLANT.Sprite({
      src: icon,
      x: 100,
      y: 100
    }) as any);

    const cube1 = new (PLANT.Rectangle({
      x: 120,
      y: 120,
      width: 30,
      height: 30,
      opacity: 0.5,
      color: "#00ff00"
    }) as any);

    const cube2 = new (PLANT.Rectangle({
      x: 80,
      y: 10,
      width: 60,
      height: 40,
      opacity: 0.5,
      color: '#ff77aa'
    }) as any);

    const cube3 = new (PLANT.Rectangle({
      x: 110,
      y: 30,
      width: 50,
      height: 60,
      opacity: 0.5,
      color: '#cceeff'
    }) as any);

    canvas.add(txtMouse);
    canvas.add(cube1);
    canvas.add(cube2);
    canvas.add(cube3);
    canvas.add(crystal);
    canvas.update();

    cube1.onClick = function() {
      cube1.visible = false;
      canvas.update();
    };

    cube2.onClick = function() {
      cube2.color = '#66ffbb';
      canvas.update();
    };

    cube3.onClick = function() {
      cube3.color = '#22ff55';
      canvas.update();
    };

  }
};
window.addEventListener('load', example.onPageLoad, false);
