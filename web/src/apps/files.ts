import { FILES, OPEN_DOCS } from '../content/case'
import type { FileDoc, FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'

export function getDoc(id: FileId): FileDoc | undefined {
  if (id === '01' || id === '02') return OPEN_DOCS[id]
  return useGame.getState().unlocked[id]
}

export function isLocked(id: FileId) {
  return !!FILES.find((f) => f.id === id)?.lock && !getDoc(id)
}

// Open a case file: shows the lock prompt if it is still restricted, otherwise the viewer.
export function openFile(id: FileId, preview = false) {
  const entry = FILES.find((f) => f.id === id)!
  if (!preview && isLocked(id)) {
    useWindows.getState().showLock(id)
    return
  }
  if (!preview) useGame.getState().markOpened(id)
  useWindows.getState().open('doc', { fileId: id, preview, title: `${entry.number} - ${entry.title}${preview ? ' (Test preview)' : ''}` })
}
