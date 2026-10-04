import { useEffect, useState } from 'react'
import { getNotes, saveNotes } from '../api/client'
import { EmailView, MessageThread } from '../components/content'
import { EMAILS, FILES, MESSAGE_THREADS, SUSPECTS, SUSPECT_PHOTOS } from '../content/case'
import { CASE_IMAGES } from '../content/caseImages'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { getDoc, openFile } from './files'

export function DocWindow({ fileId, preview = false }: { fileId: FileId; preview?: boolean }) {
  useGame((s) => s.unlocked[fileId]) // re-render once an unlock lands
  const doc = getDoc(fileId)
  if (!doc && !preview) return <div className="empty">This record is restricted.</div>
  const image = CASE_IMAGES[fileId]
  const entry = FILES.find((f) => f.id === fileId)!
  return (
    <div className="viewer">
      <div className="viewer__bar">
        <span className="file__id file__id--sm">{entry.number}</span>
        <strong>{image.title}</strong>
        <span className="viewer__muted">Evidence {entry.number} of {String(FILES.length).padStart(2, '0')} · {preview ? 'test preview' : 'read-only'}</span>
      </div>
      <div className="viewer__scroll">
        <img className={`viewer__scan${image.trimRightEdge ? ' viewer__scan--paper' : ''}`} src={preview ? `${image.src}?preview=true` : image.src} alt={`${image.title} — Case PB-062 evidence document`} draggable={false} />
      </div>
    </div>
  )
}

export function MailApp() {
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'deleted'>('inbox')
  const [sel, setSel] = useState(EMAILS[0].id)
  const inbox = EMAILS.filter((e) => e.id !== 'e3')
  const deleted = EMAILS.filter((e) => e.id === 'e3')
  const emails = folder === 'inbox' ? inbox : folder === 'deleted' ? deleted : []
  const email = emails.find((e) => e.id === sel) ?? emails[0]
  return (
    <div className="mail">
      <nav className="mail__folders">
        {([{ id: 'inbox', label: `Inbox (${inbox.length})` }, { id: 'sent', label: 'Sent Items' }, { id: 'deleted', label: 'Deleted Items' }] as const).map((f) => (
          <button key={f.id} className={`mail__folder ${folder === f.id ? 'mail__folder--on' : ''}`} aria-pressed={folder === f.id} onClick={() => { setFolder(f.id); setSel('') }}>
            {f.label}
          </button>
        ))}
      </nav>
      <ul className="mail__list">
        {emails.length === 0 && <li className="mail__empty">Nothing to see here...</li>}
        {emails.map((e) => (
          <li key={e.id}>
            <button className={`mail__row ${email?.id === e.id ? 'mail__row--on' : ''}`} onClick={() => setSel(e.id)}>
              <span className="mail__from">{e.from}</span>
              <span className="mail__subj">{e.subject}</span>
              <span className="mail__date">{e.sent}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mail__read" key={email?.id ?? folder}>
        {email && <EmailView email={email} />}
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
        <li className="im__note">Source: Interviews</li>
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedText, setSavedText] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    getNotes().then((text) => {
      if (!active) return
      // On the first save, keep any notebook text already in browser storage.
      if (text !== null) setNotes(text)
      setSavedText(text)
      setLoading(false)
    }).catch(() => {
      if (!active) return
      setLoading(false)
      setError('Could not load your notebook. Your local text is kept. Check the Python server and retry.')
    })
    return () => { active = false }
  }, [reload, setNotes])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await saveNotes(notes)
      setSavedText(notes)
    } catch {
      setError('Could not save. Your text is still here; check the Python server and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="notes">
      <textarea
        className="notes__pad"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write down times, contradictions and references as you find them…"
        aria-label="Notebook"
        disabled={loading || saving}
        maxLength={100000}
      />
      {error && <div className="notes__error" role="alert">
        <span>{error}</span>
        <button className="btn" onClick={() => { setLoading(true); setError(''); setReload((n) => n + 1) }}>Retry loading</button>
      </div>}
      <div className="notes__bar">
        <span role="status">{loading ? 'Loading…' : saving ? 'Saving…' : savedText === notes ? 'Saved' : 'Unsaved changes'}</span>
        <button className="btn btn--primary" onClick={save} disabled={loading || saving || savedText === notes}>Save notes</button>
      </div>
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
        <span className="uac__muted">{ready ? 'All records recovered. Ready when you are.' : `${count} of ${FILES.length} records recovered. Recover the rest to begin your report.`}</span>
        <button className="btn btn--primary" disabled={!ready}>
          Begin report
        </button>
      </div>
    </div>
  )
}
