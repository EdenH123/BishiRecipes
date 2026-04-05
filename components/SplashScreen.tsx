'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Check if already shown this session
    if (sessionStorage.getItem('splash_shown')) {
      setShow(false)
      return
    }
    sessionStorage.setItem('splash_shown', '1')
    const timer = setTimeout(() => setShow(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="text-7xl mb-4"
          >
            🍳
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-3xl font-bold text-primary font-rubik"
          >
            BISHILicious
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
            className="text-sm text-on-surface-variant mt-2 font-rubik"
          >
            מתכונים של המשפחה ❤️
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
