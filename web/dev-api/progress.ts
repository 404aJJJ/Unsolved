// Dev mock of the progress, notebook and evidence-image endpoints (the Python API in server/main.py is the real one).
// State is in memory, so restarting the dev server starts a fresh game. It lets `npm run dev` work without Python.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Connect } from 'vite'

const IMAGES: Record<string, string> = {
  '01': 'incidentReport_01.webp',
  '02': 'interviewStatements_02.webp',
  '04': 'securityLogs_03.webp',
  '05': 'diamondExamReport_04.webp',
  '06': 'purchaseRecords_05.webp',
}
const LOCKED = new Set(['04', '05', '06'])

export function progressRoutes(opts: { readPrivate: () => any; assetsDir: string; allowPreview: boolean }) {
  const unlocked = new Set<string>()
  let notes: string | null = null

  const json = (res: any, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  const readBody = (req: any) =>
    new Promise<any>((done) => {
      let raw = ''
      req.on('data', (c: string) => (raw += c))
      req.on('end', () => {
        try {
          done(JSON.parse(raw || '{}'))
        } catch {
          done(null)
        }
      })
    })

  const handlers: Record<string, Connect.NextHandleFunction> = {
    '/api/progress/reset': async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only' })
      unlocked.clear()
      notes = ''
      json(res, 200, { ok: true })
    },
    '/api/progress': (_req, res) => {
      try {
        const files = opts.readPrivate().files
        json(res, 200, { unlocked: Object.fromEntries([...unlocked].map((id) => [id, files[id]])) })
      } catch {
        json(res, 503, { error: 'Case data missing or invalid.' })
      }
    },
    '/api/notes': async (req, res) => {
      if (req.method === 'PUT') {
        const body = await readBody(req)
        if (!body || typeof body.text !== 'string' || body.text.length > 100_000) return json(res, 422, { error: 'Invalid notebook text.' })
        notes = body.text
        return json(res, 200, { ok: true })
      }
      json(res, 200, { text: notes })
    },
    '/api/files': (req, res) => {
      const m = /^\/(\d{2})\/image/.exec(req.url ?? '')
      const file = m && IMAGES[m[1]]
      if (!file) return json(res, 404, { error: 'Image not found.' })
      const preview = new URL(req.url ?? '', 'http://x').searchParams.get('preview') === 'true' && opts.allowPreview
      if (LOCKED.has(m[1]) && !unlocked.has(m[1]) && !preview) return json(res, 403, { error: 'File is locked.' })
      const path = resolve(opts.assetsDir, file)
      if (!existsSync(path)) return json(res, 404, { error: 'Image not found.' })
      res.statusCode = 200
      res.setHeader('Content-Type', 'image/webp')
      res.setHeader('Cache-Control', 'no-store')
      res.end(readFileSync(path))
    },
  }

  return {
    handlers,
    unlock: (id: string) => unlocked.add(id),
    unlockAll: () => LOCKED.forEach((id) => unlocked.add(id)),
    relock: (id: string) => unlocked.delete(id),
  }
}
