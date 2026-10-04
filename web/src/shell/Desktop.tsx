import { BoardApp, DocWindow, MailApp, MessagesApp, NotesApp, ReportApp } from '../apps/Apps'
import { FilesApp } from '../apps/FilesApp'
import { LockDialog } from '../apps/LockDialog'
import { useWindows, type AppId, type Win } from '../store/windows'
import { AppIcon, ExtraIcon } from './Icons'
import { useCaseTimer, useCountdownWatcher } from './caseTime'
import { ClockApp } from '../apps/ClockApp'
import { ConfirmDialog } from './ConfirmDialog'
import { EXTRA_ITEMS, TRASH_ITEM, showNotAvailable, type ExtraItem } from './extras'
import { Taskbar } from './Taskbar'
import { Widgets } from './Widgets'
import { Window } from './Window'

const DESKTOP_ICONS: { app: AppId; label: string }[] = [
  { app: 'files', label: 'Case Files' },
  { app: 'mail', label: 'Mail' },
  { app: 'messages', label: 'Messages' },
  { app: 'board', label: 'Case Board' },
  { app: 'notes', label: 'Notes' },
  { app: 'report', label: 'Submit Report' },
]

function AppBody({ win }: { win: Win }) {
  switch (win.app) {
    case 'files':
      return <FilesApp />
    case 'mail':
      return <MailApp />
    case 'messages':
      return <MessagesApp />
    case 'notes':
      return <NotesApp />
    case 'board':
      return <BoardApp />
    case 'report':
      return <ReportApp />
    case 'clock':
      return <ClockApp />
    case 'doc':
      return <DocWindow fileId={win.fileId!} />
  }
}

export function Desktop({ onLogOff }: { onLogOff: () => void }) {
  const { windows, open, lockFor } = useWindows()
  useCaseTimer()
  useCountdownWatcher()
  return (
    <div className="desktop">
      <div className="wallpaper" aria-hidden />
      <div className="icons">
        {DESKTOP_ICONS.map((d, i) => (
          <button key={d.app} style={{ animationDelay: `${150 + i * 45}ms` }} className="dicon" onDoubleClick={() => open(d.app)} onKeyDown={(e) => e.key === 'Enter' && open(d.app)}>
            <AppIcon app={d.app} />
            <span>{d.label}</span>
          </button>
        ))}
      </div>
      <div className="icons icons--extra">
        {EXTRA_ITEMS.filter((x) => x.kind === 'app').map((item, i) => (
          <ExtraButton key={item.id} item={item} delay={400 + i * 45} />
        ))}
      </div>
      <div className="icons icons--files">
        {EXTRA_ITEMS.filter((x) => x.kind === 'file').map((item, i) => (
          <ExtraButton key={item.id} item={item} delay={600 + i * 45} />
        ))}
      </div>
      <ExtraButton item={TRASH_ITEM} delay={900} className="dicon--trash" />
      <Widgets />
      {windows.map((w) => (
        <Window key={w.id} win={w}>
          <AppBody win={w} />
        </Window>
      ))}
      {lockFor && <LockDialog key={lockFor} fileId={lockFor} />}
      <ConfirmDialog />
      <Taskbar onLogOff={onLogOff} />
    </div>
  )
}

function ExtraButton({ item, delay, className = '' }: { item: ExtraItem; delay: number; className?: string }) {
  return (
    <button
      style={{ animationDelay: `${delay}ms` }}
      className={`dicon ${className}`}
      onDoubleClick={() => showNotAvailable(item)}
      onKeyDown={(e) => e.key === 'Enter' && showNotAvailable(item)}
    >
      <ExtraIcon glyph={item.glyph} />
      <span>{item.label}</span>
    </button>
  )
}
