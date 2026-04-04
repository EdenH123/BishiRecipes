'use client'

export default function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest rounded overflow-hidden shadow-[0px_4px_16px_rgba(180,28,27,0.04)]">
      {/* Image placeholder */}
      <div className="aspect-[4/3] animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />

      {/* Text content */}
      <div className="p-3 text-right space-y-2">
        {/* Title */}
        <div className="h-4 w-3/4 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ml-auto" />

        {/* Description lines */}
        <div className="h-3 w-full rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        <div className="h-3 w-5/6 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ml-auto" />

        {/* Tag pills */}
        <div className="flex flex-wrap gap-1 justify-end">
          <div className="h-4 w-10 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
          <div className="h-4 w-12 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
          <div className="h-4 w-8 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  )
}
