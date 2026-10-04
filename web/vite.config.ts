import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { handleAccuse } from './dev-api/accuse.ts'
import { progressRoutes } from './dev-api/progress.ts'
import { handleNarrate, narrationConfigured, narrationVoice } from './dev-api/narrate.ts'

// Dev-only stand-in for the FastAPI backend. Implements the contract in docs/api.md
// using the gitignored server/private/case-private.json, so answers never enter the client bundle.
// Set VITE_API_URL to point the client at the real backend instead.
function mockApi(env: Record<string, string>, alsoAtApi: boolean): Plugin {
  const privatePath = resolve(__dirname, '../server/private/case-private.json')
  // No private file (a teammate without the secrets)? Use the fake sample case so the whole UI is still testable.
  const samplePath = resolve(__dirname, '../server/sample/case-sample.json')
  const usingSample = () => !existsSync(privatePath)
  const normalize = (s: string) => s.trim().toUpperCase()

  return {
    name: 'unsolved-mock-api',
    configureServer(server) {
      // The mock always answers at /mock-api (the dev-only "Use mock API" button switches the site to it, even when /api
      // is forwarded to Python). It also answers at /api unless API_PROXY_TARGET / `npm run dev:api` sends /api to Python.
      const use = (path: string, handler: Connect.NextHandleFunction) => {
        server.middlewares.use(path.replace('/api', '/mock-api'), handler)
        if (alsoAtApi) server.middlewares.use(path, handler)
      }
      const readPrivate = () => JSON.parse(readFileSync(usingSample() ? samplePath : privatePath, 'utf8'))
      const progress = progressRoutes({ readPrivate, assetsDir: resolve(__dirname, '../server/assets'), allowPreview: env.UNSOLVED_TEST_PREVIEW !== '0' })
      // Order matters: '/api/progress/reset' must be mounted before '/api/progress'.
      for (const path of ['/api/progress/reset', '/api/progress', '/api/notes', '/api/files']) use(path, progress.handlers[path])
      use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })
      use('/api/dev/relock', (req, res) => {
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', () => {
          progress.relock(String(JSON.parse(raw || '{}').id ?? ''))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        })
      })

      // What the backend can do. The client hides or degrades features whose flag is false.
      use('/api/config', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const gemini = !!env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('insert_')
        res.end(JSON.stringify({ features: { narration: narrationConfigured(env), gradingAI: gemini } }))
      })

      use('/api/narrate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', async () => {
          let body
          try {
            body = JSON.parse(raw || '{}')
          } catch {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'bad json' }))
          }
          const out = await handleNarrate(body, { env, ip: req.socket.remoteAddress ?? 'local' })
          res.statusCode = out.status
          if (out.audio) {
            res.setHeader('Content-Type', 'audio/mpeg')
            return res.end(out.audio)
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: out.error }))
        })
      })

      use('/api/accuse', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'POST only' }))
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', async () => {
          let data
          try {
            data = readPrivate()
          } catch {
            res.statusCode = 503
            return res.end(JSON.stringify({ error: 'server/private/case-private.json missing; ask the team for it' }))
          }
          if (!data.solution) {
            res.statusCode = 503
            return res.end(JSON.stringify({ error: 'case-private.json has no solution block; get the latest from the team' }))
          }
          let body
          try {
            body = JSON.parse(raw || '{}')
          } catch {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'bad json' }))
          }
          const out = await handleAccuse(body, { solution: data.solution, env, ip: req.socket.remoteAddress ?? 'local' })
          res.statusCode = out.status
          res.end(JSON.stringify(out.json))
        })
      })

      // Dev only: what the Test Lab shows as status lights. Never reports secrets, only whether they are set.
      use('/api/dev/status', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        let solution = false
        let privateData = false
        try {
          const d = readPrivate()
          privateData = !usingSample()
          solution = !!d.solution
        } catch {
          /* missing file is a valid status */
        }
        const key = env.GEMINI_API_KEY
        res.end(
          JSON.stringify({
            privateData,
            sample: usingSample(),
            sampleAnswers: usingSample() ? readPrivate().answers : undefined,
            solution,
            gemini: !!key && !key.startsWith('insert_'),
            model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
            elevenLabs: narrationConfigured(env),
            voice: narrationVoice(env),
          }),
        )
      })

      // Dev only: canned reports for the Test Lab. They hold the solution, so they never ship in the client bundle.
      use('/api/dev/scenarios', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          res.end(JSON.stringify({ scenarios: readPrivate().devScenarios ?? [] }))
        } catch {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'case-private.json missing' }))
        }
      })

      // Dev only: every record at once, so the end game can be tested without replaying the locks.
      use('/api/dev/files', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const data = readPrivate()
          progress.unlockAll() // so the evidence images are served too
          res.end(JSON.stringify({ files: data.files }))
        } catch {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'case-private.json missing' }))
        }
      })

      use('/api/unlock', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          let data
          try {
            data = readPrivate()
          } catch {
            res.statusCode = 503
            return res.end(JSON.stringify({ error: 'server/private/case-private.json missing; ask the team for it' }))
          }
          let body: { fileId?: string; answer?: string; attempt?: number }
          try {
            body = JSON.parse(raw || '{}')
          } catch {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'bad json' }))
          }
          const { fileId = '', answer = '', attempt = 1 } = body
          const expected = data.answers[fileId]
          if (!expected) {
            res.statusCode = 404
            return res.end(JSON.stringify({ error: 'unknown file' }))
          }
          if (normalize(answer) === normalize(expected)) {
            progress.unlock(fileId)
            return res.end(JSON.stringify({ ok: true, file: data.files[fileId] }))
          }
          const ladder: string[] = data.hints[fileId] ?? []
          const hints = ladder.slice(0, Math.min(Math.max(attempt, 1), ladder.length))
          res.end(JSON.stringify({ ok: false, hints }))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // .env lives at the repo root, next to .env.example. Empty prefix: server code may read non-VITE_ keys.
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  // `npm run dev:api` (vite --mode api) proxies /api to the local Python server with no .env editing; API_PROXY_TARGET overrides it.
  const proxyTarget = env.API_PROXY_TARGET || (mode === 'api' ? 'http://127.0.0.1:8000' : '')
  return {
    // Lets the root .env supply VITE_* values to the client (only VITE_-prefixed keys are ever exposed).
    envDir: resolve(__dirname, '..'),
    // With API_PROXY_TARGET set, /api goes to the real backend (no CORS needed) and the mock is off.
    plugins: [react(), mockApi(env, !proxyTarget)],
    server: proxyTarget ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true } } } : undefined,
  }
})
