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
