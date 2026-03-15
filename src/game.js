const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;
const GROUND_Y = 520;
const WORLD_W = 5600;
const TILE = 40;
const GRAVITY = 1800;
const PLAYER_SPEED = 250;
const JUMP_V = -640;
const SAVE_KEY = 'manala_v7_save';

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

const spritePaths = {
  house: 'assets/sprites/objects/house.png',
  tree: 'assets/sprites/objects/tree.png',
  rockCopper: 'assets/sprites/objects/rock_copper.png',
  rockTin: 'assets/sprites/objects/rock_tin.png',
  rockIron: 'assets/sprites/objects/rock_iron.png',
  fish: 'assets/sprites/objects/fishspot.png',
  forge: 'assets/sprites/objects/forge.png',
  anvil: 'assets/sprites/objects/anvil.png',
  bossGate: 'assets/sprites/objects/gate.png',
  merchant: 'assets/sprites/npcs/merchant.png',
  banker: 'assets/sprites/npcs/banker.png',
  healer: 'assets/sprites/npcs/healer.png',
  Wolf: 'assets/sprites/enemies/wolf.png',
  Bandit: 'assets/sprites/enemies/bandit.png',
  Skeleton: 'assets/sprites/enemies/skeleton.png',
  'Warden of Manala': 'assets/sprites/enemies/warden.png',
};
const sprites = {};
for (const [key, src] of Object.entries(spritePaths)) {
  const img = new Image();
  img.src = src;
  sprites[key] = img;
}

const itemDefs = {
  bronzeSword: { name: 'Bronze Sword', symbol: '🗡', slot: 'weapon', attack: 4, value: 12 },
  ironSword: { name: 'Iron Sword', symbol: '⚔', slot: 'weapon', attack: 7, value: 26 },
  bronzeShield: { name: 'Bronze Shield', symbol: '🛡', slot: 'shield', defense: 3, value: 12 },
  ironShield: { name: 'Iron Shield', symbol: '🛡', slot: 'shield', defense: 5, value: 24 },
  leatherArmor: { name: 'Leather Armor', symbol: '🧥', slot: 'armor', defense: 2, value: 10 },
  bronzeArmor: { name: 'Bronze Armor', symbol: '🥋', slot: 'armor', defense: 4, value: 20 },
  ironArmor: { name: 'Iron Armor', symbol: '🥋', slot: 'armor', defense: 7, value: 40 },
  logs: { name: 'Logs', symbol: '🪵', stack: true, value: 1 },
  rawFish: { name: 'Raw Fish', symbol: '🐟', stack: true, value: 2 },
  cookedFish: { name: 'Cooked Fish', symbol: '🍖', stack: true, heal: 14, value: 5 },
  copperOre: { name: 'Copper Ore', symbol: '🪨', stack: true, value: 2 },
  tinOre: { name: 'Tin Ore', symbol: '🪨', stack: true, value: 2 },
  ironOre: { name: 'Iron Ore', symbol: '⛓', stack: true, value: 4 },
  bronzeBar: { name: 'Bronze Bar', symbol: '▬', stack: true, value: 6 },
  ironBar: { name: 'Iron Bar', symbol: '▮', stack: true, value: 10 },
  coin: { name: 'Coins', symbol: '¤', stack: true, value: 1 },
  oldBoot: { name: 'Old Boot', symbol: '⌂', stack: true, value: 1 },
};

const recipes = {
  forge: [
    { name: 'Smelt bronze bar', needs: { copperOre: 1, tinOre: 1 }, gives: { bronzeBar: 1 }, skill: 'smithing', xp: 8 },
    { name: 'Smelt iron bar', needs: { ironOre: 1 }, gives: { ironBar: 1 }, skill: 'smithing', xp: 12 },
    { name: 'Cook fish', needs: { rawFish: 1 }, gives: { cookedFish: 1 }, skill: 'fishing', xp: 4 },
  ],
  anvil: [
    { name: 'Smith bronze sword', needs: { bronzeBar: 2 }, gives: { bronzeSword: 1 }, skill: 'smithing', xp: 12 },
    { name: 'Smith bronze shield', needs: { bronzeBar: 2 }, gives: { bronzeShield: 1 }, skill: 'smithing', xp: 10 },
    { name: 'Smith bronze armor', needs: { bronzeBar: 3 }, gives: { bronzeArmor: 1 }, skill: 'smithing', xp: 14 },
    { name: 'Smith iron sword', needs: { ironBar: 2 }, gives: { ironSword: 1 }, skill: 'smithing', xp: 18 },
    { name: 'Smith iron shield', needs: { ironBar: 2 }, gives: { ironShield: 1 }, skill: 'smithing', xp: 16 },
    { name: 'Smith iron armor', needs: { ironBar: 3 }, gives: { ironArmor: 1 }, skill: 'smithing', xp: 20 },
  ],
};

const keys = {};
let gameStarted = false;
let currentDialogue = null;
let creatorActive = true;

const world = {
  spawnX: 200,
  player: null,
  objects: [],
  enemies: [],
  drops: [],
  zones: [],
  bossDead: false,
  cameraX: 0,
  pendingAction: null,
  mouseHint: '',
  task: null,
};

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function snap(x) { return Math.round(x / TILE) * TILE; }
function cloneItem(item) { return { id: item.id, qty: item.qty }; }
function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }
function dist(a, b) { return Math.abs(a.x - b.x); }

function levelFromXp(xp) { return Math.max(1, Math.floor(Math.sqrt(xp / 12)) + 1); }
function skillLevel(entity, skill) { return levelFromXp((entity?.skills && entity.skills[skill]) || 0); }

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
    inv[i].qty -= use; qty -= use;
    if (inv[i].qty <= 0) inv.splice(i, 1);
  }
  return qty <= 0;
}
function countItem(inv, id) { return inv.filter(i => i.id === id).reduce((a, b) => a + b.qty, 0); }
function hasItems(inv, needs) { return Object.entries(needs).every(([id, qty]) => countItem(inv, id) >= qty); }

function gainSkill(skill, amount) {
  const p = world.player;
  const oldLv = skillLevel(p, skill);
  p.skills[skill] += amount;
  const newLv = skillLevel(p, skill);
  if (newLv > oldLv) log(`${capitalize(skill)} reaches level ${newLv}.`, 'good');
}
function totalAttack(entity) {
  const base = 3 + skillLevel(entity, 'combat');
  const eq = entity.equipment?.weapon ? itemDefs[entity.equipment.weapon].attack || 0 : 0;
  return base + eq + (entity.attack || 0);
}
function totalDefense(entity) {
  const base = 1 + Math.floor(skillLevel(entity, 'combat') * 0.5);
  const shield = entity.equipment?.shield ? itemDefs[entity.equipment.shield].defense || 0 : 0;
  const armor = entity.equipment?.armor ? itemDefs[entity.equipment.armor].defense || 0 : 0;
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
    x: world.spawnX,
    y: GROUND_Y,
    vy: 0,
    facing: 1,
    onGround: true,
    hp: 40,
    maxHp: 40,
    interactCd: 0,
    hitFlash: 0,
    anim: 0,
    attackSwing: 0,
    combat: null,
    immunity: 0,
    appearance,
    inventory: [
      { id: 'bronzeSword', qty: 1 },
      { id: 'cookedFish', qty: 3 },
      { id: 'coin', qty: 20 },
    ],
    bank: [],
    equipment: { weapon: null, shield: null, armor: null },
    skills: { combat: 0, woodcutting: 0, fishing: 0, mining: 0, smithing: 0 },
    moveTargetX: null,
  };
}

