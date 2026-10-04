import { useEffect, useState, type ReactNode } from 'react'
import { accuse, devFiles, devRelock, resetProgress, devScenarios, devStatus, type DevScenario, type DevStatus } from '../api/client'
import { FILES } from '../content/case'
import type { FileId } from '../content/types'
import { API_BASE, mockApiActive, setMockApi } from '../api/http'
import { fetchNarration } from '../api/narration'
import { useApi } from '../store/api'
import { useNarrator } from '../store/narrator'
import { useGame } from '../store/game'
import { useTimer } from '../store/timer'
import { useWindows, type AppId } from '../store/windows'
import { openFile } from './files'

// Jump-to-state panel for testing every part of the site. Dev server, or any build with ?test in the URL.

// Canned reports come from the dev server (they contain the solution, so they are not part of the client code).
type Scenario = DevScenario

const APPS: { app: AppId; label: string }[] = [
  { app: 'files', label: 'Case Files' },
  { app: 'mail', label: 'Mail' },
  { app: 'messages', label: 'Messages' },
  { app: 'board', label: 'Case Board' },
  { app: 'notes', label: 'Notes' },
  { app: 'clock', label: 'Clock' },
  { app: 'report', label: 'Submit Report' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tl__sec">
      <h3>{title}</h3>
      <div className="tl__row">{children}</div>
    </section>
  )
}

