import { useMemo } from 'react'
import { FILES } from '../content/case'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'
import { AnalogClock } from './AnalogClock'
import { useClockLabel } from './caseTime'
import { Elapsed } from './CaseTimer'
import { useNow } from './useNow'

function ClockWidget() {
  const now = useNow()
  const open = useWindows((s) => s.open)
  return (
    <button className="widget widget--clock" onDoubleClick={() => open('clock')} onKeyDown={(e) => e.key === 'Enter' && open('clock')} title="Double-click to open Clock">
      <AnalogClock now={now} size={104} />
      <div className="widget__digital">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div className="widget__sub">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    </button>
  )
}

function CalendarWidget() {
  const now = useNow(60_000)
  const cells = useMemo(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const lead = (new Date(y, m, 1).getDay() + 6) % 7 // Monday-first
    const days = new Date(y, m + 1, 0).getDate()
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  }, [now])
  return (
    <section className="widget widget--cal" aria-label="Calendar">
      <div className="widget__title">{now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
      <div className="cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="cal__dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) => (
          <span key={i} className={d === now.getDate() ? 'cal__today' : ''}>
            {d}
          </span>
        ))}
      </div>
    </section>
  )
}

function CaseWidget() {
  const unlocked = useGame((s) => s.unlocked)
  const count = FILES.filter((f) => !f.lock || unlocked[f.id]).length
  const label = useClockLabel()
  return (
    <aside className="widget widget--case" aria-label="Case status">
      <div className="widget__title">Case PB-062</div>
      <div className="gadget__big">
        <span key={count} className="gadget__num">
          {count}
        </span>
        <small>/{FILES.length}</small>
      </div>
      <div className="gadget__label">records recovered</div>
      <div className="progress progress--dark">
        <div className="progress__fill" style={{ width: `${(count / FILES.length) * 100}%` }} />
      </div>
      <div className="gadget__time">
        <span>{label}</span>
        <Elapsed />
      </div>
      <div className={`gadget__status ${count === FILES.length ? 'gadget__status--ready' : ''}`}>{count === FILES.length ? 'Ready to report' : 'Investigation open'}</div>
    </aside>
  )
}

export function Widgets() {
  return (
    <div className="widgets">
      <ClockWidget />
      <CaseWidget />
      <CalendarWidget />
    </div>
  )
}
