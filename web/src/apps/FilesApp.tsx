import { useState } from 'react'
import { FILES } from '../content/case'
import type { FileId } from '../content/types'
import { useGame } from '../store/game'
import { useWindows } from '../store/windows'
import { DocIcon, FolderIcon } from '../shell/Icons'
import { openFile } from './files'

export function FilesApp() {
  const unlocked = useGame((s) => s.unlocked)
  const opened = useGame((s) => s.opened)
  const justUnlocked = useWindows((s) => s.justUnlocked)
  const [selected, setSelected] = useState<FileId>('01')
  const locked = (id: FileId) => !!FILES.find((f) => f.id === id)?.lock && !unlocked[id]
  const sel = FILES.find((f) => f.id === selected)!
  const available = FILES.filter((f) => !locked(f.id)).length

  return (
    <div className="explorer">
      <div className="explorer__bar">
        <div className="crumbs">
          <span>Investigation</span>
          <span className="crumbs__sep">›</span>
          <span>Case PB-062</span>
          <span className="crumbs__sep">›</span>
          <strong>Evidence</strong>
        </div>
        <input className="search" placeholder="Search Evidence" aria-label="Search evidence" />
      </div>
      <div className="explorer__cmd">
        <button className="cmd" onClick={() => openFile(selected)}>
          {locked(selected) ? 'Request access' : 'Open'}
        </button>
        <span className="cmd__info">{available} of {FILES.length} records available</span>
      </div>
      <div className="explorer__main">
        <nav className="explorer__nav">
          <div className="nav__head">Favorite Links</div>
          <div className="nav__item nav__item--on">
            <FolderIcon size={16} /> Evidence
          </div>
        </nav>
        <div className="explorer__grid" role="listbox" aria-label="Evidence files">
          {FILES.map((f, i) => (
            <button
              key={f.id}
              style={{ animationDelay: `${i * 35}ms` }}
              role="option"
              aria-selected={selected === f.id}
              className={`file ${selected === f.id ? 'file--sel' : ''} ${locked(f.id) ? 'file--locked' : ''} ${justUnlocked === f.id ? 'file--unlocked' : ''}`}
              onClick={() => setSelected(f.id)}
              onDoubleClick={() => openFile(f.id)}
            >
              <DocIcon size={56} locked={locked(f.id)} />
              <span className="file__name">
                {f.number} - {f.title}
                {!locked(f.id) && !opened.includes(f.id) && <em className="file__new">NEW</em>}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="explorer__details">
        <DocIcon size={40} locked={locked(sel.id)} />
        <div>
          <strong>
            {sel.number} - {sel.title}
          </strong>
          <div>
            {sel.kind} · {locked(sel.id) ? 'Restricted: access reference required' : 'Available'}
          </div>
        </div>
      </div>
    </div>
  )
}
