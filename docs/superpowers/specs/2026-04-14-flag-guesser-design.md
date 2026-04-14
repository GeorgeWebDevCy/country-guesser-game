# Flag Guesser Game — Design Spec

**Date:** 2026-04-14
**Target user:** 9-year-old nephew
**Platform:** Windows desktop app (Electron, offline-capable)

---

## Overview

A flag guessing game delivered as a Windows installer. The player picks a difficulty and continent, then identifies flags from multiple-choice answers against a 5-minute countdown. At the end they see a rating and a list of any flags they got wrong.

---

## Tech Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| App shell | Electron | Packages as a proper Windows `.exe` installer; works offline; no browser required |
| Frontend | Vanilla HTML/CSS/JS | 3-screen app — no framework needed |
| Bundler | Vite | Fast dev server, clean production build |
| Installer | electron-builder | Generates a Windows NSIS installer |
| Flag images | `flag-icons` npm package | SVG flags bundled locally — fully offline |

---

## Project Structure

```text
country-guesser-game/
├── main.js                  # Electron main process — window creation & lifecycle
├── src/
│   ├── index.html           # Single HTML shell — all 3 screens live here
│   ├── style.css            # Theme: teal-to-green gradient, orange accents
│   ├── app.js               # Screen router — swaps active screen
│   ├── screens/
│   │   ├── setup.js         # Screen 1: difficulty + continent selection
│   │   ├── game.js          # Screen 2: flag display, answers, timer
│   │   └── results.js       # Screen 3: rating, mistake list, replay buttons
│   └── data/
│       └── countries.js     # ~195 countries: { name, continent, code }
├── package.json             # Dependencies + electron-builder config
└── docs/
    └── superpowers/specs/
        └── 2026-04-14-flag-guesser-design.md
```

---

## Visual Theme

Theme C — Adventure Map:

- Background: teal-to-green gradient (`#134e5e` → `#71b280`)
- Answer cards: white/light with coloured borders
- Primary action buttons: orange (`#ff6b35`)
- Correct answer highlight: green
- Wrong answer highlight: red
- Fonts: large and bold throughout — designed for a 9-year-old

---

## Screen 1 — Setup

The first screen the player sees on launch.

Elements:

- Game title at top: "🌍 FLAG GUESSER"
- **Difficulty selector** — 3 buttons, one active at a time:
  - Easy (2 answer choices)
  - Medium (5 answer choices)
  - Hard (10 answer choices)
- Small label under difficulty explaining what each level means
- **Continent selector** — grid of buttons, one active at a time:
  - Africa, Asia, Europe, North America, South America, Oceania, **All**
- **START GAME** button — disabled until both difficulty and continent are selected

---

## Screen 2 — Game

Layout (top to bottom):

1. **Top bar** — question counter (e.g. "Question 3 / 54"), countdown timer (⏱ 4:23), mistake count
2. **Flag area** — large flag image centred; label "WHICH COUNTRY IS THIS?" underneath
3. **Answer choices** — stacked vertically for Easy/Medium; 2-column grid for Hard (10 options)
4. **NEXT button** — hidden until the player picks an answer; appears below the choices

Answer interaction:

- Player taps a choice → button turns green (correct) or red (wrong) immediately
- All other buttons are disabled after a pick
- NEXT button appears; player must press it to advance

Timer:

- Counts down from 5:00
- Displayed in the top bar
- When it reaches 0:00 the game ends immediately and navigates to Screen 3; any flag the player had not yet answered counts as a mistake

Difficulty → answer count:

| Difficulty | Total choices shown |
| --- | --- |
| Easy | 2 (1 correct + 1 wrong) |
| Medium | 5 (1 correct + 4 wrong) |
| Hard | 10 (1 correct + 9 wrong) — 2-column grid |

Wrong choices are drawn randomly from the same continent pool (or the full world pool if "All" was selected).

---

## Screen 3 — Results

Layout:

1. **Rating** — large word + emoji centred at the top
2. **Score summary** — "X mistakes out of Y flags · Z:ZZ remaining" (or "Time ran out!" if timer expired)
3. **Mistakes list** — scrollable list of flags the player got wrong: flag image + country name
4. **Two buttons** at the bottom:
   - **← Back** — returns to Screen 1 (setup)
   - **Try Again 🔄** — replays same continent/difficulty with the countries reshuffled

Rating thresholds *(documented here — easy to adjust if nephew wants different rules later):*

| Rating | Condition |
| --- | --- |
| 🏆 Excellent | Fewer than 3 mistakes |
| 👍 Good | Mistakes ≤ 50% of total questions |
| 😬 Bad | Mistakes > 50% of total questions |

---

## Game Logic

### Country data shape

```js
{ name: "Brazil", continent: "South America", code: "br" }
```

`code` is the ISO 3166-1 alpha-2 country code, used to load the flag from `flag-icons`.

### Session flow

1. Load all countries matching the selected continent (or all countries if "All")
2. Shuffle the list randomly
3. For each country in turn:
   - Display its flag
   - Pick (difficulty − 1) random wrong answers from the same pool
   - Shuffle correct + wrong answers together
   - Show choices; wait for player input
   - Show result; show NEXT button
4. After all countries are done **or** timer hits 0:00 → navigate to Screen 3

### Try Again behaviour

- Same continent and difficulty settings
- Country list is reshuffled — different order every time
- Timer resets to 5:00

---

## Packaging & Distribution

- `npm run build` → Vite builds the frontend into `dist/`
- `npm run make` → electron-builder packages into a Windows NSIS installer
- Output: a single `.exe` installer the nephew can run on any Windows PC
- App works fully offline after install (all flags bundled locally)

---

## Out of Scope

- Sound effects (can be added later)
- Persistent high scores / leaderboard (can be added later)
- Multiplayer
- Mobile / macOS builds
