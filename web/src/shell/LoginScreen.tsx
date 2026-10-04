import { useState } from 'react'
import { CASE } from '../content/case'
import { MagnifierGlyph } from './Icons'

// Placeholder standings until a real leaderboard exists.
const SAMPLE_BOARD = [
  { name: 'D. Holloway', time: '12:48', score: 940 },
  { name: 'M. Okafor', time: '15:02', score: 905 },
  { name: 'R. Lindqvist', time: '17:37', score: 870 },
  { name: 'S. Patel', time: '21:15', score: 815 },
  { name: 'J. Whitaker', time: '26:40', score: 760 },
]

function LoginLeaderboard() {
  return (
    <aside className="lb" aria-label="Leaderboard">
      <div className="lb__title">Leaderboard</div>
      <div className="lb__sub">Fastest solved cases</div>
      <ol className="lb__list">
        {SAMPLE_BOARD.map((r, i) => (
          <li key={r.name} className="lb__row">
            <span className="lb__rank">{i + 1}</span>
            <span className="lb__name">{r.name}</span>
            <time className="lb__time">{r.time}</time>
            <span className="lb__score">{r.score}</span>
          </li>
        ))}
      </ol>
      <div className="lb__foot">Sample standings · live rankings coming soon</div>
    </aside>
  )
}

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [welcome, setWelcome] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const start = () => {
    setWelcome(true)
    setTimeout(() => setLeaving(true), 1100)
    setTimeout(onLogin, 1500)
  }
  return (
    <div className={`login ${leaving ? 'login--out' : ''}`}>
      <div className="login__band">
        {welcome ? (
          <div className="login__welcome">
            <span className="spinner" /> Welcome
          </div>
        ) : (
          <button className="login__user" onClick={start} autoFocus>
            <div className="login__tile">
              <MagnifierGlyph size={44} />
            </div>
            <strong>Detective</strong>
            <span>Case {CASE.id} · click to log on</span>
          </button>
        )}
      </div>
      <LoginLeaderboard />
      <p className="login__premise">{CASE.premise}</p>
      <div className="login__brand">
        Unsolved<span>.exe</span>
      </div>
    </div>
  )
}
