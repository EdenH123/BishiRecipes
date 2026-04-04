'use client'

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
        <h1 className="mb-6 text-3xl font-bold text-primary">מתכון חדש</h1>
        <RecipeForm />
      </motion.div>
      <BottomNav />
    </div>
  )
}
