const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hoverVerb = document.getElementById('hoverVerb');
const statsPanel = document.getElementById('statsPanel');
const inventoryPanel = document.getElementById('inventoryPanel');
const skillsPanel = document.getElementById('skillsPanel');
const messageLog = document.getElementById('messageLog');
const creator = document.getElementById('characterCreator');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const deleteSaveBtn = document.getElementById('deleteSaveBtn');
const nameInput = document.getElementById('nameInput');
const skinToneSelect = document.getElementById('skinToneSelect');
const hairStyleSelect = document.getElementById('hairStyleSelect');
const hairColorSelect = document.getElementById('hairColorSelect');
const shirtColorSelect = document.getElementById('shirtColorSelect');
const pantsColorSelect = document.getElementById('pantsColorSelect');
const creatorPreview = document.getElementById('creatorPreview');
const pctx = creatorPreview.getContext('2d');
const dialogue = document.getElementById('dialogue');
const dialogueTitle = document.getElementById('dialogueTitle');
const dialogueText = document.getElementById('dialogueText');
const dialogueChoices = document.getElementById('dialogueChoices');
const dialogueClose = document.getElementById('dialogueClose');

const SAVE_KEY = 'manala_v12_save';
const world = { w: 34, h: 34, tileW: 64, tileH: 32 };
const camera = { x: 0, y: 120, zoom: 1.65 };
const minZoom = 1.05;
const maxZoom = 2.25;
const cameraSpeed = 420;
const keys = {};
let last = performance.now();
let dragging = false;
let dragStart = null;
let cameraStart = null;
let hoverTarget = null;
let gameStarted = false;

const itemDefs = {
  bronzeSword: { name: 'Bronze Sword', symbol: '🗡', slot: 'weapon', attack: 4, value: 12 },
  ironSword: { name: 'Iron Sword', symbol: '⚔', slot: 'weapon', attack: 7, value: 26 },
  bronzeShield: { name: 'Bronze Shield', symbol: '🛡', slot: 'shield', defense: 3, value: 12 },
  bronzeArmor: { name: 'Bronze Armor', symbol: '🥋', slot: 'armor', defense: 4, value: 20 },
  logs: { name: 'Logs', symbol: '🪵', stack: true },
  rawFish: { name: 'Raw Fish', symbol: '🐟', stack: true },
  cookedFish: { name: 'Cooked Fish', symbol: '🍖', stack: true, heal: 14 },
  oldBoot: { name: 'Old Boot', symbol: '👢', stack: true },
  copperOre: { name: 'Copper Ore', symbol: '🪨', stack: true },
  tinOre: { name: 'Tin Ore', symbol: '🪨', stack: true },
  ironOre: { name: 'Iron Ore', symbol: '⛓', stack: true },
  bronzeBar: { name: 'Bronze Bar', symbol: '▬', stack: true },
  ironBar: { name: 'Iron Bar', symbol: '▮', stack: true },
  coin: { name: 'Coins', symbol: '¤', stack: true },
};

const worldState = {
  player: null,
  objects: [],
  enemies: [],
  drops: [],
  messages: [],
  task: null,
  pendingTarget: null,
  bossDead: false,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function levelFromXp(xp) { return Math.max(1, Math.floor(Math.sqrt(xp / 12)) + 1); }
function skillLevel(entity, skill) { return levelFromXp((entity?.skills?.[skill]) || 0); }
function hasItems(inv, needs) { return Object.entries(needs).every(([id, qty]) => countItem(inv, id) >= qty); }
function countItem(inv, id) { return inv.filter(i => i.id === id).reduce((a, b) => a + b.qty, 0); }
function addItem(inv, id, qty = 1) {
  const def = itemDefs[id];
  if (def.stack) {
    const found = inv.find(i => i.id === id);
    if (found) found.qty += qty;
    else inv.push({ id, qty });
  } else {
    for (let i = 0; i < qty; i++) inv.push({ id, qty: 1 });
  }
}
function removeItem(inv, id, qty = 1) {
  for (let i = inv.length - 1; i >= 0 && qty > 0; i--) {
    if (inv[i].id !== id) continue;
    const use = Math.min(qty, inv[i].qty);
    inv[i].qty -= use;
    qty -= use;
    if (inv[i].qty <= 0) inv.splice(i, 1);
  }
  return qty <= 0;
}
function gainSkill(skill, amount) {
  const p = worldState.player;
  const oldLv = skillLevel(p, skill);
  p.skills[skill] += amount;
  const newLv = skillLevel(p, skill);
  if (newLv > oldLv) log(`${capitalize(skill)} reaches level ${newLv}.`, 'good');
}
function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }
function totalAttack(entity) {
  const base = 3 + skillLevel(entity, 'combat');
  const eq = entity.equipment?.weapon ? itemDefs[entity.equipment.weapon]?.attack || 0 : 0;
  return base + eq + (entity.attack || 0);
}
function totalDefense(entity) {
  const base = 1 + Math.floor(skillLevel(entity, 'combat') * 0.5);
  const shield = entity.equipment?.shield ? itemDefs[entity.equipment.shield]?.defense || 0 : 0;
  const armor = entity.equipment?.armor ? itemDefs[entity.equipment.armor]?.defense || 0 : 0;
  return base + shield + armor + (entity.defense || 0);
}
function log(text, cls = '') {
  const div = document.createElement('div');
  div.className = `entry ${cls}`.trim();
  div.textContent = text;
  messageLog.prepend(div);
  while (messageLog.children.length > 80) messageLog.removeChild(messageLog.lastChild);
}

function getAppearanceFromForm() {
  return {
    name: nameInput.value.trim() || 'Wanderer',
    skinTone: skinToneSelect.value,
    hairStyle: hairStyleSelect.value,
    hairColor: hairColorSelect.value,
    shirtColor: shirtColorSelect.value,
    pantsColor: pantsColorSelect.value,
  };
}

