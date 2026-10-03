import { useEffect, useRef, useState, type FormEvent } from 'react'
import { unlockFile } from '../api/client'
import { FILES } from '../content/case'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'
import { ShieldIcon } from '../shell/Icons'
import { openFile } from './files'

// Generic lock prompt (permission-dialog style). Minigame skins in phase 4 wrap this same flow.
export function LockDialog({ fileId }: { fileId: FileId }) {
  const entry = FILES.find((f) => f.id === fileId)!
  const showLock = useWindows((s) => s.showLock)
  const { attempts, hints, recordMiss, recordUnlock } = useGame()
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const myHints = hints[fileId] ?? []

  useEffect(() => inputRef.current?.focus(), [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || busy) return
    setBusy(true)
    setError('')
    const res = await unlockFile(fileId, answer, (attempts[fileId] ?? 0) + 1)
    setBusy(false)
    if (res.ok) {
      recordUnlock(fileId, res.file)
      showLock(null)
      openFile(fileId)
    } else if ('error' in res) {
      setError(res.error)
    } else {
      recordMiss(fileId, res.hints)
      setError('Access denied. The reference was not recognised.')
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setAnswer('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="uac-scrim" onPointerDown={() => showLock(null)}>
      <form className={`uac ${shake ? 'uac--shake' : ''}`} onPointerDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="uac__bar">Restricted Archive</div>
        <div className="uac__head">
          <ShieldIcon />
          <div>
            <div className="uac__title">This record requires an access reference</div>
            <div className="uac__file">
              {entry.id} - {entry.title}
            </div>
          </div>
        </div>
        <div className="uac__body">
          <label htmlFor="uac-input">{entry.lock?.prompt}</label>
          <input
            id="uac-input"
            ref={inputRef}
            className="field"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            inputMode={entry.lock?.type === 'numeric' ? 'numeric' : 'text'}
            maxLength={entry.lock?.type === 'numeric' ? 4 : 32}
            autoComplete="off"
            spellCheck={false}
            placeholder={entry.lock?.type === 'numeric' ? '0000' : 'Reference'}
          />
          {error && <div className="uac__error">{error}</div>}
          {myHints.length > 0 && (
            <div className="uac__hints">
              <strong>Investigator hints</strong>
              <ol>
                {myHints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="uac__foot">
          <span className="uac__muted">Attempts: {attempts[fileId] ?? 0} · no lockout</span>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <button type="button" className="btn" onClick={() => showLock(null)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
