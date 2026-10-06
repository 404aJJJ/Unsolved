import { useEffect, useRef } from 'react'
import { fileReport } from '../apps/fileReport'
import { TIME_LIMIT, useGame } from '../store/game'
import { useTimer } from '../store/timer'
import { useWindows } from '../store/windows'

export function formatElapsed(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function useClockLabel() {
  return useGame((s) => (s.mode === 'timed' ? 'Time left' : 'Time on case'))
}

// Case time left, in seconds, for timed games. Null when untimed.
export function timeLeft(s: { mode: string; elapsed: number }) {
  return s.mode === 'timed' ? Math.max(0, TIME_LIMIT - s.elapsed) : null
}

// Advances the case clock while the game is on screen. Hiding or closing the tab freezes time left.
// Timed games recompute from a deadline four times a second so the countdown does not skip; untimed games add one second.
export function useCaseTimer() {
  const tick = useGame((s) => s.tick)
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') useGame.getState().resumeClock()
      else useGame.getState().pauseClock()
    }
    sync()
    tick()
    document.addEventListener('visibilitychange', sync)
    let n = 0
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      n++
      if (useGame.getState().mode === 'timed') tick()
      else if (n % 4 === 0) tick()
    }, 250)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
      useGame.getState().pauseClock()
    }
  }, [tick])
}

// Warns at 5:00 and 1:00 left, and files the report automatically when time runs out.
export function useTimedGame() {
  const timeUp = useGame((s) => s.timeUp)
  const result = useGame((s) => s.result)
  const left = useGame((s) => timeLeft(s))
  const warned = useRef(new Set<number>())

  useEffect(() => {
    if (left === null || result) return
    for (const mark of [300, 60]) {
      if (left <= mark && left > mark - 3 && !warned.current.has(mark)) {
        warned.current.add(mark)
        useWindows.getState().pushToast({ title: mark === 300 ? 'Five minutes left' : 'One minute left', body: 'File your report before time runs out.' })
      }
    }
  }, [left, result])

  const handled = useRef(false)
  useEffect(() => {
    if (!timeUp || result || handled.current) return
    handled.current = true
    const { askConfirm, open } = useWindows.getState()
    useGame.getState().setReportStarted(true)
    askConfirm({
      title: "Time's up",
      body: 'The 30 minutes are over. Your report is being filed with what you have so far.',
      confirmLabel: 'OK',
      info: true,
      onConfirm: () => {},
    })
    void fileReport(true).then((res) => {
      open('report')
      if (!res.ok) {
        handled.current = false // let the Report window retry
        useWindows.getState().pushToast({ title: 'Could not file the report', body: res.error })
      }
    })
  }, [timeUp, result])
}

// Fires a toast when the Clock app's countdown finishes, even if its window is closed.
export function useCountdownWatcher() {
  useEffect(() => {
    const id = setInterval(() => {
      const t = useTimer.getState()
      if (t.status === 'running') useTimer.setState({ now: Date.now() })
      if (t.status === 'running' && Date.now() >= t.endsAt) {
        t.finish()
        useWindows.getState().pushToast({ title: "Timer finished", body: `${formatElapsed(t.duration)} countdown is up.` })
      }
    }, 250)
    return () => clearInterval(id)
  }, [])
}
