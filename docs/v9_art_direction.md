# Manala v9 art direction

This update focuses on pushing **Manala** closer to a **RuneScape Classic inspired** look.

## Goals

- heavier use of muted earth tones
- pseudo-isometric / angled presentation
- painted-looking low-res sprites with hard outlines
- more old-school UI framing and button treatment
- item, NPC, enemy, and world object art that reads cleanly at small sizes

## Included assets

### Player
- `assets/sprites/player/base_idle.png`
- `assets/sprites/player/weapon_idle.png`
- `assets/sprites/player/warrior_idle.png`
- `assets/sprites/player/warrior_armor_idle.png`

### NPCs
- banker
- merchant
- healer

### Enemies
- wolf

### Objects
- oak tree
- ore rock
- forge
- anvil
- bank

### Items
- bronze sword
- bronze ore
- cooked fish

### Tiles
- pseudo-isometric grass tile

## Integration notes

1. Load `src/rsc_theme.css` after the main stylesheet so it overrides colors cleanly.
2. Use the sprite files in place of primitive canvas rectangles where available.
3. Keep image smoothing disabled:
   - `ctx.imageSmoothingEnabled = false`
4. Draw sprites at integer coordinates only to avoid blur.
5. Scale by whole multiples where possible (1x / 2x / 3x).

## Suggested next pass

- full player animation set: idle / walk / attack / hit / death
- more enemies: bandit, skeleton, warden
- building kit for village / fence / door / wall pieces
- hover verbs and yellow target labels
- dialogue portraits