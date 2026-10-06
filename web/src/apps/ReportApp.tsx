import { useState } from 'react'
import { devFiles } from '../api/client'
import { FILES, SUSPECTS } from '../content/case'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'
import { formatElapsed } from '../shell/caseTime'
import { openFile } from './files'
import { fileReport } from './fileReport'
import { useSession } from '../store/session'

const MAX_RECORDS = 3

export function ReportApp() {
  const unlocked = useGame((s) => s.unlocked)
  const result = useGame((s) => s.result)
  const started = useGame((s) => s.reportStarted)
  const setStarted = useGame((s) => s.setReportStarted)
  const count = FILES.filter((f) => !f.lock || unlocked[f.id]).length

  if (result) return <Result r={result} />
  if (started) return <Form />
  return <Intro count={count} onBegin={() => setStarted(true)} />
}

function Intro({ count, onBegin }: { count: number; onBegin: () => void }) {
  const unlocked = useGame((s) => s.unlocked)
  const recordUnlock = useGame((s) => s.recordUnlock)
  const pushToast = useWindows((s) => s.pushToast)

  const loadAll = async () => {
    const files = await devFiles()
    if (!files) return pushToast({ title: 'Dev records unavailable', body: 'Run the dev server with server/private/case-private.json.' })
    for (const [id, doc] of Object.entries(files)) recordUnlock(id as FileId, doc!)
  }

  return (
    <div className="report">
      <h2>Investigation report</h2>
      <p className="report__lead">Name who you believe took the diamond and cite the records that support it. You can file a report at any time, but you can only cite records you have recovered.</p>
      <ul className="report__checklist">
        {FILES.map((f) => {
          const ok = !f.lock || !!unlocked[f.id]
          return (
            <li key={f.id}>
              <button className={`report__item ${ok ? 'report__item--ok' : ''}`} onClick={() => openFile(f.id)}>
                <span className="report__id">{f.number}</span>
                <span className="report__name">{f.title}</span>
                <span className={`chip ${ok ? 'chip--new' : 'chip--restricted'}`}>{ok ? 'Recovered' : 'Restricted'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={FILES.length} aria-valuenow={count} aria-label="Records recovered">
        <div className="progress__fill" style={{ width: `${(count / FILES.length) * 100}%` }} />
      </div>
      <div className="report__foot">
        <span className="uac__muted">{`${count} of ${FILES.length} records recovered.`}</span>
        {import.meta.env.DEV && count < FILES.length && (
          <button className="btn" onClick={loadAll} title="Dev server only">
            Dev: load all records
          </button>
        )}
        <button className="btn btn--primary" onClick={onBegin}>
          Begin report
        </button>
      </div>
    </div>
  )
}

function Form() {
  const draft = useGame((s) => s.draft)
  const setDraft = useGame((s) => s.setDraft)
  const timeUp = useGame((s) => s.timeUp)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // When time has run out the report may be filed as it stands.
  const complete = timeUp || (!!draft.culprit && draft.evidence.length > 0)
  const unlocked = useGame((s) => s.unlocked)
  const recovered = (id: string) => !FILES.find((f) => f.id === id)?.lock || !!unlocked[id as FileId]

  const askConfirm = useWindows((s) => s.askConfirm)

  const file = async () => {
    setBusy(true)
    setError('')
    const res = await fileReport(timeUp)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  // The report is final, so ask first.
  const submit = () => {
    if (!complete || busy) return
    if (timeUp) return void file()
    askConfirm({
      title: 'File your final report?',
      body: 'This closes the case. You will see whether you were right and how it really happened.',
      confirmLabel: 'File report',
      onConfirm: file,
    })
  }

  return (
    <div className="report report--form">
      <h2>Submit report</h2>
      {timeUp && <p className="rnudge">Time is up. File your report with what you have.</p>}

      <section className="rsec">
        <h3>1. Who took the diamond?</h3>
        <div className="suspects" role="radiogroup" aria-label="Culprit">
          {SUSPECTS.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={draft.culprit === s.id}
              className={`suspect ${draft.culprit === s.id ? 'suspect--on' : ''}`}
              onClick={() => setDraft({ culprit: s.id })}
            >
              <strong>{s.name}</strong>
              <span>{s.occupation}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rsec">
        <h3>2. Cite your evidence</h3>
        <p className="rhelp">Choose up to {MAX_RECORDS} records that make your case. Only recovered records can be cited.</p>
        <div className="records">
          {FILES.map((f) => {
            const on = draft.evidence.includes(f.id)
            const ok = recovered(f.id)
            const full = !on && draft.evidence.length >= MAX_RECORDS
            return (
              <label key={f.id} className={`record ${on ? 'record--on' : ''} ${!ok || full ? 'record--off' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!ok || full}
                  onChange={() => setDraft({ evidence: on ? draft.evidence.filter((x) => x !== f.id) : [...draft.evidence, f.id] })}
                />
                <span className="report__id">{f.number}</span>
                <span className="report__name">{f.title}</span>
                {!ok && <span className="chip chip--restricted">Restricted</span>}
              </label>
            )
          })}
        </div>
      </section>

      {error && <p className="uac__error">{error}</p>}
      <div className="report__foot">
        <span className="uac__muted">
          Filing a report closes the case. You will see how it really happened, right or wrong.
        </span>
        <button className="btn btn--primary" disabled={!complete || busy} onClick={submit}>
          {busy ? 'Filing…' : 'File report'}
        </button>
      </div>
    </div>
  )
}

const BANNER: Record<string, { title: string; tone: string }> = {
  solved: { title: 'Case solved', tone: 'ok' },
  partial: { title: 'Right suspect, thin case', tone: 'warn' },
  incorrect: { title: 'Wrong suspect', tone: 'bad' },
}

function Result({ r }: { r: NonNullable<ReturnType<typeof useGame.getState>['result']> }) {
  const askConfirm = useWindows((s) => s.askConfirm)
  const reset = useGame((s) => s.reset)
  const banner = r.timedOut && r.verdict !== 'solved' ? { title: "Time's up", tone: BANNER[r.verdict].tone } : BANNER[r.verdict]
  const name = (id: string) => SUSPECTS.find((s) => s.id === id)?.name ?? (id ? id : 'no one')
  const title = (id: string) => FILES.find((f) => f.id === id)
  return (
    <div className="report report--result">
      <div className={`verdict verdict--${banner.tone}`}>
        <div>
          <div className="verdict__rating">{banner.title}</div>
          <div className="verdict__meta">
            {r.timedOut ? (r.rating === 'Out of time' ? 'The 30 minutes ran out' : `${r.rating} · the 30 minutes ran out`) : `${r.rating} · closed in ${formatElapsed(r.elapsed)}`}
          </div>
        </div>
      </div>

      <h3>Your report</h3>
      <p className="rtheory-result">
        You accused <strong>{name(r.accused)}</strong>
        {r.cited.length > 0 && (
          <>
            {' '}
            and cited {r.cited.map((id) => title(id)?.title ?? id).join(', ')}
          </>
        )}
        .
        {r.verdict === 'incorrect' && (
          <>
            {' '}
            The culprit was <strong>{name(r.culprit)}</strong>.
          </>
        )}
      </p>

      <h3>How it really happened</h3>
      <ol className="chain">
        {r.explanation.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>

      <div className="report__foot">
        <span className="uac__muted" />
        <button
          className="btn"
          onClick={() =>
            askConfirm({
              title: 'Start a new investigation?',
              body: 'This clears your records, notes and case time, and returns to the log-on screen where you pick the mode.',
              confirmLabel: 'Restart case',
              danger: true,
              onConfirm: () => {
                reset()
                useWindows.getState().closeAll()
                useSession.getState().logOff()
              },
            })
          }
        >
          Play again
        </button>
      </div>
    </div>
  )
}
