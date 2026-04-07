'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface WordPuzzle {
  word: string
  hints: string[]
  category: string
}

const ALL_PUZZLES: WordPuzzle[] = [
  // Short / easy
  { word: 'מצה', hints: ['לחם שטוח', 'אוכלים בפסח', 'ללא שמרים', 'פריכה'], category: 'מאפה' },
  { word: 'חציל', hints: ['ירק סגול', 'אפשר לצלות על האש', 'משמש לבבגנוש', 'ספוגי כשלא מבשלים'], category: 'ירק' },
  { word: 'חומוס', hints: ['קטנית', 'ממרח פופולרי', 'עם טחינה ולימון', 'אוכל מזרח תיכוני'], category: 'מצרך' },
  { word: 'שמנת', hints: ['מוצר חלב', 'שמנה ולבנה', 'אפשר להקציף', 'שמים בפסטה'], category: 'מצרך' },
  { word: 'טחינה', hints: ['עשויה משומשום', 'ממרח מזרח תיכוני', 'שמים על פלאפל', 'לבנה וסמיכה'], category: 'מצרך' },
  { word: 'פלאפל', hints: ['עשוי מחומוס', 'עגול וטוגן', 'בא בפיתה', 'אוכל רחוב ישראלי'], category: 'מאכל' },
  { word: 'קינמון', hints: ['תבלין חום', 'מגיע מקליפת עץ', 'ריח מתוק', 'שמים בעוגת תפוחים'], category: 'תבלין' },
  { word: 'כורכום', hints: ['תבלין צהוב', 'נקרא גם טורמריק', 'בריא מאוד', 'צובע הכל'], category: 'תבלין' },
  { word: 'זעפרן', hints: ['התבלין היקר בעולם', 'צבע צהוב-כתום', 'מגיע מפרחים', 'משתמשים בו בפאייה'], category: 'תבלין' },
  { word: 'שוקולד', hints: ['מתוק וחום', 'מגיע מפולי קקאו', 'אפשר להמיס אותו', 'יש ממנו חלב ומריר'], category: 'מצרך' },
  { word: 'אבוקדו', hints: ['ירוק מבפנים', 'יש לו גלעין גדול', 'שמים על טוסט', 'מקור לשומן בריא'], category: 'ירק' },
  { word: 'שקשוקה', hints: ['ארוחת בוקר', 'עם ביצים ועגבניות', 'בסיר או מחבת', 'מאכל ישראלי'], category: 'מאכל' },
  { word: 'לחמניה', hints: ['מאפה קטן', 'עשויה מבצק שמרים', 'להמבורגר או לארוחה', 'עגולה ורכה'], category: 'מאפה' },
  { word: 'רוזמרין', hints: ['עשב תיבול', 'עלים דקים כמחטים', 'ריח חזק', 'מתאים לתפוחי אדמה'], category: 'תבלין' },
  // New puzzles
  { word: 'פטרוזיליה', hints: ['עשב תיבול ירוק', 'גזר וסלרי הם קרובים שלו', 'שמים על סלט טאבולה', 'עלים מסולסלים או שטוחים'], category: 'תבלין' },
  { word: 'בטטה', hints: ['ירק כתום', 'מתוקה מתפוח אדמה', 'גדלה מתחת לאדמה', 'אופים אותה בתנור'], category: 'ירק' },
  { word: 'לימון', hints: ['פרי צהוב', 'חמוץ מאוד', 'שמים במים או בתה', 'עשיר בויטמין C'], category: 'פרי' },
  { word: 'קישוא', hints: ['ירוק וארוך', 'מהמשפחה של הדלעת', 'אפשר למלא אותו', 'טעים על הגריל'], category: 'ירק' },
  { word: 'סחוג', hints: ['רוטב חריף', 'מגיע מתימן', 'ירוק או אדום', 'שמים על פלאפל ושווארמה'], category: 'מאכל' },
  { word: 'חלה', hints: ['לחם שבת', 'קלועה ויפה', 'עשויה מבצק מתוק', 'מברכים עליה'], category: 'מאפה' },
]

