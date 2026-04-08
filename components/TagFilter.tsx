'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

interface TagFilterProps {
  tags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}

export default memo(function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
}: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag)
        return (
          <motion.button
            key={tag}
            layout
            type="button"
            onClick={() => onToggleTag(tag)}
            whileTap={{ scale: 0.9 }}
            animate={isSelected ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`rounded-full px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap transition-colors ${
              isSelected
                ? 'bg-primary text-on-primary shadow-md'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tag}
          </motion.button>
        )
      })}
    </div>
  )
})
