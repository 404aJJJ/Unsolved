import { useEffect, useState } from 'react'
import { useGame } from '../store/game'
import { activeWindowId, useWindows, type AppId } from '../store/windows'
import { secondsLeft, useTimer } from '../store/timer'
import { formatElapsed, useClockLabel } from './caseTime'
import { Elapsed } from './CaseTimer'
import { useNarrator } from '../store/narrator'
import { useNow } from './useNow'
import { AppIcon, MagnifierGlyph } from './Icons'
import { IS_TEST } from '../testMode'

const START_ITEMS: { app: AppId; label: string; desc: string }[] = [
  { app: 'files', label: 'Case Files', desc: 'Evidence 01–05' },
  { app: 'mail', label: 'Mail', desc: 'Recovered emails' },
  { app: 'messages', label: 'Messages', desc: 'Recovered chat logs' },
  { app: 'board', label: 'Case Board', desc: 'Suspects and leads' },
  { app: 'notes', label: 'Notes', desc: 'Your notebook' },
  { app: 'report', label: 'Submit Report', desc: 'Name the culprit' },
  ...(IS_TEST ? [{ app: 'testlab' as AppId, label: 'Test Lab', desc: 'Jump to any state' }] : []),
]

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}

// Mute and volume for the narrator. Always available so sound can be turned off before anything plays.
function VoiceChip() {
  const { muted, auto, volume, status, toggleMute, setAuto, setVolume, stop } = useNarrator()
  const live = status !== 'idle'
  return (
    <div className={`tray__voice ${live ? 'tray__voice--live' : ''}`}>
      <button className="linkbtn" style={{ color: 'inherit', textDecoration: 'none' }} onClick={toggleMute} aria-pressed={muted} title={muted ? 'Unmute narrator' : 'Mute narrator'}>
        {muted ? 'Muted' : live ? 'Narrating' : 'Voice'}
      </button>
      <input className="tray__vol" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Narrator volume" />
      <button className="linkbtn" style={{ color: 'inherit', textDecoration: 'none' }} onClick={() => setAuto(!auto)} aria-pressed={auto} title="Read the brief, documents, emails and chats aloud when they open">
        Auto: {auto ? 'on' : 'off'}
      </button>
      {live && (
        <button className="linkbtn" style={{ color: 'inherit' }} onClick={stop}>
          Stop
        </button>
      )}
    </div>
  )
}

function CountdownChip() {
  const t = useTimer()
  const now = useNow(250)
  const open = useWindows((s) => s.open)
  if (t.status === 'idle') return null
  return (
    <button className={`tray__timer tray__timer--cd ${t.status === 'done' ? 'tray__timer--done' : ''}`} title="Countdown timer" onClick={() => open('clock')}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M3 1h6M3 11h6M3.5 1c0 3 5 3 5 5s-5 2-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      {formatElapsed(secondsLeft(t, now.getTime()))}
    </button>
  )
}

export function Taskbar({ onLogOff }: { onLogOff: () => void }) {
  const { windows, open, focus, requestMin, toasts, dismissToast, askConfirm } = useWindows()
  const activeId = activeWindowId(windows)
  const reset = useGame((s) => s.reset)
  const [startOpen, setStartOpen] = useState(false)
  const now = useClock()
  const clockLabel = useClockLabel()

  return (
    <>
      {startOpen && (
        <div className="start-scrim" onPointerDown={() => setStartOpen(false)}>
          <div className="start" onPointerDown={(e) => e.stopPropagation()}>
            <div className="start__left">
              {START_ITEMS.map((it, i) => (
                <button
                  key={it.app}
                  style={{ animationDelay: `${40 + i * 25}ms` }}
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
                  setStartOpen(false)
                  askConfirm({
                    title: 'Restart the investigation?',
                    body: 'Unlocked records, notes and your case time will be cleared and you will return to the log-on screen. This cannot be undone.',
                    confirmLabel: 'Restart case',
                    danger: true,
                    onConfirm: () => {
                      reset()
                      onLogOff()
                    },
                  })
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
            const active = w.id === activeId
            return (
              <button
                key={w.id}
                data-task={w.id}
                className={`task ${active ? 'task--active' : ''} ${w.anim === 'close' ? 'task--leaving' : ''}`}
                onClick={() => (active ? requestMin(w.id) : focus(w.id))}
                title={w.title}
              >
                <AppIcon app={w.app} size={18} />
                <span>{w.title}</span>
              </button>
            )
          })}
        </div>
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => (
            <button key={t.id} className="toast" onClick={() => dismissToast(t.id)}>
              <span className="toast__icon">✓</span>
              <span>
                <strong>{t.title}</strong>
                <span>{t.body}</span>
              </span>
            </button>
          ))}
        </div>
        <VoiceChip />
        <CountdownChip />
        <div className="tray__timer" title={clockLabel}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3v3.2l2 1.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <Elapsed />
        </div>
        <div className="tray">
          <span className="tray__time">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <span className="tray__date">{now.toLocaleDateString()}</span>
        </div>
      </footer>
    </>
  )
}
