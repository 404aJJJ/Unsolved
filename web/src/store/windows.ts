import { create } from 'zustand'
import type { FileId } from '../content/types'

export type AppId = 'files' | 'mail' | 'messages' | 'notes' | 'board' | 'report' | 'clock' | 'doc'

// Animation phase a window is in; the Window component finishes it on animationend.
export type WinAnim = 'open' | 'close' | 'min' | 'restore' | null

export interface Win {
  id: string
  app: AppId
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  min: boolean
  max: boolean
  anim: WinAnim
  fileId?: FileId
}

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  info?: boolean // single OK button, informational icon
  onConfirm: () => void
}

export interface Toast {
  id: number
  title: string
  body: string
}

export const APP_META: Record<AppId, { title: string; w: number; h: number }> = {
  files: { title: 'Case Files', w: 720, h: 460 },
  mail: { title: 'Mail', w: 820, h: 520 },
  messages: { title: 'Messages', w: 640, h: 480 },
  notes: { title: 'Notes', w: 460, h: 420 },
  board: { title: 'Case Board', w: 860, h: 560 },
  report: { title: 'Submit Report', w: 560, h: 440 },
  clock: { title: 'Clock', w: 460, h: 530 },
  doc: { title: 'Case Viewer', w: 700, h: 560 },
}

interface WindowState {
  windows: Win[]
  topZ: number
  lockFor: FileId | null
  justUnlocked: FileId | null
  toasts: Toast[]
  confirm: ConfirmRequest | null
  askConfirm: (c: ConfirmRequest | null) => void
  open: (app: AppId, opts?: { fileId?: FileId; title?: string }) => void
  focus: (id: string) => void
  requestClose: (id: string) => void
  requestMin: (id: string) => void
  finishAnim: (id: string) => void
  toggleMax: (id: string) => void
  move: (id: string, x: number, y: number) => void
  showLock: (id: FileId | null) => void
  flashUnlocked: (id: FileId) => void
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  closeAll: () => void
}

// The focused window is the top-most one that is visible and not on its way out.
export function activeWindowId(windows: Win[]): string | null {
  let best: Win | null = null
  for (const w of windows) if (!w.min && w.anim !== 'min' && w.anim !== 'close' && (!best || w.z > best.z)) best = w
  return best?.id ?? null
}

let cascade = 0
let toastSeq = 0

const patch = (windows: Win[], id: string, p: Partial<Win>) => windows.map((w) => (w.id === id ? { ...w, ...p } : w))

export const useWindows = create<WindowState>((set, get) => ({
  windows: [],
  topZ: 10,
  lockFor: null,
  justUnlocked: null,
  toasts: [],
  confirm: null,
  askConfirm: (confirm) => set({ confirm }),
  open: (app, opts = {}) => {
    const id = opts.fileId ? `${app}-${opts.fileId}` : app
    const existing = get().windows.find((w) => w.id === id)
    if (existing) {
      get().focus(id)
      return
    }
    const meta = APP_META[app]
    const vw = window.innerWidth
    const vh = window.innerHeight - 40
    const w = Math.min(meta.w, vw - 40)
    const h = Math.min(meta.h, vh - 40)
    const offset = (cascade++ % 6) * 26
    const x = Math.max(10, Math.round((vw - w) / 2 - 100 + offset))
    const y = Math.max(10, Math.round((vh - h) / 2 - 50 + offset))
    set((s) => ({
      topZ: s.topZ + 1,
      windows: [
        ...s.windows,
        { id, app, title: opts.title ?? meta.title, x, y, w, h, z: s.topZ + 1, min: false, max: false, anim: 'open', fileId: opts.fileId },
      ],
    }))
  },
  focus: (id) =>
    set((s) => {
      const win = s.windows.find((w) => w.id === id)
      if (!win) return s
      if (win.min) return { topZ: s.topZ + 1, windows: patch(s.windows, id, { min: false, anim: 'restore', z: s.topZ + 1 }) }
      if (win.z === s.topZ) return s
      return { topZ: s.topZ + 1, windows: patch(s.windows, id, { z: s.topZ + 1 }) }
    }),
  requestClose: (id) => set((s) => ({ windows: patch(s.windows, id, { anim: 'close' }) })),
  requestMin: (id) => set((s) => ({ windows: patch(s.windows, id, { anim: 'min' }) })),
  finishAnim: (id) =>
    set((s) => {
      const win = s.windows.find((w) => w.id === id)
      if (!win) return s
      if (win.anim === 'close') return { windows: s.windows.filter((w) => w.id !== id) }
      if (win.anim === 'min') return { windows: patch(s.windows, id, { anim: null, min: true }) }
      return { windows: patch(s.windows, id, { anim: null }) }
    }),
  toggleMax: (id) => set((s) => ({ windows: patch(s.windows, id, { max: !s.windows.find((w) => w.id === id)?.max }) })),
  move: (id, x, y) => set((s) => ({ windows: patch(s.windows, id, { x, y }) })),
  showLock: (lockFor) => set({ lockFor }),
  flashUnlocked: (id) => {
    set({ justUnlocked: id })
    setTimeout(() => get().justUnlocked === id && set({ justUnlocked: null }), 1800)
  },
  pushToast: (t) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismissToast(id), 5000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  closeAll: () => set({ windows: [], lockFor: null, toasts: [], confirm: null }),
}))
