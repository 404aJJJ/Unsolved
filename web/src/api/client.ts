import type { FileDoc, FileId } from '../content/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export async function getNotes(): Promise<string | null> {
  const res = await fetch(`${BASE}/api/notes`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load your notebook.')
  return (await res.json()).text
}

export async function saveNotes(text: string): Promise<void> {
  const res = await fetch(`${BASE}/api/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error('Could not save your notebook.')
}

export async function getProgress(): Promise<Partial<Record<FileId, FileDoc>>> {
  const res = await fetch(`${BASE}/api/progress`, { signal: AbortSignal.timeout(10000), cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load saved progress.')
  return (await res.json()).unlocked
}

export async function resetProgress(): Promise<void> {
  const res = await fetch(`${BASE}/api/progress/reset`, { method: 'POST', signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('Could not restart the case.')
}

export type UnlockResult = { ok: true; file: FileDoc } | { ok: false; hints: string[] } | { ok: false; error: string }

export async function unlockFile(fileId: FileId, answer: string, attempt: number): Promise<UnlockResult> {
  try {
    const res = await fetch(`${BASE}/api/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, answer, attempt }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? `Server error ${res.status}` }
    return data
  } catch {
    return { ok: false, error: 'Cannot reach the investigation server.' }
  }
}
