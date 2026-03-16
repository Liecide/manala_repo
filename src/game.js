const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hoverVerb = document.getElementById('hoverVerb');

const world = { w: 36, h: 36, tileW: 64, tileH: 32 };
const camera = { x: 0, y: 110, zoom: 1.35 };
const minZoom = 0.85;
const maxZoom = 2.1;

const player = { x: 10, y: 16, tx: 10, ty: 16, moveCooldown: 0, speed: 5.5 };
const entities = [
  { kind: 'bank', name: 'Bank Booth', x: 14, y: 10, ox: 0, oy: -14 },
  { kind: 'forge', name: 'Forge', x: 16, y: 10, ox: 0, oy: -8 },
  { kind: 'anvil', name: 'Anvil', x: 15, y: 12, ox: 0, oy: -8 },
  { kind: 'tree', name: 'Tree', x: 18, y: 11, ox: 0, oy: -10 },
  { kind: 'tree', name: 'Tree', x: 21, y: 14, ox: 0, oy: -10 },
  { kind: 'tree', name: 'Tree', x: 12, y: 8, ox: 0, oy: -10 },
  { kind: 'rock', name: 'Ore Rock', x: 22, y: 18, ox: 0, oy: -8 },
  { kind: 'wolf', name: 'Wolf', x: 24, y: 18, ox: 0, oy: -6, hp: 10, maxHp: 10 },
  { kind: 'merchant', name: 'Merchant', x: 13, y: 9, ox: 0, oy: -8 },
  { kind: 'healer', name: 'Healer', x: 17, y: 9, ox: 0, oy: -8 },
];

let last = performance.now();
let dragging = false;
let dragStart = null;
let cameraStart = null;
let hoverTarget = null;

function isoToScreen(x, y) {
  const sx = (x - y) * (world.tileW / 2);
  const sy = (x + y) * (world.tileH / 2);
  return {
    x: sx * camera.zoom + canvas.width / 2 + camera.x,
    y: sy * camera.zoom + camera.y,
  };
}

function screenToIso(sx, sy) {
  const x = (sx - canvas.width / 2 - camera.x) / camera.zoom;
  const y = (sy - camera.y) / camera.zoom;
  const tx = (y / (world.tileH / 2) + x / (world.tileW / 2)) / 2;
  const ty = (y / (world.tileH / 2) - x / (world.tileW / 2)) / 2;
  return { x: Math.floor(tx), y: Math.floor(ty) };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }

function entityVerb(e) {
  switch (e.kind) {
    case 'wolf': return 'Attack Wolf';
    case 'tree': return 'Chop Tree';
    case 'rock': return 'Mine Rock';
    case 'bank': return 'Bank Booth';
    case 'forge': return 'Use Forge';
    case 'anvil': return 'Use Anvil';
    case 'merchant': return 'Talk Merchant';
    case 'healer': return 'Talk Healer';
    default: return e.name;
  }
}

function drawDiamond(x, y, fill, stroke) {
  const p = isoToScreen(x, y);
  const hw = (world.tileW / 2) * camera.zoom;
  const hh = (world.tileH / 2) * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + hw, p.y + hh);
  ctx.lineTo(p.x, p.y + hh * 2);
  ctx.lineTo(p.x - hw, p.y + hh);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, camera.zoom * 0.75);
  ctx.stroke();
}

function drawGround() {
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      const shade = (x + y) % 2 === 0 ? '#879561' : '#82905d';
      drawDiamond(x, y, shade, '#59653f');
    }
  }
}

