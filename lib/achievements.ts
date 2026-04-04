export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
}

export interface UserStats {
  recipeCount: number
  commentCount: number
  ratingCount: number
  favoriteCount: number
  reactionCount: number
  categoriesUsed: number
  collaborationCount: number
}

export const ACHIEVEMENTS: (Achievement & { check: (stats: UserStats) => boolean })[] = [
  {
    id: 'first_recipe',
    title: 'שף מתחיל',
    description: 'הוספת מתכון ראשון',
    icon: '🌱',
    check: (stats) => stats.recipeCount >= 1,
  },
  {
    id: 'five_recipes',
    title: 'שף חובב',
    description: 'הוספת 5 מתכונים',
    icon: '🍳',
    check: (stats) => stats.recipeCount >= 5,
  },
  {
    id: 'ten_recipes',
    title: 'שף מנוסה',
    description: 'הוספת 10 מתכונים',
    icon: '👨‍🍳',
    check: (stats) => stats.recipeCount >= 10,
  },
  {
    id: 'twenty_recipes',
    title: 'שף מאסטר',
    description: 'הוספת 20 מתכונים',
    icon: '⭐',
    check: (stats) => stats.recipeCount >= 20,
  },
  {
    id: 'first_comment',
    title: 'מגיב/ה',
    description: 'תגובה ראשונה',
    icon: '💬',
    check: (stats) => stats.commentCount >= 1,
  },
  {
    id: 'ten_comments',
    title: 'דברן/ית',
    description: '10 תגובות',
    icon: '🗣️',
    check: (stats) => stats.commentCount >= 10,
  },
  {
    id: 'first_rating',
    title: 'שופט/ת',
    description: 'דירוג ראשון',
    icon: '⭐',
    check: (stats) => stats.ratingCount >= 1,
  },
  {
    id: 'first_favorite',
    title: 'אספן/ית',
    description: 'מועדף ראשון',
    icon: '📌',
    check: (stats) => stats.favoriteCount >= 1,
  },
  {
    id: 'ten_favorites',
    title: 'אספן/ית מושבע/ת',
    description: '10 מועדפים',
    icon: '📚',
    check: (stats) => stats.favoriteCount >= 10,
  },
  {
    id: 'all_categories',
    title: 'גורמה',
    description: 'פרסום מתכון בכל הקטגוריות',
    icon: '🏆',
    check: (stats) => stats.categoriesUsed >= 9,
  },
  {
    id: 'first_reaction',
    title: 'ריאקטור/ית',
    description: 'תגובת אמוג׳י ראשונה',
    icon: '😋',
    check: (stats) => stats.reactionCount >= 1,
  },
  {
    id: 'collaborator',
    title: 'שותף/ה',
    description: 'שותפות במתכון',
    icon: '🤝',
    check: (stats) => stats.collaborationCount >= 1,
  },
]

export function getUnlockedAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(stats)).map(({ check, ...rest }) => rest)
}
