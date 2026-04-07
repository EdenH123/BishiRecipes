import dynamic from 'next/dynamic'

const WordGame = dynamic(() => import('./WordGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-pulse">📝</span>
        <p className="text-white/50 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function WordPage() {
  return <WordGame />
}
