import { IsoCamera } from './renderer/isoCamera.js';
import { depthSort } from './renderer/depthSort.js';
import { loadSprites } from './renderer/spriteLoader.js';
import { drawShadow, drawSprite } from './renderer/spriteRenderer.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hoverVerb = document.getElementById('hoverVerb');
const camera = new IsoCamera(canvas, 84, 42);
ctx.imageSmoothingEnabled = false;

const GRID_W = 24;
const GRID_H = 24;
const TILE_COLORS = {
  grassA: '#8b9466',
  grassB: '#848d60',
  grassC: '#7c8659',
  roadA: '#9c957e',
  roadB: '#938b74',
  dirtA: '#857458',
  waterA: '#6b8c8f',
  waterB: '#58777d'
};

const state = {
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
  dragging: false,
  dragStart: null,
  panStart: null,
  keys: new Set(),
  target: null,
  hover: null,
};

const player = {
  x: 9,
  y: 17,
  speed: 0.050,
  sprite: 'player_idle',
  walkPulse: 0,
  dir: 'se',
};

const world = {
  tiles: [],
  entities: [
    { kind: 'npc', verb: 'Talk Banker', label: 'Banker', x: 8, y: 6, sprite: 'npc_banker', blocker: true },
    { kind: 'npc', verb: 'Talk Merchant', label: 'Merchant', x: 7, y: 6, sprite: 'npc_merchant', blocker: true },
    { kind: 'npc', verb: 'Talk Healer', label: 'Healer', x: 11, y: 17, sprite: 'npc_healer', blocker: true },
    { kind: 'object', verb: 'Use Forge', label: 'Forge', x: 9, y: 6, sprite: 'forge', blocker: true },
    { kind: 'object', verb: 'Use Anvil', label: 'Anvil', x: 8, y: 8, sprite: 'anvil', blocker: true },
    { kind: 'object', verb: 'Bank Booth', label: 'Bank', x: 10, y: 5, sprite: 'bank_booth', blocker: true },
    { kind: 'object', verb: 'Open Door', label: 'House', x: 6, y: 5, sprite: 'house_tall', blocker: true, sortBias: -0.2 },
    { kind: 'object', verb: 'Open Door', label: 'House', x: 4, y: 6, sprite: 'house_small', blocker: true, sortBias: -0.2 },
    { kind: 'resource', verb: 'Chop Oak', label: 'Oak Tree', x: 12, y: 11, sprite: 'tree_oak', blocker: true },
    { kind: 'resource', verb: 'Chop Oak', label: 'Oak Tree', x: 13, y: 13, sprite: 'tree_oak', blocker: true },
    { kind: 'resource', verb: 'Chop Oak', label: 'Oak Tree', x: 14, y: 15, sprite: 'tree_oak', blocker: true },
    { kind: 'resource', verb: 'Mine Rock', label: 'Rock', x: 14, y: 12, sprite: 'rock_iron', blocker: true },
    { kind: 'resource', verb: 'Net Fish', label: 'Fishing Spot', x: 16, y: 18, sprite: 'fish_spot', blocker: true },
    { kind: 'enemy', verb: 'Attack Wolf', label: 'Wolf', x: 16, y: 13, sprite: 'wolf_idle', blocker: true },
    { kind: 'enemy', verb: 'Attack Wolf', label: 'Wolf', x: 18, y: 11, sprite: 'wolf_idle', blocker: true },
  ]
};

