import { describe, it, expect } from 'vitest'
import { parseRecipeText } from '@/lib/parse-recipe'

describe('parseRecipeText', () => {
  it('returns empty for empty input', () => {
    const result = parseRecipeText('')
    expect(result.title).toBe('')
    expect(result.ingredients).toEqual([])
    expect(result.steps).toEqual([])
  })

  it('parses structured recipe with headers', () => {
    const text = `עוגת שוקולד
מתכון קלאסי

מרכיבים:
2 כוס קמח
1 כוס סוכר
3 ביצים

הכנה:
לערבב את כל המרכיבים
לאפות 180 מעלות 30 דקות`

    const result = parseRecipeText(text)
    expect(result.title).toBe('עוגת שוקולד')
    expect(result.description).toBe('מתכון קלאסי')
    expect(result.ingredients.length).toBe(3)
    expect(result.ingredients[0].name).toContain('קמח')
    expect(result.ingredients[0].amount).toBe('2')
    expect(result.steps.length).toBe(2)
    expect(result.category).toBe('קינוח')
  })

  it('parses ingredient amounts correctly', () => {
    const text = `מתכון
מרכיבים:
2 כוס קמח
חצי כפית מלח
1/2 כוס שמן`

    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('2')
    expect(result.ingredients[0].unit).toBe('כוס')
    expect(result.ingredients[1].amount).toBe('½')
    expect(result.ingredients[1].unit).toBe('כפית')
  })

  it('guesses category for soup', () => {
    const text = `מרק עוף
מרכיבים:
עוף
מים
גזר
הכנה:
לבשל שעה`

    const result = parseRecipeText(text)
    expect(result.category).toBe('מרק')
  })

  it('guesses category for salad', () => {
    const text = `סלט ירקות
מרכיבים:
עגבנייה
מלפפון`

    const result = parseRecipeText(text)
    expect(result.category).toBe('סלט')
  })

  it('strips bullets and numbering', () => {
    const text = `מתכון
מרכיבים:
- 1 כוס קמח
• 2 ביצים
הכנה:
1. לערבב
2. לאפות`

    const result = parseRecipeText(text)
    expect(result.ingredients[0].name).toContain('קמח')
    expect(result.steps[0]).toBe('לערבב')
    expect(result.steps[1]).toBe('לאפות')
  })

  it('handles recipe without headers (heuristic mode)', () => {
    const text = `שקשוקה
3 ביצים
2 עגבניות
בצל
לחתוך את הירקות ולטגן`

    const result = parseRecipeText(text)
    expect(result.title).toBe('שקשוקה')
    expect(result.ingredients.length).toBeGreaterThan(0)
  })
})
