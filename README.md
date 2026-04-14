# Flag Guesser

A flag guessing game built for Windows. Pick a continent and difficulty, then race against a 5-minute countdown to identify as many flags as you can from multiple-choice answers.

Built for a 9-year-old nephew. Works fully offline after installation.

---

## How to Play

1. **Choose difficulty** — Easy (2 choices), Medium (5 choices), or Hard (10 choices)
2. **Choose a continent** — or pick "All Countries" to see flags from the whole world
3. **Press START GAME** — a flag appears; tap the right country name
4. **Beat the clock** — you have 5 minutes to get through every flag in the pool
5. **See your results** — rating, mistake list, and a replay button at the end

### Ratings

| Rating | Condition |
| ------ | --------- |
| 🏆 Excellent | Fewer than 3 mistakes |
| 👍 Good | Mistakes ≤ 50% of total flags |
| 😬 Bad luck | Mistakes > 50% of total flags |

High scores are saved automatically per continent + difficulty combination (top 10 per combo, stored locally).

---

## Tech Stack

| Layer | Choice |
| ----- | ------ |
| App shell | Electron 30 |
| Frontend | Vanilla HTML / CSS / JS |
| Bundler | Vite 5 |
| Installer | electron-builder (NSIS) |
| Flag images | `flag-icons` npm package — bundled offline |
| Sounds | Web Audio API — synthesised, no audio files |
| Scores | JSON file in Electron `userData` — survives app updates |

---

## Requirements (development only)

- [Node.js](https://nodejs.org) 18 or later (includes npm)
- Windows, macOS, or Linux for development; the built installer targets Windows

---

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd country-guesser-game

# Start the dev server + Electron window
# (npm install runs automatically if node_modules is missing)
npm run dev
```

The app opens maximised. Vite serves the frontend on port 5173; Electron loads it from there in dev mode.

---

## Available Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start Vite dev server + Electron (auto-installs deps if missing) |
| `npm test` | Run the Vitest unit test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Build the frontend into `dist/renderer/` |
| `npm run make` | Build frontend + package as a Windows NSIS installer |

---

## Building the Installer

```bash
npm run make
```

This runs `vite build` then `electron-builder`. The output is a Windows NSIS installer (`.exe`) in the `dist/` folder. The installer bundles everything — the app works fully offline with no internet connection required.

---

## Project Structure

```text
country-guesser-game/
├── main.js                  # Electron main process — window + IPC score handlers
├── preload.js               # contextBridge — exposes score API to renderer
├── src/
│   ├── index.html           # HTML shell
│   ├── style.css            # Adventure Map theme (teal/green/orange)
│   ├── app.js               # Screen router
│   ├── audio.js             # Synthesised sound effects (Web Audio API)
│   ├── scores.js            # IPC wrapper for high scores
│   ├── utils.js             # Pure game logic (shuffle, choices, rating, timer)
│   ├── screens/
│   │   ├── setup.js         # Screen 1 — difficulty + continent selection
│   │   ├── game.js          # Screen 2 — flag display, answers, countdown
│   │   └── results.js       # Screen 3 — rating, mistakes, replay
│   └── data/
│       └── countries.js     # 196 countries: { name, continent, code }
├── tests/
│   └── utils.test.js        # 18 unit tests for game logic
├── vite.config.js           # Vite config — bundles flag SVGs for offline use
└── package.json
```

---

## Offline Capability

The app is fully self-contained after installation:

- **Flag images** — all SVGs are bundled from the `flag-icons` package at build time (no CDN)
- **Sounds** — synthesised at runtime via the Web Audio API (no audio files)
- **High scores** — stored in a local JSON file (`%APPDATA%\Flag Guesser\scores.json`)
- **No network calls** — the app never makes any HTTP requests

---

## Country Data

196 countries across 6 continents:

| Continent | Count |
| --------- | ----- |
| Africa | 54 |
| Asia | 48 |
| Europe | 45 |
| North America | 23 |
| Oceania | 14 |
| South America | 12 |

Each entry: `{ name, continent, code }` where `code` is the ISO 3166-1 alpha-2 code used to load the flag icon.
