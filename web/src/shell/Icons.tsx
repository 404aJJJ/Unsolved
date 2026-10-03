// Original Aero-flavoured icons. No third-party or Microsoft artwork.
import { useId } from 'react'
import type { AppId } from '../store/windows'

type P = { size?: number }

function Gloss({ id, a, b }: { id: string; a: string; b: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  )
}

export function FolderIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}b`} a="#e9c46a" b="#b8862b" />
        <Gloss id={`${g}f`} a="#fff1c1" b="#e6b450" />
      </defs>
      <path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={`url(#${g}b)`} />
      <rect x="9" y="15" width="30" height="20" rx="1" fill="#fff" opacity=".9" transform="rotate(-4 24 25)" />
      <rect x="11" y="17" width="26" height="1.6" fill="#9aa7b4" transform="rotate(-4 24 25)" />
      <rect x="11" y="21" width="20" height="1.6" fill="#9aa7b4" transform="rotate(-4 24 25)" />
      <path d="M4 20a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3l-2 18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill={`url(#${g}f)`} />
      <path d="M5 20a2 2 0 0 1 2-2h34a2 2 0 0 1 2 2v3H5z" fill="#fff" opacity=".45" />
      <rect x="18" y="26" width="12" height="7" rx="1" fill="#8b1e1e" opacity=".85" />
      <text x="24" y="31.6" fontSize="5" fill="#fff" textAnchor="middle" fontFamily="Segoe UI, Tahoma, sans-serif" fontWeight="700">
        CASE
      </text>
    </svg>
  )
}

export function MailIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}e`} a="#ffffff" b="#c9d8e6" />
        <Gloss id={`${g}s`} a="#5fb3f0" b="#1d5fa8" />
      </defs>
      <rect x="5" y="12" width="38" height="26" rx="3" fill={`url(#${g}e)`} stroke="#6f8aa3" />
      <path d="M6 14l18 13 18-13" fill="none" stroke="#6f8aa3" strokeWidth="1.6" />
      <path d="M6 37l14-11M42 37L28 26" stroke="#9fb3c6" strokeWidth="1.2" />
      <circle cx="37" cy="13" r="7" fill={`url(#${g}s)`} stroke="#fff" strokeWidth="1.5" />
      <text x="37" y="16.2" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700" fontFamily="Segoe UI, Tahoma, sans-serif">
        4
      </text>
    </svg>
  )
}

export function ChatIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}a`} a="#8de08a" b="#2f9a3a" />
        <Gloss id={`${g}b`} a="#7cc4f7" b="#2a73c2" />
      </defs>
      <path d="M6 10h24a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H16l-7 6v-6H6a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill={`url(#${g}b)`} />
      <path d="M20 20h20a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-2v5l-6-5H20a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" fill={`url(#${g}a)`} stroke="#fff" strokeWidth="1.2" />
      <path d="M6 11h24a3 3 0 0 1 3 3v3H3v-3a3 3 0 0 1 3-3z" fill="#fff" opacity=".35" />
    </svg>
  )
}

export function NotesIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}p`} a="#fffbe0" b="#f3e39a" />
      </defs>
      <rect x="9" y="6" width="30" height="37" rx="2" fill={`url(#${g}p)`} stroke="#b9a35a" />
      {[14, 19, 24, 29, 34].map((y) => (
        <rect key={y} x="13" y={y} width={y === 34 ? 14 : 22} height="1.4" fill="#8aa4c8" />
      ))}
      <rect x="9" y="6" width="30" height="5" rx="2" fill="#d9534f" />
      <path d="M33 30l7-7 3 3-7 7-4 1z" fill="#2b4a73" />
    </svg>
  )
}

