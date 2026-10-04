import { useEffect, useState } from 'react'
import './minigames.css'

// File 04 skin: four-digit keypad. Keyboard digits work too; submits as soon as four are in.
export function PinPad({ onSubmit, disabled }: { onSubmit: (pin: string) => Promise<boolean>; disabled: boolean }) {
  const [pin, setPin] = useState('')

  const press = (k: string) => {
    if (disabled) return
    if (k === 'clear') return setPin('')
    if (k === 'back') return setPin((p) => p.slice(0, -1))
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      onSubmit(next).then((ok) => !ok && setPin(''))
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
      else if (e.key === 'Escape') return
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

  return (
    <div className="pin">
      <div className="pin__slots" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin__slot ${i < pin.length ? 'pin__slot--on' : ''} ${i === pin.length ? 'pin__slot--cur' : ''}`}>
            {pin[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="pin__pad">
        {keys.map((k) => (
          <button key={k} type="button" className={`pin__key ${k.length > 1 ? 'pin__key--fn' : ''}`} onClick={() => press(k)} disabled={disabled}>
            {k === 'clear' ? 'Clear' : k === 'back' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  )
}
