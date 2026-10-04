import { useGame } from '../store/game'
import { formatElapsed, timeLeft } from './caseTime'

// The case clock: counts down in a timed game (turns urgent under five minutes), up otherwise.
export function Elapsed() {
  const elapsed = useGame((s) => s.elapsed)
  const mode = useGame((s) => s.mode)
  const left = timeLeft({ mode, elapsed })
  if (left === null) return <time dateTime={`PT${elapsed}S`}>{formatElapsed(elapsed)}</time>
  return (
    <time dateTime={`PT${left}S`} className={left <= 300 ? 'clock--urgent' : ''}>
      {formatElapsed(left)}
    </time>
  )
}