function object(type, x, y, extra = {}) { return { type, x: snap(x), y, maxHp: extra.maxHp || 0, hp: extra.maxHp || 0, timer: 0, ...extra }; }
function addEnemy(name, x, setup) {
  world.enemies.push({
    name, x: snap(x), baseX: snap(x), y: GROUND_Y, hp: setup.hp, maxHp: setup.hp,
    attack: setup.attack, defense: setup.defense, skills: { combat: setup.combatXp || 0 },
    equipment: setup.equipment || {}, loot: setup.loot || [],
    alive: true, respawnTime: setup.respawnTime || 18, respawn: 0, wander: Math.random() * 2, facing: -1,
    hitFlash: 0, attackSwing: 0, immunity: 0, anim: 0, width: setup.width || 36,
  });
}
function buildWorld() {
  world.objects = []; world.enemies = []; world.drops = []; world.bossDead = false; world.pendingAction = null;
  world.zones = [
    { name: 'First Village', x1: 0, x2: 1000, sky: '#98bfd3', hill: '#879473', ground: '#7f9861' },
    { name: 'Timber Road', x1: 1000, x2: 1880, sky: '#9fc3b0', hill: '#5f8458', ground: '#6f8f4f' },
    { name: 'Fishing Bank', x1: 1880, x2: 2680, sky: '#9fbfd8', hill: '#68889d', ground: '#6d8a5b' },
    { name: 'Ore Ridge', x1: 2680, x2: 3960, sky: '#bdb6be', hill: '#7b7076', ground: '#85755f' },
    { name: 'Eastern Ruins', x1: 3960, x2: WORLD_W, sky: '#b89fb4', hill: '#675262', ground: '#705d61' },
  ];
  world.objects.push(object('merchant', 240, GROUND_Y), object('healer', 400, GROUND_Y), object('banker', 560, GROUND_Y), object('forge', 720, GROUND_Y), object('anvil', 840, GROUND_Y));
  [1120, 1280, 1440, 1600].forEach(x => world.objects.push(object('tree', x, GROUND_Y, { maxHp: 2, width: 56 })));
  [2000, 2200, 2400].forEach(x => world.objects.push(object('fish', x, GROUND_Y, { width: 120 })));
  [2800, 2960].forEach(x => world.objects.push(object('rockCopper', x, GROUND_Y, { maxHp: 2, width: 60 })));
  [3200, 3360].forEach(x => world.objects.push(object('rockTin', x, GROUND_Y, { maxHp: 2, width: 60 })));
  [3600, 3760].forEach(x => world.objects.push(object('rockIron', x, GROUND_Y, { maxHp: 3, width: 60 })));
  world.objects.push(object('bossGate', 4440, GROUND_Y, { width: 92 }));

  addEnemy('Wolf', 1240, { hp: 18, attack: 4, defense: 1, width: 46, loot: [{ id: 'coin', qty: 5, chance: 1 }, { id: 'rawFish', qty: 1, chance: 0.25 }] });
  addEnemy('Bandit', 2080, { hp: 25, attack: 5, defense: 2, equipment: { weapon: 'bronzeSword' }, loot: [{ id: 'coin', qty: 10, chance: 1 }, { id: 'bronzeSword', qty: 1, chance: 0.18 }] });
  addEnemy('Skeleton', 3400, { hp: 34, attack: 7, defense: 3, equipment: { weapon: 'ironSword', shield: 'bronzeShield' }, loot: [{ id: 'ironOre', qty: 1, chance: 0.55 }, { id: 'ironSword', qty: 1, chance: 0.16 }, { id: 'coin', qty: 16, chance: 1 }] });
  addEnemy('Warden of Manala', 4880, { hp: 80, attack: 11, defense: 6, width: 42, equipment: { weapon: 'ironSword', shield: 'ironShield', armor: 'ironArmor' }, loot: [{ id: 'coin', qty: 120, chance: 1 }] });
}

function getZoneAt(x) { return world.zones.find(z => x >= z.x1 && x < z.x2) || world.zones[0]; }
function friendlyName(type) {
  return { merchant: 'merchant', healer: 'healer', banker: 'banker', forge: 'forge', anvil: 'anvil', tree: 'tree', fish: 'fishing spot', rockCopper: 'copper rock', rockTin: 'tin rock', rockIron: 'iron rock', bossGate: 'ruined gate' }[type] || type;
}
function getNearestObject(maxRange = 72) {
  const p = world.player; let best = null; let bestD = 99999;
  for (const obj of world.objects) {
    if (obj.maxHp && obj.hp <= 0) continue;
    const d = Math.abs(obj.x - p.x);
    if (d <= maxRange && d < bestD) { best = obj; bestD = d; }
  }
  return best;
}
function getNearestEnemy(maxRange = 72) {
  const p = world.player; let best = null; let bestD = 99999;
  for (const e of world.enemies) {
    if (!e.alive) continue;
    const d = Math.abs(e.x - p.x);
    if (d <= maxRange && d < bestD) { best = e; bestD = d; }
  }
  return best;
}
function getNearestDrop(maxRange = 72) { return world.drops.find(drop => Math.abs(drop.x - world.player.x) <= maxRange) || null; }

function combatLocked() {
  const p = world.player;
  return !!(p && p.combat);
}

function showDialogue(title, contentHtml, choices = []) {
  currentDialogue = { title, contentHtml, choices };
  dialogueTitle.textContent = title;
  dialogueText.innerHTML = contentHtml;
  dialogueChoices.innerHTML = '';
  for (const choice of choices) {
    const btn = document.createElement('button');
    btn.className = `smallButton ${choice.className || ''}`.trim();
    btn.textContent = choice.label;
    btn.onclick = () => {
      const closeNow = choice.close !== false;
      if (closeNow) hideDialogue();
      choice.onClick?.();
    };
    dialogueChoices.appendChild(btn);
  }
  dialogue.classList.remove('hidden');
}
function hideDialogue() { dialogue.classList.add('hidden'); currentDialogue = null; }
function dialogueOpen() { return !dialogue.classList.contains('hidden'); }
dialogueClose.addEventListener('click', hideDialogue);

