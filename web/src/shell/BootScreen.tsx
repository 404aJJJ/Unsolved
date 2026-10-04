import { useEffect, useRef, useState } from 'react'
import { CASE_IMAGES } from '../content/caseImages'
import { useApi } from '../store/api'
import { MagnifierGlyph } from './Icons'

// Shown once, when the page first loads: it really does the start-up work (reach the API, read its feature flags,
// warm the public evidence images and fonts) and holds for a moment so it reads as a boot, then hands over to log-on.
const MIN_MS = 1800

const STEPS = ['Starting Unsolved.exe', 'Connecting to the investigation server', 'Loading case files', 'Preparing your desktop'] as const

function preload(src: string) {
  return new Promise<void>((done) => {
    const img = new Image()
    img.onload = img.onerror = () => done()
    img.src = src
  })
}

export function BootScreen({ onDone }: { onDone: () => void }) {
  const load = useApi((s) => s.load)
  const status = useApi((s) => s.status)
  const [step, setStep] = useState(1) // 0 would be 'Starting'; the work begins immediately
  const [attempt, setAttempt] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    let live = true
    const started = performance.now()
    ;(async () => {
      await load() // the server's feature flags; sets status to online or offline
      if (!live) return
      if (useApi.getState().status === 'offline') return // the screen shows a retry; nothing else to do
      setStep(2)
      await Promise.all([document.fonts?.ready, preload(CASE_IMAGES['01'].src), preload(CASE_IMAGES['02'].src)])
      if (!live) return
      setStep(3)
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_MS - (performance.now() - started))))
      if (!live || finished.current) return
      finished.current = true
      setLeaving(true)
      setTimeout(onDone, 450)
    })()
    return () => {
      live = false
    }
  }, [attempt, load, onDone])

  const offline = status === 'offline'
  return (
    <div className={`boot ${leaving ? 'boot--out' : ''}`} role="status" aria-live="polite">
      <div className="boot__logo">
        <MagnifierGlyph size={46} />
      </div>
      <div className="boot__title">
        Unsolved<span>.exe</span>
      </div>
      <div className={`boot__bar ${offline ? 'boot__bar--stalled' : ''}`} aria-hidden>
        <i style={{ width: offline ? '35%' : `${(step / (STEPS.length - 1)) * 100}%` }} />
      </div>
      {offline ? (
        <div className="boot__error">
          <p>Cannot reach the investigation server.</p>
          <button
            className="boot__retry"
            onClick={() => {
              useApi.setState({ status: 'unknown' })
              setStep(1)
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="boot__status">{STEPS[Math.min(step, STEPS.length - 1)]}…</div>
      )}
    </div>
  )
}
