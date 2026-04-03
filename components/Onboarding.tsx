'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  {
    icon: 'restaurant_menu',
    title: 'ברוכים הבאים!',
    text: 'בישי מתכונים — המקום לשתף מתכונים עם המשפחה',
  },
  {
    icon: 'add_circle',
    title: 'הוסיפו מתכון',
    text: 'לחצו על ה-+ בתחתית המסך להוסיף מתכון חדש עם מצרכים, שלבים ותמונה',
  },
  {
    icon: 'star',
    title: 'סמנו מועדפים',
    text: 'לחצו על הכוכב כדי לשמור מתכונים שאהבתם',
  },
  {
    icon: 'skillet',
    title: 'מצב בישול',
    text: 'בתוך מתכון — לחצו "מצב בישול" לצפייה שלב אחרי שלב במסך מלא',
  },
]

const STORAGE_KEY = 'bishi-onboarding-done'

export default function Onboarding() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true)
    }
  }, [])

  function handleDone() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  const isLast = step === STEPS.length - 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-4xl text-primary">
                {STEPS[step].icon}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2">{STEPS[step].title}</h2>
            <p className="text-gray-600 leading-relaxed">{STEPS[step].text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-gray-200 py-3 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              הקודם
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleDone}
              className="flex-1 rounded-lg bg-primary py-3 font-bold text-white hover:opacity-90 transition-opacity"
            >
              יאללה, בואו נבשל!
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-lg bg-primary py-3 font-bold text-white hover:opacity-90 transition-opacity"
            >
              הבא
            </button>
          )}
        </div>

        <button
          onClick={handleDone}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          דלג
        </button>
      </motion.div>
    </motion.div>
  )
}
