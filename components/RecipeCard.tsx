'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import type { Recipe } from '@/lib/types'
import { parseIngredient, displayIngredient } from '@/lib/types'
import { detectAllergens } from '@/lib/allergens'

const BLUR_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIklEQVQYV2N89+7dfwYGBgZGRkYGJgYKABMDhYCRkgAALCQEAf2VlGIAAAAASUVORK5CYII='

interface RecipeCardProps {
  recipe: Recipe
}

const tagContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
}

const tagItemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const allergens = useMemo(() => detectAllergens(recipe.ingredients ?? []), [recipe.ingredients])

  const handleFlip = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFlipped((prev) => !prev)
  }

  return (
    <Link href={`/recipe/${recipe.id}`}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="group"
        style={{ perspective: 800 }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front side */}
          <div
            className="bg-surface-container-lowest rounded overflow-hidden shadow-[0px_4px_16px_rgba(180,28,27,0.04)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="aspect-[4/3] overflow-hidden relative">
              {recipe.image_url ? (
                <Image
                  src={recipe.image_url}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  onLoad={() => setImageLoaded(true)}
                  className={`object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
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
              {recipe.prep_time && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-medium text-white flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  {recipe.prep_time} דק׳
                </div>
              )}
              {allergens.length > 0 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {allergens.map((a) => (
                    <span
                      key={a.name}
                      className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-xs"
                      title={a.name}
                    >
                      {a.icon}
                    </span>
                  ))}
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

              <motion.div
                className="flex flex-wrap gap-1 mb-2 justify-end"
                variants={tagContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {recipe.tags?.slice(0, 3).map((tag) => (
                  <motion.span
                    key={tag}
                    variants={tagItemVariants}
                    className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-outline"
                  >
                    {tag}
                  </motion.span>
                ))}
              </motion.div>

              <div className="flex items-end justify-between">
                {recipe.profiles?.display_name && (
                  <p className="text-[11px] text-outline italic">
                    הוסיף/ה: {recipe.profiles.display_name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleFlip}
                  className="w-8 h-8 shrink-0 rounded-full bg-primary/80 text-white flex items-center justify-center text-sm shadow-md hover:bg-primary transition-colors active:scale-95"
                  aria-label="Show ingredients"
                >
                  i
                </button>
              </div>
            </div>
          </div>

          {/* Back side */}
          <div
            className="absolute inset-0 bg-surface-container-lowest rounded overflow-hidden shadow-[0px_4px_16px_rgba(180,28,27,0.04)] flex flex-col"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="p-3 pb-1 text-right flex-1 overflow-hidden flex flex-col min-h-0">
              <h3 className="text-on-surface font-bold text-sm mb-2 line-clamp-1 shrink-0">
                {recipe.title}
              </h3>
              <p className="text-[10px] text-primary font-bold mb-1.5 shrink-0">
                מצרכים
              </p>
              <ul className="text-xs text-on-surface-variant space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
                {recipe.ingredients?.length ? (
                  recipe.ingredients.map((raw, idx) => {
                    const ing = parseIngredient(raw)
                    return (
                      <li key={idx} className="flex items-start gap-1 justify-end">
                        <span>{displayIngredient(ing)}</span>
                        <span className="text-primary/60 mt-0.5 shrink-0">&#x2022;</span>
                      </li>
                    )
                  })
                ) : (
                  <li className="text-outline italic">אין מצרכים</li>
                )}
              </ul>
            </div>
            <div className="flex justify-start px-3 pb-2 shrink-0">
              <button
                type="button"
                onClick={handleFlip}
                className="w-8 h-8 rounded-full bg-on-surface/10 text-on-surface-variant flex items-center justify-center shadow-sm hover:bg-on-surface/20 transition-colors active:scale-95"
                aria-label="Show front"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
