import { BoardApp, DocWindow, MailApp, MessagesApp, NotesApp, ReportApp } from '../apps/Apps'
import { FilesApp } from '../apps/FilesApp'
import { LockDialog } from '../apps/LockDialog'
import { FILES } from '../content/case'
import { useGame } from '../store/game'
import { useWindows, type AppId, type Win } from '../store/windows'
import { AppIcon } from './Icons'
import { Taskbar } from './Taskbar'
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
    case 'doc':
      return <DocWindow fileId={win.fileId!} />
  }
}

function CaseGadget() {
  const unlocked = useGame((s) => s.unlocked)
  const count = FILES.filter((f) => !f.lock || unlocked[f.id]).length
  return (
    <aside className="gadget" aria-label="Case status">
      <div className="gadget__title">Case PB-062</div>
      <div className="gadget__big">
        <span key={count} className="gadget__num">
          {count}
        </span>
        <small>/6</small>
      </div>
      <div className="gadget__label">records recovered</div>
      <div className="progress progress--dark">
        <div className="progress__fill" style={{ width: `${(count / 6) * 100}%` }} />
      </div>
      <div className={`gadget__status ${count === 6 ? 'gadget__status--ready' : ''}`}>{count === 6 ? 'Ready to report' : 'Investigation open'}</div>
    </aside>
  )
}

export function Desktop({ onLogOff }: { onLogOff: () => void }) {
  const { windows, open, lockFor } = useWindows()
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
      <CaseGadget />
      {windows.map((w) => (
        <Window key={w.id} win={w}>
          <AppBody win={w} />
        </Window>
      ))}
      {lockFor && <LockDialog key={lockFor} fileId={lockFor} />}
      <Taskbar onLogOff={onLogOff} />
    </div>
  )
}
