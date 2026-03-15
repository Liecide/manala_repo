# Manala

Local RuneScape Classic-inspired MMORPG prototype.

This repository-ready package uses the working **v7** prototype as the current baseline, reorganized into a cleaner structure so future builds stop depending on temporary chat-session zip files.

## Current state

- Local offline browser prototype
- Combat uses a 3-hit simultaneous exchange followed by a 5-second immunity window
- Timed fishing with fish / nothing / junk outcomes
- Cook All / Smelt All batch actions at the forge
- Hybrid pseudo-isometric first-pass camera and ground presentation
- First external RSC-style sprite pass for world objects and enemies
- Click-to-move and click-to-interact gameplay
- Bank, smithing, smelting, fishing, mining, woodcutting
- Save/load with browser local storage

## Run locally

### Fastest option
Open `index.html` in a browser.

### Recommended option
Run a tiny local web server from the repo root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Repository structure

```text
manala_repo/
├── index.html
├── README.md
├── .gitignore
├── LICENSE
├── docs/
│   ├── roadmap.md
│   └── legacy_README_v6b.txt
├── src/
│   ├── game.js
│   └── styles.css
├── assets/
│   ├── sprites/
│   ├── items/
│   ├── tiles/
│   └── ui/
└── scripts/
    └── zip_release.py
```

## Planned next work

The next planned milestone is **v8**:

- More complete external sprite-sheet pipeline for the player and UI
- Hover verbs and classic interaction labels
- Better tile/pathfinding behavior
- Additional skilling animations and dialogue polish
- Stronger pseudo-isometric map composition

## Suggested GitHub setup

From the repo root:

```bash
git init
git add .
git commit -m "Initial Manala repo scaffold from working v6b prototype"
```

Then create a GitHub repo and push:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## Notes

- Save data is stored in the browser local storage.
- This package is repo-ready, but I cannot directly create or host a GitHub repository from inside this chat environment.
