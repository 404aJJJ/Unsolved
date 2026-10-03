import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { useWindows, type AppId } from '../store/windows'
import { AppIcon, MagnifierGlyph } from './Icons'

const START_ITEMS: { app: AppId; label: string; desc: string }[] = [
  { app: 'files', label: 'Case Files', desc: 'Evidence 01–06' },
  { app: 'mail', label: 'Mail', desc: 'Appraisal correspondence' },
  { app: 'messages', label: 'Messages', desc: 'Recovered chat logs' },
  { app: 'board', label: 'Case Board', desc: 'Suspects and leads' },
  { app: 'notes', label: 'Notes', desc: 'Your notebook' },
  { app: 'report', label: 'Submit Report', desc: 'Name the culprit' },
]

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function Taskbar({ onLogOff }: { onLogOff: () => void }) {
  const { windows, topZ, open, focus, toggleMin } = useWindows()
  const reset = useGame((s) => s.reset)
  const [startOpen, setStartOpen] = useState(false)
  const now = useClock()

  return (
    <>
      {startOpen && (
        <div className="start-scrim" onPointerDown={() => setStartOpen(false)}>
          <div className="start" onPointerDown={(e) => e.stopPropagation()}>
            <div className="start__left">
              {START_ITEMS.map((it) => (
                <button
                  key={it.app}
                  className="start__item"
                  onClick={() => {
                    open(it.app)
                    setStartOpen(false)
                  }}
                >
                  <AppIcon app={it.app} size={32} />
                  <span>
                    <strong>{it.label}</strong>
                    <small>{it.desc}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="start__right">
              <div className="start__user">
                <div className="start__avatar">
                  <MagnifierGlyph size={30} />
                </div>
                <strong>Detective</strong>
              </div>
              <div className="start__link">Case PB-062</div>
              <div className="start__link">Premier Bank, London</div>
              <div className="start__spacer" />
              <button
                className="start__link start__link--btn"
                onClick={() => {
                  if (confirm('Restart the investigation? Unlocked files and notes will be cleared.')) {
                    reset()
                    setStartOpen(false)
                  }
                }}
              >
                Restart case
              </button>
              <button className="start__power" onClick={onLogOff}>
                Log off
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="taskbar">
        <button className={`orb ${startOpen ? 'orb--on' : ''}`} aria-label="Start" onClick={() => setStartOpen((v) => !v)}>
          <MagnifierGlyph />
        </button>
        <div className="taskbar__tasks">
          {windows.map((w) => {
            const active = w.z === topZ && !w.min
            return (
              <button
                key={w.id}
                className={`task ${active ? 'task--active' : ''}`}
                onClick={() => (active ? toggleMin(w.id) : focus(w.id))}
                title={w.title}
              >
                <AppIcon app={w.app} size={18} />
                <span>{w.title}</span>
              </button>
            )
          })}
        </div>
        <div className="tray">
          <span className="tray__time">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <span className="tray__date">{now.toLocaleDateString()}</span>
        </div>
      </footer>
    </>
  )
}
