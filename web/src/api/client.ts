import type { FileDoc, FileId } from '../content/types'
import { apiRequest } from './http'

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
