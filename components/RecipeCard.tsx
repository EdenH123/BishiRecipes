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
        className="bg-surface-container-lowest rounded overflow-hidden shadow-[0px_4px_16px_rgba(180,28,27,0.04)] group"
      >
        <div className="aspect-[4/3] overflow-hidden relative">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex w-full h-full items-center justify-center bg-secondary-container/30 text-5xl">
              🍽️
            </div>
          )}

          {recipe.category && (
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-primary">
              {recipe.category}
            </div>
          )}
        </div>

        <div className="p-3 text-right">
          <h3 className="text-on-surface font-bold text-sm mb-1 line-clamp-1">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="text-xs text-on-surface-variant mb-1.5 line-clamp-2 whitespace-pre-line">
              {recipe.description}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mb-2 justify-end">
            {recipe.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] bg-surface-container px-1.5 py-0.5 rounded text-outline"
              >
                {tag}
              </span>
            ))}
          </div>

          {recipe.profiles?.display_name && (
            <p className="text-[10px] text-outline italic">
              הוסיף/ה: {recipe.profiles.display_name}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  )
}
