import { useState } from 'react'
import { FILES } from '../content/case'
import { useGame } from '../store/game'
import { secondsLeft, useTimer } from '../store/timer'
import { AnalogClock } from '../shell/AnalogClock'
import { formatElapsed, timeLeft } from '../shell/caseTime'
import { useNow } from '../shell/useNow'

type Tab = 'clock' | 'world' | 'case' | 'timer'

const TABS: { id: Tab; label: string }[] = [
  { id: 'clock', label: 'Clock' },
  { id: 'world', label: 'World time' },
  { id: 'case', label: 'Case time' },
  { id: 'timer', label: 'Timer' },
]

const CITIES = [
  { name: 'London', zone: 'Europe/London', note: 'Case location' },
  { name: 'New York', zone: 'America/New_York' },
  { name: 'Los Angeles', zone: 'America/Los_Angeles' },
  { name: 'Reykjavik', zone: 'Atlantic/Reykjavik' },
  { name: 'Paris', zone: 'Europe/Paris' },
  { name: 'Dubai', zone: 'Asia/Dubai' },
  { name: 'Tokyo', zone: 'Asia/Tokyo' },
  { name: 'Sydney', zone: 'Australia/Sydney' },
]

export function ClockApp() {
  const [tab, setTab] = useState<Tab>('clock')
  const timerStatus = useTimer((s) => s.status)
  return (
    <div className="clockapp">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tabs__tab ${tab === t.id ? 'tabs__tab--on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'timer' && (timerStatus === 'running' || timerStatus === 'done') && <i className="tabs__dot" />}
          </button>
        ))}
      </div>
      <div className="clockapp__body" key={tab}>
        {tab === 'clock' && <LocalClock />}
        {tab === 'world' && <WorldClock />}
        {tab === 'case' && <CaseClock />}
        {tab === 'timer' && <TimerPanel />}
      </div>
    </div>
  )
}

function LocalClock() {
  const now = useNow()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return (
    <div className="clockpane">
      <AnalogClock now={now} size={190} />
      <div className="bigtime">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        <small>{String(now.getSeconds()).padStart(2, '0')}</small>
      </div>
      <div className="clockpane__date">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div className="clockpane__muted">{zone.replace('_', ' ')}</div>
    </div>
  )
}

function dayLabel(now: Date, zone: string) {
  const fmt = (d: Date, tz?: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const here = new Date(fmt(now) + 'T00:00:00Z').getTime()
  const there = new Date(fmt(now, zone) + 'T00:00:00Z').getTime()
  const diff = Math.round((there - here) / 86_400_000)
  return diff === 0 ? 'Today' : diff > 0 ? 'Tomorrow' : 'Yesterday'
}

function WorldClock() {
  const now = useNow()
  return (
    <ul className="world">
      {CITIES.map((c) => (
        <li key={c.zone} className={`world__row ${c.note ? 'world__row--home' : ''}`}>
          <AnalogClock now={now} timeZone={c.zone} size={46} seconds={false} />
          <div className="world__name">
            <strong>{c.name}</strong>
            <span>
              {c.note ? `${c.note} · ` : ''}
              {dayLabel(now, c.zone)}
            </span>
          </div>
          <time className="world__time">{now.toLocaleTimeString('en-GB', { timeZone: c.zone, hour: '2-digit', minute: '2-digit' })}</time>
        </li>
      ))}
    </ul>
  )
}

function CaseClock() {
  const elapsed = useGame((s) => s.elapsed)
  const mode = useGame((s) => s.mode)
  const left = timeLeft({ mode, elapsed })
  const unlockedAt = useGame((s) => s.unlockedAt)
  const unlocked = useGame((s) => s.unlocked)
  const recovered = FILES.filter((f) => !f.lock || unlocked[f.id]).length
  const marks = FILES.filter((f) => f.lock && unlockedAt[f.id] !== undefined)
  return (
    <div className="clockpane clockpane--case">
      <div className="clockpane__label">{left === null ? 'Time on case PB-062' : 'Time left on case PB-062'}</div>
      <div className={`bigtime bigtime--mono ${left !== null && left <= 300 ? 'clock--urgent' : ''}`}>{formatElapsed(left ?? elapsed)}</div>
      <div className="clockpane__muted">
        {left === null ? 'Untimed game. Counts while you work and pauses when this tab is hidden.' : 'Timed game. The clock keeps running even if you leave the tab. Your report is filed automatically at zero.'}
      </div>
      <div className="stats">
        <div>
          <strong>{recovered}/{FILES.length}</strong>
          <span>records recovered</span>
        </div>
        <div>
          <strong>{recovered > 0 ? formatElapsed(Math.round(elapsed / recovered)) : '--:--'}</strong>
          <span>average per record</span>
        </div>
      </div>
      <div className="milestones">
        <div className="clockpane__label">Milestones</div>
        {marks.length === 0 ? (
          <div className="clockpane__muted">Recovered records will be timestamped here.</div>
        ) : (
          marks.map((f) => (
            <div key={f.id} className="milestones__row">
              <span className="file__id file__id--sm">{f.number}</span>
              <span>{f.title}</span>
              <time>{formatElapsed(unlockedAt[f.id]!)}</time>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const PRESETS = [60, 300, 600, 900]

function TimerPanel() {
  const t = useTimer()
  const now = useNow(200)
  const left = secondsLeft(t, now.getTime())
  const running = t.status === 'running'
  const pct = t.status === 'idle' ? 0 : Math.min(100, ((t.duration - left) / t.duration) * 100)

  return (
    <div className="clockpane clockpane--timer">
      <div className={`bigtime bigtime--mono ${t.status === 'done' ? 'bigtime--done' : ''}`}>{formatElapsed(left)}</div>
      <div className="progress" aria-hidden>
        <div className="progress__fill" style={{ width: `${pct}%`, transition: 'none' }} />
      </div>
      <div className="clockpane__muted">{t.status === 'done' ? "Time's up." : t.status === 'paused' ? 'Paused' : running ? 'Running' : 'Pick a length to start a countdown.'}</div>
      {t.status === 'idle' || t.status === 'done' ? (
        <div className="presets">
          {PRESETS.map((s) => (
            <button key={s} className="btn" onClick={() => t.start(s)}>
              {s / 60} min
            </button>
          ))}
        </div>
      ) : (
        <div className="presets">
          <button className="btn btn--primary" onClick={running ? t.pause : t.resume}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button className="btn" onClick={t.reset}>
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
