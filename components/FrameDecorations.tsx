// SVG decorations for avatar frames — no emojis, pure vector art
// All positions are relative to the container center, scaled by radius

interface DecoProps {
  r: number // radius from center to decoration position
}

export function GoldDecos({ r }: DecoProps) {
  const s = Math.max(8, r * 0.25) // star size scales with radius
  return (
    <>
      {[0, 90, 180, 270].map((deg) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
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

export function FireDecos({ r }: DecoProps) {
  return (
    <>
      {[-30, 0, 30].map((deg, i) => {
        const w = i === 1 ? Math.max(10, r * 0.3) : Math.max(8, r * 0.22)
        const h = w * 1.25
        return (
          <svg
            key={i}
            className="absolute pointer-events-none"
            style={{
              width: w,
              height: h,
              left: `calc(50% + ${Math.cos(((deg - 90) * Math.PI) / 180) * r}px - ${w / 2}px)`,
              top: `calc(50% + ${Math.sin(((deg - 90) * Math.PI) / 180) * r}px - ${h * 0.7}px)`,
              filter: 'drop-shadow(0 0 3px rgba(255,100,0,0.7))',
            }}
            viewBox="0 0 24 32"
            fill="none"
          >
            <path
              d="M12 0C12 0 4 10 4 18c0 4.4 3.6 8 8 8s8-3.6 8-8C20 10 12 0 12 0z"
              fill={`url(#flame_${i})`}
            />
            <path
              d="M12 12c0 0-3 4-3 7.5c0 1.7 1.3 3 3 3s3-1.3 3-3C15 16 12 12 12 12z"
              fill="#ffe066"
            />
            <defs>
              <linearGradient id={`flame_${i}`} x1="12" y1="0" x2="12" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff4500" />
                <stop offset="0.5" stopColor="#ff6a00" />
                <stop offset="1" stopColor="#ffa500" />
              </linearGradient>
            </defs>
          </svg>
        )
      })}
    </>
  )
}

export function IceDecos({ r }: DecoProps) {
  const s = Math.max(10, r * 0.28)
  return (
    <>
      {[45, 165, 285].map((deg) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
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

export function RainbowDecos({ r }: DecoProps) {
  const s = Math.max(5, r * 0.12)
  return (
    <>
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
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      ))}
    </>
  )
}

export function DiamondDecos({ r }: DecoProps) {
  const s = Math.max(8, r * 0.25)
  return (
    <>
      {[60, 180, 300].map((deg, i) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            filter: 'drop-shadow(0 0 3px rgba(168,216,234,0.9))',
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <polygon points="12,2 22,10 12,22 2,10" fill={`url(#gem_${i})`} stroke="#a8d8ea" strokeWidth="1" />
          <line x1="2" y1="10" x2="22" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="12" y1="2" x2="8" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="12" y1="2" x2="16" y2="10" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="8" y1="10" x2="12" y2="22" stroke="#d4f1f9" strokeWidth="0.5" />
          <line x1="16" y1="10" x2="12" y2="22" stroke="#d4f1f9" strokeWidth="0.5" />
          <defs>
            <linearGradient id={`gem_${i}`} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
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

export function CrownDecos({ r }: DecoProps) {
  const crownW = Math.max(14, r * 0.4)
  const crownH = crownW * 0.7
  const gemS = Math.max(5, r * 0.12)
  return (
    <>
      <svg
        className="absolute pointer-events-none"
        style={{
          width: crownW,
          height: crownH,
          left: `calc(50% - ${crownW / 2}px)`,
          top: `calc(50% - ${r + crownH * 0.5}px)`,
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
      {[135, 225].map((deg) => (
        <div
          key={deg}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: gemS,
            height: gemS,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${gemS / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${gemS / 2}px)`,
            background: 'linear-gradient(135deg, #c39bd3, #8e44ad)',
            boxShadow: '0 0 4px rgba(142,68,173,0.6)',
          }}
        />
      ))}
    </>
  )
}

export function EmeraldDecos({ r }: DecoProps) {
  const s = Math.max(6, r * 0.18)
  return (
    <>
      {[30, 150, 270].map((deg) => (
        <div
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s * 1.3,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${(s * 1.3) / 2}px)`,
            background: 'linear-gradient(135deg, #2ecc71, #0d6b3d)',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: '0 0 4px rgba(46,204,113,0.7)',
          }}
        />
      ))}
    </>
  )
}

export function GalaxyDecos({ r }: DecoProps) {
  const s = Math.max(4, r * 0.1)
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <div
          key={deg}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: i % 2 === 0 ? s : s * 0.6,
            height: i % 2 === 0 ? s : s * 0.6,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${(i % 2 === 0 ? s : s * 0.6) / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${(i % 2 === 0 ? s : s * 0.6) / 2}px)`,
            background: i % 2 === 0 ? '#c0c0ff' : '#ffe4ff',
            boxShadow: `0 0 ${s}px rgba(192,192,255,0.8)`,
          }}
        />
      ))}
    </>
  )
}

export function SunsetDecos({ r }: DecoProps) {
  const s = Math.max(7, r * 0.2)
  return (
    <>
      {[0, 120, 240].map((deg) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            filter: 'drop-shadow(0 0 2px rgba(238,90,36,0.7))',
          }}
          viewBox="0 0 24 24"
          fill="#f0932b"
        >
          <circle cx="12" cy="12" r="6" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="12" x2={12 + Math.cos((a * Math.PI) / 180) * 10} y2={12 + Math.sin((a * Math.PI) / 180) * 10} stroke="#ff6b6b" strokeWidth="1.5" strokeLinecap="round" />
          ))}
        </svg>
      ))}
    </>
  )
}

export function NeonDecos({ r }: DecoProps) {
  const s = Math.max(5, r * 0.14)
  return (
    <>
      {[0, 72, 144, 216, 288].map((deg) => (
        <div
          key={deg}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            background: deg % 144 === 0 ? '#00ff87' : '#60efff',
            boxShadow: `0 0 ${s * 1.5}px ${deg % 144 === 0 ? '#00ff87' : '#60efff'}`,
          }}
        />
      ))}
    </>
  )
}

export function RoseGoldDecos({ r }: DecoProps) {
  const s = Math.max(7, r * 0.2)
  return (
    <>
      {[60, 180, 300].map((deg) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            filter: 'drop-shadow(0 0 2px rgba(183,110,121,0.6))',
          }}
          viewBox="0 0 24 24"
          fill="#e8a0a0"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}
    </>
  )
}

export function LavaDecos({ r }: DecoProps) {
  return (
    <>
      {[-20, 0, 20, 160, 200].map((deg, i) => {
        const w = i === 1 ? Math.max(9, r * 0.26) : Math.max(6, r * 0.18)
        const h = w * 1.3
        return (
          <svg
            key={i}
            className="absolute pointer-events-none"
            style={{
              width: w,
              height: h,
              left: `calc(50% + ${Math.cos(((deg - 90) * Math.PI) / 180) * r}px - ${w / 2}px)`,
              top: `calc(50% + ${Math.sin(((deg - 90) * Math.PI) / 180) * r}px - ${h * 0.6}px)`,
              filter: 'drop-shadow(0 0 3px rgba(255,69,0,0.8))',
            }}
            viewBox="0 0 24 32"
            fill="none"
          >
            <path d="M12 0C12 0 4 10 4 18c0 4.4 3.6 8 8 8s8-3.6 8-8C20 10 12 0 12 0z" fill={`url(#lava_${i})`} />
            <defs>
              <linearGradient id={`lava_${i}`} x1="12" y1="0" x2="12" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffd700" />
                <stop offset="0.4" stopColor="#ff4500" />
                <stop offset="1" stopColor="#8b0000" />
              </linearGradient>
            </defs>
          </svg>
        )
      })}
    </>
  )
}

export function OceanDecos({ r }: DecoProps) {
  const s = Math.max(8, r * 0.22)
  return (
    <>
      {[90, 210, 330].map((deg, i) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s * 0.7,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${(s * 0.7) / 2}px)`,
            filter: 'drop-shadow(0 0 2px rgba(54,209,220,0.7))',
          }}
          viewBox="0 0 30 18"
          fill="none"
        >
          <path d={`M2 12 Q8 ${i % 2 === 0 ? 4 : 2} 15 10 Q22 ${i % 2 === 0 ? 2 : 4} 28 12`} stroke="#36d1dc" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d={`M5 16 Q12 ${i % 2 === 0 ? 8 : 10} 25 16`} stroke="#5b86e5" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      ))}
    </>
  )
}

export function SakuraDecos({ r }: DecoProps) {
  const s = Math.max(8, r * 0.24)
  return (
    <>
      {[30, 100, 200, 310].map((deg, i) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: s,
            height: s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${s / 2}px)`,
            filter: 'drop-shadow(0 0 2px rgba(255,105,180,0.6))',
            transform: `rotate(${i * 30}deg)`,
          }}
          viewBox="0 0 24 24"
          fill="#ffb7c5"
        >
          <path d="M12 2C12 2 8 6 8 10c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2 0-4-4-8-4-8z" />
          <path d="M12 2C12 2 16 6 16 10c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2 0-4 4-8 4-8z" opacity="0.6" />
          <circle cx="12" cy="11" r="1.5" fill="#ff69b4" />
        </svg>
      ))}
    </>
  )
}

export function MidnightDecos({ r }: DecoProps) {
  const s = Math.max(5, r * 0.15)
  return (
    <>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <svg
          key={deg}
          className="absolute pointer-events-none"
          style={{
            width: i % 2 === 0 ? s * 1.2 : s,
            height: i % 2 === 0 ? s * 1.2 : s,
            left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${(i % 2 === 0 ? s * 1.2 : s) / 2}px)`,
            top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${(i % 2 === 0 ? s * 1.2 : s) / 2}px)`,
            filter: 'drop-shadow(0 0 2px rgba(192,192,192,0.8))',
          }}
          viewBox="0 0 24 24"
          fill="#c0c0c0"
        >
          <path d="M12 2l1.5 4.5H18l-3.5 2.8 1.3 4.5L12 11l-3.8 2.8 1.3-4.5L6 6.5h4.5z" />
        </svg>
      ))}
    </>
  )
}

