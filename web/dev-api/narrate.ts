// Dev implementation of POST /api/narrate (contract: docs/api.md): an ElevenLabs text-to-speech proxy with one voice per
// character. The voice map is server/voices.json, shared with the Python server. The API key stays on the server.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface NarrateContext {
  env: Record<string, string | undefined>
  ip: string
  fetchImpl?: typeof fetch
}

export const MAX_NARRATION_CHARS = 2500
const VOICES_PATH = fileURLToPath(new URL('../../server/voices.json', import.meta.url))
const cache = new Map<string, Buffer>()
const hits = new Map<string, number[]>()

export function narrationConfigured(env: NarrateContext['env']) {
  const key = env.ELEVEN_LABS_API_KEY
  return !!key && !key.startsWith('insert_')
}

export function speakers(env: NarrateContext['env']): Record<string, { name: string; voice: string }> {
  const data = JSON.parse(readFileSync(VOICES_PATH, 'utf8')).speakers as Record<string, { name: string; voice: string }>
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { name: v.name, voice: env[`ELEVEN_LABS_VOICE_${k.toUpperCase()}`] || v.voice }]))
}

type Result = { status: number; audio?: Buffer; error?: string }

export async function handleNarrate(body: { speaker?: string; text?: string }, ctx: NarrateContext): Promise<Result> {
  const voices = speakers(ctx.env)
  const speaker = String(body.speaker ?? '')
  if (!Object.prototype.hasOwnProperty.call(voices, speaker)) return { status: 400, error: 'Unknown speaker.' }
  if (!narrationConfigured(ctx.env)) return { status: 503, error: 'Narration is not configured on this server.' }

  const now = Date.now()
  const recent = (hits.get(ctx.ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ctx.ip, recent)
  if (recent.length > 40) return { status: 429, error: 'Too many narration requests. Wait a moment.' }

  const text = String(body.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return { status: 400, error: 'Nothing to narrate.' }
  if (text.length > MAX_NARRATION_CHARS) return { status: 413, error: `Text is too long (max ${MAX_NARRATION_CHARS} characters).` }

  const voice = voices[speaker].voice
  const model = ctx.env.ELEVEN_LABS_MODEL || 'eleven_multilingual_v2'
  const key = createHash('sha256').update(`${voice}|${model}|${text}`).digest('hex')
  const cached = cache.get(key)
  if (cached) return { status: 200, audio: cached }

  try {
    const res = await (ctx.fetchImpl ?? fetch)(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': ctx.env.ELEVEN_LABS_API_KEY! },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({ text, model_id: model }),
    })
    if (!res.ok) {
      console.warn(`[narrate] ElevenLabs returned HTTP ${res.status} for ${speaker}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
      return { status: 502, error: 'The voice is unavailable right now.' }
    }
    const audio = Buffer.from(await res.arrayBuffer())
    cache.set(key, audio)
    return { status: 200, audio }
  } catch (err) {
    console.warn(`[narrate] ElevenLabs call failed: ${err instanceof Error ? err.message : String(err)}`)
    return { status: 502, error: 'The voice is unavailable right now.' }
  }
}

// Dev tool: what ElevenLabs reports for each configured voice (name, gender, accent), to check who sounds like whom.
export async function describeVoices(env: NarrateContext['env'], fetchImpl: typeof fetch = fetch) {
  return Promise.all(
    Object.entries(speakers(env)).map(async ([speaker, entry]) => {
      const row: Record<string, unknown> = { speaker, character: entry.name, voice: entry.voice }
      if (!narrationConfigured(env)) return { ...row, error: 'No ElevenLabs key set' }
      try {
        const res = await fetchImpl(`https://api.elevenlabs.io/v1/voices/${entry.voice}`, { headers: { 'xi-api-key': env.ELEVEN_LABS_API_KEY! }, signal: AbortSignal.timeout(15_000) })
        if (!res.ok) return { ...row, error: `ElevenLabs HTTP ${res.status} (is this voice added to the account?)` }
        const info = (await res.json()) as { name?: string; category?: string; description?: string; labels?: Record<string, string> }
        const l = info.labels ?? {}
        return { ...row, name: info.name, gender: l.gender, accent: l.accent, age: l.age, description: l.description ?? info.description, category: info.category }
      } catch (err) {
        return { ...row, error: err instanceof Error ? err.message : String(err) }
      }
    }),
  )
}