function taskLocked() { return !!world.task; }
function setTask(task) {
  if (world.task) {
    log('You are already busy with something.', 'bad');
    return false;
  }
  world.task = { elapsed: 0, stepIndex: 0, ...task };
  if (task.startText) log(task.startText, '');
  return true;
}
function clearTask(msg = '', cls = '') {
  if (msg) log(msg, cls);
  world.task = null;
}
function getBatchCount(recipe) {
  return Math.min(...Object.entries(recipe.needs).map(([id, qty]) => Math.floor(countItem(world.player.inventory, id) / qty)));
}
function startFishingTask() {
  const p = world.player;
  if (combatLocked()) return log('Fishing during combat is not a thing unless you are clinically cursed.', 'bad');
  const duration = 3 + Math.random() * 2;
  setTask({
    type: 'fishing',
    duration,
    timer: duration,
    label: 'Fishing',
    startText: 'You cast your line and wait...',
    onFinish: () => {
      const roll = Math.random();
      if (roll < 0.62) {
        addItem(p.inventory, 'rawFish', 1);
        gainSkill('fishing', 7);
        log('You catch a fish.', 'good');
      } else if (roll < 0.87) {
        log('Nothing bites. The water mocks you in silence.', 'bad');
      } else {
        const junk = Math.random() < 0.5 ? { id: 'oldBoot', qty: 1, text: 'You fish up an old boot. Riveting.' } : { id: 'coin', qty: rand(1, 4), text: 'You fish up a few soggy coins.' };
        addItem(p.inventory, junk.id, junk.qty);
        gainSkill('fishing', 3);
        log(junk.text, 'good');
      }
      world.task = null;
    },
  });
}
function startBatchTask(label, recipe, count, skill, xp) {
  if (count <= 0) {
    const msg = `You do not have materials to ${label.toLowerCase()}.`;
    log(msg, 'bad');
    setDialogueNotice(msg, 'bad');
    return;
  }
  setTask({
    type: 'batch',
    timer: 1,
    stepTime: 1,
    remaining: count,
    label,
    startText: `${label} started (${count} item${count === 1 ? '' : 's'}).`,
    onTick: (task) => {
      if (!hasItems(world.player.inventory, recipe.needs)) {
        log(`${label} stopped because you ran out of materials.`, 'bad');
        world.task = null;
        return;
      }
      Object.entries(recipe.needs).forEach(([id, qty]) => removeItem(world.player.inventory, id, qty));
      Object.entries(recipe.gives).forEach(([id, qty]) => addItem(world.player.inventory, id, qty));
      gainSkill(skill || recipe.skill, xp || recipe.xp);
      task.remaining -= 1;
      setDialogueNotice(`${label}: ${count - task.remaining}/${count}`, 'good');
      if (task.remaining <= 0) {
        log(`${label} finished.`, 'good');
        setDialogueNotice(`${label} finished.`, 'good');
        world.task = null;
      } else {
        task.timer = task.stepTime;
      }
    },
  });
}
function updateTask(dt) {
  const task = world.task;
  if (!task) return;
  if (combatLocked()) {
    clearTask(`${task.label} was interrupted by combat.`, 'bad');
    return;
  }
  task.elapsed += dt;
  if (task.duration) {
    task.timer -= dt;
    if (task.timer <= 0) task.onFinish?.();
    return;
  }
  task.timer -= dt;
  if (task.timer <= 0) task.onTick?.(task);
}

function formatNeeds(needs) { return Object.entries(needs).map(([id, qty]) => `${itemDefs[id].name} x${qty}`).join(', '); }
function tradeBuy(cost, gain, text) {
  const p = world.player;
  if (!hasItems(p.inventory, cost)) return log('Not enough money.', 'bad');
  Object.entries(cost).forEach(([id, qty]) => removeItem(p.inventory, id, qty));
  Object.entries(gain).forEach(([id, qty]) => addItem(p.inventory, id, qty));
  log(text, 'good');
}
function tradeSell(cost, gain, text) {
  const p = world.player;
  if (!hasItems(p.inventory, cost)) return log('You do not have the item to sell.', 'bad');
  Object.entries(cost).forEach(([id, qty]) => removeItem(p.inventory, id, qty));
  Object.entries(gain).forEach(([id, qty]) => addItem(p.inventory, id, qty));
  log(text, 'good');
}
function moveAllMatching(src, dst, filterFn) {
  const take = src.filter(filterFn).map(cloneItem);
  for (const it of take) { removeItem(src, it.id, it.qty); addItem(dst, it.id, it.qty); }
  return take.length;
}
function depositAllStackables() {
  const moved = moveAllMatching(world.player.inventory, world.player.bank, it => itemDefs[it.id].stack);
  log(moved ? 'You deposit your stackable items.' : 'Nothing stackable to deposit.', moved ? 'good' : 'bad');
  openBankDialogue();
}
function depositAllInventory() {
  const moved = world.player.inventory.map(cloneItem);
  for (const it of moved) { removeItem(world.player.inventory, it.id, it.qty); addItem(world.player.bank, it.id, it.qty); }
  log(moved.length ? 'You deposit your entire inventory.' : 'Inventory already empty.', moved.length ? 'good' : 'bad');
  openBankDialogue();
}
function withdrawAll(id) {
  const qty = countItem(world.player.bank, id);
  if (!qty) return log(`No ${itemDefs[id].name} in bank.`, 'bad');
  removeItem(world.player.bank, id, qty); addItem(world.player.inventory, id, qty); log(`You withdraw ${itemDefs[id].name}${qty > 1 ? ` x${qty}` : ''}.`, 'good');
  openBankDialogue();
}
function withdrawOne(id) {
  if (!countItem(world.player.bank, id)) return;
  removeItem(world.player.bank, id, 1); addItem(world.player.inventory, id, 1); log(`You withdraw ${itemDefs[id].name}.`, 'good'); openBankDialogue();
}
function weaponScore(id) { return (itemDefs[id]?.attack || 0); }
function withdrawBestWeapon() {
  const weapons = world.player.bank.filter(it => itemDefs[it.id]?.slot === 'weapon');
  if (!weapons.length) return log('No weapons in bank.', 'bad');
  const best = weapons.sort((a, b) => weaponScore(b.id) - weaponScore(a.id))[0];
  removeItem(world.player.bank, best.id, 1); addItem(world.player.inventory, best.id, 1); log(`You withdraw ${itemDefs[best.id].name}.`, 'good'); openBankDialogue();
}
function setDialogueNotice(msg, cls='bad') {
  if (!dialogueOpen()) return;
  const color = cls === 'good' ? '#2f6b43' : '#8b2e22';
  dialogueText.innerHTML += `<p style="margin-top:10px;color:${color};font-weight:bold;">${msg}</p>`;
}

function useRecipe(recipe) {
  const p = world.player;
  if (!hasItems(p.inventory, recipe.needs)) {
    const msg = `Missing materials for ${recipe.name}.`;
    log(msg, 'bad');
    setDialogueNotice(msg, 'bad');
    return;
  }
  Object.entries(recipe.needs).forEach(([id, qty]) => removeItem(p.inventory, id, qty));
  Object.entries(recipe.gives).forEach(([id, qty]) => addItem(p.inventory, id, qty));
  gainSkill(recipe.skill, recipe.xp);
  const msg = `${recipe.name} completed.`;
  log(msg, 'good');
  setDialogueNotice(msg, 'good');
}
function bankGridHtml() {
  const bank = world.player.bank;
  if (!bank.length) return '<p class="small">Bank is empty.</p>';
  return `<div class="bankGrid">${bank.map(it => {
    const def = itemDefs[it.id];
    return `<div class="bankSlot"><div><div class="itemIcon" data-symbol="${def.symbol || '?'}"></div><div><b>${def.name}</b></div><div class="mini">Qty ${it.qty}</div></div><button class="smallButton" onclick="window.manalaWithdraw('${it.id}')">Withdraw 1</button></div>`;
  }).join('')}</div>`;
}
window.manalaWithdraw = withdrawOne;

