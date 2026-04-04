'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

export default function Fab() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  if (!isLoggedIn) return null

  return (
    <motion.button
      onClick={() => router.push('/recipe/new')}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:shadow-xl transition-shadow"
      aria-label="Add new recipe"
    >
      <span className="material-symbols-outlined text-3xl">add</span>
    </motion.button>
  )
}
