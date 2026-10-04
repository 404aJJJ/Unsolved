import { apiRequest } from './http'

// What the backend can do right now. Each flag lets the UI hide or degrade an AI feature instead of failing.
export interface ApiFeatures {
  narration: boolean // ElevenLabs voice
  gradingAI: boolean // Gemini grades the written theory
}

export const NO_FEATURES: ApiFeatures = { narration: false, gradingAI: false }

export async function fetchConfig(): Promise<{ online: boolean; features: ApiFeatures }> {
  const res = await apiRequest<{ features?: Partial<ApiFeatures> }>('/api/config', { timeoutMs: 5000 })
  // An older backend without /api/config is treated as online with every optional feature off.
  if (!res.ok) return { online: res.status !== 0 && res.status < 500, features: NO_FEATURES }
  return { online: true, features: { ...NO_FEATURES, ...res.data.features } }
}
