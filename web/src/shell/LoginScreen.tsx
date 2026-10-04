import { useState } from 'react'
import { CASE } from '../content/case'
import { MagnifierGlyph } from './Icons'

export function LoginScreen({ onLogin }: { onLogin: () => Promise<boolean> }) {
  const [welcome, setWelcome] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const start = () => {
    setWelcome(true)
    setTimeout(() => setLeaving(true), 1100)
    setTimeout(async () => {
      if (!(await onLogin())) {
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
          <button className="login__user" onClick={start} autoFocus>
            <div className="login__tile">
              <MagnifierGlyph size={44} />
            </div>
            <strong>Detective</strong>
            <span>Case {CASE.id} · click to log on</span>
          </button>
        )}
      </div>
      <p className="login__premise">{CASE.premise}</p>
      <div className="login__brand">
        Unsolved<span>.exe</span>
      </div>
    </div>
  )
}