const CATEGORY_ICONS: Record<string, string> = {
  'מאכל': '🥘',
  'תבלין': '🧂',
  'ירק': '🥬',
  'מצרך': '🧈',
  'מאפה': '🥖',
  'פרי': '🍋',
}

export default function WordGame() {
  const router = useRouter()
  const [puzzles] = useState(() =>
    [...ALL_PUZZLES]
      .sort((a, b) => a.word.length - b.word.length)
      .slice(0, 10)
  )
  const [current, setCurrent] = useState(0)
  const [hintsShown, setHintsShown] = useState(1)
  const [guess, setGuess] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [score, setScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [shake, setShake] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [timeBonus, setTimeBonus] = useState(false)
  const [results, setResults] = useState<{ word: string; correct: boolean }[]>([])
  const [revealIndex, setRevealIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const puzzle = puzzles[current]
  const maxPoints = 4

  // Animated score counter
  useEffect(() => {
    if (displayScore === score) return
    const timer = setTimeout(() => {
      setDisplayScore(prev => {
        if (prev < score) return prev + 1
        if (prev > score) return prev - 1
        return prev
      })
    }, 50)
    return () => clearTimeout(timer)
  }, [displayScore, score])

  // Reset timer on new puzzle
  useEffect(() => {
    setStartTime(Date.now())
    setWrongCount(0)
  }, [current])

  // Auto-focus input
  useEffect(() => {
    if (!result && !finished) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [current, result, finished])

  // Letter flip animation on correct
  useEffect(() => {
    if (result === 'correct') {
      setRevealIndex(0)
    }
  }, [result])

  useEffect(() => {
    if (revealIndex >= 0 && revealIndex < (puzzle?.word.length ?? 0)) {
      const timer = setTimeout(() => setRevealIndex(i => i + 1), 120)
      return () => clearTimeout(timer)
    }
  }, [revealIndex, puzzle?.word.length])

  // Partial match: find which letters in the guess match the word at same position
  const getPartialMatches = useCallback((): Set<number> => {
    const matches = new Set<number>()
    if (!guess.trim() || result) return matches
    const clean = guess.trim().replace(/['"]/g, '')
    for (let i = 0; i < Math.min(clean.length, puzzle.word.length); i++) {
      if (clean[i] === puzzle.word[i]) {
        matches.add(i)
      }
    }
    return matches
  }, [guess, puzzle?.word, result])

  function checkGuess() {
    const clean = guess.trim().replace(/['"]/g, '')
    if (!clean) return

    if (clean === puzzle.word) {
      const elapsed = (Date.now() - startTime) / 1000
      const hintPoints = Math.max(1, maxPoints - hintsShown + 1)
      const bonus = elapsed <= 20 ? 2 : 0
      if (bonus > 0) setTimeBonus(true)
      setScore(s => s + hintPoints + bonus)
      setResult('correct')
      setStreak(s => s + 1)
      setBestStreak(b => Math.max(b, streak + 1))
      setResults(r => [...r, { word: puzzle.word, correct: true }])
    } else {
      setShake(true)
      setWrongCount(c => c + 1)
      setTimeout(() => setShake(false), 600)
      setGuess('')
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
      setRevealIndex(-1)
      setTimeBonus(false)
    }
  }

  function giveUp() {
    setResult('wrong')
    setStreak(0)
    setHintsShown(puzzle.hints.length)
    setResults(r => [...r, { word: puzzle.word, correct: false }])
  }

  function restart() {
    setCurrent(0)
    setHintsShown(1)
    setGuess('')
    setResult(null)
    setScore(0)
    setDisplayScore(0)
    setFinished(false)
    setRevealIndex(-1)
    setTimeBonus(false)
    setStreak(0)
    setBestStreak(0)
    setWrongCount(0)
    setResults([])
  }

  const partialMatches = getPartialMatches()

  // Show first letter hint after 2 wrong guesses
  const showFirstLetterHint = wrongCount >= 2 && !result

  const categoryIcon = CATEGORY_ICONS[puzzle?.category] || '🍽️'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 font-rubik" dir="rtl">
      {/* Header */}
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
              {/* Top bar: progress, score, streak */}
              <div className="flex justify-between items-center text-white/60 text-sm mb-2">
                <span>מילה {current + 1} מתוך {puzzles.length}</span>
                <div className="flex items-center gap-3">
                  {streak >= 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-orange-400 font-bold text-xs"
                    >
                      🔥 רצף {streak}
                    </motion.span>
                  )}
                  <span className="font-bold text-white">
                    ניקוד:{' '}
                    <motion.span
                      key={displayScore}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="inline-block text-yellow-300"
                    >
                      {displayScore}
                    </motion.span>
                  </span>
                </div>
              </div>

              {/* Hint progress bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/40 text-xs">רמזים</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-l from-blue-400 to-cyan-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(hintsShown / puzzle.hints.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-white/40 text-xs">{hintsShown}/{puzzle.hints.length}</span>
                </div>
              </div>

              {/* Category badge with icon */}
              <div className="mb-4">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-sm px-3 py-1.5 rounded-full"
                >
                  <span>{categoryIcon}</span>
                  <span>{puzzle.category}</span>
                </motion.span>
              </div>

              {/* Letter boxes */}
              <div
                className={`flex gap-2 justify-center mb-6 ${
                  shake ? 'animate-[shakeX_0.6s_ease-in-out]' : ''
                }`}
              >
                {puzzle.word.split('').map((char, i) => {
                  const isRevealed = result === 'correct' && revealIndex > i
                  const isWrongReveal = result === 'wrong'
                  const isPartialMatch = partialMatches.has(i)
                  const showFirstLetter = showFirstLetterHint && i === 0

                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={
                        isRevealed
                          ? { rotateY: [0, 90, 0], scale: [1, 1.1, 1] }
                          : shake
                          ? {}
                          : {}
                      }
                      transition={{ duration: 0.4, delay: isRevealed ? i * 0.12 : 0 }}
                      className={`w-10 h-12 rounded-lg flex items-center justify-center text-xl font-bold transition-all duration-300 ${
                        isRevealed
                          ? 'bg-green-500/40 text-green-200 border-2 border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]'
                          : isWrongReveal
                          ? 'bg-red-500/30 text-white border-2 border-red-400/60 shadow-[0_0_8px_rgba(248,113,113,0.4)]'
                          : isPartialMatch
                          ? 'bg-yellow-500/30 text-yellow-200 border-2 border-yellow-400/60'
                          : showFirstLetter
                          ? 'bg-blue-500/30 text-blue-200 border-2 border-blue-400/50'
                          : 'bg-white/10 text-transparent border-2 border-white/20'
                      }`}
                    >
                      {isRevealed || isWrongReveal
                        ? char
                        : showFirstLetter
                        ? char
                        : isPartialMatch
                        ? char
                        : '_'}
                    </motion.div>
                  )
                })}
              </div>

              {/* Hints as chat bubbles */}
              <div className="space-y-2 mb-6">
                {puzzle.hints.slice(0, hintsShown).map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="relative bg-white/10 backdrop-blur-sm rounded-2xl rounded-tr-sm px-4 py-3 text-white/90 text-sm flex items-start gap-2 border border-white/5"
                  >
                    <span className="bg-blue-500/30 text-blue-300 font-bold text-xs shrink-0 px-2 py-0.5 rounded-full">
                      {i + 1}
                    </span>
                    <span>{hint}</span>
                  </motion.div>
                ))}

                {/* "Almost there" auto hint */}
                {showFirstLetterHint && (
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative bg-orange-500/20 backdrop-blur-sm rounded-2xl rounded-tr-sm px-4 py-3 text-orange-200 text-sm flex items-start gap-2 border border-orange-500/20"
                  >
                    <span className="bg-orange-500/30 text-orange-300 font-bold text-xs shrink-0 px-2 py-0.5 rounded-full">
                      💡
                    </span>
                    <span>כמעט! האות הראשונה היא: <strong>{puzzle.word[0]}</strong></span>
                  </motion.div>
                )}
              </div>

              {!result ? (
                <>
                  {/* Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') checkGuess() }}
                      placeholder="הקלידו את הניחוש..."
                      className="flex-1 bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-blue-400 transition-colors"
                    />
                    <button
                      onClick={checkGuess}
                      disabled={!guess.trim()}
                      className="bg-blue-500 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-30 active:scale-95 transition-transform"
                    >
                      בדוק
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {hintsShown < puzzle.hints.length && (
                      <button
                        onClick={showNextHint}
                        className="text-sm text-blue-300 hover:text-blue-200 active:scale-95 transition-colors"
                      >
                        רמז נוסף ({Math.max(1, maxPoints - hintsShown)} נק׳)
                      </button>
                    )}
                    <button
                      onClick={giveUp}
                      className="text-sm text-white/40 hover:text-white/60 active:scale-95 mr-auto transition-colors"
                    >
                      ויתור
                    </button>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <p className={`font-bold text-lg mb-1 ${result === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                    {result === 'correct'
                      ? `נכון! +${Math.max(1, maxPoints - hintsShown + 1)} נקודות`
                      : `התשובה: ${puzzle.word}`}
                  </p>
                  {timeBonus && result === 'correct' && (
                    <motion.p
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-yellow-300 text-sm font-bold mb-2"
                    >
                      ⚡ בונוס מהירות +2!
                    </motion.p>
                  )}
                  {streak >= 2 && result === 'correct' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-orange-300 text-sm mb-2"
                    >
                      🔥 רצף של {streak}!
                    </motion.p>
                  )}
                  <button
                    onClick={nextPuzzle}
                    className="bg-white text-blue-900 px-6 py-2.5 rounded-full font-bold active:scale-95 mt-2 transition-transform"
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
              {score >= 30 ? '🏆' : score >= 20 ? '🌟' : score >= 12 ? '👍' : '📚'}
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {score >= 30 ? 'גאון מטבח!' : score >= 20 ? 'מרשים!' : score >= 12 ? 'לא רע!' : 'נסו שוב!'}
            </h2>
            <motion.p
              className="text-white/80 text-3xl font-bold mb-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {score} נקודות
            </motion.p>
            <p className="text-white/50 text-sm mb-2">מתוך {puzzles.length * (maxPoints + 2)} אפשריות</p>
            {bestStreak >= 2 && (
              <p className="text-orange-300 text-sm mb-4">🔥 רצף הכי ארוך: {bestStreak}</p>
            )}

            {/* Word cloud */}
            <div className="flex flex-wrap justify-center gap-2 mb-6 px-4">
              {results.map((r, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                    r.correct
                      ? 'bg-green-500/25 text-green-300 border border-green-500/30'
                      : 'bg-red-500/25 text-red-300 border border-red-500/30'
                  }`}
                >
                  {r.word}
                </motion.span>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={restart} className="bg-white text-blue-900 px-6 py-2.5 rounded-full font-bold active:scale-95 transition-transform">
                שחקו שוב
              </button>
              <button onClick={() => router.push('/games')} className="bg-white/20 text-white px-6 py-2.5 rounded-full font-bold active:scale-95 transition-transform">
                חזרה
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Custom keyframe for shake animation */}
      <style jsx global>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-\\[shakeX_0\\.6s_ease-in-out\\] {
          animation: shakeX 0.6s ease-in-out;
        }
      `}</style>
    </div>
  )
}
