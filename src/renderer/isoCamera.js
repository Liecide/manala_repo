export class IsoCamera {
  constructor(canvas, tileW = 84, tileH = 42) {
    this.canvas = canvas;
    this.tileW = tileW;
    this.tileH = tileH;
    this.offsetX = canvas.width * 0.5;
    this.offsetY = 175;
    this.zoom = 1.28;
  }

  worldToScreen(x, y) {
    return {
      x: (x - y) * (this.tileW / 2) * this.zoom + this.offsetX,
      y: (x + y) * (this.tileH / 2) * this.zoom + this.offsetY,
    };
  }

  screenToWorld(screenX, screenY) {
    const x = (screenX - this.offsetX) / this.zoom;
    const y = (screenY - this.offsetY) / this.zoom;
    const wx = (x / (this.tileW / 2) + y / (this.tileH / 2)) / 2;
    const wy = (y / (this.tileH / 2) - x / (this.tileW / 2)) / 2;
    return { x: wx, y: wy };
  }
}
