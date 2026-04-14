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