export function BoardIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}c`} a="#c99a64" b="#8c5f32" />
      </defs>
      <rect x="3" y="7" width="42" height="33" rx="2" fill="#5b3a1e" />
      <rect x="6" y="10" width="36" height="27" fill={`url(#${g}c)`} />
      <rect x="9" y="13" width="9" height="11" fill="#fff" transform="rotate(-5 13 18)" />
      <rect x="29" y="14" width="9" height="11" fill="#fff" transform="rotate(6 33 19)" />
      <rect x="19" y="24" width="9" height="10" fill="#fff8d0" transform="rotate(-2 23 29)" />
      <path d="M13 15L33 16M33 16L23 26M13 15L23 26" stroke="#c0262d" strokeWidth="1.2" fill="none" />
      {[
        [13, 15],
        [33, 16],
        [23, 26],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1.8" fill="#e23b3b" stroke="#7a0f12" strokeWidth=".6" />
      ))}
      <rect x="10" y="40" width="3" height="5" fill="#5b3a1e" />
      <rect x="35" y="40" width="3" height="5" fill="#5b3a1e" />
    </svg>
  )
}

export function ReportIcon({ size = 48 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}g`} a="#f6d365" b="#c9922b" />
      </defs>
      <rect x="10" y="5" width="28" height="36" rx="2" fill="#fff" stroke="#8796a6" />
      {[11, 15, 19, 23].map((y) => (
        <rect key={y} x="14" y={y} width="20" height="1.4" fill="#a9b6c3" />
      ))}
      <path d="M24 27l9 3v6c0 5-4 8-9 10-5-2-9-5-9-10v-6z" fill={`url(#${g}g)`} stroke="#7a5a12" />
      <path d="M20 36l3 3 6-6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function DocIcon({ size = 48, locked = false }: P & { locked?: boolean }) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <Gloss id={`${g}d`} a="#ffffff" b="#dbe4ee" />
        <Gloss id={`${g}l`} a="#ffe28a" b="#d39b1c" />
      </defs>
      <path d="M11 4h19l9 9v30a1 1 0 0 1-1 1H11a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" fill={`url(#${g}d)`} stroke="#8796a6" />
      <path d="M30 4v9h9" fill="#c7d3df" stroke="#8796a6" />
      {[18, 22, 26, 30, 34].map((y) => (
        <rect key={y} x="15" y={y} width={y === 34 ? 12 : 20} height="1.4" fill="#a9b6c3" />
      ))}
      {locked && (
        <g transform="translate(24 24)">
          <path d="M5 9V6a6 6 0 0 1 12 0v3" fill="none" stroke="#6b7a89" strokeWidth="3" />
          <rect x="2" y="9" width="18" height="14" rx="2.5" fill={`url(#${g}l)`} stroke="#8a6410" />
          <circle cx="11" cy="15" r="2" fill="#6b4a06" />
          <rect x="10.2" y="15" width="1.6" height="4" fill="#6b4a06" />
        </g>
      )}
    </svg>
  )
}

export function ShieldIcon({ size = 40 }: P) {
  const g = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <defs>
        <linearGradient id={`${g}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4aa3f0" />
          <stop offset=".5" stopColor="#1f5fae" />
          <stop offset=".5" stopColor="#f2c230" />
          <stop offset="1" stopColor="#c48a12" />
        </linearGradient>
      </defs>
      <path d="M24 3l17 6v13c0 11-7 19-17 23C14 41 7 33 7 22V9z" fill={`url(#${g}s)`} stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

export function MagnifierGlyph({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="10" cy="10" r="6" fill="rgba(255,255,255,.25)" stroke="#fff" strokeWidth="2.4" />
      <path d="M14.5 14.5L20 20" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function AppIcon({ app, size = 48 }: { app: AppId; size?: number }) {
  switch (app) {
    case 'files':
      return <FolderIcon size={size} />
    case 'mail':
      return <MailIcon size={size} />
    case 'messages':
      return <ChatIcon size={size} />
    case 'notes':
      return <NotesIcon size={size} />
    case 'board':
      return <BoardIcon size={size} />
    case 'report':
      return <ReportIcon size={size} />
    case 'doc':
      return <DocIcon size={size} />
  }
}
