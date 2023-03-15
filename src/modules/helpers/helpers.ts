export function _sortBy(prop: any, arr: any) {
  prop = prop.split('.');
  const len = prop.length;

  arr.sort(function (a: any, b: any) {
    let i = 0;
    while (i < len) {
      a = a[prop[i]];
      b = b[prop[i]];
      i++;
    }
    if (a < b) {
      return -1;
    } else if (a > b) {
      return 1;
    } else {
      return 0;
    }
  });
  return arr;
}

export function _componentToHex(c: string) {
  const hex = c.toString();
  return hex.length == 1 ? '0' + hex : hex;
}

export function _rgbToHex(r: any, g: any, b: any) {
  return '#' + _componentToHex(r) + _componentToHex(g) + _componentToHex(b);
}

export function _hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}