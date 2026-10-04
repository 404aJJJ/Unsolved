import { apiRequest } from './http'

// Server narration (ElevenLabs via POST /api/narrate), one voice per character. Audio is cached in memory so replays are free.
const cache = new Map<string, string>()

export const MAX_NARRATION_CHARS = 2500

export async function fetchNarration(text: string, speaker: string, signal?: AbortSignal): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const key = `${speaker}|${text}`
  const hit = cache.get(key)
  if (hit) return { ok: true, url: hit }
  const res = await apiRequest<Blob>('/api/narrate', { body: { speaker, text }, as: 'blob', timeoutMs: 30_000, signal })
  if (!res.ok) return { ok: false, error: res.error }
  const url = URL.createObjectURL(res.data)
  cache.set(key, url)
  return { ok: true, url }
}