function openVendorDialogue() {
  showDialogue('Village Merchant', '<p>Old school shop menu. Click what you want instead of being voluntold by the interface.</p>', [
    { label: 'Cooked Fish x2 (15 coins)', onClick: () => tradeBuy({ coin: 15 }, { cookedFish: 2 }, 'You buy two cooked fish.') },
    { label: 'Leather Armor (20 coins)', onClick: () => tradeBuy({ coin: 20 }, { leatherArmor: 1 }, 'You buy leather armor.') },
    { label: 'Bronze Shield (18 coins)', onClick: () => tradeBuy({ coin: 18 }, { bronzeShield: 1 }, 'You buy a bronze shield.') },
    { label: 'Sell 1 logs (2 coins)', onClick: () => tradeSell({ logs: 1 }, { coin: 2 }, 'The merchant buys your logs.') },
    { label: 'Never mind', onClick: () => log('You leave the merchant alone.') },
  ]);
}
function openBankDialogue() {
  const bankTotal = world.player.bank.reduce((a, b) => a + b.qty, 0);
  showDialogue('Village Bank', `<p>Banked items survive death. Vault slots in use: <b>${bankTotal}</b></p>${bankGridHtml()}`, [
    { label: 'Deposit all stackables', onClick: depositAllStackables },
    { label: 'Deposit all inventory', onClick: depositAllInventory },
    { label: 'Withdraw all coins', onClick: () => withdrawAll('coin') },
    { label: 'Withdraw all cooked fish', onClick: () => withdrawAll('cookedFish') },
    { label: 'Withdraw best weapon', onClick: withdrawBestWeapon },
    { label: 'Close', onClick: () => { } },
  ]);
}
function openForgeDialogue() {
  const bronzeRecipe = recipes.forge.find(r => r.name === 'Smelt bronze bar');
  const ironRecipe = recipes.forge.find(r => r.name === 'Smelt iron bar');
  const cookRecipe = recipes.forge.find(r => r.name === 'Cook fish');
  const choices = recipes.forge.map(recipe => ({
    label: `${recipe.name} [${formatNeeds(recipe.needs)}]`, close: false, onClick: () => useRecipe(recipe),
  }));
  choices.push(
    { label: 'Cook all raw fish', close: false, onClick: () => startBatchTask('Cook All Fish', cookRecipe, getBatchCount(cookRecipe), 'fishing', 4) },
    { label: 'Smelt all bronze', close: false, onClick: () => startBatchTask('Smelt All Bronze', bronzeRecipe, getBatchCount(bronzeRecipe), 'smithing', 8) },
    { label: 'Smelt all iron', close: false, onClick: () => startBatchTask('Smelt All Iron', ironRecipe, getBatchCount(ironRecipe), 'smithing', 12) },
    { label: 'Close', onClick: () => { } },
  );
  showDialogue('Forge', '<p>Smelt ore into bars or cook fish. Batch actions process one item per second.</p>', choices);
}

function openAnvilDialogue() {
  showDialogue('Anvil', '<p>Choose what to smith. Classic click-heavy nonsense, but in a charming way.</p>', recipes.anvil.map(recipe => ({
    label: `${recipe.name} [${formatNeeds(recipe.needs)}]`, close: false, onClick: () => useRecipe(recipe),
  })).concat([{ label: 'Close', onClick: () => { } }]));
}
function openHealerDialogue() {
  showDialogue('Village Healer', '<p>Restore your health?</p>', [
    { label: 'Heal me', onClick: () => { world.player.hp = world.player.maxHp; log('The healer restores you to full health.', 'good'); } },
    { label: 'Not now', onClick: () => { } },
  ]);
}

function collectDrop(drop) {
  for (const item of drop.items) addItem(world.player.inventory, item.id, item.qty);
  world.drops.splice(world.drops.indexOf(drop), 1);
  log('You pick up the dropped items.', 'good');
}
function executeInteraction(target) {
  const p = world.player;
  if (!target || dialogueOpen() || p.interactCd > 0) return;
  if (target.kind !== 'enemy' && combatLocked()) { log('You are in combat and cannot interact with that right now.', 'bad'); return; }
  p.interactCd = 0.18;
  if (target.kind === 'drop') return collectDrop(target.ref);
  if (target.kind === 'enemy') return startCombat(target.ref);

  const obj = target.ref;
  if (obj.type === 'tree') { obj.hp -= 1; addItem(p.inventory, 'logs', 1); gainSkill('woodcutting', 8); log('You chop the tree and get logs.', 'good'); if (obj.hp <= 0) { obj.hp = 0; obj.timer = 12; } return; }
  if (obj.type === 'fish') { startFishingTask(); return; }
  if (obj.type === 'rockCopper') { obj.hp -= 1; addItem(p.inventory, 'copperOre', 1); gainSkill('mining', 9); log('You mine copper ore.', 'good'); if (obj.hp <= 0) { obj.hp = 0; obj.timer = 14; } return; }
  if (obj.type === 'rockTin') { obj.hp -= 1; addItem(p.inventory, 'tinOre', 1); gainSkill('mining', 9); log('You mine tin ore.', 'good'); if (obj.hp <= 0) { obj.hp = 0; obj.timer = 14; } return; }
  if (obj.type === 'rockIron') { obj.hp -= 1; addItem(p.inventory, 'ironOre', 1); gainSkill('mining', 12); log('You mine iron ore.', 'good'); if (obj.hp <= 0) { obj.hp = 0; obj.timer = 18; } return; }
  if (obj.type === 'merchant') return openVendorDialogue();
  if (obj.type === 'banker') return openBankDialogue();
  if (obj.type === 'forge') return openForgeDialogue();
  if (obj.type === 'anvil') return openAnvilDialogue();
  if (obj.type === 'healer') return openHealerDialogue();
  if (obj.type === 'bossGate') return log(world.bossDead ? 'The Warden is gone. The ruins feel merely cursed now.' : 'Beyond the gate waits the Warden. Terrible decor. Worse manners.', 'bad');
}
function interact() {
  const p = world.player;
  if (!gameStarted || dialogueOpen() || p.interactCd > 0) return;
  const drop = getNearestDrop();
  if (drop) return executeInteraction({ kind: 'drop', ref: drop });
  if (!combatLocked() && p.immunity <= 0) {
    const enemy = getNearestEnemy();
    if (enemy) return executeInteraction({ kind: 'enemy', ref: enemy });
  }
  const obj = getNearestObject();
  if (!obj) return log('Nothing useful is close enough to interact with.', 'bad');
  executeInteraction({ kind: 'object', ref: obj });
}

function startCombat(enemy) {
  const p = world.player;
  if (!enemy.alive || combatLocked() || p.immunity > 0 || enemy.immunity > 0) return;
  p.moveTargetX = null; world.pendingAction = null;
  p.combat = { enemy, hitsDone: 0, timer: 0.5, state: 'exchange', recovery: 5, startedAt: performance.now(), failSafe: 0, totalElapsed: 0, debugStarted: Date.now() };
  enemy.combatant = true;
  p.attackSwing = 0.3; enemy.attackSwing = 0.3;
  log(`Combat starts with ${enemy.name}. Three hits, then 5 seconds of immunity.`, 'bad');
}
function concludeCombatRecovery(reason = '') {
  const p = world.player;
  if (!p.combat) return;
  const e = p.combat.enemy;
  if (e) e.combatant = false;
  p.combat = null;
  if (reason) log(reason, '');
}