function makePlayer(appearance) {
  return {
    name: appearance.name,
    x: 5, y: 7, tx: 5, ty: 7,
    moveCooldown: 0, speed: 6.2,
    hp: 40, maxHp: 40,
    facing: 1,
    appearance,
    inventory: [{ id: 'bronzeSword', qty: 1 }, { id: 'cookedFish', qty: 3 }, { id: 'coin', qty: 20 }],
    bank: [],
    equipment: { weapon: null, shield: null, armor: null },
    skills: { combat: 0, woodcutting: 0, fishing: 0, mining: 0, smithing: 0 },
    immunity: 0,
    combat: null,
  };
}

function buildWorld() {
  worldState.objects = [
    { kind: 'house', name: 'Village House', x: 7, y: 6 },
    { kind: 'merchant', name: 'Merchant', x: 8, y: 8 },
    { kind: 'healer', name: 'Healer', x: 9, y: 7 },
    { kind: 'bank', name: 'Bank Booth', x: 6, y: 9 },
    { kind: 'forge', name: 'Forge', x: 10, y: 8 },
    { kind: 'anvil', name: 'Anvil', x: 11, y: 9 },
    { kind: 'tree', name: 'Tree', x: 14, y: 9, resource: 'logs' },
    { kind: 'tree', name: 'Tree', x: 16, y: 10, resource: 'logs' },
    { kind: 'tree', name: 'Tree', x: 18, y: 12, resource: 'logs' },
    { kind: 'fish', name: 'Fishing Spot', x: 20, y: 14 },
    { kind: 'fish', name: 'Fishing Spot', x: 22, y: 15 },
    { kind: 'rockCopper', name: 'Copper Rock', x: 24, y: 18 },
    { kind: 'rockTin', name: 'Tin Rock', x: 25, y: 19 },
    { kind: 'rockIron', name: 'Iron Rock', x: 27, y: 21 },
    { kind: 'bossGate', name: 'Ruined Gate', x: 29, y: 24 },
  ];
  worldState.enemies = [
    { kind: 'wolf', name: 'Wolf', x: 15, y: 12, hp: 18, maxHp: 18, attack: 4, defense: 1, combatXp: 0, loot: [{ id: 'coin', qty: 5, chance: 1 }, { id: 'rawFish', qty: 1, chance: 0.25 }] },
    { kind: 'bandit', name: 'Bandit', x: 21, y: 16, hp: 26, maxHp: 26, attack: 5, defense: 2, equipment: { weapon: 'bronzeSword' }, combatXp: 12, loot: [{ id: 'coin', qty: 10, chance: 1 }, { id: 'bronzeSword', qty: 1, chance: 0.18 }] },
    { kind: 'skeleton', name: 'Skeleton', x: 26, y: 20, hp: 34, maxHp: 34, attack: 7, defense: 3, combatXp: 24, loot: [{ id: 'ironOre', qty: 1, chance: 0.55 }, { id: 'coin', qty: 16, chance: 1 }] },
    { kind: 'warden', name: 'Warden of Manala', x: 30, y: 25, hp: 80, maxHp: 80, attack: 11, defense: 6, combatXp: 48, equipment: { weapon: 'ironSword', shield: 'bronzeShield', armor: 'bronzeArmor' }, loot: [{ id: 'coin', qty: 120, chance: 1 }] },
  ].map(e => ({ alive: true, respawn: 0, immunity: 0, ...e }));
  worldState.drops = [];
  worldState.bossDead = false;
}

