'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface WordPuzzle {
  word: string
  hints: string[]
  category: string
}

const PUZZLES: WordPuzzle[] = [
  { word: 'שוקולד', hints: ['מתוק וחום', 'מגיע מפולי קקאו', 'אפשר להמיס אותו', 'יש ממנו חלב ומריר'], category: 'מצרך' },
  { word: 'פלאפל', hints: ['עשוי מחומוס', 'עגול וטוגן', 'בא בפיתה', 'אוכל רחוב ישראלי'], category: 'מאכל' },
  { word: 'חומוס', hints: ['קטנית', 'ממרח פופולרי', 'עם טחינה ולימון', 'אוכל מזרח תיכוני'], category: 'מצרך' },
  { word: 'קינמון', hints: ['תבלין חום', 'מגיע מקליפת עץ', 'ריח מתוק', 'שמים בעוגת תפוחים'], category: 'תבלין' },
  { word: 'אבוקדו', hints: ['ירוק מבפנים', 'יש לו גלעין גדול', 'שמים על טוסט', 'מקור לשומן בריא'], category: 'ירק' },
  { word: 'שקשוקה', hints: ['ארוחת בוקר', 'עם ביצים ועגבניות', 'בסיר או מחבת', 'מאכל ישראלי'], category: 'מאכל' },
  { word: 'כורכום', hints: ['תבלין צהוב', 'נקרא גם טורמריק', 'בריא מאוד', 'צובע הכל'], category: 'תבלין' },
  { word: 'חציל', hints: ['ירק סגול', 'אפשר לצלות על האש', 'משמש לבבגנוש', 'ספוגי כשלא מבשלים'], category: 'ירק' },
  { word: 'טחינה', hints: ['עשויה משומשום', 'ממרח מזרח תיכוני', 'שמים על פלאפל', 'לבנה וסמיכה'], category: 'מצרך' },
  { word: 'זעפרן', hints: ['התבלין היקר בעולם', 'צבע צהוב-כתום', 'מגיע מפרחים', 'משתמשים בו בפאייה'], category: 'תבלין' },
  { word: 'לחמניה', hints: ['מאפה קטן', 'עשויה מבצק שמרים', 'להמבורגר או לארוחה', 'עגולה ורכה'], category: 'מאפה' },
  { word: 'שמנת', hints: ['מוצר חלב', 'שמנה ולבנה', 'אפשר להקציף', 'שמים בפסטה'], category: 'מצרך' },
  { word: 'רוזמרין', hints: ['עשב תיבול', 'עלים דקים כמחטים', 'ריח חזק', 'מתאים לתפוחי אדמה'], category: 'תבלין' },
  { word: 'מצה', hints: ['לחם שטוח', 'אוכלים בפסח', 'ללא שמרים', 'פריכה'], category: 'מאפה' },
]

export default function WordGame() {
  const router = useRouter()
  const [puzzles] = useState(() => [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, 8))
  const [current, setCurrent] = useState(0)
  const [hintsShown, setHintsShown] = useState(1)
  const [guess, setGuess] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [shake, setShake] = useState(false)

  const puzzle = puzzles[current]
  const maxPoints = 4 // points decrease with hints

  function checkGuess() {
    const clean = guess.trim().replace(/['"]/g, '')
    if (!clean) return

    if (clean === puzzle.word) {
      const points = Math.max(1, maxPoints - hintsShown + 1)
      setScore(s => s + points)
      setResult('correct')
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setResult('wrong')
    }
  }

  function showNextHint() {
    if (hintsShown < puzzle.hints.length) {
      setHintsShown(h => h + 1)
    }
  }

  function nextPuzzle() {
    if (current + 1 >= puzzles.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setHintsShown(1)
      setGuess('')
      setResult(null)
    }
  }

  function giveUp() {
    setResult('wrong')
    setHintsShown(puzzle.hints.length)
  }

  function restart() {
    setCurrent(0)
    setHintsShown(1)
    setGuess('')
    setResult(null)
    setScore(0)
    setFinished(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 font-rubik" dir="rtl">
      <div className="sticky top-0 z-10 bg-blue-900/80 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h1 className="text-lg font-bold text-white">מילה מבושלת</h1>
          </div>
          <button onClick={() => router.push('/games')} className="text-white/70 text-sm active:scale-95">חזרה</button>
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
              <div className="flex justify-between text-white/60 text-sm mb-4">
                <span>מילה {current + 1} מתוך {puzzles.length}</span>
                <span>ניקוד: {score}</span>
              </div>

              {/* Category badge */}
              <div className="mb-3">
                <span className="bg-white/15 text-white/80 text-xs px-3 py-1 rounded-full">{puzzle.category}</span>
              </div>

              {/* Word display (hidden) */}
              <div className="flex gap-2 justify-center mb-6">
                {puzzle.word.split('').map((char, i) => (
                  <div
                    key={i}
                    className={`w-10 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                      result === 'correct' ? 'bg-green-500/30 text-green-300 border-2 border-green-400' :
                      result === 'wrong' ? 'bg-red-500/20 text-white border-2 border-red-400/50' :
                      'bg-white/10 text-transparent border-2 border-white/20'
                    }`}
                  >
                    {result ? char : '_'}
                  </div>
                ))}
              </div>

              {/* Hints */}
              <div className="space-y-2 mb-6">
                {puzzle.hints.slice(0, hintsShown).map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm flex items-center gap-2"
                  >
                    <span className="text-blue-300 font-bold text-xs shrink-0">רמז {i + 1}</span>
                    {hint}
                  </motion.div>
                ))}
              </div>

              {!result ? (
                <>
                  {/* Input */}
                  <div className={`flex gap-2 mb-3 ${shake ? 'animate-[shake_0.5s]' : ''}`}>
                    <input
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') checkGuess() }}
                      placeholder="הקלידו את הניחוש..."
                      className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={checkGuess}
                      disabled={!guess.trim()}
                      className="bg-blue-500 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-30 active:scale-95"
                    >
                      בדוק
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {hintsShown < puzzle.hints.length && (
                      <button
                        onClick={showNextHint}
                        className="text-sm text-blue-300 hover:text-blue-200 active:scale-95"
                      >
                        רמז נוסף ({maxPoints - hintsShown} נק׳)
                      </button>
                    )}
                    <button
                      onClick={giveUp}
                      className="text-sm text-white/40 hover:text-white/60 active:scale-95 mr-auto"
                    >
                      ויתור
                    </button>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className={`font-bold text-lg mb-3 ${result === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                    {result === 'correct' ? `✅ נכון! +${Math.max(1, maxPoints - hintsShown + 1)} נקודות` : `❌ התשובה: ${puzzle.word}`}
                  </p>
                  <button
                    onClick={nextPuzzle}
                    className="bg-white text-blue-900 px-6 py-2.5 rounded-full font-bold active:scale-95"
                  >
                    {current + 1 >= puzzles.length ? 'סיום' : 'הבא'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <span className="text-6xl block mb-4">
              {score >= 25 ? '🏆' : score >= 18 ? '🌟' : score >= 10 ? '👍' : '📚'}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {score >= 25 ? 'גאון מטבח!' : score >= 18 ? 'מרשים!' : score >= 10 ? 'לא רע!' : 'נסו שוב!'}
            </h2>
            <p className="text-white/80 text-lg mb-6">{score} נקודות מתוך {puzzles.length * maxPoints}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="bg-white text-blue-900 px-6 py-2.5 rounded-full font-bold active:scale-95">
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
