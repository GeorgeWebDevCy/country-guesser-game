# Flag Guesser Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows Electron app where a 9-year-old guesses country names from flags, with difficulty selection, a 5-minute timer, sound effects, and persistent high scores.

**Architecture:** Single-page Electron app; three screens rendered by vanilla JS into a root `#app` div; screen router in `app.js` swaps screens by calling each screen's `render(container, data)` function. All dynamic DOM content uses `textContent` or `createElement` — never raw string injection into the DOM. Pure game logic lives in `src/utils.js` (unit-tested with Vitest). High scores are stored as JSON in Electron `userData` via IPC and exposed to the renderer through `contextBridge`.

**Tech Stack:** Electron 30, Vite 5, Vitest, flag-icons (SVG flags bundled offline via vite-plugin-static-copy), electron-builder (Windows NSIS installer), Web Audio API (synthesised sounds — no audio files needed), concurrently + wait-on (dev runner).

> **Security note:** All dynamic content inserted into the DOM (country names, scores, times) comes from our own static `COUNTRIES` constant and computed numeric values — never from external user input. Nevertheless, all dynamic text is set via `textContent` or `setAttribute`, never via string concatenation into a markup setter, following DOM API best practice.

---

## File Map

| File | Purpose |
| --- | --- |
| `main.js` | Electron main process — window, IPC handlers, scores file I/O |
| `preload.js` | contextBridge — exposes `window.electronAPI.{loadScores, saveScore}` |
| `vite.config.js` | Vite config — base `./`, copies flag SVGs into `dist/renderer/flags/` |
| `src/index.html` | Minimal HTML shell — just `<div id="app">` |
| `src/style.css` | Global theme: teal-to-green gradient, orange buttons |
| `src/app.js` | Screen router — `showScreen(name, data)` |
| `src/utils.js` | Pure game logic: shuffle, filter, choices, rating, formatTime, addScore |
| `src/audio.js` | Web Audio API sound engine — correct, wrong, complete, timeout, tick |
| `src/scores.js` | Thin renderer-side wrapper around `window.electronAPI` |
| `src/data/countries.js` | All ~195 countries: `{ name, continent, code }` |
| `src/screens/setup.js` | Screen 1 — difficulty + continent picker, high-scores overlay |
| `src/screens/game.js` | Screen 2 — timer, flag, answer choices, Next button |
| `src/screens/results.js` | Screen 3 — rating, mistake list, Back / Try Again |
| `tests/utils.test.js` | Vitest unit tests for all functions in `src/utils.js` |

---

## Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `vite.config.js`
- Create: `main.js`
- Create: `preload.js`
- Create: `src/index.html`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "flag-guesser",
  "version": "1.0.0",
  "description": "Flag guessing game for Windows",
  "main": "main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "make": "npm run build && electron-builder"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "electron": "^30.0.0",
    "electron-builder": "^24.13.3",
    "vite": "^5.2.0",
    "vite-plugin-static-copy": "^1.0.6",
    "vitest": "^1.5.0",
    "wait-on": "^7.2.0"
  },
  "dependencies": {
    "flag-icons": "^7.2.3"
  },
  "build": {
    "appId": "com.flagguesser.app",
    "productName": "Flag Guesser",
    "win": {
      "target": "nsis"
    },
    "files": [
      "dist/**/*",
      "main.js",
      "preload.js"
    ]
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: './',
  root: 'src',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/flag-icons/flags/4x3/*.svg',
          dest: 'flags',
        },
      ],
    }),
  ],
  server: { port: 5173 },
})
```

- [ ] **Step 4: Create `main.js`**

```js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged
const SCORES_FILE = path.join(app.getPath('userData'), 'scores.json')

function loadScoresFile() {
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')) }
  catch { return {} }
}

function saveScoresFile(data) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(data, null, 2))
}

function updateTopScores(current, newEntry) {
  const updated = [...current, newEntry]
  updated.sort((a, b) =>
    a.mistakes !== b.mistakes
      ? a.mistakes - b.mistakes
      : b.timeRemaining - a.timeRemaining
  )
  return updated.slice(0, 10)
}

ipcMain.handle('scores:load', (_, continent, difficulty) => {
  const data = loadScoresFile()
  return data[`${continent}:${difficulty}`] || []
})

ipcMain.handle('scores:save', (_, { continent, difficulty, entry }) => {
  const data = loadScoresFile()
  const key = `${continent}:${difficulty}`
  data[key] = updateTopScores(data[key] || [], entry)
  saveScoresFile(data)
  return data[key]
})

function createWindow() {
  const win = new BrowserWindow({
    width: 800, height: 700, minWidth: 600, minHeight: 600,
    title: 'Flag Guesser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist/renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- [ ] **Step 5: Create `preload.js`**

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadScores: (continent, difficulty) =>
    ipcRenderer.invoke('scores:load', continent, difficulty),
  saveScore: (continent, difficulty, entry) =>
    ipcRenderer.invoke('scores:save', { continent, difficulty, entry }),
})
```

- [ ] **Step 6: Create `src/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flag Guesser</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./app.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 8: Start the app in dev mode to confirm it launches**

```bash
npm run dev
```

Expected: Electron window opens showing a blank page (no content yet — that's fine). No crash.

- [ ] **Step 9: Commit**

```bash
git add package.json vite.config.js main.js preload.js src/index.html .gitignore
git commit -m "feat: project scaffold — Electron + Vite + electron-builder"
```

---

## Task 2: Country Data

**Files:**

- Create: `src/data/countries.js`

- [ ] **Step 1: Create `src/data/countries.js`**

```js
export const COUNTRIES = [
  // Africa (54)
  { name: 'Algeria', continent: 'Africa', code: 'dz' },
  { name: 'Angola', continent: 'Africa', code: 'ao' },
  { name: 'Benin', continent: 'Africa', code: 'bj' },
  { name: 'Botswana', continent: 'Africa', code: 'bw' },
  { name: 'Burkina Faso', continent: 'Africa', code: 'bf' },
  { name: 'Burundi', continent: 'Africa', code: 'bi' },
  { name: 'Cabo Verde', continent: 'Africa', code: 'cv' },
  { name: 'Cameroon', continent: 'Africa', code: 'cm' },
  { name: 'Central African Republic', continent: 'Africa', code: 'cf' },
  { name: 'Chad', continent: 'Africa', code: 'td' },
  { name: 'Comoros', continent: 'Africa', code: 'km' },
  { name: 'DR Congo', continent: 'Africa', code: 'cd' },
  { name: 'Republic of Congo', continent: 'Africa', code: 'cg' },
  { name: 'Djibouti', continent: 'Africa', code: 'dj' },
  { name: 'Egypt', continent: 'Africa', code: 'eg' },
  { name: 'Equatorial Guinea', continent: 'Africa', code: 'gq' },
  { name: 'Eritrea', continent: 'Africa', code: 'er' },
  { name: 'Eswatini', continent: 'Africa', code: 'sz' },
  { name: 'Ethiopia', continent: 'Africa', code: 'et' },
  { name: 'Gabon', continent: 'Africa', code: 'ga' },
  { name: 'Gambia', continent: 'Africa', code: 'gm' },
  { name: 'Ghana', continent: 'Africa', code: 'gh' },
  { name: 'Guinea', continent: 'Africa', code: 'gn' },
  { name: 'Guinea-Bissau', continent: 'Africa', code: 'gw' },
  { name: 'Ivory Coast', continent: 'Africa', code: 'ci' },
  { name: 'Kenya', continent: 'Africa', code: 'ke' },
  { name: 'Lesotho', continent: 'Africa', code: 'ls' },
  { name: 'Liberia', continent: 'Africa', code: 'lr' },
  { name: 'Libya', continent: 'Africa', code: 'ly' },
  { name: 'Madagascar', continent: 'Africa', code: 'mg' },
  { name: 'Malawi', continent: 'Africa', code: 'mw' },
  { name: 'Mali', continent: 'Africa', code: 'ml' },
  { name: 'Mauritania', continent: 'Africa', code: 'mr' },
  { name: 'Mauritius', continent: 'Africa', code: 'mu' },
  { name: 'Morocco', continent: 'Africa', code: 'ma' },
  { name: 'Mozambique', continent: 'Africa', code: 'mz' },
  { name: 'Namibia', continent: 'Africa', code: 'na' },
  { name: 'Niger', continent: 'Africa', code: 'ne' },
  { name: 'Nigeria', continent: 'Africa', code: 'ng' },
  { name: 'Rwanda', continent: 'Africa', code: 'rw' },
  { name: 'Sao Tome and Principe', continent: 'Africa', code: 'st' },
  { name: 'Senegal', continent: 'Africa', code: 'sn' },
  { name: 'Seychelles', continent: 'Africa', code: 'sc' },
  { name: 'Sierra Leone', continent: 'Africa', code: 'sl' },
  { name: 'Somalia', continent: 'Africa', code: 'so' },
  { name: 'South Africa', continent: 'Africa', code: 'za' },
  { name: 'South Sudan', continent: 'Africa', code: 'ss' },
  { name: 'Sudan', continent: 'Africa', code: 'sd' },
  { name: 'Tanzania', continent: 'Africa', code: 'tz' },
  { name: 'Togo', continent: 'Africa', code: 'tg' },
  { name: 'Tunisia', continent: 'Africa', code: 'tn' },
  { name: 'Uganda', continent: 'Africa', code: 'ug' },
  { name: 'Zambia', continent: 'Africa', code: 'zm' },
  { name: 'Zimbabwe', continent: 'Africa', code: 'zw' },

  // Asia (48)
  { name: 'Afghanistan', continent: 'Asia', code: 'af' },
  { name: 'Armenia', continent: 'Asia', code: 'am' },
  { name: 'Azerbaijan', continent: 'Asia', code: 'az' },
  { name: 'Bahrain', continent: 'Asia', code: 'bh' },
  { name: 'Bangladesh', continent: 'Asia', code: 'bd' },
  { name: 'Bhutan', continent: 'Asia', code: 'bt' },
  { name: 'Brunei', continent: 'Asia', code: 'bn' },
  { name: 'Cambodia', continent: 'Asia', code: 'kh' },
  { name: 'China', continent: 'Asia', code: 'cn' },
  { name: 'Cyprus', continent: 'Asia', code: 'cy' },
  { name: 'Georgia', continent: 'Asia', code: 'ge' },
  { name: 'India', continent: 'Asia', code: 'in' },
  { name: 'Indonesia', continent: 'Asia', code: 'id' },
  { name: 'Iran', continent: 'Asia', code: 'ir' },
  { name: 'Iraq', continent: 'Asia', code: 'iq' },
  { name: 'Israel', continent: 'Asia', code: 'il' },
  { name: 'Japan', continent: 'Asia', code: 'jp' },
  { name: 'Jordan', continent: 'Asia', code: 'jo' },
  { name: 'Kazakhstan', continent: 'Asia', code: 'kz' },
  { name: 'Kuwait', continent: 'Asia', code: 'kw' },
  { name: 'Kyrgyzstan', continent: 'Asia', code: 'kg' },
  { name: 'Laos', continent: 'Asia', code: 'la' },
  { name: 'Lebanon', continent: 'Asia', code: 'lb' },
  { name: 'Malaysia', continent: 'Asia', code: 'my' },
  { name: 'Maldives', continent: 'Asia', code: 'mv' },
  { name: 'Mongolia', continent: 'Asia', code: 'mn' },
  { name: 'Myanmar', continent: 'Asia', code: 'mm' },
  { name: 'Nepal', continent: 'Asia', code: 'np' },
  { name: 'North Korea', continent: 'Asia', code: 'kp' },
  { name: 'Oman', continent: 'Asia', code: 'om' },
  { name: 'Pakistan', continent: 'Asia', code: 'pk' },
  { name: 'Philippines', continent: 'Asia', code: 'ph' },
  { name: 'Qatar', continent: 'Asia', code: 'qa' },
  { name: 'Saudi Arabia', continent: 'Asia', code: 'sa' },
  { name: 'Singapore', continent: 'Asia', code: 'sg' },
  { name: 'South Korea', continent: 'Asia', code: 'kr' },
  { name: 'Sri Lanka', continent: 'Asia', code: 'lk' },
  { name: 'Syria', continent: 'Asia', code: 'sy' },
  { name: 'Taiwan', continent: 'Asia', code: 'tw' },
  { name: 'Tajikistan', continent: 'Asia', code: 'tj' },
  { name: 'Thailand', continent: 'Asia', code: 'th' },
  { name: 'Timor-Leste', continent: 'Asia', code: 'tl' },
  { name: 'Turkey', continent: 'Asia', code: 'tr' },
  { name: 'Turkmenistan', continent: 'Asia', code: 'tm' },
  { name: 'United Arab Emirates', continent: 'Asia', code: 'ae' },
  { name: 'Uzbekistan', continent: 'Asia', code: 'uz' },
  { name: 'Vietnam', continent: 'Asia', code: 'vn' },
  { name: 'Yemen', continent: 'Asia', code: 'ye' },

  // Europe (45)
  { name: 'Albania', continent: 'Europe', code: 'al' },
  { name: 'Andorra', continent: 'Europe', code: 'ad' },
  { name: 'Austria', continent: 'Europe', code: 'at' },
  { name: 'Belarus', continent: 'Europe', code: 'by' },
  { name: 'Belgium', continent: 'Europe', code: 'be' },
  { name: 'Bosnia and Herzegovina', continent: 'Europe', code: 'ba' },
  { name: 'Bulgaria', continent: 'Europe', code: 'bg' },
  { name: 'Croatia', continent: 'Europe', code: 'hr' },
  { name: 'Czech Republic', continent: 'Europe', code: 'cz' },
  { name: 'Denmark', continent: 'Europe', code: 'dk' },
  { name: 'Estonia', continent: 'Europe', code: 'ee' },
  { name: 'Finland', continent: 'Europe', code: 'fi' },
  { name: 'France', continent: 'Europe', code: 'fr' },
  { name: 'Germany', continent: 'Europe', code: 'de' },
  { name: 'Greece', continent: 'Europe', code: 'gr' },
  { name: 'Hungary', continent: 'Europe', code: 'hu' },
  { name: 'Iceland', continent: 'Europe', code: 'is' },
  { name: 'Ireland', continent: 'Europe', code: 'ie' },
  { name: 'Italy', continent: 'Europe', code: 'it' },
  { name: 'Kosovo', continent: 'Europe', code: 'xk' },
  { name: 'Latvia', continent: 'Europe', code: 'lv' },
  { name: 'Liechtenstein', continent: 'Europe', code: 'li' },
  { name: 'Lithuania', continent: 'Europe', code: 'lt' },
  { name: 'Luxembourg', continent: 'Europe', code: 'lu' },
  { name: 'Malta', continent: 'Europe', code: 'mt' },
  { name: 'Moldova', continent: 'Europe', code: 'md' },
  { name: 'Monaco', continent: 'Europe', code: 'mc' },
  { name: 'Montenegro', continent: 'Europe', code: 'me' },
  { name: 'Netherlands', continent: 'Europe', code: 'nl' },
  { name: 'North Macedonia', continent: 'Europe', code: 'mk' },
  { name: 'Norway', continent: 'Europe', code: 'no' },
  { name: 'Poland', continent: 'Europe', code: 'pl' },
  { name: 'Portugal', continent: 'Europe', code: 'pt' },
  { name: 'Romania', continent: 'Europe', code: 'ro' },
  { name: 'Russia', continent: 'Europe', code: 'ru' },
  { name: 'San Marino', continent: 'Europe', code: 'sm' },
  { name: 'Serbia', continent: 'Europe', code: 'rs' },
  { name: 'Slovakia', continent: 'Europe', code: 'sk' },
  { name: 'Slovenia', continent: 'Europe', code: 'si' },
  { name: 'Spain', continent: 'Europe', code: 'es' },
  { name: 'Sweden', continent: 'Europe', code: 'se' },
  { name: 'Switzerland', continent: 'Europe', code: 'ch' },
  { name: 'Ukraine', continent: 'Europe', code: 'ua' },
  { name: 'United Kingdom', continent: 'Europe', code: 'gb' },
  { name: 'Vatican City', continent: 'Europe', code: 'va' },

  // North America (23)
  { name: 'Antigua and Barbuda', continent: 'North America', code: 'ag' },
  { name: 'Bahamas', continent: 'North America', code: 'bs' },
  { name: 'Barbados', continent: 'North America', code: 'bb' },
  { name: 'Belize', continent: 'North America', code: 'bz' },
  { name: 'Canada', continent: 'North America', code: 'ca' },
  { name: 'Costa Rica', continent: 'North America', code: 'cr' },
  { name: 'Cuba', continent: 'North America', code: 'cu' },
  { name: 'Dominica', continent: 'North America', code: 'dm' },
  { name: 'Dominican Republic', continent: 'North America', code: 'do' },
  { name: 'El Salvador', continent: 'North America', code: 'sv' },
  { name: 'Grenada', continent: 'North America', code: 'gd' },
  { name: 'Guatemala', continent: 'North America', code: 'gt' },
  { name: 'Haiti', continent: 'North America', code: 'ht' },
  { name: 'Honduras', continent: 'North America', code: 'hn' },
  { name: 'Jamaica', continent: 'North America', code: 'jm' },
  { name: 'Mexico', continent: 'North America', code: 'mx' },
  { name: 'Nicaragua', continent: 'North America', code: 'ni' },
  { name: 'Panama', continent: 'North America', code: 'pa' },
  { name: 'Saint Kitts and Nevis', continent: 'North America', code: 'kn' },
  { name: 'Saint Lucia', continent: 'North America', code: 'lc' },
  { name: 'Saint Vincent and the Grenadines', continent: 'North America', code: 'vc' },
  { name: 'Trinidad and Tobago', continent: 'North America', code: 'tt' },
  { name: 'United States', continent: 'North America', code: 'us' },

  // South America (12)
  { name: 'Argentina', continent: 'South America', code: 'ar' },
  { name: 'Bolivia', continent: 'South America', code: 'bo' },
  { name: 'Brazil', continent: 'South America', code: 'br' },
  { name: 'Chile', continent: 'South America', code: 'cl' },
  { name: 'Colombia', continent: 'South America', code: 'co' },
  { name: 'Ecuador', continent: 'South America', code: 'ec' },
  { name: 'Guyana', continent: 'South America', code: 'gy' },
  { name: 'Paraguay', continent: 'South America', code: 'py' },
  { name: 'Peru', continent: 'South America', code: 'pe' },
  { name: 'Suriname', continent: 'South America', code: 'sr' },
  { name: 'Uruguay', continent: 'South America', code: 'uy' },
  { name: 'Venezuela', continent: 'South America', code: 've' },

  // Oceania (14)
  { name: 'Australia', continent: 'Oceania', code: 'au' },
  { name: 'Fiji', continent: 'Oceania', code: 'fj' },
  { name: 'Kiribati', continent: 'Oceania', code: 'ki' },
  { name: 'Marshall Islands', continent: 'Oceania', code: 'mh' },
  { name: 'Micronesia', continent: 'Oceania', code: 'fm' },
  { name: 'Nauru', continent: 'Oceania', code: 'nr' },
  { name: 'New Zealand', continent: 'Oceania', code: 'nz' },
  { name: 'Palau', continent: 'Oceania', code: 'pw' },
  { name: 'Papua New Guinea', continent: 'Oceania', code: 'pg' },
  { name: 'Samoa', continent: 'Oceania', code: 'ws' },
  { name: 'Solomon Islands', continent: 'Oceania', code: 'sb' },
  { name: 'Tonga', continent: 'Oceania', code: 'to' },
  { name: 'Tuvalu', continent: 'Oceania', code: 'tv' },
  { name: 'Vanuatu', continent: 'Oceania', code: 'vu' },
]

export const CONTINENTS = [
  'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'All',
]
```

- [ ] **Step 2: Commit**

```bash
git add src/data/countries.js
git commit -m "feat: complete country dataset — 196 countries across 6 continents"
```

---

## Task 3: Utility Functions + Tests

**Files:**

- Create: `src/utils.js`
- Create: `tests/utils.test.js`
- Create: `vitest.config.js`

- [ ] **Step 1: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node' },
})
```

- [ ] **Step 2: Write `tests/utils.test.js` first — all will fail until utils.js exists**

```js
import { describe, it, expect } from 'vitest'
import {
  shuffleArray,
  getCountriesByContinent,
  generateChoices,
  getRating,
  formatTime,
  addScore,
} from '../src/utils.js'

const SAMPLE = [
  { name: 'Brazil', continent: 'South America', code: 'br' },
  { name: 'Argentina', continent: 'South America', code: 'ar' },
  { name: 'France', continent: 'Europe', code: 'fr' },
  { name: 'Germany', continent: 'Europe', code: 'de' },
  { name: 'Japan', continent: 'Asia', code: 'jp' },
]

describe('shuffleArray', () => {
  it('returns same length', () => {
    expect(shuffleArray(SAMPLE).length).toBe(SAMPLE.length)
  })
  it('contains all original elements', () => {
    const result = shuffleArray(SAMPLE)
    SAMPLE.forEach(item => expect(result).toContainEqual(item))
  })
  it('does not mutate original', () => {
    const copy = [...SAMPLE]
    shuffleArray(SAMPLE)
    expect(SAMPLE).toEqual(copy)
  })
})

describe('getCountriesByContinent', () => {
  it('filters by continent', () => {
    const result = getCountriesByContinent(SAMPLE, 'Europe')
    expect(result).toHaveLength(2)
    expect(result.every(c => c.continent === 'Europe')).toBe(true)
  })
  it('returns all when continent is All', () => {
    expect(getCountriesByContinent(SAMPLE, 'All')).toHaveLength(SAMPLE.length)
  })
  it('does not mutate original', () => {
    const copy = [...SAMPLE]
    getCountriesByContinent(SAMPLE, 'Europe')
    expect(SAMPLE).toEqual(copy)
  })
})

describe('generateChoices', () => {
  it('returns requested count', () => {
    expect(generateChoices(SAMPLE[0], SAMPLE, 2)).toHaveLength(2)
    expect(generateChoices(SAMPLE[0], SAMPLE, 5)).toHaveLength(5)
  })
  it('always includes the correct country marked isCorrect', () => {
    const choices = generateChoices(SAMPLE[0], SAMPLE, 2)
    expect(choices.some(c => c.isCorrect && c.code === SAMPLE[0].code)).toBe(true)
  })
  it('marks exactly one choice as correct', () => {
    const choices = generateChoices(SAMPLE[0], SAMPLE, 3)
    expect(choices.filter(c => c.isCorrect).length).toBe(1)
  })
  it('clamps to pool size when count exceeds pool', () => {
    expect(generateChoices(SAMPLE[0], SAMPLE, 100).length).toBe(SAMPLE.length)
  })
})

describe('getRating', () => {
  it('excellent for fewer than 3 mistakes', () => {
    expect(getRating(0, 10)).toBe('excellent')
    expect(getRating(2, 10)).toBe('excellent')
  })
  it('good for mistakes <= 50% of total', () => {
    expect(getRating(3, 10)).toBe('good')
    expect(getRating(5, 10)).toBe('good')
  })
  it('bad for mistakes > 50% of total', () => {
    expect(getRating(6, 10)).toBe('bad')
    expect(getRating(10, 10)).toBe('bad')
  })
})

describe('formatTime', () => {
  it('formats correctly', () => {
    expect(formatTime(300)).toBe('5:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(0)).toBe('0:00')
  })
})

describe('addScore', () => {
  it('adds to empty list', () => {
    const e = { mistakes: 2, totalFlags: 10, timeRemaining: 180, date: 0 }
    expect(addScore([], e)).toHaveLength(1)
  })
  it('sorts by fewest mistakes then most timeRemaining', () => {
    const a = { mistakes: 1, totalFlags: 10, timeRemaining: 100, date: 0 }
    const b = { mistakes: 0, totalFlags: 10, timeRemaining: 50, date: 0 }
    const c = { mistakes: 0, totalFlags: 10, timeRemaining: 200, date: 0 }
    const result = addScore([a, b], c)
    expect(result[0]).toEqual(c)
    expect(result[1]).toEqual(b)
    expect(result[2]).toEqual(a)
  })
  it('keeps only top 10', () => {
    const base = Array.from({ length: 10 }, (_, i) => ({
      mistakes: i + 5, totalFlags: 10, timeRemaining: 0, date: 0,
    }))
    const top = { mistakes: 0, totalFlags: 10, timeRemaining: 300, date: 0 }
    const result = addScore(base, top)
    expect(result).toHaveLength(10)
    expect(result[0]).toEqual(top)
  })
  it('does not mutate original', () => {
    const scores = [{ mistakes: 1, totalFlags: 10, timeRemaining: 100, date: 0 }]
    const copy = [...scores]
    addScore(scores, { mistakes: 0, totalFlags: 10, timeRemaining: 200, date: 0 })
    expect(scores).toEqual(copy)
  })
})
```

- [ ] **Step 3: Run tests — confirm all fail**

```bash
npm test
```

Expected: all tests FAIL with `Cannot find module '../src/utils.js'`.

- [ ] **Step 4: Create `src/utils.js`**

```js
/** Return a shuffled copy (Fisher-Yates). Does not mutate the original. */
export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Return countries matching continent. 'All' returns a copy of the full list. */
export function getCountriesByContinent(countries, continent) {
  if (continent === 'All') return [...countries]
  return countries.filter(c => c.continent === continent)
}

/**
 * Build a shuffled choices array for one question.
 * count is clamped to pool.length so small continents never crash.
 * Each item: { name, code, continent, isCorrect }
 */
export function generateChoices(correct, pool, count) {
  const safeCount = Math.min(count, pool.length)
  const wrong = shuffleArray(pool.filter(c => c.code !== correct.code))
    .slice(0, safeCount - 1)
  return shuffleArray([
    { ...correct, isCorrect: true },
    ...wrong.map(c => ({ ...c, isCorrect: false })),
  ])
}

/**
 * Return 'excellent' | 'good' | 'bad'.
 * Thresholds (adjustable in spec): excellent < 3; good <= 50%; bad > 50%.
 */
export function getRating(mistakes, totalFlags) {
  if (mistakes < 3) return 'excellent'
  if (mistakes <= totalFlags * 0.5) return 'good'
  return 'bad'
}

/** Format seconds as "M:SS" */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Add newScore, sort by fewest mistakes then most timeRemaining, keep top 10.
 * Does not mutate the original array.
 */
export function addScore(scores, newScore) {
  const updated = [...scores, newScore]
  updated.sort((a, b) =>
    a.mistakes !== b.mistakes
      ? a.mistakes - b.mistakes
      : b.timeRemaining - a.timeRemaining
  )
  return updated.slice(0, 10)
}
```

- [ ] **Step 5: Run tests — confirm all pass**

```bash
npm test
```

Expected: `18 tests passed`.

- [ ] **Step 6: Commit**

```bash
git add src/utils.js tests/utils.test.js vitest.config.js
git commit -m "feat: game utility functions with full Vitest coverage"
```

---

## Task 4: HTML Shell + CSS Theme

**Files:**

- Create: `src/style.css`

- [ ] **Step 1: Create `src/style.css`**

```css
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: 'Segoe UI', Arial, sans-serif;
  background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);
  background-attachment: fixed;
  color: #fff;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px 16px;
}

