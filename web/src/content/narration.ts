import type { ChatMessage, Email, FileDoc } from './types'

// Only characters are voiced: chat messages, interview statements, and emails written by one of them. Case documents,
// reports and logs are never read aloud. Each piece of speech is a segment with a speaker; the server maps the speaker to
// that character's ElevenLabs voice (server/voices.json).

export interface Segment {
  speaker: string // key into server/voices.json
  name: string // shown while the line is playing
  text: string
}

const SPEAKER_NAMES: Record<string, string> = {
  mw: 'Margaret Wood',
  nb: 'Noah Brown',
  aw: 'Arthur Wilson',
  bm: 'Bryant Moreland',
  ow: 'Olivia Walker',
  lj: 'Lily Johnson',
  supervisor: 'Supervisor',
  friend: 'Friend',
}

// Chat logs use first names ("Lily"), statements and emails use full names. Unknown people are not voiced.
export function speakerFor(name: string): string | null {
  const n = name.trim().toLowerCase()
  const first = n.split(/\s+/)[0]
  for (const [id, full] of Object.entries(SPEAKER_NAMES)) {
    const f = full.toLowerCase()
    if (n === f || first === f.split(/\s+/)[0]) return id
  }
  return null
}

const sentence = (t: string) => (/[.!?…]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)

function segment(name: string, text: string): Segment | null {
  const speaker = speakerFor(name)
  return speaker && text.trim() ? { speaker, name: SPEAKER_NAMES[speaker], text: text.trim() } : null
}

// One segment per message, so the thread can highlight the line being spoken (index matches the message index).
export function chatSegments(msgs: ChatMessage[]): Segment[] {
  return msgs.map((m) => segment(m.from, m.text) ?? { speaker: '', name: m.from, text: '' })
}

// An email is read in its sender's voice, but only when the sender is one of the characters.
export function emailSegments(e: Email): Segment[] {
  const s = segment(e.from, e.body.map(sentence).join(' '))
  return s ? [s] : []
}

// Interview statements, each in its speaker's voice. Anything else in a document (headings, notes) is skipped.
export function interviewSegments(doc: FileDoc): Segment[] {
  return doc.blocks.flatMap((b) => (b.t === 'statement' ? [segment(b.who, b.lines.map(sentence).join(' '))] : [])).filter((s): s is Segment => !!s)
}
