'use client'

const shimmer = 'animate-shimmer bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high bg-[length:200%_100%]'

export default function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest rounded overflow-hidden shadow-[0px_4px_16px_rgba(0,0,0,0.04)]">
      {/* Image placeholder */}
      <div className={`aspect-[4/3] ${shimmer}`} />

      {/* Text content */}
      <div className="p-3 text-right space-y-2">
        <div className={`h-4 w-3/4 rounded ml-auto ${shimmer}`} />
        <div className={`h-3 w-full rounded ${shimmer}`} />
        <div className={`h-3 w-5/6 rounded ml-auto ${shimmer}`} />
        <div className="flex flex-wrap gap-1 justify-end">
          <div className={`h-4 w-10 rounded-full ${shimmer}`} />
          <div className={`h-4 w-12 rounded-full ${shimmer}`} />
          <div className={`h-4 w-8 rounded-full ${shimmer}`} />
        </div>
      </div>
    </div>
  )
}
