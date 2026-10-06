import { useCallback, useEffect, useRef, useState } from 'react'
import { CASE_IMAGES } from '../content/caseImages'
import { mockApiActive, setMockApi } from '../api/http'
import { useApi } from '../store/api'

// A text-mode boot, like a Linux console: kernel-style lines with timestamps and [ OK ] markers.
// Flavour lines are scripted; the lines marked REAL wait for actual work (reach the API, read its flags, warm the
// public evidence images) and show its real result, including [FAILED] with a retry if the server is down.
type Tag = 'ok' | 'fail' | 'warn' | null
interface Line {
  id: number
  time: string
  text: string
  tag: Tag
}

const MIN_MS = 2200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function preload(src: string) {
  return new Promise<void>((done) => {
    const img = new Image()
    img.onload = img.onerror = () => done()
    img.src = src
  })
}

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<Line[]>([])
  const [failed, setFailed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const fast = useRef(false) // any key or click fast-forwards the scripted lines
  const finished = useRef(false)

  const retry = useCallback(() => {
    useApi.setState({ status: 'unknown' })
    setLines([])
    setFailed(false)
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    const skip = () => (fast.current = true)
    const key = (e: KeyboardEvent) => (failed && e.key === 'Enter' ? retry() : skip())
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', skip)
    }
  }, [failed, retry])

  useEffect(() => {
    let live = true
    const t0 = performance.now()
    let id = 0
    const stamp = () => ((performance.now() - t0) / 1000 + 0.18).toFixed(6).padStart(11, ' ')
    const add = (text: string, tag: Tag = null) => {
      const line: Line = { id: id++, time: stamp(), text, tag }
      setLines((l) => [...l, line])
      return line.id
    }
    const mark = (lineId: number, tag: Tag, text?: string) =>
      setLines((l) => l.map((x) => (x.id === lineId ? { ...x, tag, text: text ?? x.text } : x)))
    const flavour = async (text: string, tag: Tag = 'ok', ms = 70) => {
      if (!live) return
      add(text, tag)
      await sleep(fast.current ? 4 : ms + Math.random() * 60)
    }

    ;(async () => {
      await sleep(0) // lets StrictMode's throwaway first run be cancelled before it prints anything
      if (!live) return
      add('Unsolved.exe evidence terminal PB-062, Premier Bank, London')
      await sleep(fast.current ? 4 : 220)
      for (const [text, tag] of [
        ['Booting case file system', null],
        ['Checking memory ... 640K OK', 'ok'],
        ['Detecting hardware: 1 detective, 6 persons of interest', null],
        ['Started Evidence Vault', 'ok'],
        ['Started Interview Transcripts', 'ok'],
        ['Reached target Security Logs', 'warn'],
      ] as [string, Tag][]) {
        await flavour(text, tag)
        if (!live) return
      }

      // REAL: reach the server and read what it can do.
      const net = add('Connecting to the investigation server')
      await useApi.getState().load()
      if (!live) return
      const { status, features } = useApi.getState()
      if (status === 'offline') {
        mark(net, 'fail')
        add('Cannot reach the investigation server.', 'fail')
        add('Press ENTER or click Try again to retry.')
        setFailed(true)
        return
      }
      mark(net, 'ok')
      if (import.meta.env.DEV && mockApiActive()) add('Dev: using the built-in mock API (no Python). Turn it off in the Test Lab.', 'warn')
      await flavour(`Server features: narration=${features.narration ? 'server voice' : 'browser voice'}`, 'ok', 120)
      if (!live) return

      // REAL: warm the public evidence images and fonts.
      const files = add('Mounting /evidence (case files)')
      await Promise.all([document.fonts?.ready, preload(CASE_IMAGES['01'].src), preload(CASE_IMAGES['02'].src)])
      if (!live) return
      mark(files, 'ok')

      for (const text of ['Started Case Board', 'Started Notebook', 'Started Clock (30:00 on the clock)', 'Reached target Detective Desktop']) {
        await flavour(text)
        if (!live) return
      }
      const wait = Math.max(0, MIN_MS - (performance.now() - t0))
      await sleep(fast.current ? 0 : wait)
      if (!live || finished.current) return
      add('Starting display manager ...')
      await sleep(fast.current ? 60 : 350)
      if (!live || finished.current) return
      finished.current = true
      setLeaving(true)
      setTimeout(onDone, 450)
    })()
    return () => {
      live = false
    }
  }, [attempt, onDone])

  // Keep the newest line in view, like a scrolling console.
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  return (
    <div className={`boot ${leaving ? 'boot--out' : ''}`} role="status" aria-live="polite" aria-label="Starting Unsolved.exe">
      <div className="boot__log">
        {lines.map((l) => (
          <div key={l.id} className="boot__line">
            <span className="boot__time">[{l.time}]</span>
            {l.tag && <span className={`boot__tag boot__tag--${l.tag}`}>{l.tag === 'ok' ? '[  OK  ]' : l.tag === 'fail' ? '[FAILED]' : '[ WARN ]'}</span>}
            <span className="boot__text">{l.text}</span>
          </div>
        ))}
        {failed ? (
          <>
            <button className="boot__retry" onClick={retry}>
              &gt; Try again
            </button>
            {import.meta.env.DEV && (
              <button className="boot__retry boot__retry--dev" onClick={() => setMockApi(true)} title="Dev only: use the in-memory mock API instead of Python">
                &gt; Continue without the API (dev: use the built-in mock)
              </button>
            )}
          </>
        ) : (
          <span className="boot__cursor" aria-hidden />
        )}
        <div ref={end} />
      </div>
    </div>
  )
}