/* Typography */
h1 { font-size: 2.4rem; font-weight: 900; letter-spacing: 2px; text-shadow: 0 3px 12px rgba(0,0,0,0.35); margin-bottom: 8px; }
h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 12px; }
.subtitle { font-size: 1rem; opacity: 0.8; margin-bottom: 20px; }

/* Card */
.card {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 520px;
  margin-bottom: 14px;
}

/* Option buttons (difficulty / continent) */
.btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-group.grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
.btn-group.grid-2 .full { grid-column: 1 / -1; }

.btn-option {
  flex: 1;
  padding: 11px 8px;
  font-size: 0.95rem;
  font-weight: 700;
  border: 2px solid rgba(255,255,255,0.35);
  border-radius: 10px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
  text-align: center;
}
.btn-option:hover { background: rgba(255,255,255,0.2); }
.btn-option.active { background: rgba(255,255,255,0.9); color: #134e5e; border-color: #fff; }

/* Primary button */
.btn-primary {
  width: 100%;
  max-width: 520px;
  padding: 15px;
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 1px;
  background: #ff6b35;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(255,107,53,0.4);
  transition: background 0.15s, transform 0.1s;
}
.btn-primary:hover:not(:disabled) { background: #e85c27; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Secondary button */
.btn-secondary {
  flex: 1;
  padding: 13px;
  font-size: 1rem;
  font-weight: 700;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-secondary:hover { background: rgba(255,255,255,0.25); }

/* Top bar */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 520px;
  margin-bottom: 14px;
  font-size: 0.9rem;
  font-weight: 600;
}
.timer-badge {
  background: #ff6b35;
  color: #fff;
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 1.05rem;
  font-weight: 900;
}
.timer-badge.warning { background: #c0392b; animation: pulse 0.8s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }

/* Flag area */
.flag-area {
  width: 100%;
  max-width: 520px;
  background: rgba(255,255,255,0.12);
  border: 2px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  padding: 28px 16px 18px;
  text-align: center;
  margin-bottom: 14px;
}
.flag-img {
  width: 300px;
  height: 200px;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  display: block;
  margin: 0 auto 12px;
}
.flag-label { font-size: 0.82rem; letter-spacing: 2px; opacity: 0.7; text-transform: uppercase; }

/* Choice buttons */
.choices { display: flex; flex-direction: column; gap: 9px; width: 100%; max-width: 520px; margin-bottom: 12px; }
.choices.grid-2 { display: grid; grid-template-columns: 1fr 1fr; }

.choice-btn {
  padding: 13px 14px;
  font-size: 1rem;
  font-weight: 700;
  background: rgba(255,255,255,0.9);
  color: #1a3a2a;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.1s, transform 0.08s;
  text-align: center;
}
.choice-btn:hover:not(:disabled) { background: #fff; transform: translateY(-1px); }
.choice-btn:disabled { cursor: not-allowed; }
.choice-btn.correct { background: #27ae60; color: #fff; border-color: #1e8449; }
.choice-btn.wrong { background: #e74c3c; color: #fff; border-color: #c0392b; }

/* Rating */
.rating-display { text-align: center; margin-bottom: 20px; }
.rating-emoji { font-size: 3rem; display: block; }
.rating-word { font-size: 2.4rem; font-weight: 900; letter-spacing: 3px; display: block; margin: 6px 0; }
.rating-word.excellent { color: #ffd700; text-shadow: 0 0 20px rgba(255,215,0,0.5); }
.rating-word.good { color: #2ecc71; }
.rating-word.bad { color: #ff6b6b; }
.score-summary { font-size: 0.95rem; opacity: 0.85; }

/* Mistakes list */
.mistakes-list {
  width: 100%; max-width: 520px;
  max-height: 220px; overflow-y: auto;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 14px;
}
.mistake-item { display: flex; align-items: center; gap: 12px; padding: 7px 4px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.mistake-item:last-child { border-bottom: none; }
.mistake-flag { width: 40px; height: 27px; object-fit: contain; border-radius: 3px; flex-shrink: 0; }

/* Bottom row */
.btn-row { display: flex; gap: 12px; width: 100%; max-width: 520px; }

/* Overlay (high scores) */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 100; }
.overlay.hidden { display: none; }
.overlay-card { background: linear-gradient(135deg, #134e5e, #1a6b52); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 24px; width: 90%; max-width: 420px; max-height: 80vh; overflow-y: auto; }

.scores-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.scores-table th { text-align: left; padding: 6px 8px; opacity: 0.65; font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.2); }
.scores-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.scores-table tbody tr:first-child td { color: #ffd700; font-weight: 700; }
.no-scores { text-align: center; opacity: 0.6; padding: 20px 0; }

/* Utilities */
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.hidden { display: none !important; }
.w-full { width: 100%; max-width: 520px; }
```

- [ ] **Step 2: Start dev and verify the gradient background renders**

```bash
npm run dev
```

Expected: Electron window shows teal-to-green gradient on the background. No white flash.

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: CSS theme — adventure map gradient, orange buttons"
```

---

## Task 5: Screen Router + Audio + Scores Module

**Files:**

- Create: `src/audio.js`
- Create: `src/scores.js`
- Create: `src/app.js`
- Create: `src/screens/setup.js` (stub)
- Create: `src/screens/game.js` (stub)
- Create: `src/screens/results.js` (stub)

- [ ] **Step 1: Create `src/audio.js`**

```js
// Synthesised sounds via Web Audio API — no audio files required.
let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function tone(freq, dur, type = 'sine', gain = 0.28, delay = 0) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = type
  osc.frequency.value = freq
  const t = c.currentTime + delay
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.start(t)
  osc.stop(t + dur)
}

export const audio = {
  correct() {
    tone(523, 0.12, 'sine', 0.28, 0.00) // C5
    tone(659, 0.12, 'sine', 0.28, 0.10) // E5
    tone(784, 0.25, 'sine', 0.28, 0.20) // G5
  },
  wrong() {
    tone(300, 0.10, 'sawtooth', 0.22, 0.00)
    tone(220, 0.20, 'sawtooth', 0.22, 0.10)
  },
  complete() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.28, i * 0.14))
  },
  timeout() {
    tone(220, 0.15, 'sawtooth', 0.38, 0.00)
    tone(180, 0.35, 'sawtooth', 0.38, 0.15)
  },
  tick() {
    tone(800, 0.04, 'square', 0.07)
  },
}
```

- [ ] **Step 2: Create `src/scores.js`**

```js
// Renderer-side wrapper around window.electronAPI (set up by preload.js).
// Falls back to no-ops when running outside Electron.
const api = window.electronAPI ?? {
  loadScores: async () => [],
  saveScore: async () => [],
}

export const loadScores = (continent, difficulty) =>
  api.loadScores(continent, difficulty)

export const saveScore = (continent, difficulty, entry) =>
  api.saveScore(continent, difficulty, entry)
```

- [ ] **Step 3: Create stub screen files so imports resolve**

`src/screens/setup.js`:

```js
export function renderSetup(container) {
  const h = document.createElement('h1')
  h.textContent = 'Setup stub'
  container.appendChild(h)
}
```

`src/screens/game.js`:

```js
export function renderGame(container) {
  const h = document.createElement('h1')
  h.textContent = 'Game stub'
  container.appendChild(h)
}
```

`src/screens/results.js`:

```js
export function renderResults(container) {
  const h = document.createElement('h1')
  h.textContent = 'Results stub'
  container.appendChild(h)
}
```

- [ ] **Step 4: Create `src/app.js`**

```js
import 'flag-icons/css/flag-icons.min.css'
import { renderSetup } from './screens/setup.js'
import { renderGame } from './screens/game.js'
import { renderResults } from './screens/results.js'

const app = document.getElementById('app')

export function showScreen(name, data = {}) {
  app.textContent = '' // clear without markup injection
  if (name === 'setup') renderSetup(app, data)
  else if (name === 'game') renderGame(app, data)
  else if (name === 'results') renderResults(app, data)
}

showScreen('setup')
```

- [ ] **Step 5: Verify stubs load**

```bash
npm run dev
```

Expected: Electron window shows "Setup stub" text on the gradient background.

- [ ] **Step 6: Commit**

```bash
git add src/app.js src/audio.js src/scores.js src/screens/setup.js src/screens/game.js src/screens/results.js
git commit -m "feat: screen router, audio engine, scores IPC wrapper, screen stubs"
```

---

## Task 6: Setup Screen

**Files:**

- Modify: `src/screens/setup.js`

**DOM pattern used throughout:** All dynamic text content is set via `element.textContent`. All structural containers are created via `document.createElement`. Attributes that contain static strings (CSS classes, data-* values from our own CONTINENTS constant) are safe to set via `setAttribute` / `.className`.

- [ ] **Step 1: Replace `src/screens/setup.js` with full implementation**

```js
import { showScreen } from '../app.js'
import { CONTINENTS } from '../data/countries.js'
import { loadScores } from '../scores.js'
import { formatTime } from '../utils.js'

const DIFFICULTY_INFO = {
  easy: '2 choices per flag',
  medium: '5 choices per flag',
  hard: '10 choices per flag',
}

export function renderSetup(container, data = {}) {
  let selectedDifficulty = data.difficulty ?? null
  let selectedContinent = data.continent ?? null

  // ── Title ──
  const h1 = document.createElement('h1')
  h1.textContent = '🌍 FLAG GUESSER'
  container.appendChild(h1)

  const sub = document.createElement('p')
  sub.className = 'subtitle'
  sub.textContent = 'How well do you know the world\'s flags?'
  container.appendChild(sub)

  // ── Difficulty card ──
  const diffCard = document.createElement('div')
  diffCard.className = 'card'

  const diffH2 = document.createElement('h2')
  diffH2.textContent = 'Difficulty'
  diffCard.appendChild(diffH2)

  const diffGroup = document.createElement('div')
  diffGroup.className = 'btn-group'
  diffCard.appendChild(diffGroup)

  ;['easy', 'medium', 'hard'].forEach(level => {
    const btn = document.createElement('button')
    btn.className = 'btn-option'
    btn.textContent = level.charAt(0).toUpperCase() + level.slice(1)
    btn.dataset.value = level
    if (level === selectedDifficulty) btn.classList.add('active')
    diffGroup.appendChild(btn)
  })

  const diffHint = document.createElement('p')
  diffHint.className = 'subtitle mt-8'
  diffHint.style.fontSize = '0.82rem'
  diffHint.textContent = 'Easy = 2 choices  ·  Medium = 5  ·  Hard = 10'
  diffCard.appendChild(diffHint)
  container.appendChild(diffCard)

  // ── Continent card ──
  const contCard = document.createElement('div')
  contCard.className = 'card'

  const contH2 = document.createElement('h2')
  contH2.textContent = 'Continent'
  contCard.appendChild(contH2)

  const contGroup = document.createElement('div')
  contGroup.className = 'btn-group grid-2'
  contCard.appendChild(contGroup)

  CONTINENTS.forEach(c => {
    const btn = document.createElement('button')
    btn.className = 'btn-option'
    if (c === 'All') btn.classList.add('full')
    btn.textContent = c === 'All' ? '🌍 All Countries' : c
    btn.dataset.value = c
    if (c === selectedContinent) btn.classList.add('active')
    contGroup.appendChild(btn)
  })
  container.appendChild(contCard)

  // ── Start button ──
  const startBtn = document.createElement('button')
  startBtn.className = 'btn-primary'
  startBtn.textContent = 'START GAME ▶'
  startBtn.disabled = !selectedDifficulty || !selectedContinent
  container.appendChild(startBtn)

  // ── High Scores button ──
  const scoresBtn = document.createElement('button')
  scoresBtn.className = 'btn-secondary w-full mt-8'
  scoresBtn.textContent = '🏆 High Scores'
  scoresBtn.disabled = !selectedDifficulty || !selectedContinent
  container.appendChild(scoresBtn)

  // ── High Scores overlay ──
  const overlay = document.createElement('div')
  overlay.className = 'overlay hidden'

  const overlayCard = document.createElement('div')
  overlayCard.className = 'overlay-card'

  const overlayH2 = document.createElement('h2')
  overlayH2.textContent = '🏆 High Scores'
  overlayCard.appendChild(overlayH2)

  const overlayLabel = document.createElement('p')
  overlayLabel.className = 'subtitle'
  overlayCard.appendChild(overlayLabel)

  const overlayContent = document.createElement('div')
  overlayCard.appendChild(overlayContent)

  const closeBtn = document.createElement('button')
  closeBtn.className = 'btn-primary mt-16'
  closeBtn.textContent = 'Close'
  overlayCard.appendChild(closeBtn)
  overlay.appendChild(overlayCard)
  container.appendChild(overlay)

  // ── Helper: update button states ──
  function syncButtons() {
    startBtn.disabled = !selectedDifficulty || !selectedContinent
    scoresBtn.disabled = !selectedDifficulty || !selectedContinent
  }

  // ── Difficulty click ──
  diffGroup.addEventListener('click', e => {
    const btn = e.target.closest('.btn-option')
    if (!btn) return
    diffGroup.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    selectedDifficulty = btn.dataset.value
    syncButtons()
  })

  // ── Continent click ──
  contGroup.addEventListener('click', e => {
    const btn = e.target.closest('.btn-option')
    if (!btn) return
    contGroup.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    selectedContinent = btn.dataset.value
    syncButtons()
  })

  // ── Start game ──
  startBtn.addEventListener('click', () => {
    showScreen('game', { difficulty: selectedDifficulty, continent: selectedContinent })
  })

  // ── Open scores overlay ──
  scoresBtn.addEventListener('click', async () => {
    overlayLabel.textContent = `${selectedContinent} · ${DIFFICULTY_INFO[selectedDifficulty]}`
    overlayContent.textContent = 'Loading…'
    overlay.classList.remove('hidden')

    const scores = await loadScores(selectedContinent, selectedDifficulty)

    overlayContent.textContent = ''
    if (!scores.length) {
      const p = document.createElement('p')
      p.className = 'no-scores'
      p.textContent = 'No scores yet — be the first!'
      overlayContent.appendChild(p)
      return
    }

    const table = document.createElement('table')
    table.className = 'scores-table'

    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    ;['#', 'Mistakes', 'Time left', 'Flags'].forEach(h => {
      const th = document.createElement('th')
      th.textContent = h
      headerRow.appendChild(th)
    })
    thead.appendChild(headerRow)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    scores.forEach((s, i) => {
      const tr = document.createElement('tr')
      ;[i + 1, s.mistakes, formatTime(s.timeRemaining), s.totalFlags].forEach(val => {
        const td = document.createElement('td')
        td.textContent = String(val)
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    overlayContent.appendChild(table)
  })

  // ── Close overlay ──
  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'))
}
```

- [ ] **Step 2: Run dev and test the setup screen manually**

```bash
npm run dev
```

Checklist:
- Title and subtitle visible
- Difficulty buttons highlight on click (one at a time)
- Continent buttons highlight on click (one at a time)
- START GAME disabled until both are selected
- After selecting both, clicking START navigates to game stub
- High Scores button opens overlay; "No scores yet" shown
- Close dismisses overlay

- [ ] **Step 3: Commit**

```bash
git add src/screens/setup.js
git commit -m "feat: setup screen — difficulty, continent, high scores overlay"
```

---

## Task 7: Game Screen

**Files:**

- Modify: `src/screens/game.js`

- [ ] **Step 1: Replace `src/screens/game.js` with full implementation**

```js
import { showScreen } from '../app.js'
import { COUNTRIES } from '../data/countries.js'
import { shuffleArray, getCountriesByContinent, generateChoices, formatTime } from '../utils.js'
import { audio } from '../audio.js'
import { saveScore } from '../scores.js'

const DIFFICULTY_COUNT = { easy: 2, medium: 5, hard: 10 }
const TOTAL_SECONDS = 300

export function renderGame(container, { difficulty, continent }) {
  const pool = shuffleArray(getCountriesByContinent(COUNTRIES, continent))
  const count = DIFFICULTY_COUNT[difficulty]

  let questionIndex = 0
  let mistakes = 0
  let secondsLeft = TOTAL_SECONDS
  let timerInterval = null
  let answered = false
  const missedCountries = []

  // ── Build structural skeleton (no dynamic content here) ──
  const topBar = document.createElement('div')
  topBar.className = 'top-bar'

  const counterEl = document.createElement('span')
  const timerBadge = document.createElement('span')
  timerBadge.className = 'timer-badge'
  const mistakeEl = document.createElement('span')
  mistakeEl.style.color = '#ffe0d6'

  topBar.appendChild(counterEl)
  topBar.appendChild(timerBadge)
  topBar.appendChild(mistakeEl)
  container.appendChild(topBar)

  const flagArea = document.createElement('div')
  flagArea.className = 'flag-area'
  const flagImg = document.createElement('img')
  flagImg.className = 'flag-img'
  flagImg.alt = 'Flag'
  const flagLabel = document.createElement('p')
  flagLabel.className = 'flag-label'
  flagLabel.textContent = 'Which country is this?'
  flagArea.appendChild(flagImg)
  flagArea.appendChild(flagLabel)
  container.appendChild(flagArea)

  const choicesEl = document.createElement('div')
  container.appendChild(choicesEl)

  const nextBtn = document.createElement('button')
  nextBtn.className = 'btn-primary hidden w-full'
  nextBtn.textContent = 'NEXT →'
  container.appendChild(nextBtn)

  // ── Timer ──
  function updateTopBar() {
    counterEl.textContent = `Question ${questionIndex + 1} / ${pool.length}`
    timerBadge.textContent = `⏱ ${formatTime(secondsLeft)}`
    mistakeEl.textContent = `❌ ${mistakes} mistake${mistakes !== 1 ? 's' : ''}`
    if (secondsLeft <= 30) timerBadge.classList.add('warning')
  }

  function tickTimer() {
    secondsLeft--
    timerBadge.textContent = `⏱ ${formatTime(secondsLeft)}`
    if (secondsLeft <= 30) {
      timerBadge.classList.add('warning')
      audio.tick()
    }
    if (secondsLeft <= 0) endGame(true)
  }

  timerInterval = setInterval(tickTimer, 1000)

  // ── Render one question ──
  function renderQuestion() {
    if (questionIndex >= pool.length) { endGame(false); return }

    answered = false
    const current = pool[questionIndex]
    const choices = generateChoices(current, pool, count)

    updateTopBar()
    flagImg.src = `./flags/${current.code}.svg`
    flagImg.alt = current.name

    choicesEl.textContent = ''
    choicesEl.className = `choices${count >= 10 ? ' grid-2' : ''}`

    choices.forEach(c => {
      const btn = document.createElement('button')
      btn.className = 'choice-btn'
      btn.textContent = c.name
      btn.dataset.code = c.code
      btn.dataset.correct = c.isCorrect ? 'true' : 'false'
      btn.addEventListener('click', () => handleAnswer(btn, current))
      choicesEl.appendChild(btn)
    })

    nextBtn.classList.add('hidden')
  }

  function handleAnswer(picked, current) {
    if (answered) return
    answered = true

    const isCorrect = picked.dataset.correct === 'true'

    choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true
      if (btn.dataset.correct === 'true') btn.classList.add('correct')
      else if (btn === picked) btn.classList.add('wrong')
    })

    if (isCorrect) {
      audio.correct()
    } else {
      audio.wrong()
      mistakes++
      missedCountries.push(current)
      mistakeEl.textContent = `❌ ${mistakes} mistake${mistakes !== 1 ? 's' : ''}`
    }

    questionIndex++
    nextBtn.classList.remove('hidden')
  }

  nextBtn.addEventListener('click', () => {
    if (questionIndex >= pool.length) endGame(false)
    else renderQuestion()
  })

  async function endGame(timedOut) {
    clearInterval(timerInterval)

    if (timedOut) {
      // Remaining unanswered flags count as mistakes
      pool.slice(questionIndex).forEach(c => {
        mistakes++
        missedCountries.push(c)
      })
      audio.timeout()
    } else {
      audio.complete()
    }

    await saveScore(continent, difficulty, {
      mistakes,
      totalFlags: pool.length,
      timeRemaining: secondsLeft,
      date: Date.now(),
    })

    showScreen('results', {
      difficulty,
      continent,
      mistakes,
      totalFlags: pool.length,
      timeRemaining: secondsLeft,
      timedOut,
      missedCountries,
    })
  }

  renderQuestion()
}
```

- [ ] **Step 2: Run dev and test the game screen**

```bash
npm run dev
```

Checklist:
- Select Easy + Africa on setup, press START
- Flag appears large and centred
- 2 answer buttons shown (Easy mode)
- Clicking correct answer → turns green, sound plays
- Clicking wrong answer → turns red, sound plays
- NEXT button appears after answering; advances to next flag
- Counter increments each question
- Timer counts down; turns red at 30 s and ticks
- After all Africa flags, navigates to results stub
- Try Hard mode: 10 buttons appear in 2-column grid

- [ ] **Step 3: Commit**

```bash
git add src/screens/game.js
git commit -m "feat: game screen — timer, flag display, answer choices, sounds"
```

---

## Task 8: Results Screen

**Files:**

- Modify: `src/screens/results.js`

- [ ] **Step 1: Replace `src/screens/results.js` with full implementation**

```js
import { showScreen } from '../app.js'
import { getRating, formatTime } from '../utils.js'

const RATING_CONFIG = {
  excellent: { emoji: '🏆', word: 'EXCELLENT!', cls: 'excellent' },
  good:      { emoji: '👍', word: 'GOOD!',       cls: 'good' },
  bad:       { emoji: '😬', word: 'BAD...',       cls: 'bad' },
}

export function renderResults(container, {
  difficulty,
  continent,
  mistakes,
  totalFlags,
  timeRemaining,
  timedOut,
  missedCountries,
}) {
  const rating = getRating(mistakes, totalFlags)
  const { emoji, word, cls } = RATING_CONFIG[rating]

  // ── Rating display ──
  const ratingDiv = document.createElement('div')
  ratingDiv.className = 'rating-display'

  const emojiEl = document.createElement('span')
  emojiEl.className = 'rating-emoji'
  emojiEl.textContent = emoji

  const wordEl = document.createElement('span')
  wordEl.className = `rating-word ${cls}`
  wordEl.textContent = word

  const summaryEl = document.createElement('p')
  summaryEl.className = 'score-summary'
  if (timedOut) {
    summaryEl.textContent = `${mistakes} mistakes out of ${totalFlags} flags · Time ran out!`
  } else {
    summaryEl.textContent =
      `${mistakes} mistake${mistakes !== 1 ? 's' : ''} out of ${totalFlags} flags · ${formatTime(timeRemaining)} remaining`
  }

  ratingDiv.appendChild(emojiEl)
  ratingDiv.appendChild(wordEl)
  ratingDiv.appendChild(summaryEl)
  container.appendChild(ratingDiv)

  // ── Missed countries header ──
  if (missedCountries.length > 0) {
    const h2 = document.createElement('h2')
    h2.className = 'w-full'
    h2.style.marginBottom = '8px'
    h2.textContent = 'Flags to remember:'
    container.appendChild(h2)
  }

  // ── Mistakes list ──
  const list = document.createElement('div')
  list.className = 'mistakes-list'

  if (missedCountries.length === 0) {
    const p = document.createElement('p')
    p.style.textAlign = 'center'
    p.style.padding = '16px'
    p.style.opacity = '0.7'
    p.textContent = 'No mistakes — perfect! 🎉'
    list.appendChild(p)
  } else {
    missedCountries.forEach(c => {
      const item = document.createElement('div')
      item.className = 'mistake-item'

      const img = document.createElement('img')
      img.className = 'mistake-flag'
      img.src = `./flags/${c.code}.svg`
      img.alt = c.name

      const name = document.createElement('span')
      name.textContent = c.name

      item.appendChild(img)
      item.appendChild(name)
      list.appendChild(item)
    })
  }

  container.appendChild(list)

  // ── Buttons ──
  const btnRow = document.createElement('div')
  btnRow.className = 'btn-row'

  const backBtn = document.createElement('button')
  backBtn.className = 'btn-secondary'
  backBtn.textContent = '← Back'
  backBtn.addEventListener('click', () => showScreen('setup'))

  const retryBtn = document.createElement('button')
  retryBtn.className = 'btn-primary'
  retryBtn.textContent = 'Try Again 🔄'
  retryBtn.addEventListener('click', () =>
    showScreen('game', { difficulty, continent })
  )

  btnRow.appendChild(backBtn)
  btnRow.appendChild(retryBtn)
  container.appendChild(btnRow)
}
```

- [ ] **Step 2: Run dev and test the full game loop end-to-end**

```bash
npm run dev
```

Checklist:
- Complete a game (South America on Easy is quickest — 12 flags)
- Rating word shows in correct colour (gold / green / red)
- Score summary text is accurate
- Missed flags list shows flag image + country name
- "← Back" returns to setup
- "Try Again 🔄" replays same settings with different order (play twice, verify order differs)
- Let the timer run out — results show "Time ran out!" and unanswered flags appear in the mistakes list
- High scores overlay on setup shows entries after completing a game

- [ ] **Step 3: Commit**

```bash
git add src/screens/results.js
git commit -m "feat: results screen — rating, mistakes list, back and retry buttons"
```

---

## Task 9: Packaging — Windows Installer

**Files:**

- No new files; verifying build pipeline from Task 1.

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected: `dist/renderer/` created containing `index.html`, `assets/`, and `flags/` (SVG files). No errors.

- [ ] **Step 2: Smoke-test the production build in Electron**

Edit `main.js` line: `const isDev = false` (temporarily). Run:

```bash
electron .
```

Expected: app launches, loads from `dist/renderer/index.html`, game plays fully. After confirming, restore: `const isDev = !app.isPackaged`.

- [ ] **Step 3: Build the Windows installer**

```bash
npm run make
```

Expected: `dist/Flag Guesser Setup 1.0.0.exe` created. No errors.

> Run this step on Windows. electron-builder requires the target OS for native installer formats.

- [ ] **Step 4: Install and full smoke-test**

Run the generated `.exe`. Install with defaults. Launch from Start Menu.

Checklist:
- App launches to setup screen
- All three screens work
- Sounds play (correct / wrong / timer tick / complete / timeout)
- High scores persist across app restarts (play a game, close, reopen, check High Scores)
- Try Again uses a different question order each time
- Flag images all load correctly

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: verified Windows NSIS installer via electron-builder"
```

---

## Spec Coverage

| Requirement | Task |
| --- | --- |
| Difficulty selector: Easy / Medium / Hard | 6 |
| Difficulty controls answer count (2 / 5 / 10) | 7 |
| Continent selector with All option | 6 |
| START disabled until both selections made | 6 |
| 5-minute countdown timer with warning pulse | 7 |
| Large flag image centred on game screen | 7 |
| Answer choices (vertical or 2-column grid) | 7 |
| Green / red feedback on answer | 7 |
| NEXT button hidden until answer chosen | 7 |
| Timeout ends game; unanswered = mistakes | 7 |
| Rating word: Excellent / Good / Bad | 8 |
| Mistake list: flag + country name | 8 |
| Back → setup; Try Again → reshuffled | 8 |
| Sound: correct, wrong, complete, timeout, tick | 5 |
| High Scores overlay on setup screen | 6 |
| Scores saved per continent + difficulty | 1, 7 |
| Top 10 sorted: fewest mistakes, most time | 1, 3 |
| Offline flag images | 1, 9 |
| Windows NSIS installer | 9 |
