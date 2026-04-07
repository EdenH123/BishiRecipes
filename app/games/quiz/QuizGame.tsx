'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  { question: 'מהי הטמפרטורה האידיאלית לצליית סטייק מדיום?', answers: ['50°C', '55°C', '63°C', '72°C'], correct: 2, fact: 'סטייק מדיום מגיע לטמפרטורה פנימית של כ-63°C — ורוד מבפנים עם מיצים שקופים.' },
  { question: 'מהו הגבינה הנמכרת ביותר בעולם?', answers: ['צ\'דר', 'מוצרלה', 'גאודה', 'פרמזן'], correct: 1, fact: 'מוצרלה היא הגבינה הנמכרת ביותר, בעיקר בזכות הפופולריות של הפיצה!' },
  { question: 'כמה זמן לוקח לביצה להתבשל קשה?', answers: ['5 דקות', '8 דקות', '10-12 דקות', '15 דקות'], correct: 2, fact: 'ביצה קשה מושלמת מתבשלת 10-12 דקות. מעבר לזה החלמון הופך ירקרק.' },
  { question: 'מהו המרכיב הסודי ברוב המאפים?', answers: ['סוכר', 'מלח', 'חמאה', 'ביצים'], correct: 1, fact: 'מלח מחזק את הגלוטן, מאט תסיסה ומעצים טעמים — בלעדיו מאפים שטוחים ותפלים!' },
  { question: 'מאיפה מגיע השוקולד?', answers: ['אפריקה', 'דרום אמריקה', 'אסיה', 'אוסטרליה'], correct: 1, fact: 'פולי הקקאו מקורם בדרום אמריקה. האצטקים הכינו ממנו משקה מר בשם "שוקולטל".' },
  { question: 'מהו הפרי הפופולרי ביותר בעולם?', answers: ['תפוח', 'בננה', 'מנגו', 'תפוז'], correct: 2, fact: 'מנגו הוא הפרי הנאכל ביותר בעולם! הוא גדל בעיקר בהודו שמייצרת 40% מהיבול העולמי.' },
  { question: 'מה קורה כשמוסיפים מלח למים רותחים?', answers: ['מורידים טמפרטורת רתיחה', 'מעלים טמפרטורת רתיחה', 'לא משפיע', 'עוצרים רתיחה'], correct: 1, fact: 'מלח מעלה את טמפרטורת הרתיחה בכמעט מעלה אחת — מה שמבשל פסטה טוב יותר.' },
  { question: 'איזה שמן הכי טוב לטיגון עמוק?', answers: ['שמן זית', 'שמן קנולה', 'שמן בוטנים', 'חמאה'], correct: 2, fact: 'שמן בוטנים מצוין לטיגון עמוק — נקודת העשן שלו גבוהה (230°C) והוא נותן טעם ניטרלי.' },
]

const ANSWER_LETTERS = ['א', 'ב', 'ג', 'ד']
const TIMER_SECONDS = 15
const SPEED_THRESHOLD = 5

function shuffleAnswers(q: Question): { answers: string[]; correctIndex: number } {
  const indices = q.answers.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const newAnswers = indices.map(i => q.answers[i])
  const newCorrect = indices.indexOf(q.correct)
  return { answers: newAnswers, correctIndex: newCorrect }
}

function CircularTimer({ timeLeft, total }: { timeLeft: number; total: number }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const progress = (timeLeft / total) * circumference
  const urgent = timeLeft <= 5
  const strokeColor = urgent ? '#ef4444' : '#fbbf24'

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <motion.circle
          cx="24" cy="24" r={radius} fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          animate={{ strokeDashoffset: circumference - progress, stroke: strokeColor }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      </svg>
      <span className={`absolute text-sm font-bold ${urgent ? 'text-red-400' : 'text-white'}`}>
        {timeLeft}
      </span>
    </div>
  )
}

function FloatingScore({ points, id }: { points: number; id: number }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.5 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className="absolute top-0 left-1/2 -translate-x-1/2 text-amber-300 font-bold text-lg pointer-events-none z-20"
    >
      +{points}
    </motion.div>
  )
}

