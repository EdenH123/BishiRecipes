'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TagFilter from './TagFilter'

interface FilterBarProps {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (cat: string | null) => void
  tags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  members: { id: string; display_name: string }[]
  selectedMember: string | null
  onSelectMember: (id: string | null) => void
  showFavoritesOnly: boolean
  onToggleFavorites: () => void
}

export default function FilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  tags,
  selectedTags,
  onToggleTag,
  members,
  selectedMember,
  onSelectMember,
  showFavoritesOnly,
  onToggleFavorites,
}: FilterBarProps) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)

  function toggleExpand(filter: string) {
    setExpandedFilter((prev) => (prev === filter ? null : filter))
  }

  return (
    <div className="space-y-3">
      {/* Top-level filter pills with icons */}
      <div className="flex flex-row-reverse gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
        {/* Favorites Toggle */}
        <button
          type="button"
          onClick={onToggleFavorites}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium shadow-sm active:scale-95 transition-all whitespace-nowrap ${
            showFavoritesOnly
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={showFavoritesOnly ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            star
          </span>
          <span>מועדפים</span>
        </button>

        {/* Category Filter */}
        <button
          type="button"
          onClick={() => toggleExpand('category')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium active:scale-95 transition-all whitespace-nowrap ${
            selectedCategory || expandedFilter === 'category'
              ? 'bg-sky/15 text-sky'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">category</span>
          <span>{selectedCategory || 'קטגוריות'}</span>
        </button>

        {/* Tags Filter */}
        <button
          type="button"
          onClick={() => toggleExpand('tags')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium active:scale-95 transition-all whitespace-nowrap ${
            selectedTags.length > 0 || expandedFilter === 'tags'
              ? 'bg-primary/10 text-primary'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sell</span>
          <span>תגיות{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}</span>
        </button>

        {/* Family Filter */}
        <button
          type="button"
          onClick={() => toggleExpand('members')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium active:scale-95 transition-all whitespace-nowrap ${
            selectedMember || expandedFilter === 'members'
              ? 'bg-tertiary/10 text-tertiary'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">family_restroom</span>
          <span>בני משפחה</span>
        </button>
      </div>

      {/* Expanded filter content */}
      <AnimatePresence mode="wait">
        {expandedFilter === 'category' && (
          <motion.div
            key="category"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar pb-1">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(isSelected ? null : cat)}
                    className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-sky text-white'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {expandedFilter === 'tags' && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TagFilter
              tags={tags}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
            />
          </motion.div>
        )}

        {expandedFilter === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar pb-1">
              {members.map((member) => {
                const isSelected = selectedMember === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectMember(isSelected ? null : member.id)}
                    className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                      isSelected
                        ? 'bg-tertiary text-on-tertiary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {member.display_name}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
