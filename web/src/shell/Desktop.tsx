import { lazy, Suspense } from 'react'
import { BoardApp, DocWindow, MailApp, MessagesApp, NotesApp } from '../apps/Apps'
import { ReportApp } from '../apps/ReportApp'
import { IS_TEST } from '../testMode'

// Dev only; the dynamic import is dropped from production builds.
const TestLab = import.meta.env.DEV ? lazy(() => import('../apps/TestLab').then((m) => ({ default: m.TestLab }))) : null
import { FilesApp } from '../apps/FilesApp'
import { LockDialog } from '../apps/LockDialog'
import { useWindows, type AppId, type Win } from '../store/windows'
import { AppIcon } from './Icons'
import { useCaseTimer, useCountdownWatcher, useTimedGame } from './caseTime'
import { ClockApp } from '../apps/ClockApp'
import { ConfirmDialog } from './ConfirmDialog'
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
  ...(IS_TEST ? [{ app: 'testlab' as AppId, label: 'Test Lab' }] : []),
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
    case 'testlab':
      return TestLab ? (
        <Suspense fallback={null}>
          <TestLab />
        </Suspense>
      ) : null
    case 'doc':
      return <DocWindow fileId={win.fileId!} preview={win.preview} />
  }
}

export function Desktop({ onLogOff }: { onLogOff: () => void }) {
  const { windows, open, lockFor } = useWindows()
  useCaseTimer()
  useCountdownWatcher()
  useTimedGame()
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
