import { useRef, useState, type PointerEvent } from 'react'
import './minigames.css'

// File 06 skin, and the specimen photo inside file 05. A drawn imitation stone whose girdle carries
// an engraving too small to read; drag the lens over it to read it. The engraving text comes from
// the unlocked file 05 content (a server-delivered `specimen` block), never from the client bundle.

const W = 360
const H = 220
const LENS = 110
const ZOOM = 7

function Stone({ engraving }: { engraving?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <defs>
        <radialGradient id="mg-bg" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#3a4250" />
          <stop offset="100%" stopColor="#11151b" />
        </radialGradient>
        <linearGradient id="mg-crown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4fbff" />
          <stop offset="55%" stopColor="#b9d3e6" />
          <stop offset="100%" stopColor="#7f9fb8" />
        </linearGradient>
        <linearGradient id="mg-pav" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9c4d9" />
          <stop offset="100%" stopColor="#4d6a83" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#mg-bg)" />
      {/* scale bar and plate label */}
      <text x="12" y="20" fill="#8aa0b4" fontSize="9" fontFamily="monospace">
        PLATE 05-A · GIRDLE VIEW · ×1
      </text>
      <line x1="12" y1={H - 14} x2="62" y2={H - 14} stroke="#8aa0b4" />
      <text x="66" y={H - 11} fill="#8aa0b4" fontSize="8" fontFamily="monospace">
        2 mm
      </text>
      {/* crown */}
      <polygon points="110,92 140,62 220,62 250,92" fill="url(#mg-crown)" stroke="#e8f4ff" strokeWidth="0.8" />
      <polyline points="140,62 155,92 180,62 205,92 220,62" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="0.6" />
      <line x1="110" y1="92" x2="250" y2="92" stroke="#ffffff" strokeOpacity="0.5" />
      {/* girdle band */}
      <rect x="110" y="92" width="140" height="7" fill="#c9dae7" stroke="#e8f4ff" strokeWidth="0.5" />
      {/* pavilion */}
      <polygon points="110,99 250,99 180,170" fill="url(#mg-pav)" stroke="#d8e9f6" strokeWidth="0.8" />
      <polyline points="110,99 165,170 180,99 195,170 250,99" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.6" />
      {/* sparkle */}
      <circle cx="160" cy="72" r="3" fill="#fff" opacity="0.8" />
      {/* violet manufacturing blemish */}
      <ellipse cx="236" cy="118" rx="1.4" ry="1" fill="#8a4fd0" opacity="0.85" />
      {/* engraving on the girdle: unreadable at 1x */}
      {engraving && (
        <text x="200" y="96.6" fontSize="2" fontFamily="monospace" fill="#8193a4" letterSpacing="0.15">
          {engraving}
        </text>
      )}
    </svg>
  )
}

export function GemSpecimen({ engraving, caption }: { engraving?: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)

  const move = (e: PointerEvent) => {
    const box = ref.current!.getBoundingClientRect()
    // Plate may be scaled down to fit; work in unscaled SVG coordinates.
    const sx = W / box.width
    setLens({ x: (e.clientX - box.left) * sx, y: (e.clientY - box.top) * sx })
  }

  return (
    <figure className="specimen">
      <div
        ref={ref}
        className={`specimen__plate ${lens ? 'specimen__plate--lens' : ''}`}
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setLens(null)}
      >
        <Stone engraving={engraving} />
        {lens && (
          <div className="specimen__lens" style={{ left: lens.x - LENS / 2, top: lens.y - LENS / 2, width: LENS, height: LENS }}>
            <div
              style={{
                transform: `translate(${LENS / 2 - lens.x * ZOOM}px, ${LENS / 2 - lens.y * ZOOM}px) scale(${ZOOM})`,
                transformOrigin: '0 0',
              }}
            >
              <Stone engraving={engraving} />
            </div>
          </div>
        )}
      </div>
      <figcaption>{caption ?? 'Move the lens over the stone to inspect it.'}</figcaption>
    </figure>
  )
}
