// Analog clock face. Pass a Date plus an optional IANA time zone; hands follow that zone's wall time.
function wallTime(now: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { h: get('hour') % 24, m: get('minute'), s: get('second') }
}

export function AnalogClock({ now, timeZone, size = 120, seconds = true }: { now: Date; timeZone?: string; size?: number; seconds?: boolean }) {
  const { h, m, s } = wallTime(now, timeZone)
  const hourDeg = ((h % 12) + m / 60) * 30
  const minDeg = (m + s / 60) * 6
  const secDeg = s * 6
  return (
    <svg className="aclock" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}>
      <circle cx="60" cy="60" r="57" className="aclock__rim" />
      <circle cx="60" cy="60" r="52" className="aclock__face" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="60" y1={i % 5 === 0 ? 11 : 9} x2="60" y2={i % 5 === 0 ? 19 : 12} className={i % 5 === 0 ? 'aclock__tick aclock__tick--hour' : 'aclock__tick'} transform={`rotate(${i * 6} 60 60)`} />
      ))}
      <line x1="60" y1="64" x2="60" y2="32" className="aclock__hand aclock__hand--h" transform={`rotate(${hourDeg} 60 60)`} />
      <line x1="60" y1="66" x2="60" y2="18" className="aclock__hand aclock__hand--m" transform={`rotate(${minDeg} 60 60)`} />
      {seconds && <line x1="60" y1="70" x2="60" y2="14" className="aclock__hand aclock__hand--s" transform={`rotate(${secDeg} 60 60)`} />}
      <circle cx="60" cy="60" r="3.2" className="aclock__pin" />
    </svg>
  )
}
