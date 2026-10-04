import type { FileDoc, FileId } from '../content/types'
import { apiRequest } from './http'

// Notebook and progress live on the server (Alex's API); these throw so callers can show a retry.
export async function getNotes(): Promise<string | null> {
  const res = await apiRequest<{ text: string | null }>('/api/notes', { timeoutMs: 10_000 })
  if (!res.ok) throw new Error('Could not load your notebook.')
  return res.data.text
}

export async function saveNotes(text: string): Promise<void> {
  const res = await apiRequest<{ ok: true }>('/api/notes', { method: 'PUT', body: { text }, timeoutMs: 10_000 })
  if (!res.ok) throw new Error('Could not save your notebook.')
}

export async function getProgress(): Promise<Partial<Record<FileId, FileDoc>>> {
  const res = await apiRequest<{ unlocked: Partial<Record<FileId, FileDoc>> }>('/api/progress', { timeoutMs: 10_000 })
  if (!res.ok) throw new Error('Could not load saved progress.')
  return res.data.unlocked
}

export async function resetProgress(): Promise<void> {
  const res = await apiRequest<{ ok: true }>('/api/progress/reset', { method: 'POST', body: {}, timeoutMs: 10_000 })
  if (!res.ok) throw new Error('Could not restart the case.')
}

export type UnlockResult = { ok: true; file: FileDoc } | { ok: false; hints: string[] } | { ok: false; error: string }

export async function unlockFile(fileId: FileId, answer: string, attempt: number): Promise<UnlockResult> {
  const res = await apiRequest<{ ok: true; file: FileDoc } | { ok: false; hints: string[] }>('/api/unlock', { body: { fileId, answer, attempt } })
  return res.ok ? res.data : { ok: false, error: res.error }
}

export interface AccuseRequest {
  culprit: string
  evidence: string[] // up to three record ids
  theory: string
  timedOut?: boolean // filed automatically when the 30:00 limit ran out; an empty report is allowed
}

export interface Verdict {
  verdict: 'solved' | 'partial' | 'incorrect'
  score: number
  rating: string
  culprit: string // the real culprit's suspect id, revealed because the report is final
  theory: { graded: boolean; score: number | null; feedback: string; source: 'gemini' | 'offline' }
  explanation: string[]
}

export async function accuse(req: AccuseRequest): Promise<{ ok: true; verdict: Verdict } | { ok: false; error: string }> {
  const res = await apiRequest<Verdict>('/api/accuse', { body: req, timeoutMs: 30_000 })
  return res.ok ? { ok: true, verdict: res.data } : { ok: false, error: res.error }
}

// Dev server only: every record at once, for testing the end game.
export async function devFiles(): Promise<Partial<Record<FileId, FileDoc>> | null> {
  const res = await apiRequest<{ files: Partial<Record<FileId, FileDoc>> }>('/api/dev/files')
  return res.ok ? res.data.files : null
}

export async function devRelock(id: string): Promise<void> {
  await apiRequest('/api/dev/relock', { body: { id } })
}

export interface DevStatus {
  privateData: boolean
  solution: boolean
  gemini: boolean
  model: string
  elevenLabs: boolean
  voice: string
}

export async function devStatus(): Promise<DevStatus | null> {
  const res = await apiRequest<DevStatus>('/api/dev/status')
  return res.ok ? res.data : null
}

export interface DevScenario {
  label: string
  note: string
  draft: { culprit: string; evidence: string[]; theory: string }
}

export async function devScenarios(): Promise<DevScenario[] | null> {
  const res = await apiRequest<{ scenarios: DevScenario[] }>('/api/dev/scenarios')
  return res.ok ? res.data.scenarios : null
}
