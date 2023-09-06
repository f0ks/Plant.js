export class Text {
  font: string;
  color: string;
  x: number;
  y: number;
  text: string;
  zindex: number;
  visible: boolean;

  constructor(
    font = "10pt sans-serif",
    color = "#ffffff",
    x = 0,
    y = 0,
    text = "Sample text",
    zindex = 1,
    visible = true,
  ) {

    this.font = font;
    this.color = color;
    this.x = x;
    this.y = y;
    this.text = text;
    this.zindex = zindex;
    this.visible = visible;
  }
}
