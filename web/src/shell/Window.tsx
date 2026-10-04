import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { activeWindowId, useWindows, type Win } from '../store/windows'
import { AppIcon } from './Icons'

export function Window({ win, children }: { win: Win; children: ReactNode }) {
  const { focus, requestClose, requestMin, finishAnim, toggleMax, move } = useWindows()
  const active = useWindows((s) => activeWindowId(s.windows) === win.id)
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Minimize/restore fly toward/from this window's taskbar button.
  useLayoutEffect(() => {
    if (win.anim !== 'min' && win.anim !== 'restore') return
    const el = ref.current
    const btn = document.querySelector(`[data-task="${win.id}"]`)
    if (!el || !btn) return
    const a = el.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    el.style.setProperty('--fly-x', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`)
    el.style.setProperty('--fly-y', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`)
  }, [win.anim, win.id])

  // Safety net: finish the phase even if animationend never fires (hidden tab, cancelled animation).
  useEffect(() => {
    if (!win.anim) return
    const t = setTimeout(() => finishAnim(win.id), 600)
    return () => clearTimeout(t)
  }, [win.anim, win.id, finishAnim])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || win.max) return
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const x = Math.min(Math.max(e.clientX - drag.current.dx, -win.w + 120), window.innerWidth - 120)
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 0), window.innerHeight - 80)
    move(win.id, x, y)
  }
  const onUp = () => {
    drag.current = null
    setDragging(false)
  }
  const onAnimEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && win.anim) finishAnim(win.id)
  }

  const style: CSSProperties = win.max
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - 40px)', zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }

  const cls = ['win', active && 'win--active', win.max && 'win--max', dragging && 'win--drag', win.anim && `win--${win.anim}`]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      ref={ref}
      className={cls}
      style={{ ...style, display: win.min ? 'none' : undefined }}
      onPointerDown={() => focus(win.id)}
      onAnimationEnd={onAnimEnd}
      role="dialog"
      aria-label={win.title}
    >
      <div className="win__bar" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={() => toggleMax(win.id)}>
        <span className="win__icon">
          <AppIcon app={win.app} size={16} />
        </span>
        <span className="win__title">{win.title}</span>
        <div className="win__controls">
          <button className="wbtn wbtn--min" aria-label="Minimize" onClick={() => requestMin(win.id)}>
            <span />
          </button>
          <button className="wbtn wbtn--max" aria-label={win.max ? 'Restore' : 'Maximize'} onClick={() => toggleMax(win.id)}>
            <span />
          </button>
          <button className="wbtn wbtn--close" aria-label="Close" onClick={() => requestClose(win.id)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="win__body">{children}</div>
    </section>
  )
}
