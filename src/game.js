
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const hoverEl = document.getElementById("hover");

const TILE_W = 64;
const TILE_H = 32;
const SPRITE_W = 64;
const SPRITE_H = 64;
const worldWidth = 20;
const worldHeight = 20;
const originX = canvas.width / 2;
const originY = 80;

const sprites = {};
const state = {
  player: { x: 10, y: 10, moving: false },
  targets: [],
  hoverTarget: null,
};

function loadSprite(name, path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      sprites[name] = img;
      resolve();
    };
    img.onerror = () => {
      console.warn("Failed to load sprite:", name, path);
      resolve();
    };
    img.src = path;
  });
}

function loadSprites() {
  const files = [
    ["player", "assets/sprites/player/player_base.png"],
    ["wolf", "assets/sprites/enemies/wolf.png"],
    ["tree", "assets/sprites/objects/tree.png"],
    ["rock", "assets/sprites/objects/rock.png"],
    ["bank", "assets/sprites/objects/bank.png"],
    ["forge", "assets/sprites/objects/forge.png"],
    ["anvil", "assets/sprites/objects/anvil.png"],
    ["tile", "assets/tiles/grass_tile.png"],
  ];
  return Promise.all(files.map(([n,p]) => loadSprite(n,p)));
}

function isoToScreen(x, y) {
  return {
    x: (x - y) * (TILE_W / 2) + originX,
    y: (x + y) * (TILE_H / 2) + originY
  };
}

function screenToIso(sx, sy) {
  const x = ((sx - originX) / (TILE_W / 2) + (sy - originY) / (TILE_H / 2)) / 2;
  const y = ((sy - originY) / (TILE_H / 2) - (sx - originX) / (TILE_W / 2)) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildWorldTargets() {
  state.targets = [
    { id:"tree1", type:"tree", verb:"Chop Tree", x:8, y:9, blocks:true },
    { id:"rock1", type:"rock", verb:"Mine Rock", x:12, y:12, blocks:true },
    { id:"bank1", type:"bank", verb:"Bank Booth", x:6, y:8, blocks:true },
    { id:"forge1", type:"forge", verb:"Use Forge", x:7, y:8, blocks:true },
    { id:"anvil1", type:"anvil", verb:"Use Anvil", x:7, y:9, blocks:true },
    { id:"wolf1", type:"wolf", verb:"Attack Wolf", x:13, y:11, blocks:true, hp:10, maxHp:10 },
  ];
}

function findTargetAt(x, y) {
  return state.targets.find(t => t.x === x && t.y === y) || null;
}

function drawTile(x, y) {
  const screen = isoToScreen(x, y);
  if (sprites.tile) {
    ctx.drawImage(sprites.tile, screen.x - TILE_W/2, screen.y, TILE_W, TILE_H);
  } else {
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(screen.x + TILE_W/2, screen.y + TILE_H/2);
    ctx.lineTo(screen.x, screen.y + TILE_H);
    ctx.lineTo(screen.x - TILE_W/2, screen.y + TILE_H/2);
    ctx.closePath();
    ctx.fillStyle = "#6d8c4c";
    ctx.fill();
    ctx.strokeStyle = "#53693b";
    ctx.stroke();
  }
}

function drawSprite(img, x, y, hover=false, hpBar=null) {
  const screen = isoToScreen(x, y);
  const drawX = screen.x - SPRITE_W/2;
  const drawY = screen.y - 44;
  if (img) {
    ctx.drawImage(img, drawX, drawY, SPRITE_W, SPRITE_H);
  } else {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(drawX, drawY, SPRITE_W, SPRITE_H);
  }
  if (hover) {
    ctx.strokeStyle = "#f7de7a";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX + 3, drawY + 3, SPRITE_W - 6, SPRITE_H - 6);
  }
  if (hpBar) {
    const barW = 34;
    const barX = screen.x - barW/2;
    const barY = drawY - 8;
    ctx.fillStyle = "#2a1a14";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 6);
    ctx.fillStyle = "#5b1616";
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = "#49a54a";
    ctx.fillRect(barX, barY, Math.max(0, Math.floor((hpBar.current/hpBar.max) * barW)), 4);
  }
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < worldHeight; y++) {
    for (let x = 0; x < worldWidth; x++) {
      drawTile(x, y);
    }
  }

  const entities = [
    ...state.targets.map(t => ({
      type: t.type,
      x: t.x,
      y: t.y,
      hpBar: t.maxHp ? { current:t.hp, max:t.maxHp } : null
    })),
    { type:"player", x:state.player.x, y:state.player.y }
  ];

  entities.sort((a,b) => (a.x + a.y) - (b.x + b.y));

  for (const e of entities) {
    const hover = state.hoverTarget && state.hoverTarget.x === e.x && state.hoverTarget.y === e.y && state.hoverTarget.type === e.type;
    drawSprite(sprites[e.type], e.x, e.y, hover, e.hpBar);
  }

  drawGridCursor();
}

function drawGridCursor() {
  if (!state.cursorTile) return;
  const { x, y } = state.cursorTile;
  if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return;
  const s = isoToScreen(x, y);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x + TILE_W/2, s.y + TILE_H/2);
  ctx.lineTo(s.x, s.y + TILE_H);
  ctx.lineTo(s.x - TILE_W/2, s.y + TILE_H/2);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  state.cursorTile = screenToIso(mx, my);

  let best = null;
  let bestDist = 999999;

  for (const t of state.targets) {
    const s = isoToScreen(t.x, t.y);
    const dx = mx - s.x;
    const dy = my - (s.y - 10);
    const dist = dx*dx + dy*dy;
    if (dist < bestDist && dist < 2600) {
      best = t;
      bestDist = dist;
    }
  }

  state.hoverTarget = best;
  hoverEl.textContent = best ? best.verb : "Walk here";
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const iso = screenToIso(mx, my);
  const tx = clamp(iso.x, 0, worldWidth - 1);
  const ty = clamp(iso.y, 0, worldHeight - 1);

  if (state.hoverTarget) {
    // simple move-near interaction target
    const nx = clamp(state.hoverTarget.x - 1, 0, worldWidth - 1);
    const ny = state.hoverTarget.y;
    state.player.x = nx;
    state.player.y = ny;
    hoverEl.textContent = `${state.hoverTarget.verb} (interaction placeholder)`;
  } else {
    state.player.x = tx;
    state.player.y = ty;
    hoverEl.textContent = "Walk here";
  }
});

function drawDebugLegend() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(10, canvas.height - 98, 330, 88);
  ctx.fillStyle = "#f0e4bc";
  ctx.font = "14px Verdana";
  ctx.fillText("v10 renderer focus:", 20, canvas.height - 72);
  ctx.fillText("- Faux 3/4 pseudo-isometric tile camera", 20, canvas.height - 52);
  ctx.fillText("- Depth-sorted sprite rendering", 20, canvas.height - 34);
  ctx.fillText("- Hover verbs and click-to-move placeholder", 20, canvas.height - 16);
}

function gameLoop() {
  drawWorld();
  drawDebugLegend();
  requestAnimationFrame(gameLoop);
}

buildWorldTargets();
loadSprites().then(() => {
  gameLoop();
});
