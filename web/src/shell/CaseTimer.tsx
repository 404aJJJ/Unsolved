import { useGame } from '../store/game'
import { formatElapsed } from './caseTime'

export function Elapsed() {
  const elapsed = useGame((s) => s.elapsed)
  return <time dateTime={`PT${elapsed}S`}>{formatElapsed(elapsed)}</time>
}
