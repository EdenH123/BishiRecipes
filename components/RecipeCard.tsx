'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Recipe } from '@/lib/types'

interface RecipeCardProps {
  recipe: Recipe
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipe/${recipe.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="overflow-hidden rounded-card bg-white shadow-md transition-shadow hover:shadow-lg font-rubik"
      >
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-saffron">
            <span className="text-5xl">🍽️</span>
          </div>
        )}

        <div className="p-4" dir="rtl">
          <h3 className="text-lg font-bold text-gray-900">{recipe.title}</h3>

          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.category && (
              <span className="rounded-full bg-herb/15 px-2.5 py-0.5 text-xs font-medium text-herb">
                {recipe.category}
              </span>
            )}

            {recipe.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-warm-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>

          {recipe.profiles?.display_name && (
            <p className="mt-3 text-xs text-gray-400">
              הוסיף/ה: {recipe.profiles.display_name}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
