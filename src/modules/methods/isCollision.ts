export function isCollision (obj1: any, obj2: any) { //TODO

  // check for collision
  // @TODO move collision check to scene method?
  let x1 = obj1.x;
  let y1 = obj1.y;
  let w1 = obj1.width;
  let h1 = obj1.height;

  let x2 = obj2.x;
  let y2 = obj2.y;
  let w2 = obj2.width;
  let h2 = obj2.height;

  w2 += x2;
  w1 += x1;

  if (x2 > w1 || x1 > w2) {
    return false;
  }

  h2 += y2;
  h1 += y1;

  return !(y2 > h1 || y1 > h2);
}
