import { useState } from 'react'
import { DocView, EmailView, MessageThread } from '../components/content'
import { EMAILS, FILES, MESSAGE_THREADS, SUSPECTS, SUSPECT_PHOTOS } from '../content/case'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { getDoc, openFile } from './files'

export function DocWindow({ fileId }: { fileId: FileId }) {
  useGame((s) => s.unlocked[fileId]) // re-render once an unlock lands
  const doc = getDoc(fileId)
  if (!doc) return <div className="empty">This record is restricted.</div>
  return (
    <div className="viewer">
      <div className="viewer__bar">
        <span className="file__id file__id--sm">{doc.id}</span>
        <strong>{doc.heading}</strong>
        <span className="viewer__muted">Evidence {doc.id} of 06 · read-only</span>
      </div>
      <div className="viewer__scroll">
        <DocView doc={doc} />
      </div>
    </div>
  )
}

export function MailApp() {
  const [sel, setSel] = useState(EMAILS[0].id)
  const email = EMAILS.find((e) => e.id === sel)!
  return (
    <div className="mail">
      <nav className="mail__folders">
        <div className="mail__folder mail__folder--on">Inbox ({EMAILS.length})</div>
        <div className="mail__folder">Sent Items</div>
        <div className="mail__folder">Deleted Items</div>
        <div className="mail__note">Source: Evidence 03</div>
      </nav>
      <ul className="mail__list">
        {EMAILS.map((e) => (
          <li key={e.id}>
            <button className={`mail__row ${sel === e.id ? 'mail__row--on' : ''}`} onClick={() => setSel(e.id)}>
              <span className="mail__from">{e.from}</span>
              <span className="mail__subj">{e.subject}</span>
              <span className="mail__date">{e.sent}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mail__read" key={email.id}>
        <EmailView email={email} />
      </div>
    </div>
  )
}

export function MessagesApp() {
  const [sel, setSel] = useState(MESSAGE_THREADS[0].id)
  const thread = MESSAGE_THREADS.find((t) => t.id === sel)!
  return (
    <div className="im">
      <ul className="im__contacts">
        <li className="im__head">Recovered conversations</li>
        {MESSAGE_THREADS.map((t) => (
          <li key={t.id}>
            <button className={`im__contact ${sel === t.id ? 'im__contact--on' : ''}`} onClick={() => setSel(t.id)}>
              <span className="im__dot" />
              {t.with}
            </button>
          </li>
        ))}
        <li className="im__note">Source: Evidence 02</li>
      </ul>
      <div className="im__chat">
        <div className="im__chathead">{thread.title}</div>
        <div className="im__scroll" key={thread.id}>
          <MessageThread msgs={thread.msgs} />
        </div>
        <div className="im__compose">
          <input className="field" disabled placeholder="Read-only evidence log" />
        </div>
      </div>
    </div>
  )
}

export function NotesApp() {
  const notes = useGame((s) => s.notes)
  const setNotes = useGame((s) => s.setNotes)
  return (
    <div className="notes">
      <div className="notes__bar">Notebook · saved automatically</div>
      <textarea
        className="notes__pad"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write down times, contradictions and references as you find them…"
        aria-label="Notebook"
      />
    </div>
  )
}

export function BoardApp() {
  const suspectNotes = useGame((s) => s.suspectNotes)
  const setSuspectNote = useGame((s) => s.setSuspectNote)
  return (
    <div className="board">
      <div className="board__grid">
        {SUSPECTS.map((s, i) => (
          <article key={s.id} className="card" style={{ rotate: `${[-1.5, 1, -0.5, 1.5, -1, 0.5][i]}deg` }}>
            <span className="card__pin" />
            <img className="card__dossier" src={SUSPECT_PHOTOS[s.id]} alt={`${s.name}, ${s.age}, ${s.occupation}. ${s.background}`} draggable={false} />
            <textarea
              className="card__note"
              value={suspectNotes[s.id] ?? ''}
              onChange={(e) => setSuspectNote(s.id, e.target.value)}
              placeholder="Your notes…"
              aria-label={`Notes on ${s.name}`}
            />
          </article>
        ))}
      </div>
    </div>
  )
}

export function ReportApp() {
  const unlocked = useGame((s) => s.unlocked)
  const count = FILES.filter((f) => !f.lock || unlocked[f.id]).length
  const ready = count === FILES.length
  return (
    <div className="report">
      <h2>Investigation report</h2>
      <p className="report__lead">Name the culprit and support your theory with evidence. Recovering every record does not close the case; you decide when you are ready.</p>
      <ul className="report__checklist">
        {FILES.map((f) => {
          const ok = !f.lock || !!unlocked[f.id]
          return (
            <li key={f.id}>
              <button className={`report__item ${ok ? 'report__item--ok' : ''}`} onClick={() => openFile(f.id)}>
                <span className="report__id">{f.id}</span>
                <span className="report__name">{f.title}</span>
                <span className={`chip ${ok ? 'chip--new' : 'chip--restricted'}`}>{ok ? 'Recovered' : 'Restricted'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={count} aria-label="Records recovered">
        <div className="progress__fill" style={{ width: `${(count / 6) * 100}%` }} />
      </div>
      <div className="report__foot">
        <span className="uac__muted">{ready ? 'All records recovered. Ready when you are.' : `${count} of 6 records recovered. Recover the rest to begin your report.`}</span>
        <button className="btn btn--primary" disabled={!ready}>
          Begin report
        </button>
      </div>
    </div>
  )
}
