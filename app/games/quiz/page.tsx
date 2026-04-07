'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Question {
  question: string
  answers: string[]
  correct: number
  fact: string
}

const QUESTIONS: Question[] = [
  { question: 'מהו התבלין היקר בעולם?', answers: ['כורכום', 'זעפרן', 'וניל', 'קינמון'], correct: 1, fact: 'זעפרן נקטף ביד מפרחי כרכום — צריך כ-150,000 פרחים לקילוגרם אחד!' },
  { question: 'מאיזו מדינה מגיעה הפיצה?', answers: ['צרפת', 'ספרד', 'איטליה', 'יוון'], correct: 2, fact: 'הפיצה המודרנית נולדה בנאפולי, איטליה, במאה ה-18.' },
  { question: 'כמה מעלות צריך מים כדי לרתוח?', answers: ['90°C', '100°C', '110°C', '120°C'], correct: 1, fact: 'ברמת הים מים רותחים ב-100°C, אבל בהרים זה קורה בטמפרטורה נמוכה יותר!' },
  { question: 'מהו המרכיב העיקרי בגואקמולי?', answers: ['עגבנייה', 'אבוקדו', 'לימון', 'בצל'], correct: 1, fact: 'גואקמולי הומצא על ידי האצטקים לפני למעלה מ-500 שנה.' },
  { question: 'איזה פרי הוא גם ירק מבחינה בוטנית?', answers: ['מלפפון', 'תפוח', 'בננה', 'ענבים'], correct: 0, fact: 'מלפפון, עגבנייה ופלפל הם למעשה פירות מבחינה בוטנית!' },
  { question: 'מה המשמעות של "אל דנטה"?', answers: ['רך מאוד', 'לשן (קשיח קצת)', 'שרוף', 'קר'], correct: 1, fact: 'אל דנטה באיטלקית פירושו "לשן" — פסטה שעדיין מעט קשיחה בביס.' },
  { question: 'איזו מדינה ממציאה את הסושי?', answers: ['סין', 'קוריאה', 'יפן', 'תאילנד'], correct: 2, fact: 'הסושי המקורי היה דג מותסס עם אורז, והומצא ביפן במאה ה-8.' },
  { question: 'מהו שמן הזית הכי איכותי?', answers: ['Light', 'Pure', 'Extra Virgin', 'Pomace'], correct: 2, fact: 'Extra Virgin מופק מסחיטה ראשונה קרה ויש לו את הטעם הטוב ביותר.' },
  { question: 'כמה סוכר יש בכוס קולה (330 מ"ל)?', answers: ['15 גרם', '25 גרם', '35 גרם', '45 גרם'], correct: 2, fact: 'בפחית קולה יש כ-35 גרם סוכר — כ-9 כפיות!' },
  { question: 'מאיזו מדינה מגיע הפלאפל?', answers: ['ישראל', 'מצרים', 'לבנון', 'שנוי במחלוקת'], correct: 3, fact: 'מקור הפלאפל שנוי במחלוקת — מצרים, לבנון וישראל כולן טוענות לבעלות!' },
  { question: 'מה ההבדל בין אפייה לצלייה?', answers: ['אין הבדל', 'חום יבש vs רטוב', 'עם/בלי מכסה', 'טמפרטורה'], correct: 3, fact: 'צלייה (roasting) בדרך כלל בטמפרטורות גבוהות יותר מאפייה (baking).' },
  { question: 'איזה תבלין נותן לקארי את הצבע הצהוב?', answers: ['פפריקה', 'כורכום', 'כמון', 'זנגביל'], correct: 1, fact: 'כורכום (טורמריק) נותן את הצבע הצהוב ויש לו גם תכונות בריאותיות.' },
]

export default function QuizGame() {
  const router = useRouter()
  const [questions] = useState(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 10)
  })
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [showFact, setShowFact] = useState(false)
  const [finished, setFinished] = useState(false)

  function handleAnswer(index: number) {
    if (selected !== null) return
    setSelected(index)
    if (index === questions[current].correct) setScore(s => s + 1)
    setShowFact(true)
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowFact(false)
    }
  }

  function restart() {
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setShowFact(false)
    setFinished(false)
  }

  const q = questions[current]
  const progress = ((current + (selected !== null ? 1 : 0)) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-orange-900 font-rubik" dir="rtl">
      <div className="sticky top-0 z-10 bg-amber-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h1 className="text-lg font-bold text-white">חידון בישול</h1>
          </div>
          <button onClick={() => router.push('/games')} className="text-white/70 text-sm active:scale-95">חזרה</button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {!finished ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              {/* Score & question number */}
              <div className="flex justify-between text-white/60 text-sm mb-4">
                <span>שאלה {current + 1} מתוך {questions.length}</span>
                <span>ניקוד: {score}/{questions.length}</span>
              </div>

              {/* Question */}
              <h2 className="text-xl font-bold text-white mb-6">{q.question}</h2>

              {/* Answers */}
              <div className="space-y-3">
                {q.answers.map((ans, i) => {
                  let bg = 'bg-white/10 border-white/20'
                  if (selected !== null) {
                    if (i === q.correct) bg = 'bg-green-500/30 border-green-400'
                    else if (i === selected) bg = 'bg-red-500/30 border-red-400'
                  }
                  return (
                    <motion.button
                      key={i}
                      whileTap={selected === null ? { scale: 0.97 } : {}}
                      onClick={() => handleAnswer(i)}
                      className={`w-full text-right px-5 py-3.5 rounded-xl border-2 text-white font-medium transition-all ${bg}`}
                    >
                      {ans}
                    </motion.button>
                  )
                })}
              </div>

              {/* Fact */}
              {showFact && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 bg-white/10 rounded-xl p-4"
                >
                  <p className="text-sm text-amber-200 font-medium mb-1">
                    {selected === q.correct ? '✅ נכון!' : '❌ לא נכון!'}
                  </p>
                  <p className="text-white/80 text-sm">{q.fact}</p>
                  <button
                    onClick={nextQuestion}
                    className="mt-3 bg-white text-amber-900 px-6 py-2 rounded-full font-bold text-sm active:scale-95"
                  >
                    {current + 1 >= questions.length ? 'סיום' : 'הבא'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <span className="text-6xl block mb-4">
              {score >= 9 ? '🏆' : score >= 7 ? '🌟' : score >= 5 ? '👍' : '📚'}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {score >= 9 ? 'שף מומחה!' : score >= 7 ? 'מעולה!' : score >= 5 ? 'לא רע!' : 'יש מקום לשיפור'}
            </h2>
            <p className="text-white/80 text-lg mb-6">{score} מתוך {questions.length} תשובות נכונות</p>
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="bg-white text-amber-900 px-6 py-2.5 rounded-full font-bold active:scale-95">
                שחקו שוב
              </button>
              <button onClick={() => router.push('/games')} className="bg-white/20 text-white px-6 py-2.5 rounded-full font-bold active:scale-95">
                חזרה
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
