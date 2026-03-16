// Manala v9 sprite manifest and helpers
// Drop this into the repo and import/use where convenient.

window.MANALA_SPRITES = {
  player: {
    baseIdle: 'assets/sprites/player/base_idle.png',
    weaponIdle: 'assets/sprites/player/weapon_idle.png',
    warriorIdle: 'assets/sprites/player/warrior_idle.png',
    warriorArmorIdle: 'assets/sprites/player/warrior_armor_idle.png',
  },
  npcs: {
    banker: 'assets/sprites/npcs/banker.png',
    merchant: 'assets/sprites/npcs/merchant.png',
    healer: 'assets/sprites/npcs/healer.png',
  },
  enemies: {
    wolf: 'assets/sprites/enemies/wolf.png',
  },
  objects: {
    treeOak: 'assets/sprites/objects/tree_oak.png',
    oreRock: 'assets/sprites/objects/ore_rock.png',
    forge: 'assets/sprites/objects/forge.png',
    anvil: 'assets/sprites/objects/anvil.png',
    bank: 'assets/sprites/objects/bank.png',
  },
  items: {
    bronzeSword: 'assets/items/bronze_sword.png',
    bronzeOre: 'assets/items/bronze_ore.png',
    cookedFish: 'assets/items/cooked_fish.png',
  },
  tiles: {
    grassIso: 'assets/tiles/grass_iso.png',
  }
};

window.loadManalaSprites = async function loadManalaSprites(map = window.MANALA_SPRITES) {
  const flat = {};
  const visit = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const name = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') flat[name] = value;
      else visit(value, name);
    }
  };
  visit(map);

  const loaded = {};
  await Promise.all(Object.entries(flat).map(([name, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { loaded[name] = img; resolve(); };
    img.onerror = () => { console.warn('Sprite failed to load:', src); resolve(); };
    img.src = src;
  })));
  return loaded;
};

window.drawSpritePixelPerfect = function drawSpritePixelPerfect(ctx, img, x, y, w, h) {
  if (!ctx || !img) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
};