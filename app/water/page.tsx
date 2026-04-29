import dynamic from 'next/dynamic'

const WaterApp = dynamic(() => import('./WaterApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <span className="text-5xl block mb-3 animate-pulse">💧</span>
        <p className="text-blue-500/60 text-sm font-rubik">...טוען</p>
      </div>
    </div>
  ),
})

export default function WaterPage() {
  return <WaterApp />
}
