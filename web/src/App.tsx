import { useEffect } from 'react'
import { useApi } from './store/api'
import { useSession } from './store/session'
import { Desktop } from './shell/Desktop'
import { LoginScreen } from './shell/LoginScreen'
import { useWindows } from './store/windows'

export default function App() {
  const loggedIn = useSession((s) => s.loggedIn)
  const logIn = useSession((s) => s.logIn)
  const logOff = useSession((s) => s.logOff)
  const closeAll = useWindows((s) => s.closeAll)
  const loadApi = useApi((s) => s.load)
  useEffect(() => {
    void loadApi()
  }, [loadApi])

  if (!loggedIn) return <LoginScreen onLogin={logIn} />
  return (
    <Desktop
      onLogOff={() => {
        closeAll()
        logOff()
      }}
    />
  )
}
