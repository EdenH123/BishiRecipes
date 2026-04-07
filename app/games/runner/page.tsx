import dynamic from 'next/dynamic'

const RunnerGame = dynamic(() => import('./RunnerGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-pulse">🏃</span>
        <p className="text-white/50 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function RunnerPage() {
  return <RunnerGame />
}
