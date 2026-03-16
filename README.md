# Manala v10 Repo Update

This package is a renderer-focused update that pivots the prototype toward a RuneScape Classic-inspired faux 3/4 camera style.

## Included
- `index.html`
- `src/game.js`
- `src/styles.css`
- first-pass placeholder sprite assets
- faux isometric grass tile

## What this build does
- renders a hybrid pseudo-isometric tile map
- uses depth-sorted sprites
- shows classic hover verbs
- lets you click to move / click near targets

## Important
This is intentionally a renderer/camera integration pass rather than a full gameplay merge with every previous system. It is best used as a visual/style baseline for the next integrated version.

## Run locally
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`
