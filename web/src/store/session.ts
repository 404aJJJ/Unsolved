import { create } from 'zustand'

// Whether the player is on the desktop or the login screen. Lets any part of the app send the player back to log in.
interface SessionState {
  loggedIn: boolean
  logIn: () => void
  logOff: () => void
}

export const useSession = create<SessionState>((set) => ({
  loggedIn: false,
  logIn: () => set({ loggedIn: true }),
  logOff: () => set({ loggedIn: false }),
}))
