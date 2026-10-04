import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { ShieldIcon } from '../shell/Icons'
import { HackGrid } from '../minigames/HackGrid'
import { GemSpecimen } from '../minigames/Magnifier'
import { PinPad } from '../minigames/PinPad'
import { useUnlock } from '../minigames/useUnlock'

// Lock prompt (permission-dialog style). The file's minigame skin produces the answer; a plain
// text field is always one click away so a broken minigame never blocks progress.
export function LockDialog({ fileId }: { fileId: FileId }) {
  const u = useUnlock(fileId)
  const { entry, success } = u
  const lock = entry.lock!
  const [typed, setTyped] = useState(false)
  const skin = typed ? 'text' : lock.minigame

  return (
    <div className={`uac-scrim ${u.leaving ? 'uac-scrim--out' : ''}`} onPointerDown={() => !success && u.cancel()}>
      <div
        className={`uac ${skin === 'hack' || skin === 'magnifier' ? 'uac--wide' : ''} ${u.shake ? 'uac--shake' : ''} ${success ? 'uac--ok' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="uac__bar">{skin === 'hack' ? 'Archive Intrusion' : 'Restricted Archive'}</div>
        <div className="uac__head">
          {success ? <span className="uac__check">✓</span> : <ShieldIcon />}
          <div>
            <div className="uac__title">{success ? 'Access granted' : 'This record requires an access reference'}</div>
            <div className="uac__file">
              {entry.id} - {entry.title}
            </div>
          </div>
        </div>
        <div className="uac__body">
          <div>{lock.prompt}</div>
          {skin === 'pin' && <PinPad onSubmit={u.submit} disabled={u.busy || success} />}
          {skin === 'hack' && <HackGrid onSubmit={u.submit} disabled={u.busy || success} />}
          {skin === 'magnifier' && <MagnifierLock submit={u.submit} disabled={u.busy || success} />}
          {skin === 'text' && <TextLock numeric={lock.type === 'numeric'} submit={u.submit} disabled={u.busy || success} />}
          {u.error && <div className="uac__error">{u.error}</div>}
          {u.hints.length > 0 && (
            <div className="uac__hints">
              <strong>Investigator hints</strong>
              <ol>
                {u.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="uac__foot">
          <span className="uac__muted">
            Attempts: {u.attempts} · no lockout
            {lock.minigame !== 'magnifier' && (
              <>
                {' · '}
                <button type="button" className="linkbtn" onClick={() => setTyped(!typed)}>
                  {typed ? 'Back to interface' : 'Type the reference instead'}
                </button>
              </>
            )}
          </span>
          {success || u.busy ? <span className="uac__status">{success ? 'Opening…' : 'Checking…'}</span> : null}
          <button type="button" className="btn" onClick={u.cancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function TextLock({ numeric, submit, disabled }: { numeric: boolean; submit: (a: string) => Promise<boolean>; disabled: boolean }) {
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!(await submit(answer))) {
      setAnswer('')
      inputRef.current?.focus()
    }
  }

  return (
    <form className="textlock" onSubmit={onSubmit}>
      <input
        ref={inputRef}
        className="field"
        aria-label="Access reference"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        inputMode={numeric ? 'numeric' : 'text'}
        maxLength={numeric ? 4 : 32}
        autoComplete="off"
        spellCheck={false}
        placeholder={numeric ? '0000' : 'Reference'}
      />
      <button type="submit" className="btn btn--primary" disabled={disabled || !answer.trim()}>
        Continue
      </button>
    </form>
  )
}

// File 06: inspect the stone photographed in file 05, then enter the digits.
function MagnifierLock({ submit, disabled }: { submit: (a: string) => Promise<boolean>; disabled: boolean }) {
  const report = useGame((s) => s.unlocked['05'])
  const plate = report?.blocks.find((b) => b.t === 'specimen')

  return (
    <div className="maglock">
      {plate ? (
        <GemSpecimen engraving={plate.engraving} caption="Plate 05-A from the Gem Examination Report. Drag the lens along the girdle." />
      ) : (
        <div className="maglock__missing">
          No examination plate loaded. Recover <strong>05 - Gem Examination Report</strong> first; the reference is recorded there.
        </div>
      )}
      <TextLock numeric submit={submit} disabled={disabled} />
    </div>
  )
}
