"use client";

import { motion } from "framer-motion";
import TagFilter from "./TagFilter";

interface FilterBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  members: { id: string; display_name: string }[];
  selectedMember: string | null;
  onSelectMember: (id: string | null) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
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
  return (
    <div className="space-y-3">
      {/* Category filter */}
      <div>
        <span className="text-xs text-gray-500 mb-1 block">קטגוריה</span>
        <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <motion.button
                key={cat}
                layout
                type="button"
                onClick={() =>
                  onSelectCategory(isSelected ? null : cat)
                }
                className={`rounded-full px-3 py-1 text-sm cursor-pointer whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-sky text-white"
                    : "bg-warm-100 text-gray-600 hover:bg-warm-200"
                }`}
              >
                {cat}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tag filter */}
      <div>
        <span className="text-xs text-gray-500 mb-1 block">תגיות</span>
        <TagFilter
          tags={tags}
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
        />
      </div>

      {/* Member filter */}
      <div>
        <span className="text-xs text-gray-500 mb-1 block">בן משפחה</span>
        <div className="flex flex-row gap-2 overflow-x-auto hide-scrollbar">
          {members.map((member) => {
            const isSelected = selectedMember === member.id;
            return (
              <motion.button
                key={member.id}
                layout
                type="button"
                onClick={() =>
                  onSelectMember(isSelected ? null : member.id)
                }
                className={`rounded-full px-3 py-1 text-sm cursor-pointer whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-herb text-white"
                    : "bg-warm-100 text-gray-600 hover:bg-warm-200"
                }`}
              >
                {member.display_name}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Favorites toggle */}
      <div>
        <motion.button
          layout
          type="button"
          onClick={onToggleFavorites}
          className={`rounded-full px-3 py-1 text-sm cursor-pointer whitespace-nowrap transition-colors ${
            showFavoritesOnly
              ? "bg-saffron text-white"
              : "bg-warm-100 text-gray-600 hover:bg-warm-200"
          }`}
        >
          ⭐ מועדפים בלבד
        </motion.button>
      </div>
    </div>
  );
}
