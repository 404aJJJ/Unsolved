import { useRef, type PointerEvent, type ReactNode } from 'react'
import { useWindows, type Win } from '../store/windows'
import { AppIcon } from './Icons'

export function Window({ win, children }: { win: Win; children: ReactNode }) {
  const { focus, close, toggleMin, toggleMax, move, topZ } = useWindows()
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const active = win.z === topZ

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || win.max) return
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const x = Math.min(Math.max(e.clientX - drag.current.dx, -win.w + 120), window.innerWidth - 120)
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 0), window.innerHeight - 80)
    move(win.id, x, y)
  }
  const onUp = () => (drag.current = null)

  const style = win.max
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 40px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  return (
    <section
      className={`win ${active ? 'win--active' : ''} ${win.max ? 'win--max' : ''}`}
      style={{ ...style, display: win.min ? 'none' : undefined }}
      onPointerDown={() => focus(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      <div className="win__bar" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={() => toggleMax(win.id)}>
        <span className="win__icon">
          <AppIcon app={win.app} size={16} />
        </span>
        <span className="win__title">{win.title}</span>
        <div className="win__controls">
          <button className="wbtn wbtn--min" aria-label="Minimize" onClick={() => toggleMin(win.id)}>
            <span />
          </button>
          <button className="wbtn wbtn--max" aria-label="Maximize" onClick={() => toggleMax(win.id)}>
            <span />
          </button>
          <button className="wbtn wbtn--close" aria-label="Close" onClick={() => close(win.id)}>
            ✕
          </button>
        </div>
      </div>
      <div className="win__body">{children}</div>
    </section>
  )
}
