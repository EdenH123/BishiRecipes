import { type Ingredient, MEASUREMENT_UNITS } from './types'

export interface ParsedRecipe {
  title: string
  description: string
  ingredients: Ingredient[]
  steps: string[]
  category: string
}

const INGREDIENT_HEADERS = ['מרכיבים', 'מצרכים', 'חומרים', 'רכיבים', 'מה צריך']
const STEP_HEADERS = ['הכנה', 'אופן הכנה', 'הוראות הכנה', 'הוראות', 'שלבי הכנה', 'דרך הכנה', 'אופן ההכנה', 'מה עושים', 'איך מכינים', 'אופן העבודה']

// Hebrew number words
const HEBREW_NUMBERS: Record<string, string> = {
  'חצי': '0.5', 'רבע': '0.25', 'שליש': '0.33',
  'אחד': '1', 'אחת': '1', 'שניים': '2', 'שתיים': '2', 'שני': '2', 'שתי': '2',
  'שלוש': '3', 'שלושה': '3', 'ארבע': '4', 'ארבעה': '4',
  'חמש': '5', 'חמישה': '5', 'שש': '6', 'שישה': '6',
}

const UNITS_LIST = MEASUREMENT_UNITS.filter(Boolean)

// Action verbs that indicate a step (not an ingredient)
const STEP_VERBS = /לערבב|להוסיף|לחמם|לשים|לאפות|להכניס|לבשל|לטגן|לחתוך|להניח|למזוג|לקפל|להרתיח|לקרר|ללוש|לגלגל|להשאיר|לחלק|לסגור|להעביר|לרדד|למרוח|לשפוך|לסנן|לכסות|לפזר|לערום|ליצור|לטרוף|להמתין|לצנן|למלא|לקשט|לזלף|להגיש|לדלל|לכבות|להפוך|לנקז|לגרד|להקציף|לקמח|מחממים|מרתיחים|מערבבים|מוסיפים|שמים|אופים|מכניסים|מבשלים|מטגנים|חותכים|מניחים|מוזגים|מקפלים|מקררים|מגלגלים|יוצרים|מעבירים|מורחים|טורפים|יוצקים|מפזרים|ממלאים|מקשטים|מגישים|מנקזים|מקציפים|מכסים|משאירים|מחלקים|יש לסגור|יש להוסיף|יש לערבב|יש להניח|יש להכניס|כשהמים|כשהתנור|כשהשמן|אחרי ש|לפני ש|בינתיים|בזהירות|היטב|בעדינות|עד שמקבלים|עד ש|טובלים|מסדרים|מרססים|גוזרים|חוזרים על/

// Common food/ingredient words that indicate a line is an ingredient
const FOOD_WORDS = /קמח|סוכר|מלח|שמן|חמאה|ביצ|שמנת|חלב|שוקולד|קקאו|שמרים|אבקת|וניל|קינמון|גבינה|שקדים|אגוזים|צימוקים|דבש|סילן|תמצית|מיץ|לימון|תפוז|בצל|שום|עגבני|פלפל|גזר|תפוח|קישוא|חציל|פטרוזיל|כוסברה|נענע|כרוב|חסה|אורז|פסטה|בורגול|קוסקוס|עוף|בקר|הודו|דג|טחינה|סויה|חומוס|שעועית|עדשים|תירס|פטריות|זית|אפונה|ברוקולי|כרובית|סלרי|דלעת|בטטה|תפוחי אדמה|מרגרינה|שקית|אבקה|קורנפלור|שומשום|כמון|כורכום|פפריקה|תבלין|בשר|דפי אורז|רוטב|מים/

// Temporal/structural words that strongly indicate a step
const STEP_STRUCTURE = /דקות|שעה|שעות|מעלות|תנור|מיקסר|קערה|תבנית|סיר|מחבת|אש /

function scoreIngredient(line: string): number {
  const clean = cleanLine(line)
  if (!clean) return 0
  let score = 0

  // Strong negative: action verbs
  if (STEP_VERBS.test(clean)) score -= 5
  // Strong negative: step structure words
  if (STEP_STRUCTURE.test(clean)) score -= 2
  // Strong negative: long lines are usually steps
  if (clean.length > 60) score -= 3
  if (clean.length > 40) score -= 1

  // Strong positive: starts with number
  if (/^\d/.test(clean)) score += 4
  // Strong positive: starts with Hebrew number
  for (const [word] of Object.entries(HEBREW_NUMBERS)) {
    if (clean.startsWith(word + ' ') || clean === word) { score += 4; break }
  }
  // Strong positive: starts with or contains a measurement unit
  for (const u of UNITS_LIST) {
    if (clean.startsWith(u + ' ') || clean === u) { score += 4; break }
    if (clean.includes(' ' + u + ' ') || clean.endsWith(' ' + u)) { score += 2; break }
  }
  // Positive: contains food words
  if (FOOD_WORDS.test(clean)) score += 3
  // Positive: short lines lean ingredient
  if (clean.length < 25) score += 1

  return score
}