function seededNoise(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function buildTiles() {
  for (let y = 0; y < GRID_H; y++) {
    const row = [];
    for (let x = 0; x < GRID_W; x++) {
      let type = 'grass';
      if ((x > 8 && x < 13 && y > 15) || (x > 10 && x < 18 && y > 17)) type = 'road';
      if (x > 15 && y > 16) type = 'water';
      if (x > 14 && y > 13 && x < 21 && y < 17) type = 'grassDark';
      row.push(type);
    }
    world.tiles.push(row);
  }
}
buildTiles();

const spriteEntries = [
  ['player_idle', 'assets/sprites/player/player_idle.svg'],
  ['player_walk1', 'assets/sprites/player/player_walk1.svg'],
  ['player_walk2', 'assets/sprites/player/player_walk2.svg'],
  ['npc_banker', 'assets/sprites/npcs/banker.svg'],
  ['npc_merchant', 'assets/sprites/npcs/merchant.svg'],
  ['npc_healer', 'assets/sprites/npcs/healer.svg'],
  ['wolf_idle', 'assets/sprites/enemies/wolf.svg'],
  ['tree_oak', 'assets/sprites/objects/tree_oak.svg'],
  ['rock_iron', 'assets/sprites/objects/rock_iron.svg'],
  ['forge', 'assets/sprites/objects/forge.svg'],
  ['anvil', 'assets/sprites/objects/anvil.svg'],
  ['bank_booth', 'assets/sprites/objects/bank_booth.svg'],
  ['house_tall', 'assets/sprites/objects/house_tall.svg'],
  ['house_small', 'assets/sprites/objects/house_small.svg'],
  ['fish_spot', 'assets/sprites/objects/fish_spot.svg'],
];

function tileColor(x, y, type) {
  const n = seededNoise(x, y);
  if (type === 'road') return n > 0.45 ? TILE_COLORS.roadA : TILE_COLORS.roadB;
  if (type === 'water') return n > 0.5 ? TILE_COLORS.waterA : TILE_COLORS.waterB;
  if (type === 'grassDark') return n > 0.5 ? '#718154' : '#66764c';
  if (type === 'dirt') return TILE_COLORS.dirtA;
  if (n < 0.33) return TILE_COLORS.grassA;
  if (n < 0.66) return TILE_COLORS.grassB;
  return TILE_COLORS.grassC;
}

function drawDiamond(sx, sy, fill, stroke = '#5f6846') {
  const w = camera.tileW * camera.zoom;
  const h = camera.tileH * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(sx, sy - h / 2);
  ctx.lineTo(sx + w / 2, sy);
  ctx.lineTo(sx, sy + h / 2);
  ctx.lineTo(sx - w / 2, sy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTiles() {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const p = camera.worldToScreen(x, y);
      drawDiamond(p.x, p.y, tileColor(x, y, world.tiles[y][x]));

      if (state.mouse.tileX === x && state.mouse.tileY === y) {
        ctx.save();
        ctx.globalAlpha = 0.26;
        drawDiamond(p.x, p.y, '#ddd291', '#c1b26c');
        ctx.restore();
      }
    }
  }
}

function drawBackDecor() {
  const decor = [
    { x: 2, y: 1, w: 140, h: 70, color: '#6f7e52' },
    { x: 4, y: 1, w: 130, h: 64, color: '#708057' },
    { x: 18, y: 2, w: 120, h: 60, color: '#728156' },
  ];
  decor.forEach(d => {
    const p = camera.worldToScreen(d.x, d.y);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.moveTo(p.x - d.w * 0.5, p.y - d.h * camera.zoom);
    ctx.lineTo(p.x, p.y - d.h * 1.55 * camera.zoom);
    ctx.lineTo(p.x + d.w * 0.5, p.y - d.h * camera.zoom);
    ctx.lineTo(p.x + d.w * 0.15, p.y - d.h * 0.32 * camera.zoom);
    ctx.lineTo(p.x - d.w * 0.15, p.y - d.h * 0.32 * camera.zoom);
    ctx.closePath();
    ctx.fill();
  });
}

function drawEntity(entity) {
  drawShadow(ctx, camera, entity.x, entity.y, entity.kind === 'object' ? 16 : 13, entity.kind === 'object' ? 8 : 6);
  drawSprite(ctx, camera, entity.sprite, entity.x, entity.y, { scale: entity.kind === 'object' ? 1 : 0.92 });

  if (entity.kind === 'enemy') {
    const p = camera.worldToScreen(entity.x, entity.y);
    const w = 34 * camera.zoom;
    const h = 6 * camera.zoom;
    ctx.fillStyle = '#2f2c22';
    ctx.fillRect(p.x - w / 2, p.y - 62 * camera.zoom, w, h);
    ctx.fillStyle = '#9ce682';
    ctx.fillRect(p.x - w / 2 + 1, p.y - 61 * camera.zoom, (w - 2) * 0.9, h - 2);
  }
}

function drawPlayer() {
  drawShadow(ctx, camera, player.x, player.y, 13, 6);
  const moving = !!state.target;
  const spriteKey = moving ? (Math.floor(player.walkPulse * 8) % 2 === 0 ? 'player_walk1' : 'player_walk2') : 'player_idle';
  drawSprite(ctx, camera, spriteKey, player.x, player.y, { scale: 0.95 });
  const p = camera.worldToScreen(player.x, player.y);
  ctx.fillStyle = '#2f2c22';
  ctx.fillRect(p.x - 18 * camera.zoom, p.y - 61 * camera.zoom, 36 * camera.zoom, 7 * camera.zoom);
  ctx.fillStyle = '#9ce682';
  ctx.fillRect(p.x - 17 * camera.zoom, p.y - 60 * camera.zoom, 32 * camera.zoom, 5 * camera.zoom);
}

function getObjectUnderMouse() {
  const mx = state.mouse.x;
  const my = state.mouse.y;
  let best = null;
  let bestDist = Infinity;

  for (const entity of world.entities) {
    const p = camera.worldToScreen(entity.x, entity.y);
    const dx = Math.abs(mx - p.x);
    const dy = Math.abs(my - (p.y - 34 * camera.zoom));
    const hitW = entity.kind === 'object' ? 42 : 28;
    const hitH = entity.kind === 'object' ? 54 : 40;
    if (dx < hitW * camera.zoom && dy < hitH * camera.zoom) {
      const dist = dx + dy;
      if (dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }
  }
  return best;
}

function clampTarget(t) {
  t.x = Math.max(0, Math.min(GRID_W - 1, t.x));
  t.y = Math.max(0, Math.min(GRID_H - 1, t.y));
  return t;
}

function setMovementTarget(wx, wy) {
  state.target = clampTarget({ x: wx, y: wy });
}

function stepTowards() {
  if (!state.target) return;
  const dx = state.target.x - player.x;
  const dy = state.target.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.05) {
    player.x = state.target.x;
    player.y = state.target.y;
    state.target = null;
    return;
  }
  const step = Math.min(player.speed, dist);
  player.x += dx / dist * step;
  player.y += dy / dist * step;
  player.walkPulse += 0.06;
}

function updateCamera() {
  const pan = 9;
  if (state.keys.has('ArrowUp')) camera.offsetY += pan;
  if (state.keys.has('ArrowDown')) camera.offsetY -= pan;
  if (state.keys.has('ArrowLeft')) camera.offsetX += pan;
  if (state.keys.has('ArrowRight')) camera.offsetX -= pan;
}

function updateMouseWorld() {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (state.mouse.clientX - rect.left) * scaleX;
  const cy = (state.mouse.clientY - rect.top) * scaleY;
  state.mouse.x = cx;
  state.mouse.y = cy;
  const worldPos = camera.screenToWorld(cx, cy);
  state.mouse.worldX = worldPos.x;
  state.mouse.worldY = worldPos.y;
  state.mouse.tileX = Math.round(worldPos.x);
  state.mouse.tileY = Math.round(worldPos.y);
}

function updateHover() {
  const hovered = getObjectUnderMouse();
  state.hover = hovered;
  hoverVerb.textContent = hovered ? hovered.verb : 'Walk here';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7f8960';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBackDecor();
  drawTiles();

  const entities = depthSort([...world.entities, { ...player, kind: 'player', sprite: 'player_idle', sortBias: 0.1 }]);
  for (const entity of entities) {
    if (entity.kind === 'player') drawPlayer();
    else drawEntity(entity);
  }

  if (state.hover) {
    const p = camera.worldToScreen(state.hover.x, state.hover.y);
    ctx.fillStyle = 'rgba(27,24,19,0.85)';
    ctx.fillRect(p.x - 50, p.y - 104, 100, 22);
    ctx.fillStyle = '#f3e7b0';
    ctx.font = '18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(state.hover.label, p.x, p.y - 88);
  }
}

function loop() {
  updateCamera();
  stepTowards();
  updateHover();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', (e) => {
  state.mouse.clientX = e.clientX;
  state.mouse.clientY = e.clientY;
  updateMouseWorld();
  if (state.dragging && state.dragStart) {
    camera.offsetX = state.panStart.x + (e.clientX - state.dragStart.x);
    camera.offsetY = state.panStart.y + (e.clientY - state.dragStart.y);
    updateMouseWorld();
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) {
    state.dragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.panStart = { x: camera.offsetX, y: camera.offsetY };
  }
});
window.addEventListener('mouseup', () => {
  state.dragging = false;
  state.dragStart = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const prevZoom = camera.zoom;
  camera.zoom = Math.max(0.72, Math.min(2.1, camera.zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  camera.offsetX = mx - ((mx - camera.offsetX) / prevZoom) * camera.zoom;
  camera.offsetY = my - ((my - camera.offsetY) / prevZoom) * camera.zoom;
  updateMouseWorld();
}, { passive: false });

canvas.addEventListener('click', () => {
  const hovered = getObjectUnderMouse();
  if (hovered) {
    const approach = { x: hovered.x - 1, y: hovered.y + 1 };
    setMovementTarget(approach.x, approach.y);
  } else {
    setMovementTarget(Math.round(state.mouse.worldX), Math.round(state.mouse.worldY));
  }
});

window.addEventListener('keydown', (e) => state.keys.add(e.key));
window.addEventListener('keyup', (e) => state.keys.delete(e.key));

async function boot() {
  await loadSprites(spriteEntries);
  state.mouse.clientX = canvas.getBoundingClientRect().left + 10;
  state.mouse.clientY = canvas.getBoundingClientRect().top + 10;
  updateMouseWorld();
  loop();
}
boot();
