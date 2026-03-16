const spriteMap = new Map();

export async function loadSprites(entries) {
  await Promise.all(entries.map(([key, path]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { spriteMap.set(key, img); resolve(); };
    img.onerror = reject;
    img.src = path;
  })));
}

export function getSprite(key) {
  return spriteMap.get(key) || null;
}