function isSubHeader(line: string): boolean {
  const clean = cleanLine(line)
  // Patterns like "*לבצק (במיקסר)-", "*כשהמים רותחים,"
  if (/^\*/.test(line.trim()) && clean.length < 40 && /[-–:,]$/.test(clean)) return true
  // Catch "לציפוי:", "לבצק:", "למילוי-", "לבלילה לטבילה-" style sub-headers
  if (/^ל\S+/.test(clean) && clean.length < 40 && /[-–:]$/.test(clean)) return true
  return false
}

function isIngredientSubHeader(line: string): boolean {
  const clean = cleanLine(line)
  // "למילוי-", "לבלילה לטבילה-", "לציפוי:", "לרוטב-"
  if (/^ל\S+/.test(clean) && clean.length < 40 && /[-–:]$/.test(clean)) return true
  return false
}

function cleanLine(line: string): string {
  return line
    .replace(/[\u200E\u200F\u200B\u200C\u200D\u2066\u2067\u2068\u2069\uFEFF]/g, '') // strip bidi/zero-width marks
    .replace(/^[\s\-•●○◦▪▸►→·∙★☆✓✔⁃–—*]+/, '') // strip bullets/dashes/asterisks
    .replace(/\*+$/, '') // strip trailing asterisks
    .replace(/^\d+[\.\)]\s+/, '') // strip numbering like "1. " or "2) " (require space to avoid eating decimals like "2.5")
    .replace(/^כותרת[:\s]+/i, '') // strip "כותרת:" prefix
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2') // normalize OCR spaced fractions: "3 / 4" → "3/4"
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2') // normalize OCR spaced decimals: "1 . 5" → "1.5"
    .trim()
}

function isHeader(line: string, headers: string[]): boolean {
  const clean = line.replace(/[:\-–—?!]/g, '').trim().toLowerCase()
  return headers.some((h) => clean === h || clean.startsWith(h))
}

// Hebrew fraction modifiers that come AFTER a unit: "כוס וחצי" = 1.5 cups
const HEBREW_FRACTION_MODIFIERS: [string, string][] = [
  ['ושלושת רבעי', '0.75'],
  ['ושלושה רבעי', '0.75'],
  ['ושני שלישי', '0.67'],
  ['ורבע', '0.25'],
  ['ושליש', '0.33'],
  ['וחצי', '0.5'],
]

// Hebrew standalone compound amounts: "שלושת רבעי כפית" = 0.75
const HEBREW_COMPOUND_AMOUNTS: [string, string][] = [
  ['שלושת רבעי', '0.75'],
  ['שלושה רבעי', '0.75'],
  ['שני שלישי', '0.67'],
]

const DECIMAL_TO_FRACTION: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [0.33, '⅓'], [0.375, '⅜'],
  [0.5, '½'], [0.625, '⅝'], [0.67, '⅔'], [0.75, '¾'], [0.875, '⅞'],
]

function evaluateAmount(value: string): number {
  // Handle "1/2", "3/4" etc.
  if (value.includes('/')) {
    const parts = value.split('/')
    if (parts.length === 2) {
      const n = parseFloat(parts[0])
      const d = parseFloat(parts[1])
      if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d
    }
  }
  return parseFloat(value)
}

function decimalToFraction(value: string): string {
  const num = evaluateAmount(value)
  if (isNaN(num)) return value
  const whole = Math.floor(num)
  const frac = num - whole

  // Find closest fraction
  for (const [dec, symbol] of DECIMAL_TO_FRACTION) {
    if (Math.abs(frac - dec) < 0.02) {
      return whole > 0 ? `${whole}${symbol}` : symbol
    }
  }
  // No matching fraction — return as-is
  if (frac === 0) return String(whole)
  return value
}