function isoToScreen(x, y) {
  const sx = (x - y) * (world.tileW / 2);
  const sy = (x + y) * (world.tileH / 2);
  return { x: sx * camera.zoom + canvas.width / 2 + camera.x, y: sy * camera.zoom + camera.y };
}
function screenToIso(sx, sy) {
  const x = (sx - canvas.width / 2 - camera.x) / camera.zoom;
  const y = (sy - camera.y) / camera.zoom;
  const tx = (y / (world.tileH / 2) + x / (world.tileW / 2)) / 2;
  const ty = (y / (world.tileH / 2) - x / (world.tileW / 2)) / 2;
  return { x: Math.floor(tx), y: Math.floor(ty) };
}
function entityVerb(e) {
  switch (e.kind) {
    case 'wolf': return 'Attack Wolf';
    case 'bandit': return 'Attack Bandit';
    case 'skeleton': return 'Attack Skeleton';
    case 'warden': return 'Attack Warden';
    case 'tree': return 'Chop Tree';
    case 'fish': return 'Fish Spot';
    case 'rockCopper': case 'rockTin': case 'rockIron': return 'Mine Rock';
    case 'bank': return 'Bank Booth';
    case 'forge': return 'Use Forge';
    case 'anvil': return 'Use Anvil';
    case 'merchant': return 'Talk Merchant';
    case 'healer': return 'Talk Healer';
    case 'bossGate': return 'Inspect Gate';
    default: return e.name || 'Walk here';
  }
}
function distanceTiles(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function dialogueOpen() { return !dialogue.classList.contains('hidden'); }
function combatLocked() {
  const p = worldState.player;
  return !!(p && (p.combat || p.immunity > 0));
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
      let shade = (x + y) % 2 === 0 ? '#879561' : '#82905d';
      if (x > 19 && y > 15) shade = (x + y) % 2 === 0 ? '#8e846d' : '#877b66';
      if (x < 12 && y < 12) shade = (x + y) % 2 === 0 ? '#95a16b' : '#8d9964';
      drawDiamond(x, y, shade, '#59653f');
    }
  }
}
function drawShadow(x, y, rx = 16, ry = 8) {
  const p = isoToScreen(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + world.tileH * camera.zoom * 0.75, rx * camera.zoom, ry * camera.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawHumanoid(e, colors) {
  drawShadow(e.x, e.y, 11, 5);
  const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#00000022'; ctx.fillRect(p.x - 2*z, p.y - 10*z, 4*z, 8*z);
  ctx.fillStyle = colors.skin;
  ctx.beginPath(); ctx.arc(p.x, p.y - 26*z, 5*z, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors.hair;
  if (colors.hairStyle !== 'bald') {
    if (colors.hairStyle === 'crest') ctx.fillRect(p.x - 2*z, p.y - 36*z, 4*z, 7*z);
    else if (colors.hairStyle === 'long') ctx.fillRect(p.x - 5*z, p.y - 31*z, 10*z, 7*z);
    else ctx.fillRect(p.x - 5*z, p.y - 31*z, 10*z, 4*z);
  }
  ctx.fillStyle = colors.tunic;
  ctx.fillRect(p.x - 7*z, p.y - 20*z, 14*z, 20*z);
  if (colors.weapon) {
    ctx.fillStyle = '#7d5a2f'; ctx.fillRect(p.x - 13*z, p.y - 18*z, 4*z, 17*z); ctx.fillRect(p.x - 9*z, p.y - 18*z, 8*z, 3*z);
  }
  if (colors.shield) {
    ctx.fillStyle = '#9ba1ad'; ctx.fillRect(p.x + 7*z, p.y - 18*z, 8*z, 16*z); ctx.fillStyle = '#6b7079'; ctx.fillRect(p.x + 12*z, p.y - 12*z, 2*z, 4*z);
  }
  ctx.fillStyle = colors.legs;
  ctx.fillRect(p.x - 6*z, p.y, 5*z, 18*z);
  ctx.fillRect(p.x + 1*z, p.y, 5*z, 18*z);
  ctx.fillStyle = '#222';
  ctx.fillRect(p.x - 7*z, p.y + 18*z, 6*z, 3*z); ctx.fillRect(p.x + 1*z, p.y + 18*z, 6*z, 3*z);
}
function drawHouse(e) {
  drawShadow(e.x, e.y, 18, 9); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#b79d6c'; ctx.fillRect(p.x - 18*z, p.y - 22*z, 36*z, 34*z);
  ctx.fillStyle = '#7a4c28'; ctx.beginPath(); ctx.moveTo(p.x - 22*z, p.y - 22*z); ctx.lineTo(p.x, p.y - 42*z); ctx.lineTo(p.x + 22*z, p.y - 22*z); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#61351d'; ctx.fillRect(p.x - 6*z, p.y - 2*z, 12*z, 14*z);
}
function drawForge(e) {
  drawShadow(e.x, e.y, 16, 8); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#5f6067'; ctx.fillRect(p.x - 16*z, p.y - 18*z, 30*z, 22*z);
  ctx.fillStyle = '#30333a'; ctx.fillRect(p.x - 12*z, p.y - 14*z, 22*z, 16*z);
  ctx.fillStyle = '#f0a52f'; ctx.fillRect(p.x - 7*z, p.y - 9*z, 11*z, 8*z);
}
function drawAnvil(e) {
  drawShadow(e.x, e.y, 11, 5); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#7a7f8c'; ctx.fillRect(p.x - 9*z, p.y - 10*z, 18*z, 8*z); ctx.fillRect(p.x - 4*z, p.y - 2*z, 8*z, 10*z);
  ctx.beginPath(); ctx.moveTo(p.x + 9*z, p.y - 10*z); ctx.lineTo(p.x + 16*z, p.y - 6*z); ctx.lineTo(p.x + 9*z, p.y - 2*z); ctx.closePath(); ctx.fill();
}
function drawTree(e) {
  drawShadow(e.x, e.y, 14, 6); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#7d5a2b'; ctx.fillRect(p.x - 4*z, p.y - 6*z, 8*z, 28*z);
  ctx.fillStyle = '#58733d'; ctx.beginPath(); ctx.arc(p.x, p.y - 18*z, 16*z, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(p.x - 16*z, p.y - 22*z, 32*z, 12*z);
}
function drawFish(e) {
  drawShadow(e.x, e.y, 16, 5); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#4c8fbe'; ctx.fillRect(p.x - 20*z, p.y - 3*z, 40*z, 8*z); ctx.fillStyle = '#b9e4ff'; ctx.fillRect(p.x - 6*z, p.y - 8*z, 12*z, 4*z);
}
function drawRock(e, color) {
  drawShadow(e.x, e.y, 14, 7); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(p.x - 12*z, p.y + 4*z); ctx.lineTo(p.x - 16*z, p.y - 8*z); ctx.lineTo(p.x - 4*z, p.y - 20*z); ctx.lineTo(p.x + 12*z, p.y - 12*z); ctx.lineTo(p.x + 16*z, p.y + 2*z); ctx.lineTo(p.x + 6*z, p.y + 14*z); ctx.closePath(); ctx.fill();
}
function drawWolf(e) {
  drawShadow(e.x, e.y, 12, 5); const p = isoToScreen(e.x, e.y), z = camera.zoom;
  ctx.fillStyle = '#838793'; ctx.fillRect(p.x - 12*z, p.y - 10*z, 22*z, 12*z); ctx.beginPath(); ctx.moveTo(p.x + 10*z, p.y - 10*z); ctx.lineTo(p.x + 20*z, p.y - 6*z); ctx.lineTo(p.x + 10*z, p.y); ctx.closePath(); ctx.fill();
  ctx.fillRect(p.x - 10*z, p.y + 2*z, 3*z, 10*z); ctx.fillRect(p.x - 2*z, p.y + 2*z, 3*z, 10*z); ctx.fillRect(p.x + 5*z, p.y + 2*z, 3*z, 10*z); ctx.fillRect(p.x + 12*z, p.y + 2*z, 3*z, 10*z);
  const bw = 22*z; ctx.fillStyle = '#2a2a2a'; ctx.fillRect(p.x - 11*z, p.y - 24*z, bw, 4*z); ctx.fillStyle = '#7cd26b'; ctx.fillRect(p.x - 11*z, p.y - 24*z, bw * (e.hp / e.maxHp), 4*z);
}
function drawEnemy(e) {
  if (e.kind === 'wolf') drawWolf(e);
  else drawHumanoid(e, { skin: '#e1c39b', hair: '#2b1c13', hairStyle: 'short', tunic: e.kind === 'bandit' ? '#7a4a3d' : e.kind === 'skeleton' ? '#c2c0bb' : '#8b6688', legs: '#5a5862', weapon: true, shield: e.kind !== 'bandit' });
  const p = isoToScreen(e.x, e.y), z = camera.zoom; const bw = 26 * z;
  ctx.fillStyle = '#1f1f1f'; ctx.fillRect(p.x - 13*z, p.y - 34*z, bw, 4*z); ctx.fillStyle = '#89df78'; ctx.fillRect(p.x - 13*z, p.y - 34*z, bw * (e.hp / e.maxHp), 4*z);
}
function drawDrop(drop) {
  drawShadow(drop.x, drop.y, 9, 4);
  const p = isoToScreen(drop.x, drop.y), z = camera.zoom;
  ctx.fillStyle = '#ead8aa'; ctx.fillRect(p.x - 10*z, p.y - 8*z, 20*z, 16*z); ctx.fillStyle = '#3a2d12'; ctx.font = `${12*z}px Verdana`; ctx.textAlign = 'center'; ctx.fillText(itemDefs[drop.id].symbol || '?', p.x, p.y + 4*z);
}
function drawEntity(e) {
  switch (e.kind) {
    case 'house': drawHouse(e); break;
    case 'merchant': drawHumanoid(e, { skin: '#e1c39b', hair: '#704728', hairStyle: 'short', tunic: '#c49d4b', legs: '#5d432f' }); break;
    case 'healer': drawHumanoid(e, { skin: '#e1c39b', hair: '#d9d9e2', hairStyle: 'long', tunic: '#7fa271', legs: '#d7d9e4' }); break;
    case 'bank': drawHouse(e); break;
    case 'forge': drawForge(e); break;
    case 'anvil': drawAnvil(e); break;
    case 'tree': drawTree(e); break;
    case 'fish': drawFish(e); break;
    case 'rockCopper': drawRock(e, '#b37d57'); break;
    case 'rockTin': drawRock(e, '#b9c1d0'); break;
    case 'rockIron': drawRock(e, '#8c97a2'); break;
    case 'bossGate': drawHouse({ ...e, x: e.x, y: e.y }); break;
  }
}
function drawPlayer() {
  const p = worldState.player;
  drawHumanoid({ x: p.x, y: p.y }, { skin: p.appearance.skinTone, hair: p.appearance.hairColor, hairStyle: p.appearance.hairStyle, tunic: p.appearance.shirtColor, legs: p.appearance.pantsColor, weapon: !!p.equipment.weapon, shield: !!p.equipment.shield });
  const sp = isoToScreen(p.x, p.y), z = camera.zoom; const bw = 28 * z;
  ctx.fillStyle = '#1f1f1f'; ctx.fillRect(sp.x - 14*z, sp.y - 38*z, bw, 5*z); ctx.fillStyle = '#88d778'; ctx.fillRect(sp.x - 14*z, sp.y - 38*z, bw * (p.hp / p.maxHp), 5*z);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  const all = [
    ...worldState.objects.map(e => ({ depth: e.x + e.y, type: 'obj', ref: e })),
    ...worldState.drops.map(d => ({ depth: d.x + d.y + 0.1, type: 'drop', ref: d })),
    ...worldState.enemies.filter(e => e.alive).map(e => ({ depth: e.x + e.y + 0.2, type: 'enemy', ref: e })),
    { depth: worldState.player.x + worldState.player.y + 0.15, type: 'player', ref: worldState.player },
  ];
  all.sort((a, b) => a.depth - b.depth);
  for (const e of all) {
    if (e.type === 'obj') drawEntity(e.ref);
    else if (e.type === 'drop') drawDrop(e.ref);
    else if (e.type === 'enemy') drawEnemy(e.ref);
    else drawPlayer();
  }
  if (worldState.task) {
    ctx.fillStyle = 'rgba(34,30,20,.65)'; ctx.fillRect(16, canvas.height - 62, 360, 40); ctx.fillStyle = '#f1e7bf'; ctx.font = '16px Verdana';
    const secs = Math.max(0, worldState.task.timeLeft).toFixed(1);
    ctx.fillText(`${worldState.task.label}... ${secs}s`, 26, canvas.height - 36);
  }
}

function drawCreatorPreview() {
  const a = getAppearanceFromForm();
  pctx.clearRect(0, 0, creatorPreview.width, creatorPreview.height);
  pctx.fillStyle = '#9eb7cb'; pctx.fillRect(0, 0, 220, 170);
  pctx.fillStyle = '#93a176'; pctx.fillRect(0, 170, 220, 50);
  const fake = { x: 110, y: 150 };
  const z = 2.2;
  pctx.fillStyle = a.skinTone; pctx.beginPath(); pctx.arc(fake.x, fake.y - 54, 10, 0, Math.PI * 2); pctx.fill();
  pctx.fillStyle = a.hairColor; if (a.hairStyle !== 'bald') { if (a.hairStyle === 'crest') pctx.fillRect(fake.x - 4, fake.y - 74, 8, 14); else if (a.hairStyle === 'long') pctx.fillRect(fake.x - 10, fake.y - 64, 20, 12); else pctx.fillRect(fake.x - 10, fake.y - 64, 20, 6); }
  pctx.fillStyle = a.shirtColor; pctx.fillRect(fake.x - 14, fake.y - 40, 28, 42);
  pctx.fillStyle = a.pantsColor; pctx.fillRect(fake.x - 12, fake.y + 2, 10, 36); pctx.fillRect(fake.x + 2, fake.y + 2, 10, 36);
  pctx.fillStyle = '#222'; pctx.fillRect(fake.x - 12, fake.y + 38, 10, 6); pctx.fillRect(fake.x + 2, fake.y + 38, 10, 6);
}

function openDialogue(title, text, choices = []) {
  dialogueTitle.textContent = title;
  dialogueText.innerHTML = text;
  dialogueChoices.innerHTML = '';
  for (const choice of choices) {
    const btn = document.createElement('button');
    btn.className = 'smallButton';
    btn.textContent = choice.label;
    btn.onclick = choice.onClick;
    dialogueChoices.appendChild(btn);
  }
  dialogue.classList.remove('hidden');
}
function closeDialogue() { dialogue.classList.add('hidden'); }
dialogueClose.onclick = closeDialogue;

function inlineDialogueMessage(text, good = false) {
  dialogueText.innerHTML = `<div class="${good ? 'good' : 'bad'}">${text}</div>`;
}

function openBankDialogue() {
  const p = worldState.player;
  const rows = p.bank.length ? p.bank.map(it => {
    const def = itemDefs[it.id];
    return `<div class="bankSlot"><div><div class="itemIcon" data-symbol="${def.symbol || '?'}"></div><div><b>${def.name}</b></div><div class="mini">Qty ${it.qty}</div></div><button class="smallButton" onclick="window.manalaWithdraw('${it.id}')">Withdraw 1</button></div>`;
  }).join('') : '<p>Your bank is empty.</p>';
  openDialogue('Bank Booth', `<p>Banked items are safe when you die.</p><div class="bankGrid">${rows}</div>`, [
    { label: 'Deposit inventory', onClick: () => { depositInventory(); openBankDialogue(); } },
    { label: 'Withdraw all coins', onClick: () => { withdrawAll('coin'); openBankDialogue(); } },
    { label: 'Close', onClick: closeDialogue },
  ]);
}
function depositInventory() {
  const p = worldState.player;
  const movable = p.inventory.filter(it => it.id !== 'cookedFish');
  for (const it of movable) { addItem(p.bank, it.id, it.qty); removeItem(p.inventory, it.id, it.qty); }
  log('You deposit your inventory, except for emergency fish because we respect survival.', 'good');
}
function withdrawAll(id) {
  const qty = countItem(worldState.player.bank, id); if (!qty) return;
  removeItem(worldState.player.bank, id, qty); addItem(worldState.player.inventory, id, qty); log(`You withdraw ${itemDefs[id].name} x${qty}.`, 'good');
}
function withdrawOne(id) { if (!countItem(worldState.player.bank, id)) return; removeItem(worldState.player.bank, id, 1); addItem(worldState.player.inventory, id, 1); openBankDialogue(); }
window.manalaWithdraw = withdrawOne;

function consumeRecipe(needs, gives, skill, xp) {
  const p = worldState.player;
  if (!hasItems(p.inventory, needs)) return false;
  for (const [id, qty] of Object.entries(needs)) removeItem(p.inventory, id, qty);
  for (const [id, qty] of Object.entries(gives)) addItem(p.inventory, id, qty);
  gainSkill(skill, xp);
  return true;
}
function startBatchTask(label, times, cb, doneText) {
  if (times <= 0) { inlineDialogueMessage('Nothing to process.'); return; }
  worldState.task = {
    type: 'batch', label, timeLeft: 1, count: times,
    onTick: () => {
      const ok = cb();
      if (!ok) { worldState.task = null; inlineDialogueMessage('You ran out of materials.'); return; }
      if (--worldState.task.count <= 0) { worldState.task = null; inlineDialogueMessage(doneText, true); }
      else worldState.task.timeLeft = 1;
      syncUi();
    }
  };
  inlineDialogueMessage(`${label} started.`, true);
}
function openForgeDialogue() {
  openDialogue('Forge', '<p>Choose what to cook or smelt.</p>', [
    { label: 'Cook 1 fish', onClick: () => { const ok = consumeRecipe({ rawFish: 1 }, { cookedFish: 1 }, 'fishing', 4); inlineDialogueMessage(ok ? 'Cooked a fish.' : 'Missing raw fish.', ok); syncUi(); } },
    { label: 'Cook all fish', onClick: () => startBatchTask('Cooking fish', countItem(worldState.player.inventory, 'rawFish'), () => consumeRecipe({ rawFish: 1 }, { cookedFish: 1 }, 'fishing', 4), 'Finished cooking all fish.') },
    { label: 'Smelt bronze bar', onClick: () => { const ok = consumeRecipe({ copperOre: 1, tinOre: 1 }, { bronzeBar: 1 }, 'smithing', 8); inlineDialogueMessage(ok ? 'Smelted a bronze bar.' : 'Need 1 copper ore and 1 tin ore.', ok); syncUi(); } },
    { label: 'Smelt all bronze', onClick: () => startBatchTask('Smelting bronze', Math.min(countItem(worldState.player.inventory, 'copperOre'), countItem(worldState.player.inventory, 'tinOre')), () => consumeRecipe({ copperOre: 1, tinOre: 1 }, { bronzeBar: 1 }, 'smithing', 8), 'Finished smelting bronze.') },
    { label: 'Smelt all iron', onClick: () => startBatchTask('Smelting iron', countItem(worldState.player.inventory, 'ironOre'), () => consumeRecipe({ ironOre: 1 }, { ironBar: 1 }, 'smithing', 12), 'Finished smelting iron.') },
    { label: 'Close', onClick: closeDialogue },
  ]);
}
function openAnvilDialogue() {
  openDialogue('Anvil', '<p>Choose what to smith.</p>', [
    { label: 'Smith bronze sword [2 bars]', onClick: () => { const ok = consumeRecipe({ bronzeBar: 2 }, { bronzeSword: 1 }, 'smithing', 12); inlineDialogueMessage(ok ? 'Smithing complete.' : 'Missing materials for smith bronze sword.', ok); syncUi(); } },
    { label: 'Smith bronze shield [2 bars]', onClick: () => { const ok = consumeRecipe({ bronzeBar: 2 }, { bronzeShield: 1 }, 'smithing', 10); inlineDialogueMessage(ok ? 'Smithing complete.' : 'Missing materials for smith bronze shield.', ok); syncUi(); } },
    { label: 'Smith bronze armor [3 bars]', onClick: () => { const ok = consumeRecipe({ bronzeBar: 3 }, { bronzeArmor: 1 }, 'smithing', 14); inlineDialogueMessage(ok ? 'Smithing complete.' : 'Missing materials for smith bronze armor.', ok); syncUi(); } },
    { label: 'Close', onClick: closeDialogue },
  ]);
}
function openMerchantDialogue() {
  openDialogue('Merchant', '<p>The merchant smells faintly of profit and stale cabbage.</p>', [
    { label: 'Buy cooked fish [5 coins]', onClick: () => buyItem('cookedFish', 5) },
    { label: 'Buy bronze shield [12 coins]', onClick: () => buyItem('bronzeShield', 12) },
    { label: 'Close', onClick: closeDialogue },
  ]);
}
function buyItem(id, price) {
  const p = worldState.player;
  if (countItem(p.inventory, 'coin') < price) { inlineDialogueMessage('Not enough coins.'); return; }
  removeItem(p.inventory, 'coin', price); addItem(p.inventory, id, 1); inlineDialogueMessage(`Bought ${itemDefs[id].name}.`, true); syncUi();
}

function equipByIndex(idx) {
  const p = worldState.player; const item = p.inventory[idx]; if (!item) return;
  const def = itemDefs[item.id]; if (!def?.slot) return;
  if (p.equipment[def.slot]) addItem(p.inventory, p.equipment[def.slot], 1);
  p.equipment[def.slot] = item.id; removeItem(p.inventory, item.id, 1); log(`You equip ${def.name}.`, 'good'); syncUi();
}
function unequip(slot) {
  const p = worldState.player; if (!p.equipment[slot]) return;
  addItem(p.inventory, p.equipment[slot], 1); log(`You unequip ${itemDefs[p.equipment[slot]].name}.`, 'good'); p.equipment[slot] = null; syncUi();
}
function eatFish() {
  const p = worldState.player; if (!countItem(p.inventory, 'cookedFish')) return log('No cooked fish to eat.', 'bad');
  removeItem(p.inventory, 'cookedFish', 1); p.hp = clamp(p.hp + 14, 0, p.maxHp); log('You eat a cooked fish.', 'good'); syncUi();
}

function beginResourceTask(kind, obj) {
  if (combatLocked()) return log('You cannot interact with that while in combat.', 'bad');
  if (worldState.task) return;
  if (kind === 'tree') {
    worldState.task = { type: 'resource', label: 'Chopping tree', timeLeft: 2, onComplete: () => { addItem(worldState.player.inventory, 'logs', 1); gainSkill('woodcutting', 6); log('You get some logs.', 'good'); } };
  } else if (kind === 'fish') {
    worldState.task = { type: 'resource', label: 'Fishing', timeLeft: rand(3, 5), onComplete: () => {
      const roll = Math.random();
      if (roll < 0.58) { addItem(worldState.player.inventory, 'rawFish', 1); gainSkill('fishing', 5); log('You catch a fish.', 'good'); }
      else if (roll < 0.83) log('You catch nothing.', 'bad');
      else { addItem(worldState.player.inventory, 'oldBoot', 1); log('You fish up an old boot. Ancient fashion crime recovered.', 'good'); }
    } };
  } else if (kind.startsWith('rock')) {
    const ore = kind === 'rockCopper' ? 'copperOre' : kind === 'rockTin' ? 'tinOre' : 'ironOre';
    worldState.task = { type: 'resource', label: 'Mining', timeLeft: rand(2, 3), onComplete: () => {
      if (Math.random() < 0.75) { addItem(worldState.player.inventory, ore, 1); gainSkill('mining', ore === 'ironOre' ? 10 : 6); log(`You mine ${itemDefs[ore].name}.`, 'good'); }
      else log('You fail to get usable ore from that swing.', 'bad');
    } };
  }
}

function startCombat(enemy) {
  const p = worldState.player;
  if (!enemy.alive || p.immunity > 0 || enemy.immunity > 0) return;
  p.combat = { enemy, hitIndex: 0, timer: 0.45, timeout: 5.5 };
  p.tx = p.x; p.ty = p.y; worldState.pendingTarget = null; worldState.task = null;
  log(`Combat starts with ${enemy.name}. Three hits, then 5 seconds of immunity.`, 'bad');
}
function concludeCombatRecovery(enemy) {
  const p = worldState.player;
  p.combat = null; p.immunity = 5; if (enemy) enemy.immunity = 5;
}
function enemyDie(enemy) {
  enemy.alive = false; enemy.respawn = enemy.name === 'Warden of Manala' ? 999999 : 15; worldState.player.combat = null;
  const p = worldState.player; gainSkill('combat', 12 + Math.floor(enemy.maxHp / 2));
  for (const loot of enemy.loot || []) if (Math.random() <= loot.chance) worldState.drops.push({ id: loot.id, qty: loot.qty, x: enemy.x, y: enemy.y });
  if (enemy.name === 'Warden of Manala') { worldState.bossDead = true; log('The Warden falls. Manala is yours, you weird little tyrant.', 'good'); }
  else log(`${enemy.name} dies.`, 'good');
  concludeCombatRecovery(enemy);
}
function playerDie() {
  const p = worldState.player;
  for (const it of [...p.inventory]) worldState.drops.push({ id: it.id, qty: it.qty, x: p.x, y: p.y });
  p.inventory = [];
  for (const slot of ['weapon', 'shield', 'armor']) if (p.equipment[slot]) { worldState.drops.push({ id: p.equipment[slot], qty: 1, x: p.x, y: p.y }); p.equipment[slot] = null; }
  p.hp = p.maxHp; p.x = 5; p.y = 7; p.tx = 5; p.ty = 7; p.combat = null; p.immunity = 4;
  log('You died, dropped your belongings, and woke up in the first village. Classic brutality restored.', 'bad');
}
function updateCombat(dt) {
  const p = worldState.player;
  if (p.immunity > 0) p.immunity = Math.max(0, p.immunity - dt);
  for (const e of worldState.enemies) if (e.immunity > 0) e.immunity = Math.max(0, e.immunity - dt);
  if (!p.combat) return;
  const c = p.combat; const enemy = c.enemy;
  if (!enemy.alive) return concludeCombatRecovery(enemy);
  c.timeout -= dt; if (c.timeout <= 0) { log('Combat fail-safe resolved a stuck exchange.', 'bad'); return concludeCombatRecovery(enemy); }
  c.timer -= dt; if (c.timer > 0) return;
  const playerHit = Math.max(1, totalAttack(p) - Math.floor(totalDefense(enemy) * 0.4) + rand(-1, 2));
  const enemyHit = Math.max(0, totalAttack(enemy) - Math.floor(totalDefense(p) * 0.45) + rand(-1, 2));
  enemy.hp = clamp(enemy.hp - playerHit, 0, enemy.maxHp);
  p.hp = clamp(p.hp - enemyHit, 0, p.maxHp);
  log(`${p.name} hits ${enemy.name} for ${playerHit}. ${enemy.name} hits back for ${enemyHit}.`, enemyHit ? 'bad' : '');
  c.hitIndex += 1; c.timer = 0.65;
  if (enemy.hp <= 0) return enemyDie(enemy);
  if (p.hp <= 0) return playerDie();
  if (c.hitIndex >= 3) concludeCombatRecovery(enemy);
}

function pickDrop(drop) {
  addItem(worldState.player.inventory, drop.id, drop.qty); log(`You pick up ${itemDefs[drop.id].name}${drop.qty > 1 ? ` x${drop.qty}` : ''}.`, 'good');
  worldState.drops.splice(worldState.drops.indexOf(drop), 1);
}

function performInteraction(target) {
  if (!target) return;
  if (target.__drop) return pickDrop(target);
  if (['wolf', 'bandit', 'skeleton', 'warden'].includes(target.kind)) return startCombat(target);
  if (target.kind === 'tree' || target.kind === 'fish' || target.kind.startsWith('rock')) return beginResourceTask(target.kind, target);
  if (target.kind === 'bank') return openBankDialogue();
  if (target.kind === 'forge') return openForgeDialogue();
  if (target.kind === 'anvil') return openAnvilDialogue();
  if (target.kind === 'merchant') return openMerchantDialogue();
  if (target.kind === 'healer') { worldState.player.hp = worldState.player.maxHp; log('The healer restores you to full health.', 'good'); syncUi(); return; }
  if (target.kind === 'bossGate') { log(worldState.bossDead ? 'The gate lies quiet.' : 'A terrible presence waits beyond the gate.', 'bad'); return; }
}

function updateTask(dt) {
  if (!worldState.task) return;
  worldState.task.timeLeft -= dt;
  if (worldState.task.timeLeft > 0) return;
  if (worldState.task.type === 'batch') worldState.task.onTick();
  else {
    const task = worldState.task; worldState.task = null; task.onComplete(); syncUi();
  }
}

function updateMovement(dt) {
  const p = worldState.player;
  const stepInterval = 1 / p.speed;
  p.moveCooldown -= dt;
  if (p.moveCooldown > 0) return;
  if (p.x === p.tx && p.y === p.ty) {
    if (worldState.pendingTarget && distanceTiles(p, worldState.pendingTarget) <= 1) {
      const target = worldState.pendingTarget; worldState.pendingTarget = null; performInteraction(target);
    }
    return;
  }
  if (p.x < p.tx) p.x++; else if (p.x > p.tx) p.x--;
  if (p.y < p.ty) p.y++; else if (p.y > p.ty) p.y--;
  p.moveCooldown = stepInterval;
}

function updateCamera(dt) {
  if (keys['ArrowLeft']) camera.x += cameraSpeed * dt;
  if (keys['ArrowRight']) camera.x -= cameraSpeed * dt;
  if (keys['ArrowUp']) camera.y += cameraSpeed * dt;
  if (keys['ArrowDown']) camera.y -= cameraSpeed * dt;
}

function update(dt) {
  updateCamera(dt);
  updateTask(dt);
  updateCombat(dt);
  updateMovement(dt);
  for (const e of worldState.enemies) {
    if (!e.alive) {
      e.respawn -= dt;
      if (e.respawn <= 0 && e.name !== 'Warden of Manala') {
        e.alive = true; e.hp = e.maxHp; e.immunity = 0;
      }
    }
  }
}

function getTargets() {
  const drops = worldState.drops.map(d => ({ ...d, name: itemDefs[d.id].name, __drop: true }));
  return [...worldState.objects, ...worldState.enemies.filter(e => e.alive), ...drops];
}
function getHoveredTarget(mx, my) {
  let best = null; let bestDist = 9999;
  for (const e of getTargets()) {
    const p = isoToScreen(e.x, e.y);
    const d = Math.hypot(mx - p.x, my - (p.y - 12 * camera.zoom));
    if (d < 34 * camera.zoom && d < bestDist) { best = e; bestDist = d; }
  }
  return best;
}

function syncUi() {
  const p = worldState.player; if (!p) return;
  const status = p.combat ? 'In Combat' : p.immunity > 0 ? `Immune ${p.immunity.toFixed(1)}s` : worldState.task ? worldState.task.label : 'Idle';
  statsPanel.innerHTML = `
    <h2>Character</h2>
    <div class="kv"><span>Name</span><span>${p.name}</span></div>
    <div class="kv"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="kv"><span>Attack</span><span>${totalAttack(p)}</span></div>
    <div class="kv"><span>Defense</span><span>${totalDefense(p)}</span></div>
    <div class="kv"><span>Weapon</span><span>${p.equipment.weapon ? itemDefs[p.equipment.weapon].name : 'None'}</span></div>
    <div class="kv"><span>Shield</span><span>${p.equipment.shield ? itemDefs[p.equipment.shield].name : 'None'}</span></div>
    <div class="kv"><span>Armor</span><span>${p.equipment.armor ? itemDefs[p.equipment.armor].name : 'None'}</span></div>
    <div class="kv"><span>Status</span><span>${status}</span></div>
    <div class="buttonColumn">
      <button class="smallButton" onclick="window.manalaUnequip('weapon')">Unequip weapon</button>
      <button class="smallButton" onclick="window.manalaUnequip('shield')">Unequip shield</button>
      <button class="smallButton" onclick="window.manalaUnequip('armor')">Unequip armor</button>
    </div>
  `;
  inventoryPanel.innerHTML = `<h2>Inventory</h2>` + (p.inventory.length ? p.inventory.map((it, i) => `<div class="itemRow"><span>${i + 1}. ${itemDefs[it.id].symbol} ${itemDefs[it.id].name}${it.qty > 1 ? ` x${it.qty}` : ''}</span><span>${itemDefs[it.id].slot ? `<button class='smallButton' onclick='window.manalaEquip(${i})'>equip</button>` : ''}</span></div>`).join('') : '<p>Empty.</p>') + `<p class="small">Press 1–9 to equip visible gear items. Press H to eat fish.</p>`;
  skillsPanel.innerHTML = `
    <h2>Skills</h2>
    ${Object.entries(p.skills).map(([k, xp]) => `<div class="kv"><span>${capitalize(k)}</span><span>Lv ${levelFromXp(xp)} (${xp} xp)</span></div>`).join('')}
    <p class="small">Diagonal pathing and camera panning are now part of the live gameplay build.</p>
  `;
}
window.manalaEquip = equipByIndex;
window.manalaUnequip = unequip;

function saveGame() {
  const p = worldState.player;
  const data = {
    player: {
      ...p,
      combat: null,
      tx: p.x,
      ty: p.y,
      moveCooldown: 0,
      immunity: 0,
    },
    drops: worldState.drops,
    enemies: worldState.enemies,
    bossDead: worldState.bossDead,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  log('Game saved.', 'good');
}
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
  const data = JSON.parse(raw);
  buildWorld();
  worldState.player = data.player;
  worldState.drops = data.drops || [];
  for (const saved of data.enemies || []) {
    const found = worldState.enemies.find(e => e.name === saved.name);
    if (found) Object.assign(found, saved, { combat: null });
  }
  worldState.bossDead = !!data.bossDead;
  creator.classList.add('hidden'); document.body.classList.remove('creatorMode'); gameStarted = true; closeDialogue(); syncUi();
  log('Save loaded.', 'good');
}
function deleteSave() { localStorage.removeItem(SAVE_KEY); continueBtn.disabled = true; log('Save deleted.', 'bad'); }

function startNewCharacter() {
  buildWorld();
  worldState.player = makePlayer(getAppearanceFromForm());
  creator.classList.add('hidden'); document.body.classList.remove('creatorMode'); gameStarted = true; closeDialogue();
  log(`Welcome to Manala, ${worldState.player.name}.`, 'good');
  syncUi();
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (e.button === 2) {
    dragging = true; dragStart = { x: e.clientX, y: e.clientY }; cameraStart = { x: camera.x, y: camera.y };
  }
});
window.addEventListener('mouseup', () => dragging = false);
window.addEventListener('mousemove', e => {
  if (!gameStarted) return;
  if (dragging) {
    camera.x = cameraStart.x + (e.clientX - dragStart.x);
    camera.y = cameraStart.y + (e.clientY - dragStart.y);
    return;
  }
  const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  hoverTarget = getHoveredTarget(mx, my);
  hoverVerb.textContent = hoverTarget ? entityVerb(hoverTarget) : 'Walk here';
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  camera.zoom = clamp(camera.zoom + delta, minZoom, maxZoom);
}, { passive: false });
canvas.addEventListener('click', e => {
  if (!gameStarted || dialogueOpen()) return;
  const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  const target = getHoveredTarget(mx, my); const p = worldState.player;
  if (target) {
    if (combatLocked() && !target.__drop && !['wolf', 'bandit', 'skeleton', 'warden'].includes(target.kind)) { log('You cannot interact with that while in combat.', 'bad'); return; }
    p.tx = clamp(target.x - (target.__drop ? 0 : 1), 0, world.w - 1);
    p.ty = clamp(target.y, 0, world.h - 1);
    worldState.pendingTarget = target;
  } else {
    const tile = screenToIso(mx, my); p.tx = clamp(tile.x, 0, world.w - 1); p.ty = clamp(tile.y, 0, world.h - 1); worldState.pendingTarget = null;
  }
});

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (!gameStarted) return;
  if (e.key === 'h' || e.key === 'H') eatFish();
  const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) equipByIndex(n - 1);
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

for (const el of [nameInput, skinToneSelect, hairStyleSelect, hairColorSelect, shirtColorSelect, pantsColorSelect]) {
  el.addEventListener('input', drawCreatorPreview); el.addEventListener('change', drawCreatorPreview);
}
startBtn.onclick = startNewCharacter;
continueBtn.onclick = loadGame;
saveBtn.onclick = saveGame;
loadBtn.onclick = loadGame;
deleteSaveBtn.onclick = deleteSave;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (gameStarted) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function init() {
  document.body.classList.add('creatorMode');
  drawCreatorPreview();
  continueBtn.disabled = !localStorage.getItem(SAVE_KEY);
  if (!worldState.player) {
    buildWorld();
    worldState.player = makePlayer(getAppearanceFromForm());
  }
  syncUi();
  requestAnimationFrame(loop);
}

init();
