import { showScreen } from '../app.js'
import { formatTime } from '../utils.js'

export function renderResults(container, data = {}) {
  const {
    difficulty,
    continent,
    mistakes = [],
    countries = [],
    timeRemaining = 0,
    timedOut = false,
    rating = 'bad',
  } = data

  // 1. Rating
  const ratingEl = document.createElement('p')
  ratingEl.className = `rating-word ${rating}`
  const ratingText = {
    excellent: '🏆 Excellent!',
    good: '👍 Good!',
    bad: '😬 Bad luck!',
  }
  ratingEl.textContent = ratingText[rating] ?? ratingText.bad
  container.appendChild(ratingEl)

  // 2. Score summary
  const summary = document.createElement('p')
  summary.className = 'subtitle'
  const mistakeCount = mistakes.length
  const totalCount = countries.length
  if (timedOut) {
    summary.textContent = `${mistakeCount} mistakes out of ${totalCount} flags — Time ran out!`
  } else {
    summary.textContent = `${mistakeCount} mistakes out of ${totalCount} flags · ${formatTime(timeRemaining)} remaining`
  }
  container.appendChild(summary)

  // 3. Mistakes list
  if (mistakes.length === 0) {
    const noMistakes = document.createElement('p')
    noMistakes.textContent = '🎉 No mistakes!'
    container.appendChild(noMistakes)
  } else {
    const heading = document.createElement('p')
    heading.textContent = 'Flags to practise:'
    container.appendChild(heading)

    const list = document.createElement('ul')
    list.className = 'mistakes-list'

    for (const country of mistakes) {
      const item = document.createElement('li')
      item.className = 'mistake-item'

      const flag = document.createElement('span')
      flag.className = `fi fi-${country.code}`

      const name = document.createElement('span')
      name.textContent = country.name

      item.appendChild(flag)
      item.appendChild(name)
      list.appendChild(item)
    }

    container.appendChild(list)
  }

  // 4. Buttons
  const btnGroup = document.createElement('div')
  btnGroup.className = 'btn-group'

  const backBtn = document.createElement('button')
  backBtn.className = 'btn-secondary'
  backBtn.textContent = '← Back'
  backBtn.addEventListener('click', () => showScreen('setup'))

  const retryBtn = document.createElement('button')
  retryBtn.className = 'btn-primary'
  retryBtn.textContent = 'Try Again 🔄'
  retryBtn.addEventListener('click', () => showScreen('game', { difficulty, continent }))

  btnGroup.appendChild(backBtn)
  btnGroup.appendChild(retryBtn)
  container.appendChild(btnGroup)
}
