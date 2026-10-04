import { useEffect, useRef, useState } from 'react'
import './minigames.css'

// File 05 skin, after the GTA Online letter-scroll hack. Rows of letters scroll past a fixed
// bracket; lock the letter under it to build the codename one character at a time, then transmit.
// The client never knows the answer: the built word is checked by /api/unlock like any other.
// Running out of time only resets the attempt (no hard fail).

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROWS = 6
const CELL = 30
const MAX_LEN = 12
const TIME_LIMIT = 60
const BASE_SPEED = 55 // px/s for the active row; rises with each locked letter

const shuffled = () => {
  const a = ALPHA.split('')
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Every row is a full shuffled alphabet, so any word can be spelled.
const makeRows = () => Array.from({ length: ROWS }, shuffled)

export function HackGrid({ onSubmit, disabled }: { onSubmit: (word: string) => Promise<boolean>; disabled: boolean }) {
  const [rows, setRows] = useState(makeRows)
  const [word, setWord] = useState('')
  const [now, setNow] = useState(0) // seconds since this attempt started
  const [flash, setFlash] = useState<'lock' | 'trace' | null>(null)
  const elapsedRef = useRef(0)
  const viewRef = useRef<HTMLDivElement>(null)
  const [viewW, setViewW] = useState(390)

  const active = word.length % ROWS
  const speed = BASE_SPEED + word.length * 14
  const left = Math.max(0, TIME_LIMIT - now)
  const period = ALPHA.length * CELL

  // Each row keeps its own scroll offset, advanced per frame so speed changes never make it jump.
  const [offsets, setOffsets] = useState<number[]>(() => Array.from({ length: ROWS }, () => Math.random() * ALPHA.length * CELL))
  const live = useRef({ active, speed, disabled })
  useEffect(() => {
    live.current = { active, speed, disabled }
  })

  const letterUnderBracket = (r: number) => {
    const idx = Math.floor((offsets[r] + viewW / 2) / CELL) % ALPHA.length
    return rows[r][idx]
  }

  // Bracket sits at 50% of the grid, so the lock math must track the grid's live width.
  useEffect(() => {
    const el = viewRef.current!
    const ro = new ResizeObserver(() => setViewW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.25, (t - last) / 1000)
      last = t
      const { active: a, speed: v, disabled: paused } = live.current
      setOffsets((offs) =>
        offs.map((o, r) => {
          const dir = r % 2 === 0 ? 1 : -1
          const rv = r === a ? v : 18 + r * 4
          return (((o + dt * rv * dir) % period) + period) % period
        }),
      )
      if (!paused) {
        elapsedRef.current += dt
        if (elapsedRef.current >= TIME_LIMIT) restart('trace')
        setNow(elapsedRef.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [period])

  function restart(why: 'trace' | null) {
    elapsedRef.current = 0
    setNow(0)
    setWord('')
    setRows(makeRows())
    setFlash(why)
    if (why) setTimeout(() => setFlash(null), 1400)
  }

  const lock = () => {
    if (disabled || word.length >= MAX_LEN) return
    setWord((w) => w + letterUnderBracket(active))
    setFlash('lock')
    setTimeout(() => setFlash((f) => (f === 'lock' ? null : f)), 150)
  }
  const undo = () => !disabled && setWord((w) => w.slice(0, -1))
  const transmit = async () => {
    if (disabled || !word) return
    const ok = await onSubmit(word)
    if (!ok) restart(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') lock()
      else if (e.key === 'Backspace') undo()
      else if (e.key === 'Enter') transmit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`hack ${flash === 'trace' ? 'hack--trace' : ''}`}>
      <div className="hack__top">
        <span>NODE://PB-062/ARCHIVE/05</span>
        <span className={left < 10 ? 'hack__time--low' : ''}>{left.toFixed(1)}s</span>
      </div>
      <div className="hack__timer">
        <div style={{ width: `${(left / TIME_LIMIT) * 100}%` }} />
      </div>
      <div className="hack__grid" ref={viewRef} onClick={lock}>
        {rows.map((row, r) => (
          <div key={r} className={`hack__row ${r === active ? 'hack__row--on' : ''}`}>
            <div className="hack__strip" style={{ transform: `translateX(${-offsets[r]}px)` }}>
              {[...row, ...row, ...row].map((ch, i) => (
                <span key={i} style={{ width: CELL }}>
                  {ch}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className={`hack__bracket ${flash === 'lock' ? 'hack__bracket--hit' : ''}`} style={{ width: CELL + 6, top: active * 34 }} />
        {flash === 'trace' && <div className="hack__alert">TRACE DETECTED · reconnecting</div>}
      </div>
      <div className="hack__word" aria-live="polite">
        {Array.from({ length: Math.max(word.length + 1, 6) }, (_, i) => (
          <span key={i} className={i === word.length ? 'hack__cell--cur' : ''}>
            {word[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="hack__controls">
        <span className="hack__help">Space / click: lock · Backspace: undo · Enter: transmit</span>
        <button type="button" className="btn" onClick={undo} disabled={disabled || !word}>
          Undo
        </button>
        <button type="button" className="btn btn--primary" onClick={transmit} disabled={disabled || !word}>
          Transmit
        </button>
      </div>
    </div>
  )
}
