import dynamic from 'next/dynamic'

const HabitApp = dynamic(() => import('./HabitApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-pulse">⚔️</span>
        <p className="text-white/40 text-sm">Loading...</p>
      </div>
    </div>
  ),
})

export default function HabitRPGPage() {
  return <HabitApp />
}
