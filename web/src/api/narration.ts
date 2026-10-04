import { apiRequest } from './http'

// Server narration (ElevenLabs via POST /api/narrate). Audio is cached in memory so replays cost nothing.
const cache = new Map<string, string>()

export const MAX_NARRATION_CHARS = 2500

async function hash(text: string) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function fetchNarration(text: string, signal?: AbortSignal): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const key = await hash(text)
  const hit = cache.get(key)
  if (hit) return { ok: true, url: hit }
  const res = await apiRequest<Blob>('/api/narrate', { body: { text }, as: 'blob', timeoutMs: 30_000, signal })
  if (!res.ok) return { ok: false, error: res.error }
  const url = URL.createObjectURL(res.data)
  cache.set(key, url)
  return { ok: true, url }
}
