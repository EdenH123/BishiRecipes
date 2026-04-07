'use client'

import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import TasteMap from '@/components/TasteMap'
import PageTransition from '@/components/PageTransition'

export default function TasteMapPage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-surface pt-20 pb-28"
    >
      <Navbar />

      <PageTransition>
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-on-surface font-rubik">
            מפת הטעמים של המשפחה
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 font-rubik">
            מה המשפחה הכי אוהבת לבשל?
          </p>
        </div>

        <TasteMap />
      </div>
      </PageTransition>

      <BottomNav />
    </div>
  )
}
