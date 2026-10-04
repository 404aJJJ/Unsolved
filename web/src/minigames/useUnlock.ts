import { useState } from 'react'
import { unlockFile } from '../api/client'
import { FILES } from '../content/case'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'
import { openFile } from '../apps/files'

// Shared unlock flow behind every lock skin: server check, hint ladder, success hand-off.
// Skins only decide how the answer is produced; they never know what it is.
export function useUnlock(fileId: FileId) {
  const entry = FILES.find((f) => f.id === fileId)!
  const { showLock, pushToast, flashUnlocked } = useWindows()
  const { attempts, hints, recordMiss, recordUnlock } = useGame()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Resolves true on success, false on a wrong answer or server error.
  const submit = async (answer: string): Promise<boolean> => {
    if (!answer.trim() || busy || success) return false
    setBusy(true)
    setError('')
    const res = await unlockFile(fileId, answer, (attempts[fileId] ?? 0) + 1)
    setBusy(false)
    if (res.ok) {
      setSuccess(true)
      setTimeout(() => setLeaving(true), 700)
      setTimeout(() => {
        recordUnlock(fileId, res.file)
        flashUnlocked(fileId)
        showLock(null)
        openFile(fileId)
        pushToast({ title: 'Record recovered', body: `${entry.id} - ${entry.title} is now available.` })
      }, 950)
      return true
    }
    if ('error' in res) {
      setError(res.error)
      return false
    }
    recordMiss(fileId, res.hints)
    setError('Access denied. The reference was not recognised.')
    setShake(true)
    setTimeout(() => setShake(false), 400)
    return false
  }

  return {
    entry,
    submit,
    busy,
    error,
    shake,
    success,
    leaving,
    attempts: attempts[fileId] ?? 0,
    hints: hints[fileId] ?? [],
    cancel: () => showLock(null),
  }
}
