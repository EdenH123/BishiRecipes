import dynamic from 'next/dynamic'

const QuizGame = dynamic(() => import('./QuizGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-orange-900 flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-pulse">🧠</span>
        <p className="text-white/50 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function QuizPage() {
  return <QuizGame />
}
