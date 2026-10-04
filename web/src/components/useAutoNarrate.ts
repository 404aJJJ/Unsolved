import { useEffect } from 'react'
import { useNarrator } from '../store/narrator'

// Reads `text` aloud when the thing it belongs to opens (unless the player turned auto-narration off or muted the narrator),
// and stops when it closes or changes. Pass an empty text to do nothing.
export function useAutoNarrate(id: string, text: string) {
  useEffect(() => {
    const n = useNarrator.getState()
    if (!text || !n.auto || n.muted) return
    void n.speak(id, text)
    return () => {
      const s = useNarrator.getState()
      if (s.playingId === id) s.stop()
    }
  }, [id, text])
}
