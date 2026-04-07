import dynamic from 'next/dynamic'

const MemoryGame = dynamic(() => import('./MemoryGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, #1a0533 0%, #2d1052 30%, #4a1259 60%, #6b1d5e 100%)',
    }}>
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-pulse">🃏</span>
        <p className="text-white/50 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function MemoryPage() {
  return <MemoryGame />
}
