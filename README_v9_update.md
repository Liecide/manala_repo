# Manala v9 art / style update

This package is a **repo update** focused on moving the game's look closer to a **RuneScape Classic inspired** style.

## Contents

- new sprite assets for player / NPC / enemy / object / item / tile
- `src/rsc_theme.css` for RSC-like UI and palette overrides
- `src/spriteManifest.js` helper for loading and drawing sprites
- `docs/v9_art_direction.md` integration notes

## Intended use

Copy these files into the root of your local `manala_repo`, then wire the assets into your existing render code.

### Basic integration

In `index.html`, include after your main stylesheet:

```html
<link rel="stylesheet" href="src/rsc_theme.css">
<script src="src/spriteManifest.js"></script>
```

## Commit suggestion

`Manala v9: RSC-style art pass, sprite pipeline, pseudo-isometric theme`