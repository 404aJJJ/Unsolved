import { useState } from 'react'
import { Desktop } from './shell/Desktop'
import { LoginScreen } from './shell/LoginScreen'
import { useWindows } from './store/windows'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const closeAll = useWindows((s) => s.closeAll)

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />
  return (
    <Desktop
      onLogOff={() => {
        closeAll()
        setLoggedIn(false)
      }}
    />
  )
}
