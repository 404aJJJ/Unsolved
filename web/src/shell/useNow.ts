import { useEffect, useState } from 'react'

// Current time, re-rendered every `ms` (paused while the tab is hidden).
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }, ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
