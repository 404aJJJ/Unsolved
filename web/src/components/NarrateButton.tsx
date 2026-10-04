import { useApi } from '../store/api'
import { useNarrator } from '../store/narrator'

// Reads `text` aloud. `id` identifies what is playing so only one button shows "Stop" at a time.
export function NarrateButton({ id, text, label = 'Listen', className = '' }: { id: string; text: string; label?: string; className?: string }) {
  const playingId = useNarrator((s) => s.playingId)
  const status = useNarrator((s) => s.status)
  const speak = useNarrator((s) => s.speak)
  const stop = useNarrator((s) => s.stop)
  const serverVoice = useApi((s) => s.features.narration)

  const mine = playingId === id
  const loading = mine && status === 'loading'
  return (
    <button
      type="button"
      className={`narrate ${mine ? 'narrate--on' : ''} ${className}`}
      aria-pressed={mine}
      title={serverVoice ? 'Narrated by the case narrator' : 'Read aloud with your browser voice'}
      onClick={() => (mine ? stop() : speak(id, text))}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
        {mine && !loading ? (
          <rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" />
        ) : (
          <>
            <path d="M2 6v4h3l4 3V3L5 6z" fill="currentColor" />
            <path d="M11 5.500a3.500 3.500 0 0 1 0 5M12.800 3.800a6 6 0 0 1 0 8.400" fill="none" stroke="currentColor" strokeWidth="1.300" strokeLinecap="round" />
          </>
        )}
      </svg>
      {loading ? 'Loading…' : mine ? 'Stop' : label}
    </button>
  )
}
