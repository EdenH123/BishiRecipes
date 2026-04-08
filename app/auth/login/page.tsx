'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Ensure profile exists (may be missing if signup had issues)
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        const displayName = data.user.email?.split('@')[0] || 'משתמש/ת'
        await supabase
          .from('profiles')
          .insert({ id: data.user.id, display_name: displayName })
      }
    }

    toast.success('התחברת בהצלחה!')
    router.push('/')
    router.refresh()
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('הכנס את כתובת האימייל שלך')
      return
    }
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('נשלח מייל לאיפוס סיסמה! בדוק את תיבת הדואר')
      setResetMode(false)
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              BISHILicious
            </h1>
            <p className="text-gray-500 text-sm">
              התחברו כדי לגלות מתכונים מדהימים
            </p>
          </div>

          {resetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <p className="text-sm text-gray-500 text-center mb-2">
                הכנס את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
              </p>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  אימייל
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-card bg-primary hover:bg-primary-container text-white font-medium text-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-sky hover:text-sky/80 font-medium transition-colors"
                >
                  חזרה להתחברות
                </button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    אימייל
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    סיסמה
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הכנס סיסמה"
                    className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface/50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-card bg-primary hover:bg-primary-container text-white font-medium text-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                  {loading ? 'מתחבר...' : 'התחברות'}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  onClick={() => setResetMode(true)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  שכחתי סיסמה
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                אין לך חשבון?{' '}
                <Link
                  href="/auth/signup"
                  className="text-sky hover:text-sky/80 font-medium transition-colors"
                >
                  הרשמה
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
