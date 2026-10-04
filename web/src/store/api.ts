import { create } from 'zustand'
import { fetchConfig, NO_FEATURES, type ApiFeatures } from '../api/config'

interface ApiState {
  status: 'unknown' | 'online' | 'offline'
  features: ApiFeatures
  load: () => Promise<void>
}

export const useApi = create<ApiState>((set) => ({
  status: 'unknown',
  features: NO_FEATURES,
  load: async () => {
    const { online, features } = await fetchConfig()
    set({ status: online ? 'online' : 'offline', features })
  },
}))
