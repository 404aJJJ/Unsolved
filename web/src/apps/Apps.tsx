import { useEffect, useState } from 'react'
import { getNotes, saveNotes } from '../api/client'
import { NarrateButton } from '../components/NarrateButton'
import { useAutoNarrate } from '../components/useAutoNarrate'
import { EmailView, MessageThread } from '../components/content'
import { EMAILS, FILES, MESSAGE_THREADS, SUSPECTS, SUSPECT_PHOTOS } from '../content/case'
import { CASE_IMAGES } from '../content/caseImages'
import { chatScript, docScript, emailScript } from '../content/narration'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { getDoc } from './files'

export function DocWindow({ fileId, preview: wantPreview = false }: { fileId: FileId; preview?: boolean }) {
  const preview = import.meta.env.DEV && wantPreview // dev-server only: a preview ignores the lock
  useGame((s) => s.unlocked[fileId]) // re-render once an unlock lands
  const doc = getDoc(fileId)
  useAutoNarrate(`doc-${fileId}`, doc ? docScript(doc) : '')
  if (!doc && !preview) return <div className="empty">This record is restricted.</div>
  const image = CASE_IMAGES[fileId]
  const entry = FILES.find((f) => f.id === fileId)!
  return (
    <div className="viewer">
      <div className="viewer__bar">
        <span className="file__id file__id--sm">{entry.number}</span>
        <strong>{image.title}</strong>
        {doc && <NarrateButton id={`doc-${fileId}`} text={docScript(doc)} />}
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
  useAutoNarrate(email ? `mail-${email.id}` : 'mail', email ? emailScript(email) : '')
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
        {email && (
          <>
            <div className="mail__tools">
              <NarrateButton id={`mail-${email.id}`} text={emailScript(email)} />
            </div>
            <EmailView email={email} />
          </>
        )}
      </div>
    </div>
  )
}

export function MessagesApp() {
  const [sel, setSel] = useState(MESSAGE_THREADS[0].id)
  const thread = MESSAGE_THREADS.find((t) => t.id === sel)!
  useAutoNarrate(`chat-${thread.id}`, chatScript(thread.title, thread.msgs))
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
        <div className="im__chathead">
          {thread.title}
          <NarrateButton id={`chat-${thread.id}`} text={chatScript(thread.title, thread.msgs)} />
        </div>
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
