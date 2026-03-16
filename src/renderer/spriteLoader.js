const spriteMap = new Map();
const spriteStatus = new Map();

export async function loadSprites(entries) {
  const results = await Promise.allSettled(entries.map(([key, path]) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      spriteMap.set(key, img);
      spriteStatus.set(key, { ok: true, path });
      resolve({ key, ok: true });
    };
    img.onerror = () => {
      spriteStatus.set(key, { ok: false, path });
      resolve({ key, ok: false, path });
    };
    img.src = path;
  })));

  return results.map(r => r.value).filter(Boolean);
}

export function getSprite(key) {
  return spriteMap.get(key) || null;
}

export function getSpriteStatus() {
  return spriteStatus;
}
