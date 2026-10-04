import type { Block, ChatMessage, Email, FileDoc } from '../content/types'
import { GemSpecimen } from '../minigames/Magnifier'

export function EmailView({ email, compact = false }: { email: Email; compact?: boolean }) {
  return (
    <article className={`email ${compact ? 'email--compact' : ''}`}>
      <header className="email__head">
        <h3 className="email__subject">{email.subject}</h3>
        <dl className="email__meta">
          <dt>From</dt>
          <dd>{email.from}</dd>
          <dt>To</dt>
          <dd>{email.to}</dd>
          <dt>Sent</dt>
          <dd>{email.sent}</dd>
        </dl>
      </header>
      <div className="email__body">
        {email.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </article>
  )
}

export function MessageThread({ title, msgs, speakingIndex = -1 }: { title?: string; msgs: ChatMessage[]; speakingIndex?: number }) {
  const first = msgs[0]?.from
  return (
    <div className="thread">
      {title && <div className="thread__title">{title}</div>}
      {msgs.map((m, i) => (
        <div key={i} style={{ animationDelay: `${i * 90}ms` }} className={`bubble ${m.from === first ? 'bubble--them' : 'bubble--me'}${i === speakingIndex ? ' bubble--speaking' : ''}`}>
          <span className="bubble__from">
            {m.from}
            {m.time && <span className="bubble__time"> · {m.time}</span>}
          </span>
          <span className="bubble__text">{m.text}</span>
        </div>
      ))}
    </div>
  )
}

export function InterviewView({ who, role, lines }: { who: string; role?: string; lines: string[] }) {
  const initials = who
    .split(' ')
    .map((p) => p[0])
    .join('')
  return (
    <section className="statement">
      <div className="statement__avatar">{initials}</div>
      <div>
        <div className="statement__who">
          {who}
          {role && <span className="statement__role"> · {role}</span>}
        </div>
        {lines.map((l, i) => (
          <blockquote key={i}>“{l}”</blockquote>
        ))}
      </div>
    </section>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'h':
      return <h2 className="doc__h">{block.text}</h2>
    case 'p':
      return <p className="doc__p">{block.text}</p>
    case 'note':
      return <p className="doc__note">{block.text}</p>
    case 'rows':
      return (
        <table className="doc__rows">
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                <th>{r.k}</th>
                <td>{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'statement':
      return <InterviewView who={block.who} role={block.role} lines={block.lines} />
    case 'chat':
      return <MessageThread title={block.title} msgs={block.msgs} />
    case 'email':
      return <EmailView email={block.email} compact />
    case 'specimen':
      return <GemSpecimen engraving={block.engraving} caption={block.caption} />
  }
}

export function DocView({ doc }: { doc: FileDoc }) {
  return (
    <div className="doc">
      <div className="doc__page">
        <div className="doc__stamp">EVIDENCE {doc.id}</div>
        <div className="doc__letterhead">PREMIER BANK · CASE PB-062</div>
        <h1 className="doc__title">{doc.heading}</h1>
        {doc.sub.map((s, i) => (
          <p key={i} className="doc__sub">
            {s}
          </p>
        ))}
        <hr />
        {doc.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </div>
    </div>
  )
}
