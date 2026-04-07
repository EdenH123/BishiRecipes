'use client'

import { memo } from 'react'
import { getShopItem } from '@/lib/coins'
import { getFrameDecorations } from '@/components/FrameDecorations'
import { getAvatarGradient } from '@/lib/avatar-gradient'

interface AvatarWithFrameProps {
  userId: string
  avatarUrl?: string | null
  displayName?: string | null
  frameId?: string | null
  size?: number // px, default 40
}

export default memo(function AvatarWithFrame({ userId, avatarUrl, displayName, frameId, size = 40 }: AvatarWithFrameProps) {
  const frame = frameId ? getShopItem(frameId) : null
  const initial = displayName?.charAt(0) || '?'

  if (!frame) {
    return (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName || ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ background: getAvatarGradient(userId), fontSize: size * 0.4 }}
          >
            {initial}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: size + 8, height: size + 8 }}>
      <div
        className="w-full h-full rounded-full p-[2px]"
        style={{ background: frame.preview, boxShadow: frame.glow }}
      >
        <div className="w-full h-full rounded-full overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName || ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ background: getAvatarGradient(userId), fontSize: size * 0.4 }}
            >
              {initial}
            </div>
          )}
        </div>
      </div>
      {getFrameDecorations(frameId!, (size + 8) / 2)}
    </div>
  )
})
