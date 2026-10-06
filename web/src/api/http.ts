// The single door to the backend. Every integration goes through here so base URL handling,
// timeouts and error shapes stay identical. Add new endpoints in client.ts (or a feature file) and call apiRequest.

// '' means same origin: the dev mock, or the Vite proxy (API_PROXY_TARGET). A full URL calls the backend directly (needs CORS).
export const API_BASE: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  timeoutMs?: number
  as?: 'json' | 'blob'
  signal?: AbortSignal
}

// Dev only: send every request to the built-in mock (/mock-api) instead of the real API, so the site runs with no Python.
// The flag lives in localStorage; production builds ignore it (import.meta.env.DEV is false and this code is removed).
const MOCK_KEY = 'unsolved-mock-api'
function mockApiOn() {
  try {
    return localStorage.getItem(MOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function mockApiActive() {
  return import.meta.env.DEV && mockApiOn()
}

// Turn the mock on or off and reload, so every request and image URL picks the new target.
export function setMockApi(on: boolean) {
  if (!import.meta.env.DEV) return
  try {
    if (on) localStorage.setItem(MOCK_KEY, '1')
    else localStorage.removeItem(MOCK_KEY)
  } catch {
    /* storage blocked: nothing to switch */
  }
  location.reload()
}

export function apiUrl(path: string) {
  if (import.meta.env.DEV && mockApiOn()) return path.replace(/^\/api/, '/mock-api')
  return `${API_BASE}${path}`
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = opts.body === undefined ? 'GET' : 'POST', body, timeoutMs = 15_000, as = 'json', signal } = opts
  try {
    const res = await fetch(apiUrl(path), {
      method,
      cache: method === 'GET' ? 'no-store' : undefined,
      // The player's game is keyed by a cookie. Same-origin sends it automatically; a separate API origin needs this.
      credentials: API_BASE ? 'include' : 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      // Backends answer errors as { "error": "..." }; anything else (HTML from a proxy, empty body) gets a generic message.
      const data = await res.json().catch(() => null)
      const detail = typeof data?.detail === 'string' ? data.detail : null
      return { ok: false, status: res.status, error: data?.error ?? detail ?? `Server error ${res.status}` }
    }
    return { ok: true, data: (as === 'blob' ? await res.blob() : await res.json()) as T }
  } catch (err) {
    const aborted = err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')
    return { ok: false, status: 0, error: aborted ? 'The server took too long to respond.' : 'Cannot reach the investigation server.' }
  }
}
