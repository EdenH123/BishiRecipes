'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

export default function Fab() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
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
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:shadow-xl transition-shadow"
      aria-label="Add new recipe"
    >
      <motion.span
        className="material-symbols-outlined text-3xl"
        whileHover={{ rotate: 90 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        add
      </motion.span>
    </motion.button>
  )
}