export function TestLab() {
  const { open, showLock, pushToast, askConfirm } = useWindows()
  const { recordUnlock, relock, setDraft, setReportStarted, clearResult, reset, unlocked } = useGame()
  const [status, setStatus] = useState<DevStatus | null | undefined>(undefined)
  const api = useApi()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [out, setOut] = useState('Nothing run yet.')

  useEffect(() => {
    devStatus().then(setStatus)
    devScenarios().then((s) => setScenarios(s ?? []))
  }, [])

  const unlockAll = async () => {
    const files = await devFiles()
    if (!files) return setOut('Could not load records: dev server and server/private/case-private.json are required.')
    for (const [id, doc] of Object.entries(files)) recordUnlock(id as FileId, doc!)
    setOut(`Unlocked ${Object.keys(files).join(', ')}.`)
  }
  const ensureAll = async () => {
    if (FILES.some((f) => f.lock && !useGame.getState().unlocked[f.id])) await unlockAll()
  }

  const fill = async (s: Scenario) => {
    await ensureAll()
    clearResult()
    setDraft(s.draft)
    setReportStarted(true)
    open('report')
    setOut(`Report form filled: ${s.label}. Submit it in the Report window.`)
  }
  const probe = async (s: Scenario) => {
    setOut('Calling /api/accuse…')
    const res = await accuse(s.draft)
    setOut(JSON.stringify(res.ok ? res.verdict : res, null, 2))
  }

  const light = (on: boolean | undefined) => <i className={`tl__dot ${on ? 'tl__dot--on' : 'tl__dot--off'}`} />

  return (
    <div className="tl">
      <div className="tl__status">
        <span>{light(status?.privateData || status?.sample)} {status?.sample ? 'SAMPLE case data (fake)' : 'private data'}</span>
        <span>{light(status?.solution)} solution block</span>
        <span>{light(status?.gemini)} Gemini key{status?.gemini ? ` (${status.model})` : ''}</span>
        <span>{light(status?.elevenLabs)} ElevenLabs key</span>
        {status === null && <em>dev API unreachable (production build?)</em>}
      </div>

      {status?.sample && status.sampleAnswers && (
        <p className="tl__note">
          Sample lock answers (fake case, no private file): {Object.entries(status.sampleAnswers).map(([id, a]) => `${id}=${a}`).join(' · ')}
        </p>
      )}

      <Section title="Integrations">
        <span className="tl__note">
          API: {mockApiActive() ? 'built-in mock (/mock-api)' : API_BASE || 'same origin (dev mock or proxy)'} · {api.status} · narration {api.features.narration ? 'server voice' : 'browser voice'} · grading AI {api.features.gradingAI ? 'on' : 'off'}
        </span>
        <button className="btn" onClick={() => setMockApi(!mockApiActive())} title="Dev only. Switches every request to the in-memory mock and reloads the page.">
          Mock API (no Python): {mockApiActive() ? 'ON, turn off' : 'off, turn on'}
        </button>
        <button
          className="btn"
          onClick={async () => {
            await api.load()
            const f = useApi.getState()
            setOut(`GET /api/config -> ${f.status}\n${JSON.stringify(f.features, null, 2)}`)
          }}
        >
          Refresh /api/config
        </button>
        <button
          className="btn"
          onClick={async () => {
            setOut('POST /api/narrate …')
            const r = await fetchNarration('This is the case narrator. If you can hear this, the voice integration works.')
            setOut(r.ok ? 'POST /api/narrate -> audio received (playing).' : `POST /api/narrate failed: ${r.error}`)
            if (r.ok) new Audio(r.url).play().catch(() => setOut('Audio received but the browser blocked playback.'))
          }}
        >
          Test server voice
        </button>
        <button className="btn" onClick={() => useNarrator.getState().speak('lab', 'This is the browser voice fallback.')}>
          Test browser voice
        </button>
      </Section>

      <Section title="Progress">
        <button className="btn" onClick={unlockAll}>Unlock all records</button>
        <button className="btn" onClick={() => askConfirm({ title: 'Reset the whole case?', body: 'Clears records, notes, report and case time, then starts an untimed game.', confirmLabel: 'Reset', danger: true, onConfirm: async () => { await resetProgress().catch(() => {}); reset(); useGame.getState().startGame('untimed'); setOut('Case reset (untimed).') } })}>
          Reset (untimed)
        </button>
        <button className="btn" onClick={() => askConfirm({ title: 'Reset the whole case?', body: 'Clears everything and starts a fresh 30:00 timed game.', confirmLabel: 'Reset', danger: true, onConfirm: async () => { await resetProgress().catch(() => {}); reset(); useGame.getState().startGame('timed'); setOut('Case reset (timed 30:00).') } })}>
          Reset (timed 30:00)
        </button>
        <button className="btn" onClick={() => { const g = useGame.getState(); if (g.mode !== 'timed') return setOut('Start a timed game first.'); useGame.setState({ deadline: Date.now() + 5000 }); setOut('Deadline set to 5 seconds from now.') }}>
          Expire in 5s
        </button>
        <button className="btn" onClick={() => { const g = useGame.getState(); if (g.mode !== 'timed') return setOut('Start a timed game first.'); useGame.setState({ deadline: Date.now() + 305_000 }); setOut('5:05 left: the five-minute warning follows shortly.') }}>
          Set 5:05 left
        </button>
        <button className="btn" onClick={() => { clearResult(); setOut('Result cleared; the case is open again.') }}>Clear result</button>
      </Section>

      <Section title="Locks (re-locks the record first)">
        {FILES.filter((f) => f.lock).map((f) => (
          <button
            key={f.id}
            className="btn"
            onClick={async () => {
              await devRelock(f.id)
              relock(f.id)
              showLock(f.id)
            }}
          >
            {f.number} · {f.lock!.minigame}
            {unlocked[f.id] ? '' : ' (locked)'}
          </button>
        ))}
      </Section>

      <Section title="Records (preview bypasses locks)">
        {FILES.map((f) => (
          <button key={f.id} className="btn" onClick={() => openFile(f.id, true)}>
            {f.number} {f.title}
          </button>
        ))}
      </Section>

      <Section title="Apps">
        {APPS.map((a) => (
          <button key={a.app} className="btn" onClick={() => open(a.app)}>
            {a.label}
          </button>
        ))}
      </Section>

      <Section title="Dialogs, toasts, timer">
        <button className="btn" onClick={() => askConfirm({ title: 'Confirm dialog', body: 'Sample confirmation with a danger action.', confirmLabel: 'Do it', danger: true, onConfirm: () => setOut('Confirmed.') })}>Confirm</button>
        <button className="btn" onClick={() => askConfirm({ title: 'Notice', body: 'Sample information notice.', confirmLabel: 'OK', info: true, onConfirm: () => {} })}>Notice</button>
        <button className="btn" onClick={() => pushToast({ title: 'Record recovered', body: 'Sample toast.' })}>Toast</button>
        <button className="btn" onClick={() => useTimer.getState().start(10)}>10s countdown</button>
        <button className="btn" onClick={() => useGame.setState((s) => ({ elapsed: s.elapsed + 60 }))}>+1 min case time</button>
      </Section>

      <Section title="End game scenarios">
        <table className="tl__table">
          <tbody>
            {scenarios.length === 0 && (
              <tr>
                <td>No scenarios loaded (needs server/private/case-private.json).</td>
              </tr>
            )}
            {scenarios.map((s) => (
              <tr key={s.label}>
                <td>
                  <strong>{s.label}</strong>
                  <span>{s.note}</span>
                </td>
                <td>
                  <button className="btn" onClick={() => fill(s)}>Fill form</button>
                  <button className="btn" onClick={() => probe(s)}>Probe API</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <pre className="tl__out" aria-live="polite">{out}</pre>
    </div>
  )
}
