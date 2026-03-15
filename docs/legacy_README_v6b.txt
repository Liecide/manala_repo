Manala v6 Prototype
===================

How to run
----------
1. Unzip the folder.
2. Open index.html in a browser.
3. If your browser gets weird about local files, run a local server:
   python -m http.server 8000
   Then open http://localhost:8000

Controls
--------
- Left click ground: move
- Left click NPC/resource/enemy/drop: move to it and interact
- A / D or Left / Right: keyboard movement
- W / Up / Space: jump
- E: interact with nearby object manually
- H: eat cooked fish
- 1-9: equip visible inventory gear
- Save / Load buttons: browser local save

What's in this recreated v6 package
----------------
- Point-and-click movement
- Mouse interactions for NPCs, bank, forge, trees, rocks, fish, enemies, and drops
- Tile-based ground presentation and snapped world positions
- Bank vault grid with item icons and withdraw buttons
- Better dialogue UI for bank/vendor/forge/anvil/healer
- Combat lock fix: non-combat interactions are blocked while in combat
- 5 second immunity after each 3-hit combat cycle

Prototype notes
---------------
This is still a local offline prototype, not a networked MMO. Save data is stored in the browser.


Notes:
- combat hang fail-safe and stricter interaction lock while fighting
- creator screen no longer shows the moving game scene behind the modal
- save key bumped to v5