function doCombatHit() {
  const p = world.player;
  const c = p.combat;
  if (!c || !c.enemy || !c.enemy.alive) { concludeCombatRecovery(); return; }
  const e = c.enemy;
  const pdmg = Math.max(1, rand(1, totalAttack(p)) - Math.floor(totalDefense(e) * 0.5));
  const edmg = Math.max(1, rand(1, totalAttack(e)) - Math.floor(totalDefense(p) * 0.5));
  e.hp = clamp(e.hp - pdmg, 0, e.maxHp);
  p.hp = clamp(p.hp - edmg, 0, p.maxHp);
  p.hitFlash = 0.16; e.hitFlash = 0.16; p.attackSwing = 0.32; e.attackSwing = 0.32;
  gainSkill('combat', 6);
  log(`${p.name} hits ${e.name} for ${pdmg}. ${e.name} hits back for ${edmg}.`, e.hp > 0 ? '' : 'good');
  c.hitsDone += 1;
  if (e.hp <= 0) { killEnemy(e); concludeCombatRecovery(); return; }
  if (p.hp <= 0) { onPlayerDeath(); return; }
  if (c.hitsDone >= 3) {
    c.state = 'recovery'; c.timer = c.recovery; p.immunity = 5; e.immunity = 5;
    log('The 3-hit cycle ends. Both fighters are immune for 5 seconds. Heal or run, damn it.', 'good');
  } else c.timer = 0.82;
}
function updateCombat(dt) {
  const p = world.player;
  if (!p.combat) return;
  const c = p.combat;
  c.totalElapsed += dt;
  if (!Number.isFinite(c.timer)) c.timer = 0.6;
  if (!c.enemy || !c.enemy.alive) { concludeCombatRecovery(); return; }
  const e = c.enemy;
  const idealMid = (p.x + e.x) / 2;
  if (!Number.isFinite(idealMid)) { concludeCombatRecovery('Combat desynced and was reset.'); return; }
  p.x = clamp(idealMid - 26, 30, WORLD_W - 30);
  e.x = clamp(idealMid + 26, 30, WORLD_W - 30);
  p.facing = e.x >= p.x ? 1 : -1;
  e.facing = p.x >= e.x ? 1 : -1;
  c.timer -= dt;
  c.failSafe += dt;
  if (c.state === 'exchange' && c.failSafe > 4.5) c.timer = 0;
  if (typeof e.hp !== 'number' || typeof e.maxHp !== 'number' || !Number.isFinite(e.hp) || !Number.isFinite(e.maxHp)) {
    e.hp = Number.isFinite(e.hp) ? e.hp : 1;
    e.maxHp = Number.isFinite(e.maxHp) && e.maxHp > 0 ? e.maxHp : Math.max(1, e.hp);
  }
  if (c.totalElapsed > 12) {
    p.immunity = Math.max(p.immunity, 5);
    e.immunity = Math.max(e.immunity, 5);
    concludeCombatRecovery('Combat lock fail-safe tripped. Both fighters back off for 5 seconds.');
    return;
  }
  if (c.timer > 0) return;
  c.failSafe = 0;
  if (c.state === 'exchange') doCombatHit();
  else concludeCombatRecovery(`${e.name} can be engaged again.`);
}
function killEnemy(e) {
  e.alive = false; e.combatant = false; e.respawn = e.respawnTime; gainSkill('combat', 18);
  if (e.name === 'Warden of Manala') { world.bossDead = true; log('The Warden of Manala falls. Prototype victory achieved.', 'good'); }
  else log(`${e.name} dies.`, 'good');
  const loot = [];
  for (const entry of e.loot) if (Math.random() <= entry.chance) loot.push({ id: entry.id, qty: entry.qty });
  if (loot.length) world.drops.push({ x: e.x, items: loot });
}
function onPlayerDeath() {
  const p = world.player;
  const dropped = p.inventory.map(cloneItem);
  if (dropped.length) world.drops.push({ x: p.x, items: dropped });
  p.inventory = []; p.hp = p.maxHp; p.x = world.spawnX; p.y = GROUND_Y; p.vy = 0; concludeCombatRecovery(); p.immunity = 4; p.moveTargetX = null; world.pendingAction = null;
  log('You died, dropped your inventory, and woke up in the first village. Banked items stayed safe.', 'bad');
}
function useFood() {
  const p = world.player;
  if (countItem(p.inventory, 'cookedFish') > 0) {
    removeItem(p.inventory, 'cookedFish', 1); p.hp = clamp(p.hp + itemDefs.cookedFish.heal, 0, p.maxHp); log('You eat cooked fish and recover 14 HP.', 'good');
  } else log('No cooked fish to eat.', 'bad');
}
function equipIndex(index) {
  const p = world.player; const item = p.inventory[index]; if (!item) return;
  const def = itemDefs[item.id]; if (!def.slot) return;
  const prev = p.equipment[def.slot]; p.equipment[def.slot] = item.id; removeItem(p.inventory, item.id, 1); if (prev) addItem(p.inventory, prev, 1); log(`Equipped ${def.name}.`, 'good');
}

function saveGame() {
  if (!world.player) return;
  const p = world.player;
  const data = { version: 7, bossDead: world.bossDead, player: { name: p.name, x: p.x, hp: p.hp, maxHp: p.maxHp, appearance: p.appearance, inventory: p.inventory.map(cloneItem), bank: p.bank.map(cloneItem), equipment: p.equipment, skills: p.skills } };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data)); log('Game saved locally in your browser.', 'good'); continueBtn.disabled = false;
}
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { log('No save file found.', 'bad'); return false; }
  try {
    buildWorld(); const data = JSON.parse(raw); world.bossDead = !!data.bossDead; world.player = makePlayer(data.player.appearance);
    Object.assign(world.player, { name: data.player.name, x: snap(data.player.x), hp: clamp(data.player.hp, 1, data.player.maxHp), maxHp: data.player.maxHp, inventory: data.player.inventory || [], bank: data.player.bank || [], equipment: data.player.equipment || { weapon: null, shield: null, armor: null }, skills: data.player.skills || { combat: 0, woodcutting: 0, fishing: 0, mining: 0, smithing: 0 }, y: GROUND_Y, vy: 0, onGround: true, immunity: 2, moveTargetX: null });
    gameStarted = true; creatorActive = false; creator.classList.add('hidden'); document.body.classList.remove('creatorMode'); hideDialogue(); log(`Loaded save for ${world.player.name}.`, 'good'); return true;
  } catch (e) { console.error(e); log('Save file is corrupted or cursed.', 'bad'); return false; }
}
function deleteSave() { localStorage.removeItem(SAVE_KEY); log('Save deleted.', 'bad'); continueBtn.disabled = true; }

function updatePendingAction() {
  const p = world.player;
  if (!world.pendingAction || combatLocked() || dialogueOpen()) return;
  const target = world.pendingAction;
  const tx = target.ref.x;
  if (Math.abs(p.x - tx) > (target.kind === 'enemy' ? 60 : 56)) {
    p.moveTargetX = tx;
    return;
  }
  world.pendingAction = null;
  executeInteraction(target);
}

function updateWorld(dt) {
  const p = world.player;
  p.interactCd = Math.max(0, p.interactCd - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.attackSwing = Math.max(0, p.attackSwing - dt);
  p.immunity = Math.max(0, p.immunity - dt);
  p.anim += dt * (Math.abs(p.vy) > 1 || p.moveTargetX !== null || (!combatLocked() && (keys['a'] || keys['d'] || keys['arrowleft'] || keys['arrowright'])) ? 8 : 4);

  for (const obj of world.objects) {
    if (obj.timer > 0) obj.timer -= dt;
    if (obj.maxHp && obj.hp === 0 && obj.timer <= 0) obj.hp = obj.maxHp;
  }
  for (const e of world.enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt); e.attackSwing = Math.max(0, e.attackSwing - dt); e.immunity = Math.max(0, e.immunity - dt); e.anim += dt * 4;
    if (!e.alive && e.respawn > 0) { e.respawn -= dt; if (e.respawn <= 0) { e.alive = true; e.hp = e.maxHp; e.x = e.baseX; } continue; }
    if (!e.alive) continue;
    if (!p.combat || p.combat.enemy !== e) {
      e.wander -= dt;
      if (e.wander <= 0) {
        const shift = rand(-80, 80); e.x = clamp(snap(e.x + shift), e.baseX - 120, e.baseX + 120); e.facing = e.x < p.x ? 1 : -1; e.wander = 1.4 + Math.random() * 1.4;
      }
    }
  }
  updateCombat(dt);
  updateTask(dt);
  updatePendingAction();
}

