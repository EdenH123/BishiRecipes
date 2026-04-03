'use client'

import { motion } from 'framer-motion'

interface TagFilterProps {
  tags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}

export default function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
}: TagFilterProps) {
  return (
    <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar pb-1">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag)
        return (
          <motion.button
            key={tag}
            layout
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`rounded-full px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap transition-colors ${
              isSelected
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tag}
          </motion.button>
        )
      })}
    </div>
  )
}
