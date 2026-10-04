// Dev implementation of POST /api/narrate (contract: docs/api.md): a thin ElevenLabs text-to-speech proxy.
// The API key stays on the server (repo-root .env). The Python backend ports this.
import { createHash } from 'node:crypto'

export interface NarrateContext {
  env: Record<string, string | undefined>
  ip: string
  fetchImpl?: typeof fetch
}

export const MAX_NARRATION_CHARS = 2500
const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'
const cache = new Map<string, Buffer>()
const hits = new Map<string, number[]>()

export function narrationConfigured(env: NarrateContext['env']) {
  const key = env.ELEVEN_LABS_API_KEY
  return !!key && !key.startsWith('insert_')
}

export function narrationVoice(env: NarrateContext['env']) {
  return env.ELEVEN_LABS_VOICE_ID || DEFAULT_VOICE
}

type Result = { status: number; audio?: Buffer; error?: string }

export async function handleNarrate(body: { text?: string }, ctx: NarrateContext): Promise<Result> {
  if (!narrationConfigured(ctx.env)) return { status: 503, error: 'Narration is not configured on this server.' }

  const now = Date.now()
  const recent = (hits.get(ctx.ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ctx.ip, recent)
  if (recent.length > 20) return { status: 429, error: 'Too many narration requests. Wait a moment.' }

  const text = String(body.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return { status: 400, error: 'Nothing to narrate.' }
  if (text.length > MAX_NARRATION_CHARS) return { status: 413, error: `Text is too long (max ${MAX_NARRATION_CHARS} characters).` }

  const voice = narrationVoice(ctx.env)
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
      console.warn(`[narrate] ElevenLabs returned HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
      return { status: 502, error: 'The narrator is unavailable right now.' }
    }
    const audio = Buffer.from(await res.arrayBuffer())
    cache.set(key, audio)
    return { status: 200, audio }
  } catch (err) {
    console.warn(`[narrate] ElevenLabs call failed: ${err instanceof Error ? err.message : String(err)}`)
    return { status: 502, error: 'The narrator is unavailable right now.' }
  }
}
