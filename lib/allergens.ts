import { parseIngredient } from '@/lib/types'

interface Allergen {
  name: string
  icon: string
  keywords: string[]
}

const ALLERGEN_MAP: Allergen[] = [
  {
    name: 'גלוטן',
    icon: '🌾',
    keywords: [
      'קמח', 'לחם', 'פיתה', 'פתיתים', 'בורגול', 'קוסקוס', 'שיבולת',
      'פסטה', 'אטריות', 'ביסקוויט', 'עוגיות', 'קרקר', 'מצה', 'סולת', 'כוסמין',
    ],
  },
  {
    name: 'חלב',
    icon: '🥛',
    keywords: [
      'חלב', 'גבינה', 'שמנת', 'חמאה', 'יוגורט', 'לבן', 'קוטג',
      'קרם', 'מוצרלה', 'פרמזן', 'קממבר', 'בריא', 'ריקוטה', 'מסקרפונה',
    ],
  },
  {
    name: 'ביצים',
    icon: '🥚',
    keywords: ['ביצה', 'ביצים', 'חלבון', 'חלמון'],
  },
  {
    name: 'אגוזים',
    icon: '🥜',
    keywords: [
      'אגוז', 'שקד', 'שקדים', 'פיסטוק', 'קשיו', 'אגוזי מלך',
      'אגוזי לוז', 'פקאן', 'חמאת בוטנים', 'בוטנים', 'טחינה', 'שומשום',
    ],
  },
  {
    name: 'סויה',
    icon: '🫘',
    keywords: ['סויה', 'טופו', 'אדממה', 'רוטב סויה', 'מיסו'],
  },
  {
    name: 'דגים',
    icon: '🐟',
    keywords: ['דג', 'סלמון', 'טונה', 'דניס', 'לברק', 'אנשובי', 'סרדין', 'פילה דג'],
  },
]

export function detectAllergens(ingredients: string[]): { name: string; icon: string }[] {
  const found = new Set<string>()
  const results: { name: string; icon: string }[] = []

  for (const raw of ingredients) {
    const { name } = parseIngredient(raw)
    for (const allergen of ALLERGEN_MAP) {
      if (found.has(allergen.name)) continue
      for (const keyword of allergen.keywords) {
        if (name.includes(keyword)) {
          found.add(allergen.name)
          results.push({ name: allergen.name, icon: allergen.icon })
          break
        }
      }
    }
  }

  return results
}
