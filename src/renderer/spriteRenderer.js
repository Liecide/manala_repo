import { getSprite } from './spriteLoader.js';

export function drawSprite(ctx, camera, spriteKey, x, y, opts = {}) {
  const sprite = getSprite(spriteKey);
  if (!sprite) return;
  const p = camera.worldToScreen(x, y);
  const scale = (opts.scale || 1) * camera.zoom;
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const ox = opts.offsetX || 0;
  const oy = opts.offsetY || 0;

  ctx.drawImage(sprite, p.x - w / 2 + ox * camera.zoom, p.y - h + oy * camera.zoom, w, h);
}

export function drawShadow(ctx, camera, x, y, w = 18, h = 9, alpha = 0.22) {
  const p = camera.worldToScreen(x, y);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2 * camera.zoom, w * camera.zoom, h * camera.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
