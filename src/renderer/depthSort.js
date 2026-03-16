export function depthSort(entities) {
  return [...entities].sort((a, b) => {
    const ad = (a.x + a.y) + (a.sortBias || 0);
    const bd = (b.x + b.y) + (b.sortBias || 0);
    return ad - bd;
  });
}
