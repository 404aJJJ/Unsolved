import { useEffect } from 'react'
import { useWindows } from '../store/windows'
import { InfoIcon, ShieldIcon } from './Icons'

// In-site replacement for window.confirm(), styled like the lock dialog.
export function ConfirmDialog() {
  const req = useWindows((s) => s.confirm)
  const askConfirm = useWindows((s) => s.askConfirm)

  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && askConfirm(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req, askConfirm])

  if (!req) return null
  return (
    <div className="uac-scrim" onPointerDown={() => askConfirm(null)}>
      <div className="uac uac--small" role="alertdialog" aria-labelledby="dlg-title" onPointerDown={(e) => e.stopPropagation()}>
        <div className="uac__bar">Unsolved.exe</div>
        <div className="uac__head">
          {req.info ? <InfoIcon /> : <ShieldIcon />}
          <div>
            <div className="uac__title" id="dlg-title">
              {req.title}
            </div>
          </div>
        </div>
        <div className="uac__body">
          <p className="uac__text">{req.body}</p>
        </div>
        <div className="uac__foot">
          <span className="uac__muted" />
          <button
            type="button"
            className={`btn ${req.danger ? 'btn--danger' : 'btn--primary'}`}
            autoFocus
            onClick={() => {
              askConfirm(null)
              req.onConfirm()
            }}
          >
            {req.confirmLabel}
          </button>
          {!req.info && (
            <button type="button" className="btn" onClick={() => askConfirm(null)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
