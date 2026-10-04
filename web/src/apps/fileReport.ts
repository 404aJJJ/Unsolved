import { accuse } from '../api/client'
import { useGame } from '../store/game'

// Files the player's current draft as their final report. Used by the Submit button and by the time-up handler.
export async function fileReport(timedOut = false): Promise<{ ok: true } | { ok: false; error: string }> {
  const game = useGame.getState()
  const { culprit, evidence, theory } = game.draft
  const res = await accuse({ culprit, evidence, theory, timedOut })
  if (!res.ok) return res
  useGame.getState().recordReport(res.verdict, { accused: culprit, cited: evidence, timedOut })
  return { ok: true }
}
