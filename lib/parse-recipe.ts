import { type Ingredient, MEASUREMENT_UNITS } from './types'

export interface ParsedRecipe {
  title: string
  description: string
  ingredients: Ingredient[]
  steps: string[]
  category: string
}

const INGREDIENT_HEADERS = ['מצרכים', 'חומרים', 'רכיבים', 'מה צריך']
const STEP_HEADERS = ['הכנה', 'אופן הכנה', 'הוראות הכנה', 'הוראות', 'שלבי הכנה', 'דרך הכנה', 'אופן ההכנה']

// Hebrew number words
const HEBREW_NUMBERS: Record<string, string> = {
  'חצי': '0.5', 'רבע': '0.25', 'שליש': '0.33',
  'אחד': '1', 'אחת': '1', 'שניים': '2', 'שתיים': '2', 'שני': '2', 'שתי': '2',
  'שלוש': '3', 'שלושה': '3', 'ארבע': '4', 'ארבעה': '4',
  'חמש': '5', 'חמישה': '5', 'שש': '6', 'שישה': '6',
}

const UNITS_LIST = MEASUREMENT_UNITS.filter(Boolean)

function cleanLine(line: string): string {
  return line
    .replace(/^[\s\-•●○◦▪▸►→·∙★☆✓✔⁃–—]+/, '') // strip bullets/dashes
    .replace(/^\d+[\.\)]\s*/, '') // strip numbering like "1. " or "2) "
    .trim()
}

function isHeader(line: string, headers: string[]): boolean {
  const clean = line.replace(/[:\-–—]/g, '').trim().toLowerCase()
  return headers.some((h) => clean === h || clean.startsWith(h))
}

function parseIngredientLine(line: string): Ingredient {
  const clean = cleanLine(line)
  if (!clean) return { amount: '', unit: '', name: '' }

  // Try to match: [amount] [unit] [name]
  // Amount can be: digits, fractions (1/2), decimals, Hebrew number words
  const fractionPattern = /^(\d+(?:[\/\.]\d+)?(?:\s*[-–]\s*\d+(?:[\/\.]\d+)?)?)\s*/
  const match = clean.match(fractionPattern)

  let amount = ''
  let remaining = clean

  if (match) {
    amount = match[1].replace('–', '-')
    remaining = clean.slice(match[0].length)
  } else {
    // Check for Hebrew number words at start
    for (const [word, num] of Object.entries(HEBREW_NUMBERS)) {
      if (remaining.startsWith(word + ' ') || remaining === word) {
        amount = num
        remaining = remaining.slice(word.length).trim()
        break
      }
    }
  }

  // Try to find unit
  let unit = ''
  for (const u of UNITS_LIST) {
    if (remaining.startsWith(u + ' ') || remaining === u) {
      unit = u
      remaining = remaining.slice(u.length).trim()
      break
    }
  }

  // Remove "של" connector
  remaining = remaining.replace(/^של\s+/, '')

  return { amount, unit, name: remaining }
}

function guessCategory(title: string, ingredients: string[], steps: string[]): string {
  const all = [title, ...ingredients, ...steps.slice(0, 3)].join(' ').toLowerCase()

  if (/עוגה|עוגיות|קרם|שוקולד|מוס|טירמיסו|עוגת|קאפקייק|מאפין/.test(all)) return 'קינוח'
  if (/מרק|מרקים/.test(all)) return 'מרק'
  if (/סלט/.test(all)) return 'סלט'
  if (/לחם|חלה|פיתה|בצק|אפייה|מאפה/.test(all)) return 'לחם ואפייה'
  if (/שייק|מיץ|קוקטייל|משקה|סמוזי|לימונדה/.test(all)) return 'שתייה'
  if (/חביתה|שקשוקה|גרנולה|פנקייק|טוסט/.test(all)) return 'ארוחת בוקר'
  if (/חטיף|גרנולה בר|כדורי/.test(all)) return 'חטיף'

  return ''
}

export function parseRecipeText(text: string): ParsedRecipe {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  if (lines.length === 0) {
    return { title: '', description: '', ingredients: [], steps: [], category: '' }
  }

  let title = ''
  let description = ''
  const ingredients: Ingredient[] = []
  const steps: string[] = []

  // Find section boundaries
  let ingredientStart = -1
  let stepStart = -1

  for (let i = 0; i < lines.length; i++) {
    if (isHeader(lines[i], INGREDIENT_HEADERS)) {
      ingredientStart = i
    } else if (isHeader(lines[i], STEP_HEADERS)) {
      stepStart = i
    }
  }

  // If no headers found, try heuristic: first line = title, then try to split
  if (ingredientStart === -1 && stepStart === -1) {
    // Simple mode: first line is title
    title = cleanLine(lines[0])

    // Check if lines look like ingredients (short, have amounts) vs steps (longer, instructional)
    let splitPoint = -1
    for (let i = 1; i < lines.length; i++) {
      const clean = cleanLine(lines[i])
      // Steps tend to have action verbs or be longer
      if (clean.length > 40 || /לערבב|להוסיף|לחמם|לשים|לאפות|להכניס|לבשל|לטגן|לחתוך|לערבב|להניח|למזוג|לקפל|להרתיח|לקרר/.test(clean)) {
        if (splitPoint === -1) splitPoint = i
      }
    }

    if (splitPoint > 1) {
      // Lines 1..splitPoint-1 are ingredients, rest are steps
      for (let i = 1; i < splitPoint; i++) {
        const ing = parseIngredientLine(lines[i])
        if (ing.name) ingredients.push(ing)
      }
      for (let i = splitPoint; i < lines.length; i++) {
        const clean = cleanLine(lines[i])
        if (clean) steps.push(clean)
      }
    } else {
      // Can't determine — put everything as ingredients
      for (let i = 1; i < lines.length; i++) {
        const ing = parseIngredientLine(lines[i])
        if (ing.name) ingredients.push(ing)
      }
    }
  } else {
    // Has at least one header — use structured parsing
    // Title = first non-header line, or first line before any header
    const firstHeader = Math.min(
      ingredientStart >= 0 ? ingredientStart : Infinity,
      stepStart >= 0 ? stepStart : Infinity,
    )
    title = cleanLine(lines[0])

    // Description = lines between title and first header (if any)
    const descLines: string[] = []
    for (let i = 1; i < firstHeader; i++) {
      if (!isHeader(lines[i], [...INGREDIENT_HEADERS, ...STEP_HEADERS])) {
        descLines.push(cleanLine(lines[i]))
      }
    }
    description = descLines.join('\n')

    // Parse ingredients
    if (ingredientStart >= 0) {
      const endIdx = stepStart > ingredientStart ? stepStart : lines.length
      for (let i = ingredientStart + 1; i < endIdx; i++) {
        if (isHeader(lines[i], STEP_HEADERS)) break
        const ing = parseIngredientLine(lines[i])
        if (ing.name) ingredients.push(ing)
      }
    }

    // Parse steps
    if (stepStart >= 0) {
      const endIdx = ingredientStart > stepStart ? ingredientStart : lines.length
      for (let i = stepStart + 1; i < endIdx; i++) {
        if (isHeader(lines[i], INGREDIENT_HEADERS)) break
        const clean = cleanLine(lines[i])
        if (clean) steps.push(clean)
      }
    }
  }

  const category = guessCategory(
    title,
    ingredients.map((i) => i.name),
    steps,
  )

  return { title, description, ingredients, steps, category }
}
