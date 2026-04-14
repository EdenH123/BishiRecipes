import dynamic from 'next/dynamic'

const ClickerGame = dynamic(() => import('./ClickerGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f00] to-[#2a1500] flex items-center justify-center">
      <div className="text-center">
        <span className="text-5xl block mb-3 animate-pulse">🍳</span>
        <p className="text-amber-400/50 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function ClickerPage() {
  return <ClickerGame />
}