function parseIngredientLine(line: string): Ingredient {
  const clean = cleanLine(line)
  if (!clean) return { amount: '', unit: '', name: '' }

  let amount = ''
  let remaining = clean

  // 1. Try numeric amount: "3 כפות", "1.5 כוס", "1/2 כפית", "1 1/2 כוס"
  // Mixed number: "1 1/2" or "2 3/4"
  const mixedPattern = /^(\d+)\s+(\d+\/\d+)\s+/
  const mixedMatch = remaining.match(mixedPattern)
  // Simple: "3", "1.5", "1/2", range "1-2"
  const fractionPattern = /^(\d+(?:[\/\.]\d+)?(?:\s*[-–]\s*\d+(?:[\/\.]\d+)?)?)\s+/
  const numMatch = mixedMatch || remaining.match(fractionPattern)

  if (mixedMatch) {
    // Combine whole + fraction: "1 1/2" → evaluate as 1.5
    const whole = parseInt(mixedMatch[1])
    const [n, d] = mixedMatch[2].split('/').map(Number)
    amount = String(whole + n / d)
    remaining = remaining.slice(mixedMatch[0].length)
  } else if (numMatch) {
    amount = numMatch[1].replace('–', '-')
    remaining = remaining.slice(numMatch[0].length)
  } else {
    // 2. Try Hebrew compound amounts: "שלושת רבעי כפית"
    let foundCompound = false
    for (const [prefix, val] of HEBREW_COMPOUND_AMOUNTS) {
      if (remaining.startsWith(prefix + ' ') || remaining === prefix) {
        amount = val
        remaining = remaining.slice(prefix.length).trim()
        foundCompound = true
        break
      }
    }

    // 3. Try Hebrew number words: "חצי כפית", "שתי כוסות"
    if (!foundCompound) {
      for (const [word, num] of Object.entries(HEBREW_NUMBERS)) {
        if (remaining.startsWith(word + ' ') || remaining === word) {
          amount = num
          remaining = remaining.slice(word.length).trim()
          break
        }
      }
    }
  }

  // 4. Try to find unit
  let unit = ''
  for (const u of UNITS_LIST) {
    if (remaining.startsWith(u + ' ') || remaining === u) {
      unit = u
      remaining = remaining.slice(u.length).trim()
      break
    }
  }

  // 5. Check for Hebrew fraction modifier after unit: "כוס וחצי", "כפית ושלושת רבעי"
  if (unit) {
    for (const [prefix, val] of HEBREW_FRACTION_MODIFIERS) {
      if (remaining.startsWith(prefix + ' ') || remaining === prefix) {
        const base = amount ? parseFloat(amount) : 1
        amount = String(base + parseFloat(val))
        remaining = remaining.slice(prefix.length).trim()
        break
      }
    }
    // If we found a unit but no amount, it means "1 unit" (e.g., "כוס קמח" = 1 cup flour)
    if (!amount) amount = '1'
  }


  // Remove "של" connector
  remaining = remaining.replace(/^של\s+/, '')

  return { amount: amount ? decimalToFraction(amount) : '', unit, name: remaining }
}

export function guessCategory(title: string, ingredients: string[], steps: string[]): string {
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

  // If no headers found, try heuristic: score each line and use context
  if (ingredientStart === -1 && stepStart === -1) {
    title = cleanLine(lines[0])

    // First pass: score every line
    const scores: number[] = []
    for (let i = 1; i < lines.length; i++) {
      scores.push(scoreIngredient(lines[i]))
    }

    // Second pass: context-aware classification
    // Lines near other ingredients get a boost, and vice versa
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i]
      const clean = cleanLine(raw)
      if (!clean) continue

      const idx = i - 1 // scores index
      let score = scores[idx]

      // Context: if neighbors are ingredients, boost this line's ingredient score
      const prevScore = idx > 0 ? scores[idx - 1] : 0
      const nextScore = idx < scores.length - 1 ? scores[idx + 1] : 0
      if (prevScore > 0 && nextScore > 0) score += 1 // sandwiched between ingredients
      if (prevScore > 2) score += 0.5 // previous was clearly an ingredient

      // Sub-headers go to steps for context
      if (isSubHeader(raw)) {
        steps.push(clean)
        continue
      }

      if (score > 0) {
        const ing = parseIngredientLine(raw)
        if (ing.name || ing.unit) ingredients.push(ing)
        else if (clean) steps.push(clean)
      } else {
        steps.push(clean)
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
        const clean = cleanLine(lines[i])
        if (!clean) continue
        // Ingredient sub-headers like "למילוי-" become label-only ingredients
        if (isIngredientSubHeader(lines[i])) {
          ingredients.push({ amount: '', unit: '', name: `--- ${clean.replace(/[-–:]$/, '').trim()} ---` })
          continue
        }
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
        if (!clean) continue
        // Split long paragraphs into separate steps by sentence boundaries
        const sentences = clean.split(/(?<=\.)\s+/).filter(s => s.trim().length > 0)
        if (sentences.length > 1 && clean.length > 80) {
          for (const s of sentences) steps.push(s.trim())
        } else {
          steps.push(clean)
        }
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
