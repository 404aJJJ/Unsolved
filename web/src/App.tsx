import { useState } from 'react'
import { Desktop } from './shell/Desktop'
import { LoginScreen } from './shell/LoginScreen'
import { useWindows } from './store/windows'
import { getProgress } from './api/client'
import { useGame } from './store/game'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const closeAll = useWindows((s) => s.closeAll)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    if (loading) return false
    setLoading(true)
    setError('')
    try {
      useGame.getState().syncUnlocked(await getProgress())
      setLoggedIn(true)
      return true
    } catch {
      setError('Cannot load your progress. Check that the Python server is running, then try again.')
      return false
    } finally {
      setLoading(false)
    }
  }

  if (!loggedIn) return <>
    <LoginScreen onLogin={login} />
    {(loading || error) && <div role="status" style={{ position: 'fixed', bottom: 30, left: 0, right: 0, textAlign: 'center', color: 'white' }}>{loading ? 'Loading saved progress…' : error}</div>}
  </>
  return (
    <Desktop
      onLogOff={() => {
        closeAll()
        setLoggedIn(false)
      }}
    />
  )
}
