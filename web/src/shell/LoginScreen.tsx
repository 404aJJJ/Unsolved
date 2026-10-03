import { useState } from 'react'
import { CASE } from '../content/case'
import { MagnifierGlyph } from './Icons'

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [welcome, setWelcome] = useState(false)
  const start = () => {
    setWelcome(true)
    setTimeout(onLogin, 1200)
  }
  return (
    <div className="login">
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
