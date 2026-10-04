import { useWindows } from '../store/windows'
import type { ExtraGlyph } from './Icons'

export interface ExtraItem {
  id: string
  label: string
  glyph: ExtraGlyph
  kind: 'app' | 'file'
  message: string
}

// Decorative desktop items. Opening one shows a friendly "not available yet" notice.
export const EXTRA_ITEMS: ExtraItem[] = [
  { id: 'browser', label: 'Browser', glyph: 'browser', kind: 'app', message: 'The investigation network is offline. Everything you need is already on this machine.' },
  { id: 'cctv', label: 'CCTV Viewer', glyph: 'camera', kind: 'app', message: 'Camera footage has not been released to this workstation. Investigators supplied written transcriptions instead.' },
  { id: 'music', label: 'Music', glyph: 'music', kind: 'app', message: 'The bank lobby playlist is not available yet. Detectives work in silence.' },
  { id: 'leaderboard', label: 'Leaderboard', glyph: 'trophy', kind: 'app', message: 'The leaderboard is not available yet. Solve the case first; the rankings will wait for you.' },
  { id: 'vault', label: 'vault_schedule.xlsx', glyph: 'sheet', kind: 'file', message: 'This spreadsheet is locked by the bank and has not been released to investigators yet.' },
  { id: 'brochure', label: 'auction_brochure.pdf', glyph: 'pdf', kind: 'file', message: 'The auction brochure is not available yet.' },
  { id: 'photo', label: 'IMG_0412.jpg', glyph: 'image', kind: 'file', message: 'This image is corrupted and could not be opened. It may be recoverable later.' },
  { id: 'dno', label: 'DO NOT OPEN.txt', glyph: 'txt', kind: 'file', message: 'Nice try. This file is not available yet, and you were told not to open it.' },
]

export const TRASH_ITEM: ExtraItem = {
  id: 'trash',
  label: 'Recycle Bin',
  glyph: 'trash',
  kind: 'app',
  message: 'The Recycle Bin is not available yet. Nothing has been thrown away on this case, as far as you know.',
}

export function showNotAvailable(item: ExtraItem) {
  useWindows.getState().askConfirm({
    title: item.kind === 'file' ? `${item.label} can't be opened` : `${item.label} is not available yet`,
    body: item.message,
    confirmLabel: 'OK',
    info: true,
    onConfirm: () => {},
  })
}
