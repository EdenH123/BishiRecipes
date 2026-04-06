import { describe, it, expect } from 'vitest'
import { parseRecipeText, guessCategory } from '@/lib/parse-recipe'

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

describe('OCR fraction handling', () => {
  it('normalizes spaced fractions from OCR: "3 / 4"', () => {
    const text = `עוגה
מצרכים:
3 / 4 כוס סוכר
הכנה:
לערבב`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('¾')
    expect(result.ingredients[0].unit).toBe('כוס')
  })

  it('normalizes spaced decimals from OCR: "1 . 5"', () => {
    const text = `עוגה
מצרכים:
1 . 5 כוס קמח
הכנה:
לערבב`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('1½')
  })

  it('handles standard fractions: "3/4", "1/2"', () => {
    const text = `מתכון
מצרכים:
3/4 כוס קקאו
1/2 כפית מלח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('¾')
    expect(result.ingredients[1].amount).toBe('½')
  })

  it('handles mixed numbers: "1 1/2"', () => {
    const text = `מתכון
מצרכים:
1 1/2 כוס קמח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('1½')
  })
})

describe('mixed format (no headers)', () => {
  it('separates ingredients from steps in bagel recipe', () => {
    const text = `*בייגל כמו בקיוסק*
*מחממים תנור ל 200 מעלות
*לבצק (במיקסר)-
חצי קילו קמח
2 כפות סוכר
כפית מלח
שקית שמרים
כוס וחצי מים פושרים
2 כפות שמן
ללוש 5 דקות במיקסר
לחלק ל8 חלקים
לגלגל נקניקיות
להניח על תבנית עם נייר אפייה
*כשהמים רותחים,
להכניס 3-4 בייגלה כל פעם
להרתיח דקה מכל צד
להעביר לתבנית
למרוח ביצה מעל ושומשום
להכניס לתנור ל25 דקות`

    const result = parseRecipeText(text)
    expect(result.title).toBe('בייגל כמו בקיוסק')
    expect(result.ingredients.length).toBe(6)
    expect(result.steps.length).toBeGreaterThanOrEqual(10)

    // Verify specific ingredients
    const amounts = result.ingredients.map(i => i.amount)
    expect(amounts).toContain('½') // חצי קילו
    expect(amounts).toContain('1½') // כוס וחצי
    expect(amounts).toContain('2') // 2 כפות

    // Verify steps don't include ingredients
    const stepText = result.steps.join(' ')
    expect(stepText).toContain('מחממים תנור')
    expect(stepText).toContain('ללוש')
    expect(stepText).toContain('למרוח')
  })

  it('detects food words as ingredients even without amounts', () => {
    const text = `מתכון
קמח
סוכר
מלח
לערבב הכל`

    const result = parseRecipeText(text)
    expect(result.ingredients.length).toBe(3)
    expect(result.steps.length).toBe(1)
    expect(result.steps[0]).toContain('לערבב')
  })

  it('classifies action-verb lines as steps', () => {
    const text = `מתכון
2 כוסות קמח
לערבב היטב
להוסיף ביצים
לאפות 30 דקות בתנור`

    const result = parseRecipeText(text)
    expect(result.ingredients.length).toBe(1)
    expect(result.steps.length).toBe(3)
  })

  it('classifies long lines as steps', () => {
    const text = `מתכון
2 כוס קמח
מורחים את התערובת על התבנית ומכניסים לתנור שחומם מראש ל180 מעלות למשך 30 דקות`

    const result = parseRecipeText(text)
    expect(result.ingredients.length).toBe(1)
    expect(result.steps.length).toBe(1)
  })
})

describe('Hebrew compound amounts', () => {
  it('parses "כוס וחצי"', () => {
    const text = `מתכון
מצרכים:
כוס וחצי קמח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('1½')
    expect(result.ingredients[0].unit).toBe('כוס')
    expect(result.ingredients[0].name).toBe('קמח')
  })

  it('parses "כפית ושלושת רבעי"', () => {
    const text = `מתכון
מצרכים:
כפית ושלושת רבעי אבקת אפייה
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('1¾')
  })

  it('parses "חצי כפית"', () => {
    const text = `מתכון
מצרכים:
חצי כפית מלח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('½')
    expect(result.ingredients[0].unit).toBe('כפית')
  })

  it('parses "שלושת רבעי כוס"', () => {
    const text = `מתכון
מצרכים:
שלושת רבעי כוס שמן
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('¾')
    expect(result.ingredients[0].unit).toBe('כוס')
  })

  it('parses "שתי כוסות"', () => {
    const text = `מתכון
מצרכים:
שתי כוסות קמח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('2')
    expect(result.ingredients[0].unit).toBe('כוסות')
  })
})

describe('guessCategory', () => {
  it('detects cake as קינוח', () => {
    expect(guessCategory('עוגת שוקולד', ['קמח', 'סוכר'], ['לאפות'])).toBe('קינוח')
  })

  it('detects bread as לחם ואפייה', () => {
    expect(guessCategory('לחם ביתי', ['קמח', 'שמרים'], ['ללוש'])).toBe('לחם ואפייה')
  })

  it('detects soup as מרק', () => {
    expect(guessCategory('מרק ירקות', ['גזר', 'בצל'], ['לבשל'])).toBe('מרק')
  })

  it('detects shake as שתייה', () => {
    expect(guessCategory('שייק בננה', ['בננה', 'חלב'], ['לערבב'])).toBe('שתייה')
  })

  it('returns empty for unknown', () => {
    expect(guessCategory('אוכל טוב', ['דבר'], ['לעשות'])).toBe('')
  })
})

describe('title cleanup', () => {
  it('strips asterisks from WhatsApp-style titles', () => {
    const text = `*עוגת שוקולד*
מצרכים:
2 כוס קמח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.title).toBe('עוגת שוקולד')
  })

  it('strips leading bullets from title', () => {
    const text = `- עוגת שוקולד
מצרכים:
2 כוס קמח
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.title).toBe('עוגת שוקולד')
  })
})

describe('bidi mark handling', () => {
  it('strips bidi marks from lines', () => {
    const text = `מתכון
מצרכים:
\u200E3/4\u200F כוס סוכר
הכנה:
לאפות`
    const result = parseRecipeText(text)
    expect(result.ingredients[0].amount).toBe('¾')
  })
})

describe('sub-header detection', () => {
  it('treats sub-headers as steps for context', () => {
    const text = `עוגה
*לבצק-
2 כוס קמח
1 כוס סוכר
*לציפוי-
1 כוס שוקולד
לערבב הכל ולאפות`

    const result = parseRecipeText(text)
    // Sub-headers should be in steps
    expect(result.steps.some(s => s.includes('לבצק'))).toBe(true)
    expect(result.steps.some(s => s.includes('לציפוי'))).toBe(true)
    // Ingredients should still be detected
    expect(result.ingredients.length).toBeGreaterThanOrEqual(3)
  })
})
