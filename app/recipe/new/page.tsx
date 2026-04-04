'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import RecipeForm from '@/components/RecipeForm'

export default function NewRecipePage() {
  return (
    <div className="min-h-screen bg-surface pt-20 pb-28">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl px-4 py-8 font-rubik"
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">מתכון חדש</h1>
          <Link
            href="/recipe/import"
            className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            ייבוא מטקסט
          </Link>
        </div>
        <RecipeForm />
      </motion.div>
      <BottomNav />
    </div>
  )
}
