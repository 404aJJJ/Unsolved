import type { FileDoc, FileId } from '../content/types'

const BASE = import.meta.env.VITE_API_URL ?? ''

export type UnlockResult = { ok: true; file: FileDoc } | { ok: false; hints: string[] } | { ok: false; error: string }

export async function unlockFile(fileId: FileId, answer: string, attempt: number): Promise<UnlockResult> {
  try {
    const res = await fetch(`${BASE}/api/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, answer, attempt }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? `Server error ${res.status}` }
    return data
  } catch {
    return { ok: false, error: 'Cannot reach the investigation server.' }
  }
}
