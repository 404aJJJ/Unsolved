import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Dev-only stand-in for the FastAPI backend. Implements the contract in docs/api.md
// using the gitignored server/private/case-private.json, so answers never enter the client bundle.
// Set VITE_API_URL to point the client at the real backend instead.
function mockApi(): Plugin {
  const privatePath = resolve(__dirname, '../server/private/case-private.json')
  const normalize = (s: string) => s.trim().toUpperCase()

  return {
    name: 'unsolved-mock-api',
    configureServer(server) {
      server.middlewares.use('/api/unlock', (req, res) => {
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
            data = JSON.parse(readFileSync(privatePath, 'utf8'))
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

export default defineConfig({
  plugins: [react(), mockApi()],
})
