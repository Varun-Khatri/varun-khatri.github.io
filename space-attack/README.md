# Space Attack

A self-contained retro arcade space shooter built with HTML5 Canvas, vanilla JavaScript, CSS, and optional procedural Web Audio. No build step or server is required.

## Play

Open `index.html` in a modern browser. Choose **Start Game** or press **Enter/Space**.

- Move: **A/D** or **←/→**
- Fire: **Space**
- Sound: toggle in the top-right corner
- Pause/resume: **Pause** button, **P**, or **Esc**
- Return to title: **Back to Menu** on the pause or game-over screen

Space starts a run only from the title screen; during a run it fires. From Game Over, use **Enter** or the **Restart** button.

## Project files

- `index.html` — game shell and HUD
- `style.css` — responsive arcade presentation
- `game.js` — game loop, waves, input, collisions, effects, and audio

The canvas uses a fixed 16:9 logical playfield and scales to the available browser width. All artwork and effects are drawn procedurally.

## Wave and weapon progression

Threat follows a six-wave oscillation: the first waves build toward a peak, then the next waves ease off before the cycle rises again. Later cycles get a small difficulty lift. Enemy count, movement speed, enemy roster, and firing cadence follow that curve. Enemy ships use aimed shots, fans, bursts, spirals, rings, and cross patterns as the roster expands.

Enemies can drop temporary **Spread**, **Orbit**, or **Lance** weapons. Pick one up by flying into its diamond; the HUD shows the active weapon and its remaining time. Weapon duration is longer during calmer parts of the cycle and shorter at the peak.

Damaged pilots may also find a heart pickup to restore one hull point, up to the three-life maximum.
