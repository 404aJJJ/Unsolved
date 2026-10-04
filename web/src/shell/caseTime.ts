import { useEffect } from 'react'
import { useGame } from '../store/game'
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

// Counts case time while the desktop is open and the tab is visible.
export function useCaseTimer() {
  const tick = useGame((s) => s.tick)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') tick()
    }, 1000)
    return () => clearInterval(id)
  }, [tick])
}

// Fires a toast when the Clock app's countdown finishes, even if its window is closed.
export function useCountdownWatcher() {
  useEffect(() => {
    const id = setInterval(() => {
      const t = useTimer.getState()
      if (t.status === 'running' && Date.now() >= t.endsAt) {
        t.finish()
        useWindows.getState().pushToast({ title: "Timer finished", body: `${formatElapsed(t.duration)} countdown is up.` })
      }
    }, 250)
    return () => clearInterval(id)
  }, [])
}
