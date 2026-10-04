import { useState } from 'react'
import { CASE } from '../content/case'
import { TIME_LIMIT, useGame, type GameMode } from '../store/game'
import { formatElapsed, liveTimeLeft } from './caseTime'
import { useNow } from './useNow'
import { MagnifierGlyph } from './Icons'

export function LoginScreen({ onLogin }: { onLogin: (mode: GameMode) => Promise<boolean> }) {
  const [welcome, setWelcome] = useState(false)
  const started = useGame((s) => s.started)
  const savedMode = useGame((s) => s.mode)
  const elapsed = useGame((s) => s.elapsed)
  const finished = useGame((s) => !!s.result)
  const [choice, setChoice] = useState<GameMode>('timed')
  const deadline = useGame((s) => s.deadline)
  const now = useNow(1000)
  const left = liveTimeLeft({ mode: savedMode, deadline, elapsed }, now.getTime())
  const [leaving, setLeaving] = useState(false)
  const start = () => {
    setWelcome(true)
    setTimeout(() => setLeaving(true), 1100)
    setTimeout(async () => {
      if (!(await onLogin(choice))) {
        setWelcome(false)
        setLeaving(false)
      }
    }, 1500)
  }
  return (
    <div className={`login ${leaving ? 'login--out' : ''}`}>
      <div className="login__band">
        {welcome ? (
          <div className="login__welcome">
            <span className="spinner" /> Welcome
          </div>
        ) : (
          <div className="login__stack">
            <button className="login__user" onClick={start} autoFocus>
              <div className="login__tile">
                <MagnifierGlyph size={44} />
              </div>
              <strong>Detective</strong>
              <span>Case {CASE.id} · click to log on</span>
            </button>
            {started ? (
              <div className="login__mode">
                {finished
                  ? 'Case closed. Log on to review the verdict.'
                  : savedMode === 'timed'
                    ? `Timed game in progress · ${formatElapsed(left ?? 0)} left`
                    : 'Untimed game in progress'}
              </div>
            ) : (
              <div className="login__mode">
                <div className="modes" role="group" aria-label="Game mode">
                  <button aria-pressed={choice === 'timed'} onClick={() => setChoice('timed')}>
                    Timed · {formatElapsed(TIME_LIMIT)}
                  </button>
                  <button aria-pressed={choice === 'untimed'} onClick={() => setChoice('untimed')}>
                    Untimed
                  </button>
                </div>
                <span>{choice === 'timed' ? 'You have 30 minutes to file your report.' : 'Take as long as you like.'}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="login__premise">{CASE.premise}</p>
      <div className="login__brand">
        Unsolved<span>.exe</span>
      </div>
    </div>
  )
}
