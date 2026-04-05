// SVG decorations for avatar frames — no emojis, pure vector art

export function GoldDecos() {
  return (
    <>
      {/* 4-point stars at cardinal positions */}
      {[0, 90, 180, 270].map((deg) => (
        <svg
          key={deg}
          className="absolute w-3 h-3 pointer-events-none"
          style={{
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 44}px - 6px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 44}px - 6px)`,
            filter: 'drop-shadow(0 0 2px rgba(212,160,23,0.8))',
          }}
          viewBox="0 0 24 24"
          fill="#f5d060"
        >
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.8 4.8 2.4-7.2-6-4.8h7.6z" />
        </svg>
      ))}
    </>
  )
}

export function FireDecos() {
  return (
    <>
      {/* Flame shapes at top and sides */}
      {[-30, 0, 30].map((deg, i) => (
        <svg
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: i === 1 ? 16 : 12,
            height: i === 1 ? 20 : 16,
            left: `calc(50% + ${Math.cos(((deg - 90) * Math.PI) / 180) * 42}px - ${i === 1 ? 8 : 6}px)`,
            top: `calc(50% + ${Math.sin(((deg - 90) * Math.PI) / 180) * 42}px - ${i === 1 ? 14 : 10}px)`,
            filter: 'drop-shadow(0 0 3px rgba(255,100,0,0.7))',
          }}
          viewBox="0 0 24 32"
          fill="none"
        >
          <path
            d="M12 0C12 0 4 10 4 18c0 4.4 3.6 8 8 8s8-3.6 8-8C20 10 12 0 12 0z"
            fill="url(#flame)"
          />
          <path
            d="M12 12c0 0-3 4-3 7.5c0 1.7 1.3 3 3 3s3-1.3 3-3C15 16 12 12 12 12z"
            fill="#ffe066"
          />
          <defs>
            <linearGradient id="flame" x1="12" y1="0" x2="12" y2="26" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff4500" />
              <stop offset="0.5" stopColor="#ff6a00" />
              <stop offset="1" stopColor="#ffa500" />
            </linearGradient>
          </defs>
        </svg>
      ))}
    </>
  )
}

export function IceDecos() {
  return (
    <>
      {/* Crystal/snowflake shapes */}
      {[45, 165, 285].map((deg) => (
        <svg
          key={deg}
          className="absolute w-3.5 h-3.5 pointer-events-none"
          style={{
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 44}px - 7px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 44}px - 7px)`,
            filter: 'drop-shadow(0 0 3px rgba(135,206,235,0.8))',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b0e0e6"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
          <circle cx="12" cy="12" r="2" fill="#e0f7fa" stroke="none" />
        </svg>
      ))}
    </>
  )
}

export function RainbowDecos() {
  return (
    <>
      {/* Small colored circles like gems along the ring */}
      {[
        { deg: 0, color: '#e74c3c' },
        { deg: 60, color: '#f1c40f' },
        { deg: 120, color: '#2ecc71' },
        { deg: 180, color: '#3498db' },
        { deg: 240, color: '#9b59b6' },
        { deg: 300, color: '#e67e22' },
      ].map(({ deg, color }) => (
        <div
          key={deg}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 44}px - 4px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 44}px - 4px)`,
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      ))}
    </>
  )
}

export function DiamondDecos() {
  return (
    <>
      {/* Diamond gem shapes */}
      {[60, 180, 300].map((deg) => (
        <svg
          key={deg}
          className="absolute w-3 h-3 pointer-events-none"
          style={{
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 44}px - 6px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 44}px - 6px)`,
            filter: 'drop-shadow(0 0 3px rgba(168,216,234,0.9))',
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <polygon points="12,2 22,10 12,22 2,10" fill="url(#gem)" stroke="#a8d8ea" strokeWidth="1" />
          <line x1="2" y1="10" x2="22" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="12" y1="2" x2="8" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="12" y1="2" x2="16" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="8" y1="10" x2="12" y2="22" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="16" y1="10" x2="12" y2="22" stroke="#d4f1f9" strokeWidth="0.5" />
          <defs>
            <linearGradient id="gem" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e0f7fa" />
              <stop offset="0.4" stopColor="#a8d8ea" />
              <stop offset="1" stopColor="#87ceeb" />
            </linearGradient>
          </defs>
        </svg>
      ))}
    </>
  )
}

export function CrownDecos() {
  return (
    <>
      {/* Crown shape at top */}
      <svg
        className="absolute pointer-events-none"
        style={{
          width: 22,
          height: 16,
          left: 'calc(50% - 11px)',
          top: '-2px',
          filter: 'drop-shadow(0 0 3px rgba(142,68,173,0.7))',
        }}
        viewBox="0 0 32 24"
        fill="none"
      >
        <path
          d="M2 20L6 8L12 14L16 4L20 14L26 8L30 20z"
          fill="url(#crownGrad)"
          stroke="#8e44ad"
          strokeWidth="1"
        />
        <circle cx="6" cy="7" r="2" fill="#f5d060" />
        <circle cx="16" cy="3" r="2.5" fill="#f5d060" />
        <circle cx="26" cy="7" r="2" fill="#f5d060" />
        <defs>
          <linearGradient id="crownGrad" x1="16" y1="4" x2="16" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f5d060" />
            <stop offset="1" stopColor="#d4a017" />
          </linearGradient>
        </defs>
      </svg>
      {/* Small gems on sides */}
      {[135, 225].map((deg) => (
        <div
          key={deg}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * 44}px - 4px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * 44}px - 4px)`,
            background: 'linear-gradient(135deg, #c39bd3, #8e44ad)',
            boxShadow: '0 0 4px rgba(142,68,173,0.6)',
          }}
        />
      ))}
    </>
  )
}

export function getFrameDecorations(frameId: string) {
  switch (frameId) {
    case 'frame_gold': return <GoldDecos />
    case 'frame_fire': return <FireDecos />
    case 'frame_ice': return <IceDecos />
    case 'frame_rainbow': return <RainbowDecos />
    case 'frame_diamond': return <DiamondDecos />
    case 'frame_crown': return <CrownDecos />
    default: return null
  }
}
