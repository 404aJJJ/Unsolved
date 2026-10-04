import { resetProgress } from '../api/client'
import { useGame } from '../store/game'
import { useSession } from '../store/session'
import { useWindows } from '../store/windows'

// Starts over: clears the server-side progress and notebook first (Alex's API), then local state, then back to log-on.
// If the server cannot be reached nothing is cleared, so the browser and server never disagree.
export async function restartCase(): Promise<boolean> {
  try {
    await resetProgress()
  } catch {
    useWindows.getState().pushToast({ title: 'Case was not restarted', body: 'Check that the Python server is running, then try again.' })
    return false
  }
  useGame.getState().reset()
  useWindows.getState().closeAll()
  useSession.getState().logOff()
  return true
}
