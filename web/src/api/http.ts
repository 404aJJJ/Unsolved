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

export function apiUrl(path: string) {
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
      return { ok: false, status: res.status, error: data?.error ?? `Server error ${res.status}` }
    }
    return { ok: true, data: (as === 'blob' ? await res.blob() : await res.json()) as T }
  } catch (err) {
    const aborted = err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')
    return { ok: false, status: 0, error: aborted ? 'The server took too long to respond.' : 'Cannot reach the investigation server.' }
  }
}
