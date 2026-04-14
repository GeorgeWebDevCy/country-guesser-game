import { COUNTRIES } from '../data/countries.js'
import { FACTS } from '../data/facts.js'
import {
  shuffleArray,
  getCountriesByContinent,
  generateChoices,
  getRating,
  formatTime,
} from '../utils.js'
import { audio } from '../audio.js'
import { saveScore } from '../scores.js'
import { showScreen } from '../app.js'

const CHOICE_COUNT = { easy: 2, medium: 5, hard: 10 }
const TIMER_START = 300 // 5 minutes in seconds
const WARNING_THRESHOLD = 30

export function renderGame(container, data = {}) {
  const { difficulty = 'medium', continent = 'All' } = data

  container.classList.add('game-screen')

  // --- State ---
  const countries = shuffleArray(getCountriesByContinent(COUNTRIES, continent))
  let currentIndex = 0
  let mistakes = []
  let timeRemaining = TIMER_START
  let gameOver = false
  let answered = false

  // --- Top bar ---
  const topBar = document.createElement('div')
  topBar.className = 'top-bar'

  const questionCounter = document.createElement('span')
  questionCounter.className = 'question-counter'

  const timerBadge = document.createElement('span')
  timerBadge.className = 'timer-badge'

  const mistakeCount = document.createElement('span')
  mistakeCount.className = 'mistake-count'

  topBar.appendChild(questionCounter)
  topBar.appendChild(timerBadge)
  topBar.appendChild(mistakeCount)
  container.appendChild(topBar)

  // --- Flag area ---
  const flagArea = document.createElement('div')
  flagArea.className = 'flag-area'

  const flagImg = document.createElement('span')
  flagImg.className = 'flag-img'

  const flagLabel = document.createElement('p')
  flagLabel.className = 'flag-label'
  flagLabel.textContent = 'WHICH COUNTRY IS THIS?'

  flagArea.appendChild(flagImg)
  flagArea.appendChild(flagLabel)
  container.appendChild(flagArea)

  // --- Choices container ---
  const choicesContainer = document.createElement('div')
  choicesContainer.className = difficulty === 'hard' ? 'btn-group grid-2' : 'btn-group'
  container.appendChild(choicesContainer)

  // --- Fact panel (wrong answer modal overlay) ---
  const factPanel = document.createElement('div')
  factPanel.className = 'fact-panel hidden'

  const factCard = document.createElement('div')
  factCard.className = 'fact-panel-card'
  factPanel.appendChild(factCard)

  const factFlag = document.createElement('span')
  factCard.appendChild(factFlag)

  const factCountryName = document.createElement('p')
  factCountryName.className = 'fact-country-name'
  factCard.appendChild(factCountryName)

  const factCapital = document.createElement('p')
  factCapital.className = 'fact-detail'
  factCard.appendChild(factCapital)

  const factText = document.createElement('p')
  factText.className = 'fact-text'
  factCard.appendChild(factText)

  // NEXT button lives inside the fact panel for wrong answers,
  // and separately below choices for correct answers
  const nextBtnInPanel = document.createElement('button')
  nextBtnInPanel.className = 'btn-primary'
  nextBtnInPanel.style.marginTop = '8px'
  nextBtnInPanel.textContent = 'NEXT →'
  nextBtnInPanel.addEventListener('click', () => {
    factPanel.classList.add('hidden')
    currentIndex++
    if (currentIndex >= countries.length) endGame(false)
    else renderQuestion()
  })
  factCard.appendChild(nextBtnInPanel)

  container.appendChild(factPanel)

  // --- NEXT button (shown below choices after a CORRECT answer) ---
  const nextBtn = document.createElement('button')
  nextBtn.className = 'btn-primary hidden'
  nextBtn.textContent = 'NEXT →'
  nextBtn.addEventListener('click', () => {
    currentIndex++
    if (currentIndex >= countries.length) {
      endGame(false)
    } else {
      renderQuestion()
    }
  })
  container.appendChild(nextBtn)

  // --- Timer ---
  const intervalId = setInterval(() => {
    if (gameOver) return
    timeRemaining--
    if (timeRemaining <= 0) {
      updateTimerDisplay() // show 0:00 without tick
      if (!answered) mistakes.push(countries[currentIndex])
      endGame(true)
      return
    }
    updateTimerDisplay()
  }, 1000)

  // --- Helpers ---
  function updateTopBar() {
    questionCounter.textContent = `Question ${currentIndex + 1} / ${countries.length}`
    mistakeCount.textContent = `❌ ${mistakes.length} mistake(s)`
  }

  function updateTimerDisplay() {
    timerBadge.textContent = `⏱ ${formatTime(timeRemaining)}`
    if (timeRemaining > 0 && timeRemaining <= WARNING_THRESHOLD) {
      timerBadge.classList.add('warning')
      audio.tick()
    } else if (timeRemaining <= 0) {
      timerBadge.classList.add('warning')
      // no tick at zero — endGame plays timeout sound instead
    } else {
      timerBadge.classList.remove('warning')
    }
  }

  function renderQuestion() {
    answered = false
    factPanel.classList.add('hidden')
    const country = countries[currentIndex]
    const choiceCount = CHOICE_COUNT[difficulty] ?? 5

    // Update top bar
    updateTopBar()

    // Update flag
    flagImg.className = 'flag-img fi fi-' + country.code

    // Generate choices
    const choices = generateChoices(country, countries, choiceCount)

    // Clear previous choices
    choicesContainer.textContent = ''

    choices.forEach(choice => {
      const btn = document.createElement('button')
      btn.className = 'choice-btn'
      btn.textContent = choice.name
      btn.addEventListener('click', () => handleAnswer(choice, choices))
      choicesContainer.appendChild(btn)
    })

    // Hide NEXT button
    nextBtn.classList.add('hidden')
  }

  function handleAnswer(chosen, choices) {
    if (answered) return
    answered = true

    const allBtns = choicesContainer.querySelectorAll('.choice-btn')

    // Disable all buttons
    allBtns.forEach(btn => {
      btn.disabled = true
    })

    if (chosen.isCorrect) {
      // Mark clicked button correct
      allBtns.forEach(btn => {
        if (btn.textContent === chosen.name) {
          btn.classList.add('correct')
        }
      })
      audio.correct()
    } else {
      // Mark clicked button wrong, reveal correct
      allBtns.forEach(btn => {
        if (btn.textContent === chosen.name) {
          btn.classList.add('wrong')
        }
        // Find the correct one among choices to highlight it
        const matchingChoice = choices.find(c => c.name === btn.textContent)
        if (matchingChoice && matchingChoice.isCorrect) {
          btn.classList.add('correct')
        }
      })
      mistakes.push(countries[currentIndex])
      updateTopBar()
      audio.wrong()

      // Show fact panel modal for the correct country
      const correct = countries[currentIndex]
      const entry = FACTS[correct.code]
      factFlag.className = 'fact-flag-img fi fi-' + correct.code
      factCountryName.textContent = '🌍 ' + correct.name
      factCapital.textContent = entry ? '🏙️ Capital: ' + entry.capital : ''
      factText.textContent = entry ? entry.fact : ''
      factPanel.classList.remove('hidden')
      // NEXT is inside the panel for wrong answers — don't show the bottom one
      return
    }

    // Correct answer — show the bottom NEXT button
    nextBtn.classList.remove('hidden')
  }

  async function endGame(timedOut) {
    if (gameOver) return
    gameOver = true
    clearInterval(intervalId)

    if (timedOut) {
      audio.timeout()
    } else {
      audio.complete()
    }

    const rating = getRating(mistakes.length, countries.length)

    try {
      await saveScore(continent, difficulty, {
        mistakes: mistakes.length,
        totalFlags: countries.length,
        timeRemaining,
        date: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Failed to save score:', e)
    }

    showScreen('results', {
      difficulty,
      continent,
      mistakes,
      countries,
      timeRemaining,
      timedOut,
      rating,
    })
  }

  // --- Initial render ---
  updateTimerDisplay()
  renderQuestion()
}
