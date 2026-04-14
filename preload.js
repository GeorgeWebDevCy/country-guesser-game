const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadScores: (continent, difficulty) =>
    ipcRenderer.invoke('scores:load', continent, difficulty),
  saveScore: (continent, difficulty, entry) =>
    ipcRenderer.invoke('scores:save', { continent, difficulty, entry }),
})
