const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

function getScoresFile() {
  return path.join(app.getPath('userData'), 'scores.json')
}

function loadScoresFile() {
  try { return JSON.parse(fs.readFileSync(getScoresFile(), 'utf8')) }
  catch { return {} }
}

function saveScoresFile(data) {
  try {
    fs.writeFileSync(getScoresFile(), JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Failed to save scores:', err)
    throw err
  }
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
