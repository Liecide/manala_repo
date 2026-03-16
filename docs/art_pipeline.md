# Manala v15 art pipeline

This pass moves the renderer and assets closer to a RuneScape Classic style by using:

- muted shared palette
- painted low-resolution SVG sprites
- simple ellipse shadows
- pseudo-isometric diamond tiles
- depth sorting by world position

## Asset sizing baseline

- tiles: 84x42 display space
- characters: roughly 48x64 source feel
- objects: roughly 64x64 to 88x116 depending on footprint
- items: 32x32

## Next art step after v15

- directional sprite variants
- 2-4 frame walk cycles for NPCs and enemies
- more tile blending and environment clutter
- world-specific palette shifts