function ProgressDots({ total, current, answered }: { total: number; current: number; answered: boolean }) {
  return (
    <div className="flex gap-1.5 justify-center flex-wrap py-2">
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === current
        const isDone = i < current || (i === current && answered)
        return (
          <motion.div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              isDone ? 'bg-amber-400' : isCurrent ? 'bg-white' : 'bg-white/20'
            }`}
            animate={isCurrent && !answered ? { scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] } : {}}
            transition={isCurrent && !answered ? { duration: 1.2, repeat: Infinity } : {}}
          />
        )
      })}
    </div>
  )
}

export default function QuizGame() {
  const router = useRouter()

  const [questions] = useState(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 10)
  })

  const [shuffledQ, setShuffledQ] = useState<{ answers: string[]; correctIndex: number }[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [baseScore, setBaseScore] = useState(0)
  const [streakBonusTotal, setStreakBonusTotal] = useState(0)
  const [speedBonusTotal, setSpeedBonusTotal] = useState(0)
  const [showFact, setShowFact] = useState(false)
  const [finished, setFinished] = useState(false)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [floatingScores, setFloatingScores] = useState<{ id: number; points: number }[]>([])
  const floatingIdRef = useRef(0)
  const questionStartRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Shuffle answers for all questions once
  useEffect(() => {
    setShuffledQ(questions.map(q => shuffleAnswers(q)))
  }, [questions])

  // Timer logic
  useEffect(() => {
    if (finished || selected !== null || shuffledQ.length === 0) return

    questionStartRef.current = Date.now()
    setTimeLeft(TIMER_SECONDS)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Time ran out - auto answer wrong
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, finished, shuffledQ.length])

  // Stop timer when answer is selected
  useEffect(() => {
    if (selected !== null && timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [selected])

  const handleTimeout = useCallback(() => {
    setSelected(-1) // -1 = timeout, no selection
    setStreak(0)
    setShowFact(true)
  }, [])

  function addFloatingScore(points: number) {
    const id = ++floatingIdRef.current
    setFloatingScores(prev => [...prev, { id, points }])
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id))
    }, 1100)
  }

  function handleAnswer(index: number) {
    if (selected !== null || shuffledQ.length === 0) return
    setSelected(index)

    const isCorrect = index === shuffledQ[current].correctIndex
    const elapsed = (Date.now() - questionStartRef.current) / 1000

    if (isCorrect) {
      let points = 1
      setBaseScore(s => s + 1)

      // Streak bonus
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 2) {
        const streakBonus = newStreak - 1
        points += streakBonus
        setStreakBonusTotal(s => s + streakBonus)
      }

      // Speed bonus
      if (elapsed < SPEED_THRESHOLD) {
        points += 1
        setSpeedBonusTotal(s => s + 1)
      }

      setScore(s => s + points)
      addFloatingScore(points)
    } else {
      setStreak(0)
    }
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
    setBaseScore(0)
    setStreakBonusTotal(0)
    setSpeedBonusTotal(0)
    setShowFact(false)
    setFinished(false)
    setStreak(0)
    setTimeLeft(TIMER_SECONDS)
    setShuffledQ(questions.map(q => shuffleAnswers(q)))
  }

  if (shuffledQ.length === 0) return null

  const q = questions[current]
  const sq = shuffledQ[current]

  const shakeVariants = {
    shake: {
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.5 }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.03, 1],
      boxShadow: [
        '0 0 0 0 rgba(34,197,94,0)',
        '0 0 20px 4px rgba(34,197,94,0.4)',
        '0 0 0 0 rgba(34,197,94,0)'
      ],
      transition: { duration: 0.6 }
    }
  }

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
        {!finished && (
          <ProgressDots total={questions.length} current={current} answered={selected !== null} />
        )}
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
              {/* Score, timer & streak row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CircularTimer timeLeft={timeLeft} total={TIMER_SECONDS} />
                  <span className="text-white/60 text-sm">שאלה {current + 1} מתוך {questions.length}</span>
                </div>
                <div className="flex items-center gap-3 relative">
                  {streak >= 3 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-bold text-orange-300"
                    >
                      🔥x{streak}
                    </motion.span>
                  )}
                  <div className="relative">
                    <span className="text-white/80 text-sm font-bold">ניקוד: {score}</span>
                    <AnimatePresence>
                      {floatingScores.map(fs => (
                        <FloatingScore key={fs.id} id={fs.id} points={fs.points} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Question */}
              <h2 className="text-2xl font-extrabold text-white mb-8 leading-relaxed">{q.question}</h2>

              {/* Answers */}
              <div className="space-y-3">
                {sq.answers.map((ans, i) => {
                  const isCorrect = i === sq.correctIndex
                  const isSelected = i === selected
                  const answered = selected !== null

                  let bg = 'bg-white/10 border-white/20'
                  let variant = ''
                  if (answered) {
                    if (isCorrect) {
                      bg = 'bg-green-500/30 border-green-400'
                      variant = 'pulse'
                    } else if (isSelected) {
                      bg = 'bg-red-500/30 border-red-400'
                      variant = 'shake'
                    } else {
                      bg = 'bg-white/5 border-white/10'
                    }
                  }

                  return (
                    <motion.button
                      key={i}
                      whileTap={!answered ? { scale: 0.97 } : {}}
                      onClick={() => handleAnswer(i)}
                      variants={{ ...shakeVariants, ...pulseVariants }}
                      animate={variant || undefined}
                      className={`w-full text-right px-4 py-3.5 rounded-xl border-2 text-white font-medium transition-colors flex items-center gap-3 ${bg}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        answered && isCorrect ? 'bg-green-500/50 text-green-100' :
                        answered && isSelected ? 'bg-red-500/50 text-red-100' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {ANSWER_LETTERS[i]}
                      </span>
                      <span>{ans}</span>
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
                    {selected === -1
                      ? '⏰ נגמר הזמן!'
                      : selected === sq.correctIndex
                      ? '✅ נכון!'
                      : '❌ לא נכון!'}
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
              {baseScore >= 9 ? '🏆' : baseScore >= 7 ? '🌟' : baseScore >= 5 ? '👍' : '📚'}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {baseScore >= 9 ? 'שף מומחה!' : baseScore >= 7 ? 'מעולה!' : baseScore >= 5 ? 'לא רע!' : 'יש מקום לשיפור'}
            </h2>
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-4xl font-extrabold text-amber-300 mb-6"
            >
              {score} נקודות
            </motion.p>

            {/* Score breakdown */}
            <div className="bg-white/10 rounded-xl p-5 text-right mb-6 space-y-3">
              <div className="flex justify-between text-white/80 text-sm">
                <span className="font-bold">{baseScore}</span>
                <span>תשובות נכונות ({baseScore} מתוך {questions.length})</span>
              </div>
              <div className="flex justify-between text-white/80 text-sm">
                <span className="font-bold text-orange-300">+{streakBonusTotal}</span>
                <span>🔥 בונוס רצף</span>
              </div>
              <div className="flex justify-between text-white/80 text-sm">
                <span className="font-bold text-yellow-300">+{speedBonusTotal}</span>
                <span>⚡ בונוס מהירות</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold">
                <span>{score}</span>
                <span>סה״כ</span>
              </div>
            </div>

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