function drawIsoSprite(key, sx, baseY, width, height, flip = false) {
  const img = sprites[key];
  if (img && img.complete && img.naturalWidth) {
    ctx.save();
    if (flip) { ctx.translate(sx, 0); ctx.scale(-1, 1); sx = 0; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx - width / 2, baseY - height, width, height);
    ctx.restore();
    return true;
  }
  return false;
}
function drawDiamond(x, y, w, h, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function drawBackground(cameraX) {
  const zone = getZoneAt(world.player?.x || 0);
  ctx.fillStyle = zone.sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = zone.hill;
  for (let i = -1; i < 8; i++) {
    const x = i * 190 - (cameraX * 0.3 % 190);
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + 95, 250 + (i % 2) * 60); ctx.lineTo(x + 190, GROUND_Y); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = zone.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  const startTile = Math.floor(cameraX / TILE) - 2;
  for (let i = 0; i < Math.ceil(VIEW_W / TILE) + 4; i++) {
    const tile = startTile + i;
    const wx = tile * TILE;
    const sx = Math.round(wx - cameraX + TILE / 2);
    const alt = tile % 2 === 0;
    drawDiamond(sx, GROUND_Y + 18, TILE + 8, 22, alt ? 'rgba(173,192,122,0.28)' : 'rgba(115,138,79,0.32)', 'rgba(60,77,40,0.18)');
  }
}
function drawHouse(sx) {
  if (drawIsoSprite('house', sx, GROUND_Y - 6, 132, 132)) return;
  ctx.fillStyle = '#b1976a'; ctx.fillRect(sx - 42, GROUND_Y - 68, 84, 68); ctx.fillStyle = '#7a3f31'; ctx.beginPath(); ctx.moveTo(sx - 52, GROUND_Y - 68); ctx.lineTo(sx, GROUND_Y - 108); ctx.lineTo(sx + 52, GROUND_Y - 68); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#573a22'; ctx.fillRect(sx - 10, GROUND_Y - 26, 20, 26);
}
function drawNpc(sx, baseY, shirt, accent, key = '') {
  if (key && drawIsoSprite(key, sx, baseY + 2, 92, 92)) return;
  ctx.fillStyle = '#00000022'; ctx.fillRect(sx - 18, baseY + 3, 36, 5); ctx.fillStyle = '#caa180'; ctx.fillRect(sx - 12, baseY - 64, 24, 22); ctx.fillStyle = accent; ctx.fillRect(sx - 12, baseY - 70, 24, 8); ctx.fillStyle = shirt; ctx.fillRect(sx - 14, baseY - 42, 28, 22); ctx.fillStyle = '#4a4f5e'; ctx.fillRect(sx - 12, baseY - 20, 10, 20); ctx.fillRect(sx + 2, baseY - 20, 10, 20); ctx.fillStyle = '#222'; ctx.fillRect(sx - 12, baseY, 10, 4); ctx.fillRect(sx + 2, baseY, 10, 4);
}
function drawCharacter(entity, sx, baseY, appearance, facing = 1) {
  ctx.save(); ctx.translate(sx, 0); if (facing < 0) ctx.scale(-1, 1);
  const walk = Math.sin(entity.anim || 0) * 4; const swing = entity.attackSwing > 0 ? 10 : 0;
  ctx.fillStyle = entity.hitFlash > 0 ? '#fff2f2' : '#00000022'; drawDiamond(0, baseY + 4, 34, 8, ctx.fillStyle, null);
  ctx.fillStyle = appearance.skinTone; ctx.fillRect(-9, baseY - 66, 18, 18); ctx.fillRect(12, baseY - 42, 4, 14);
  if (appearance.hairStyle !== 'bald') { ctx.fillStyle = appearance.hairColor; if (appearance.hairStyle === 'short') ctx.fillRect(-9, baseY - 72, 18, 8); else if (appearance.hairStyle === 'crest') { ctx.fillRect(-3, baseY - 78, 6, 12); ctx.fillRect(-9, baseY - 72, 18, 6); } else ctx.fillRect(-11, baseY - 72, 22, 10); }
  ctx.fillStyle = entity.equipment?.armor ? '#7c8b9c' : appearance.shirtColor; ctx.fillRect(-14, baseY - 44, 28, 24);
  ctx.fillStyle = appearance.pantsColor; ctx.fillRect(-12, baseY - 20, 10, 20 + walk); ctx.fillRect(2, baseY - 20, 10, 20 - walk);
  ctx.fillStyle = '#252525'; ctx.fillRect(-13, baseY, 12, 5); ctx.fillRect(1, baseY, 12, 5);
  if (entity.equipment?.weapon) { ctx.fillStyle = '#b69866'; ctx.fillRect(12, baseY - 38, 3, 26); ctx.fillStyle = '#aeb4bb'; ctx.fillRect(12, baseY - 57 - swing, 3, 20); }
  if (entity.equipment?.shield) { ctx.fillStyle = '#7f6850'; ctx.fillRect(-19, baseY - 36, 8, 15); }
  ctx.restore();
}
function drawObject(obj, cameraX) {
  if (obj.maxHp && obj.hp === 0) return;
  const sx = Math.round(obj.x - cameraX), baseY = obj.y; if (sx < -160 || sx > VIEW_W + 160) return;
  drawDiamond(sx, baseY + 4, Math.max(26, (obj.width || 52) * 0.75), 10, 'rgba(0,0,0,0.16)', null);
  if (obj.type === 'tree') { if (drawIsoSprite('tree', sx, baseY + 2, 112, 112)) return; ctx.fillStyle = '#6a4922'; ctx.fillRect(sx - 10, baseY - 70, 20, 70); ctx.fillStyle = '#29522b'; ctx.fillRect(sx - 28, baseY - 118, 56, 22); ctx.fillRect(sx - 38, baseY - 96, 76, 18); ctx.fillRect(sx - 22, baseY - 82, 44, 14); }
  else if (obj.type === 'fish') { if (drawIsoSprite('fish', sx, baseY + 4, 120, 72)) return; ctx.fillStyle = '#4c8fbe'; ctx.fillRect(sx - 64, baseY - 12, 128, 12); ctx.fillStyle = '#b9e4ff'; ctx.fillRect(sx - 14, baseY - 19, 28, 7); }
  else if (obj.type === 'rockCopper' || obj.type === 'rockTin' || obj.type === 'rockIron') { const key = obj.type; if (drawIsoSprite(key, sx, baseY + 2, 96, 96)) return; ctx.fillStyle = obj.type === 'rockIron' ? '#8c97a2' : obj.type === 'rockTin' ? '#b9c1d0' : '#b37d57'; ctx.fillRect(sx - 30, baseY - 42, 20, 42); ctx.fillRect(sx - 10, baseY - 54, 24, 54); ctx.fillRect(sx + 14, baseY - 28, 18, 28); }
  else if (obj.type === 'forge') { if (drawIsoSprite('forge', sx, baseY + 2, 104, 104)) return; ctx.fillStyle = '#655240'; ctx.fillRect(sx - 32, baseY - 54, 64, 54); ctx.fillStyle = '#23150d'; ctx.fillRect(sx - 16, baseY - 32, 32, 22); ctx.fillStyle = '#f9bb5d'; ctx.fillRect(sx - 10, baseY - 25, 20, 10); }
  else if (obj.type === 'anvil') { if (drawIsoSprite('anvil', sx, baseY + 2, 92, 92)) return; ctx.fillStyle = '#8a949e'; ctx.fillRect(sx - 24, baseY - 20, 48, 14); ctx.fillRect(sx - 10, baseY - 6, 20, 6); }
  else if (obj.type === 'merchant' || obj.type === 'healer' || obj.type === 'banker') { const map = { merchant: ['#dfcf78', '#8d6830', 'merchant'], healer: ['#95d284', '#2b7a4a', 'healer'], banker: ['#a8bdd5', '#4f5f7b', 'banker'] }; drawNpc(sx, baseY, map[obj.type][0], map[obj.type][1], map[obj.type][2]); }
  else if (obj.type === 'bossGate') { if (drawIsoSprite('bossGate', sx, baseY + 2, 124, 124)) return; ctx.fillStyle = '#7a556d'; ctx.fillRect(sx - 46, baseY - 96, 92, 96); ctx.fillStyle = '#c195d4'; ctx.fillRect(sx - 22, baseY - 70, 44, 56); }
}
function drawEnemy(enemy, cameraX) {
  if (!enemy.alive) return;
  const sx = Math.round(enemy.x - cameraX); if (sx < -80 || sx > VIEW_W + 80) return;
  drawDiamond(sx, enemy.y + 4, 34, 10, 'rgba(0,0,0,0.18)', null);
  const key = enemy.name;
  const usedSprite = drawIsoSprite(key, sx, enemy.y + 2, enemy.name === 'Wolf' ? 96 : 92, enemy.name === 'Wolf' ? 72 : 92, enemy.facing > 0);
  if (!usedSprite) {
    const appearance = enemy.name === 'Wolf' ? { skinTone: '#9797a4', hairColor: '#6f6f7a', hairStyle: 'long', shirtColor: '#7f8a91', pantsColor: '#5a6068' } : enemy.name === 'Bandit' ? { skinTone: '#c08d68', hairColor: '#593522', hairStyle: 'short', shirtColor: '#8f4b37', pantsColor: '#4e3327' } : enemy.name === 'Skeleton' ? { skinTone: '#e5e8ee', hairColor: '#e5e8ee', hairStyle: 'bald', shirtColor: '#6d7582', pantsColor: '#6d7582' } : { skinTone: '#b58ca5', hairColor: '#efe8ff', hairStyle: 'crest', shirtColor: '#7e536f', pantsColor: '#4c3946' };
    drawCharacter(enemy, sx, enemy.y, appearance, enemy.facing);
  }
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 26, enemy.y - 98, 52, 6); ctx.fillStyle = '#da4b4b'; ctx.fillRect(sx - 26, enemy.y - 98, 52 * (enemy.hp / enemy.maxHp), 6);
  if (enemy.immunity > 0) { ctx.fillStyle = '#efefc9'; ctx.font = '11px Verdana'; ctx.fillText(`Immune ${enemy.immunity.toFixed(1)}s`, sx - 28, enemy.y - 108); }
  ctx.fillStyle = '#20170a'; ctx.font = '12px Verdana'; ctx.fillText(enemy.name, sx - 30, enemy.y - 116);
}
function drawDrop(drop, cameraX) {
  const sx = Math.round(drop.x - cameraX); if (sx < -40 || sx > VIEW_W + 40) return;
  drawDiamond(sx, GROUND_Y + 2, 24, 8, 'rgba(0,0,0,0.18)', null);
  ctx.fillStyle = '#d8b858'; ctx.fillRect(sx - 10, GROUND_Y - 14, 20, 14);
}


