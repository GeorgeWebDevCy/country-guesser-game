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
