import type { Block, ChatMessage, Email, FileDoc } from './types'

// Plain-text scripts for the narrator, built from the same content the player can already read.
// Add a builder here for any new content type, then drop a <NarrateButton> next to it.

const sentence = (t: string) => (/[.!?…]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`)

export function emailScript(e: Email): string {
  return [`Email from ${e.from} to ${e.to}, sent ${e.sent}.`, `Subject: ${e.subject}.`, ...e.body.map(sentence)].join(' ')
}

export function chatScript(title: string, msgs: ChatMessage[]): string {
  return [`${title}.`, ...msgs.map((m) => `${m.from}${m.time ? `, ${m.time}` : ''}: ${sentence(m.text)}`)].join(' ')
}

function blockScript(b: Block): string {
  switch (b.t) {
    case 'h':
      return sentence(b.text)
    case 'p':
    case 'note':
      return sentence(b.text)
    case 'rows':
      return b.rows.map((r) => `${r.k}: ${sentence(r.v)}`).join(' ')
    case 'statement':
      return [`Statement of ${b.who}${b.role ? `, ${b.role}` : ''}.`, ...b.lines.map(sentence)].join(' ')
    case 'chat':
      return chatScript(b.title, b.msgs)
    case 'email':
      return emailScript(b.email)
    case 'specimen':
      return sentence(b.caption)
  }
}

export function docScript(doc: FileDoc): string {
  return [`${doc.heading}.`, ...doc.sub.map(sentence), ...doc.blocks.map(blockScript)].join(' ')
}