function renderWorld() {
  const p = world.player; const cameraX = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W); world.cameraX = cameraX;
  drawBackground(cameraX);
  for (const hx of [120, 250, 420, 610]) { const sx = hx - cameraX; if (sx < -160 || sx > VIEW_W + 160) continue; drawHouse(sx); }
  for (const obj of world.objects) drawObject(obj, cameraX);
  for (const drop of world.drops) drawDrop(drop, cameraX);
  for (const e of world.enemies) drawEnemy(e, cameraX);
  const px = Math.round(p.x - cameraX);
  drawCharacter(p, px, p.y, p.appearance, p.facing);
  const playerBarY = p.y - 74;
  ctx.fillStyle = '#000'; ctx.fillRect(px - 28, playerBarY, 56, 6); ctx.fillStyle = '#80ff9f'; ctx.fillRect(px - 28, playerBarY, 56 * (p.hp / p.maxHp), 6);
  if (p.immunity > 0) { ctx.fillStyle = '#efe8bf'; ctx.font = '11px Verdana'; ctx.fillText(`Immune ${p.immunity.toFixed(1)}s`, px - 30, p.y - 84); }
  const zone = getZoneAt(p.x);
  ctx.fillStyle = 'rgba(48,38,22,0.8)'; ctx.fillRect(0, VIEW_H - 70, VIEW_W, 70); ctx.strokeStyle = '#bca66f'; ctx.strokeRect(0, VIEW_H - 70, VIEW_W, 70);
  ctx.fillStyle = '#f3ecd3'; ctx.font = '14px Verdana';
  ctx.fillText(`Zone: ${zone.name} | ${p.name} | HP ${p.hp}/${p.maxHp} | Atk ${totalAttack(p)} | Def ${totalDefense(p)} | Coins ${countItem(p.inventory, 'coin')}`, 14, VIEW_H - 42);
  ctx.fillText(world.bossDead ? 'Victory complete. Keep testing, crafting, or hoarding fish like a medieval prepper.' : 'Point-click path: Village -> Timber -> Fish -> Ore -> Ruins -> Warden', 14, VIEW_H - 18);
  const hint = world.task ? `${world.task.label}... ${world.task.duration ? Math.max(0, world.task.timer).toFixed(1) : `${world.task.remaining} left`}` : (world.mouseHint || (p.combat ? 'Combat active. Use H to eat during immunity.' : 'Click ground to move. Click objects or enemies to interact.'));
  ctx.fillStyle = 'rgba(46,36,19,0.75)'; ctx.fillRect(12, 12, 510, 32); ctx.strokeStyle = '#bda56e'; ctx.strokeRect(12, 12, 510, 32); ctx.fillStyle = '#eee1b8'; ctx.font = '13px Verdana'; ctx.fillText(hint, 22, 33);
  if (p.moveTargetX !== null) { const mx = Math.round(p.moveTargetX - cameraX); ctx.strokeStyle = '#fff0ae'; ctx.strokeRect(mx - 8, GROUND_Y - 8, 16, 16); }
}
function renderUI() {
  const p = world.player;
  statsPanel.innerHTML = `<h2>Character</h2>
    <div class="kv"><span>Name</span><span>${p.name}</span></div>
    <div class="kv"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="kv"><span>Attack</span><span>${totalAttack(p)}</span></div>
    <div class="kv"><span>Defense</span><span>${totalDefense(p)}</span></div>
    <div class="kv"><span>Weapon</span><span>${p.equipment.weapon ? itemDefs[p.equipment.weapon].name : 'None'}</span></div>
    <div class="kv"><span>Shield</span><span>${p.equipment.shield ? itemDefs[p.equipment.shield].name : 'None'}</span></div>
    <div class="kv"><span>Armor</span><span>${p.equipment.armor ? itemDefs[p.equipment.armor].name : 'None'}</span></div>
    <div class="kv"><span>Status</span><span>${combatLocked() ? 'In Combat' : p.immunity > 0 ? `Immune ${p.immunity.toFixed(1)}s` : 'Idle'}</span></div>
    <p class="small">Click-to-move and click-to-interact are enabled. After each 3-hit exchange, both sides become immune for 5 seconds.</p>`;
  inventoryPanel.innerHTML = `<h2>Inventory</h2>` + (p.inventory.length ? p.inventory.slice(0, 18).map((it, i) => {
    const def = itemDefs[it.id]; return `<div class="itemRow"><span>${i + 1}. ${def.symbol || ''} ${def.name}${it.qty > 1 ? ` x${it.qty}` : ''}</span><span>${def.slot ? '<span class="badge">equip</span>' : ''}</span></div>`;
  }).join('') : '<p class="small">Empty. Which is bold if a skeleton is nearby.</p>') + `<p class="small">Press 1–9 to equip visible gear items. Eat fish with H.</p>`;
  skillsPanel.innerHTML = `<h2>Skills</h2>${Object.entries(p.skills).map(([k, xp]) => `<div class="kv"><span>${capitalize(k)}</span><span>Lv ${levelFromXp(xp)} (${xp} xp)</span></div>`).join('')}<p class="small">Bank items in the village, smelt at the forge, smith at the anvil, and try not to get mugged by wolves.</p>`;
}

