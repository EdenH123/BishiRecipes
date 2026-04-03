'use client'

import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import RecipeForm from '@/components/RecipeForm'

export default function NewRecipePage() {
  return (
    <>
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl px-4 py-8 font-rubik"
        dir="rtl"
      >
        <h1 className="mb-6 text-3xl font-bold text-[#E8433A]">מתכון חדש</h1>
        <RecipeForm />
      </motion.div>
    </>
  )
}
