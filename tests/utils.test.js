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
