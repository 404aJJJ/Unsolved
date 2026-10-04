// Shared content shapes. The mock API and the real backend return locked files in this same format.

export type FileId = '01' | '02' | '03' | '04' | '05' | '06'

export interface Email {
  id: string
  from: string
  to: string
  sent: string
  subject: string
  body: string[]
}

export interface ChatMessage {
  from: string
  text: string
  time?: string
}

export type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'note'; text: string }
  | { t: 'rows'; rows: { k: string; v: string }[] }
  | { t: 'statement'; who: string; role?: string; lines: string[] }
  | { t: 'chat'; title: string; msgs: ChatMessage[] }
  | { t: 'email'; email: Email }
  | { t: 'specimen'; engraving: string; caption: string }

export interface FileDoc {
  id: FileId
  heading: string
  sub: string[]
  blocks: Block[]
}

// Skin a lock is presented with. All of them submit through the same /api/unlock call.
export type Minigame = 'pin' | 'hack' | 'magnifier'

export interface FileEntry {
  id: FileId
  title: string
  kind: string
  lock?: { type: 'numeric' | 'keyword'; minigame: Minigame; prompt: string }
}

export interface Suspect {
  id: string
  name: string
  age: number
  occupation: string
  background: string
  ref?: string
}