export function CosmicDecos({ r }: DecoProps) {
  const s = Math.max(5, r * 0.13)
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const colors = ['#6a0dad', '#ff69b4', '#4169e1', '#00ced1']
        const color = colors[Math.floor(deg / 90) % colors.length]
        return (
          <div
            key={deg}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: deg % 90 === 0 ? s * 1.3 : s,
              height: deg % 90 === 0 ? s * 1.3 : s,
              left: `calc(50% + ${Math.cos((deg * Math.PI) / 180) * r}px - ${(deg % 90 === 0 ? s * 1.3 : s) / 2}px)`,
              top: `calc(50% + ${Math.sin((deg * Math.PI) / 180) * r}px - ${(deg % 90 === 0 ? s * 1.3 : s) / 2}px)`,
              background: color,
              boxShadow: `0 0 ${s}px ${color}`,
            }}
          />
        )
      })}
    </>
  )
}

/** Get frame decorations scaled to a given radius (half the container size) */
export function getFrameDecorations(frameId: string, radius = 44) {
  switch (frameId) {
    case 'frame_gold': return <GoldDecos r={radius} />
    case 'frame_fire': return <FireDecos r={radius} />
    case 'frame_ice': return <IceDecos r={radius} />
    case 'frame_rainbow': return <RainbowDecos r={radius} />
    case 'frame_diamond': return <DiamondDecos r={radius} />
    case 'frame_crown': return <CrownDecos r={radius} />
    case 'frame_emerald': return <EmeraldDecos r={radius} />
    case 'frame_galaxy': return <GalaxyDecos r={radius} />
    case 'frame_sunset': return <SunsetDecos r={radius} />
    case 'frame_neon': return <NeonDecos r={radius} />
    case 'frame_rosegold': return <RoseGoldDecos r={radius} />
    case 'frame_lava': return <LavaDecos r={radius} />
    case 'frame_ocean': return <OceanDecos r={radius} />
    case 'frame_sakura': return <SakuraDecos r={radius} />
    case 'frame_midnight': return <MidnightDecos r={radius} />
    case 'frame_cosmic': return <CosmicDecos r={radius} />
    default: return null
  }
}
