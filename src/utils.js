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
 * Thresholds: excellent < 3; good <= 50%; bad > 50%.
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
