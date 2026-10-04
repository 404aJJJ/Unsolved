import { FILES, OPEN_DOCS } from '../content/case'
import type { FileDoc, FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'

export function getDoc(id: FileId): FileDoc | undefined {
  if (id === '01' || id === '02' || id === '03') return OPEN_DOCS[id]
  return useGame.getState().unlocked[id]
}

export function isLocked(id: FileId) {
  return !!FILES.find((f) => f.id === id)?.lock && !getDoc(id)
}

// Open a case file: shows the lock prompt if it is still restricted, otherwise the viewer.
export function openFile(id: FileId) {
  const entry = FILES.find((f) => f.id === id)!
  if (isLocked(id)) {
    useWindows.getState().showLock(id)
    return
  }
  useGame.getState().markOpened(id)
  useWindows.getState().open('doc', { fileId: id, title: `${id} - ${entry.title}` })
}
