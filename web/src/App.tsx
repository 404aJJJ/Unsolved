import { useEffect, useState } from 'react'
import { useApi } from './store/api'
import { useSession } from './store/session'
import { Desktop } from './shell/Desktop'
import { LoginScreen } from './shell/LoginScreen'
import { useWindows } from './store/windows'
import { getProgress } from './api/client'
import { useGame, type GameMode } from './store/game'

export default function App() {
  const loggedIn = useSession((s) => s.loggedIn)
  const logIn = useSession((s) => s.logIn)
  const logOff = useSession((s) => s.logOff)
  const closeAll = useWindows((s) => s.closeAll)
  const loadApi = useApi((s) => s.load)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    void loadApi()
  }, [loadApi])

  // Log-on reconciles with the server's saved progress first, so the browser and server never disagree.
  const login = async (mode: GameMode) => {
    if (loading) return false
    setLoading(true)
    setError('')
    try {
      useGame.getState().syncUnlocked(await getProgress())
      // The clock starts only once log-on has worked, so a down server never burns the player's 30 minutes.
      if (!useGame.getState().started) useGame.getState().startGame(mode)
      logIn()
      return true
    } catch {
      setError('Cannot load your progress. Check that the Python server is running, then try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  if (!loggedIn)
    return (
      <>
        <LoginScreen onLogin={login} />
        {(loading || error) && (
          <div role="status" style={{ position: 'fixed', bottom: 30, left: 0, right: 0, textAlign: 'center', color: 'white' }}>
            {loading ? 'Loading saved progress…' : error}
          </div>
        )}
      </>
    )
  return (
    <Desktop
      onLogOff={() => {
        closeAll()
        logOff()
      }}
    />
  )
}
