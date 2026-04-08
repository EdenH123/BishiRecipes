'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase will automatically pick up the token from the URL hash
    // and establish the session via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (password !== confirmPassword) {
      toast.error('הסיסמאות לא תואמות')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('הסיסמה שונתה בהצלחה!')
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 font-rubik">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-card shadow-lg shadow-black/8 border border-secondary-container/20 p-8">
          <div className="text-center mb-8">
            <Image src="/logo.png" alt="BISHILicious" width={80} height={80} className="rounded-full mx-auto mb-3" priority />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              איפוס סיסמה
            </h1>
            <p className="text-gray-500 text-sm">
              הכנס סיסמה חדשה
            </p>
          </div>

          {!ready ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-primary mx-auto mb-4" />
              <p className="text-sm text-gray-500">מאמת את הקישור...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  סיסמה חדשה
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  אימות סיסמה
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הכנס שוב את הסיסמה"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-card bg-primary hover:bg-primary-container text-white font-medium text-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                {loading ? 'משנה...' : 'שנה סיסמה'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