function keyboardMoveIntent() {
  let move = 0;
  if (keys['a'] || keys['arrowleft']) move -= 1;
  if (keys['d'] || keys['arrowright']) move += 1;
  return move;
}
function updateInput(dt) {
  const p = world.player; if (!p || dialogueOpen()) return;
  if ((keys['w'] || keys['arrowup'] || keys[' ']) && p.onGround) { p.vy = JUMP_V; p.onGround = false; }
  const kMove = keyboardMoveIntent();
  if (kMove !== 0) { p.moveTargetX = null; world.pendingAction = null; }
  let move = kMove;
  if (move === 0 && p.moveTargetX !== null && !p.combat && !taskLocked()) {
    const diff = p.moveTargetX - p.x;
    if (Math.abs(diff) <= 4) p.moveTargetX = null;
    else move = Math.sign(diff);
  }
  if (move !== 0 && !p.combat && !taskLocked()) { p.x += move * PLAYER_SPEED * dt; p.x = clamp(p.x, 30, WORLD_W - 30); p.facing = move >= 0 ? 1 : -1; }
  p.vy += GRAVITY * dt; p.y += p.vy * dt; if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
}

function drawCreatorPreview() {
  const appearance = getAppearanceFromForm();
  pctx.clearRect(0, 0, creatorPreview.width, creatorPreview.height);
  pctx.fillStyle = '#97bed0'; pctx.fillRect(0, 0, 220, 220); pctx.fillStyle = '#7d9363'; pctx.fillRect(0, 148, 220, 72); pctx.fillStyle = '#7e755d'; pctx.fillRect(0, 188, 220, 32);
  drawCharacter({ equipment: {}, anim: 0, attackSwing: 0, hitFlash: 0, immunity: 0 }, 110, 160, appearance, 1);
}

function getTargetAtScreen(sx, sy) {
  const worldX = sx + world.cameraX;
  for (const e of world.enemies) if (e.alive && Math.abs(worldX - e.x) <= 26 && sy >= GROUND_Y - 110 && sy <= GROUND_Y + 10) return { kind: 'enemy', ref: e };
  for (const obj of world.objects) {
    if (obj.maxHp && obj.hp <= 0) continue;
    const halfW = Math.max(24, (obj.width || 48) / 2);
    if (Math.abs(worldX - obj.x) <= halfW && sy >= GROUND_Y - 130 && sy <= GROUND_Y + 10) return { kind: 'object', ref: obj };
  }
  for (const d of world.drops) if (Math.abs(worldX - d.x) <= 20 && sy >= GROUND_Y - 30) return { kind: 'drop', ref: d };
  return { kind: 'ground', x: snap(worldX) };
}
function handleCanvasMove(ev) {
  if (!gameStarted) return;
  const rect = canvas.getBoundingClientRect();
  const sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const target = getTargetAtScreen(sx, sy);
  if (target.kind === 'ground') world.mouseHint = `Click to walk to tile ${target.x / TILE}.`;
  else if (target.kind === 'enemy') world.mouseHint = `Click to attack ${target.ref.name}.`;
  else if (target.kind === 'drop') world.mouseHint = 'Click to loot drop.';
  else if (target.ref.type === 'fish') world.mouseHint = 'Click to fish (3-5s wait).';
  else world.mouseHint = `Click to use ${friendlyName(target.ref.type)}.`;
}
function handleCanvasClick(ev) {
  if (!gameStarted || dialogueOpen()) return;
  const rect = canvas.getBoundingClientRect();
  const sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const target = getTargetAtScreen(sx, sy);
  const p = world.player;
  if (target.kind === 'ground') {
    if (!combatLocked()) { p.moveTargetX = clamp(target.x, 30, WORLD_W - 30); world.pendingAction = null; }
    return;
  }
  if (combatLocked() && target.kind !== 'enemy') { log('You cannot interact with that while in combat.', 'bad'); return; }
  world.pendingAction = target;
  p.moveTargetX = target.ref.x;
  if (Math.abs(p.x - target.ref.x) <= (target.kind === 'enemy' ? 60 : 56)) updatePendingAction();
}

function startNewGame() {
  buildWorld(); world.player = makePlayer(getAppearanceFromForm()); creator.classList.add('hidden'); document.body.classList.remove('creatorMode'); creatorActive = false; gameStarted = true; hideDialogue();
  log(`Welcome to Manala, ${world.player.name}.`, 'good');
  log('Click the ground to move, click NPCs/resources/enemies to interact, or press E when standing nearby.', '');
  log('Combat lock bug patched: while fighting, resource/NPC interactions are blocked until combat or immunity logic resolves.', 'good');
  log('v7 changes: timed fishing, Cook All / Smelt All, hybrid pseudo-isometric art pass, and first external sprite pass.', 'good');
}

for (const el of [nameInput, skinToneSelect, hairStyleSelect, hairColorSelect, shirtColorSelect, pantsColorSelect]) { el.addEventListener('input', drawCreatorPreview); el.addEventListener('change', drawCreatorPreview); }
startBtn.addEventListener('click', startNewGame);
continueBtn.addEventListener('click', () => { if (!loadGame()) log('No save to continue.', 'bad'); });
saveBtn.addEventListener('click', saveGame);
loadBtn.addEventListener('click', loadGame);
deleteSaveBtn.addEventListener('click', deleteSave);
canvas.addEventListener('mousemove', handleCanvasMove);
canvas.addEventListener('click', handleCanvasClick);
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase(); keys[key] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) e.preventDefault();
  if (!gameStarted) return;
  if (key === 'escape' && dialogueOpen()) hideDialogue();
  if (dialogueOpen()) return;
  if (key === 'e') interact();
  if (key === 'h') useFood();
  if (/^[1-9]$/.test(key)) equipIndex(Number(key) - 1);
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function init() { document.body.classList.add('creatorMode'); drawCreatorPreview(); continueBtn.disabled = !localStorage.getItem(SAVE_KEY); }
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (gameStarted) { updateInput(dt); updateWorld(dt); renderWorld(); renderUI(); }
  requestAnimationFrame(loop);
}
init(); requestAnimationFrame(loop);