function drawShadow(x, y, rx=16, ry=8) {
  const p = isoToScreen(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + world.tileH * camera.zoom * 0.75, rx * camera.zoom, ry * camera.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHouse(e) {
  drawShadow(e.x, e.y, 18, 9);
  const p = isoToScreen(e.x, e.y);
  const z = camera.zoom;
  ctx.fillStyle = '#b79d6c';
  ctx.fillRect(p.x - 18*z, p.y - 22*z, 36*z, 34*z);
  ctx.fillStyle = '#7a4c28';
  ctx.beginPath();
  ctx.moveTo(p.x - 22*z, p.y - 22*z);
  ctx.lineTo(p.x, p.y - 42*z);
  ctx.lineTo(p.x + 22*z, p.y - 22*z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#61351d';
  ctx.fillRect(p.x - 6*z, p.y - 2*z, 12*z, 14*z);
}

function drawForge(e) {
  drawShadow(e.x, e.y, 16, 8);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#5f6067';
  ctx.fillRect(p.x - 16*z, p.y - 18*z, 30*z, 22*z);
  ctx.fillStyle = '#30333a';
  ctx.fillRect(p.x - 12*z, p.y - 14*z, 22*z, 16*z);
  ctx.fillStyle = '#f0a52f';
  ctx.fillRect(p.x - 7*z, p.y - 9*z, 11*z, 8*z);
}

function drawAnvil(e) {
  drawShadow(e.x, e.y, 11, 5);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#7a7f8c';
  ctx.fillRect(p.x - 9*z, p.y - 10*z, 18*z, 8*z);
  ctx.fillRect(p.x - 4*z, p.y - 2*z, 8*z, 10*z);
  ctx.beginPath();
  ctx.moveTo(p.x + 9*z, p.y - 10*z);
  ctx.lineTo(p.x + 16*z, p.y - 6*z);
  ctx.lineTo(p.x + 9*z, p.y - 2*z);
  ctx.closePath();
  ctx.fill();
}

function drawTree(e) {
  drawShadow(e.x, e.y, 14, 6);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#7d5a2b';
  ctx.fillRect(p.x - 4*z, p.y - 6*z, 8*z, 28*z);
  ctx.fillStyle = '#58733d';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 18*z, 16*z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(p.x - 16*z, p.y - 22*z, 32*z, 12*z);
}

function drawRock(e) {
  drawShadow(e.x, e.y, 14, 7);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#787b8a';
  ctx.beginPath();
  ctx.moveTo(p.x - 12*z, p.y + 4*z);
  ctx.lineTo(p.x - 16*z, p.y - 8*z);
  ctx.lineTo(p.x - 4*z, p.y - 20*z);
  ctx.lineTo(p.x + 12*z, p.y - 12*z);
  ctx.lineTo(p.x + 16*z, p.y + 2*z);
  ctx.lineTo(p.x + 6*z, p.y + 14*z);
  ctx.closePath();
  ctx.fill();
}

function drawHumanoid(e, colors) {
  drawShadow(e.x, e.y, 11, 5);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#e1c39b';
  ctx.beginPath(); ctx.arc(p.x, p.y - 26*z, 5*z, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = colors.tunic;
  ctx.fillRect(p.x - 7*z, p.y - 20*z, 14*z, 20*z);
  ctx.fillStyle = colors.legs;
  ctx.fillRect(p.x - 6*z, p.y, 5*z, 18*z);
  ctx.fillRect(p.x + 1*z, p.y, 5*z, 18*z);
  ctx.fillStyle = '#2b2114';
  ctx.fillRect(p.x - 7*z, p.y + 18*z, 6*z, 3*z);
  ctx.fillRect(p.x + 1*z, p.y + 18*z, 6*z, 3*z);
}

function drawPlayer() {
  drawShadow(player.x, player.y, 11, 5);
  const p = isoToScreen(player.x, player.y), z = camera.zoom;
  ctx.fillStyle = '#e4c8a1';
  ctx.beginPath(); ctx.arc(p.x, p.y - 26*z, 5*z, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#6e6596';
  ctx.fillRect(p.x - 7*z, p.y - 20*z, 14*z, 20*z);
  ctx.fillStyle = '#d8d8dd';
  ctx.fillRect(p.x + 7*z, p.y - 18*z, 8*z, 16*z);
  ctx.fillStyle = '#908f9e';
  ctx.fillRect(p.x + 13*z, p.y - 15*z, 2*z, 10*z);
  ctx.fillStyle = '#7d5a2f';
  ctx.fillRect(p.x - 13*z, p.y - 18*z, 4*z, 17*z);
  ctx.fillRect(p.x - 9*z, p.y - 18*z, 8*z, 3*z);
  ctx.fillStyle = '#5d597f';
  ctx.fillRect(p.x - 6*z, p.y, 5*z, 18*z);
  ctx.fillRect(p.x + 1*z, p.y, 5*z, 18*z);
  ctx.fillStyle = '#222';
  ctx.fillRect(p.x - 7*z, p.y + 18*z, 6*z, 3*z);
  ctx.fillRect(p.x + 1*z, p.y + 18*z, 6*z, 3*z);
}

function drawWolf(e) {
  drawShadow(e.x, e.y, 12, 5);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#838793';
  ctx.fillRect(p.x - 12*z, p.y - 10*z, 22*z, 12*z);
  ctx.beginPath();
  ctx.moveTo(p.x + 10*z, p.y - 10*z);
  ctx.lineTo(p.x + 20*z, p.y - 6*z);
  ctx.lineTo(p.x + 10*z, p.y);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(p.x - 10*z, p.y + 2*z, 3*z, 10*z);
  ctx.fillRect(p.x - 2*z, p.y + 2*z, 3*z, 10*z);
  ctx.fillRect(p.x + 5*z, p.y + 2*z, 3*z, 10*z);
  ctx.fillRect(p.x + 12*z, p.y + 2*z, 3*z, 10*z);
  ctx.beginPath(); ctx.moveTo(p.x + 12*z, p.y - 10*z); ctx.lineTo(p.x + 15*z, p.y - 16*z); ctx.lineTo(p.x + 17*z, p.y - 10*z); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x + 7*z, p.y - 10*z); ctx.lineTo(p.x + 10*z, p.y - 16*z); ctx.lineTo(p.x + 12*z, p.y - 10*z); ctx.closePath(); ctx.fill();
  const bw = 22*z;
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(p.x - 11*z, p.y - 24*z, bw, 4*z);
  ctx.fillStyle = '#7cd26b'; ctx.fillRect(p.x - 11*z, p.y - 24*z, bw*(e.hp/e.maxHp), 4*z);
}

function renderEntity(e) {
  switch (e.kind) {
    case 'bank': drawHouse(e); break;
    case 'forge': drawForge(e); break;
    case 'anvil': drawAnvil(e); break;
    case 'tree': drawTree(e); break;
    case 'rock': drawRock(e); break;
    case 'merchant': drawHumanoid(e, { tunic: '#6f89b8', legs: '#d7d9e4' }); break;
    case 'healer': drawHumanoid(e, { tunic: '#8d8a5f', legs: '#d7d9e4' }); break;
    case 'wolf': drawWolf(e); break;
  }
}

function update(dt) {
  const stepInterval = 1 / player.speed;
  player.moveCooldown -= dt;
  if ((player.x !== player.tx || player.y !== player.ty) && player.moveCooldown <= 0) {
    if (player.x < player.tx) player.x++;
    else if (player.x > player.tx) player.x--;
    else if (player.y < player.ty) player.y++;
    else if (player.y > player.ty) player.y--;
    player.moveCooldown = stepInterval;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  const drawables = [...entities.map(e => ({ y: e.x + e.y, kind: 'entity', ref: e })), { y: player.x + player.y, kind: 'player' }];
  drawables.sort((a,b)=>a.y-b.y);
  for (const d of drawables) {
    if (d.kind === 'player') drawPlayer();
    else renderEntity(d.ref);
  }

  if (hoverTarget) {
    const p = isoToScreen(hoverTarget.x, hoverTarget.y);
    ctx.strokeStyle = '#e8d48b';
    ctx.lineWidth = 2;
    const hw = (world.tileW / 2) * camera.zoom;
    const hh = (world.tileH / 2) * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + hw, p.y + hh);
    ctx.lineTo(p.x, p.y + hh * 2);
    ctx.lineTo(p.x - hw, p.y + hh);
    ctx.closePath();
    ctx.stroke();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function pickEntity(mx, my) {
  let best = null;
  let bestDist = Infinity;
  for (const e of entities) {
    const p = isoToScreen(e.x, e.y);
    const d = dist(mx, my, p.x, p.y - 8 * camera.zoom);
    if (d < 28 * camera.zoom && d < bestDist) {
      best = e; bestDist = d;
    }
  }
  return best;
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (e.button === 2) {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    cameraStart = { x: camera.x, y: camera.y };
  }
});
window.addEventListener('mouseup', () => dragging = false);
window.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (dragging) {
    camera.x = cameraStart.x + (e.clientX - dragStart.x);
    camera.y = cameraStart.y + (e.clientY - dragStart.y);
    return;
  }
  const picked = pickEntity(mx, my);
  hoverTarget = picked;
  hoverVerb.textContent = picked ? entityVerb(picked) : 'Walk here';
});
canvas.addEventListener('click', e => {
  if (dragging) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const picked = pickEntity(mx, my);
  if (picked) {
    hoverVerb.textContent = entityVerb(picked);
    const adj = [
      {x: picked.x-1, y: picked.y}, {x: picked.x+1, y: picked.y},
      {x: picked.x, y: picked.y-1}, {x: picked.x, y: picked.y+1},
    ].find(t => t.x >=0 && t.y >=0 && t.x < world.w && t.y < world.h) || {x: picked.x, y: picked.y};
    player.tx = adj.x; player.ty = adj.y;
  } else {
    const tile = screenToIso(mx, my);
    player.tx = clamp(tile.x, 0, world.w - 1);
    player.ty = clamp(tile.y, 0, world.h - 1);
    hoverVerb.textContent = 'Walk here';
  }
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const dir = Math.sign(e.deltaY);
  camera.zoom = clamp(camera.zoom + dir * -0.08, minZoom, maxZoom);
}, { passive: false });
window.addEventListener('keydown', e => {
  const pan = 24;
  if (e.key === 'ArrowLeft') camera.x += pan;
  if (e.key === 'ArrowRight') camera.x -= pan;
  if (e.key === 'ArrowUp') camera.y += pan;
  if (e.key === 'ArrowDown') camera.y -= pan;
});

requestAnimationFrame(frame);
