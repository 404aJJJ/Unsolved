# UI direction

## Decision
Desktop-first, **Windows Vista / Aero-style** OS shell. Mobile on hold.

## References
- L.A. Noire: Documents and Intel / Codex and Journal screens (case file feel, skeuomorphic paper)
- Batman: Arkham Knight: forensic scan overlays (use for the gem analysis / magnifier)
- Phoenix Wright: Ace Attorney: dialogue choice, present-evidence, item-get modals
- Links: gameuidatabase.com ids 523 (L.A. Noire), 187 (Arkham Knight), 1939 (Ace Attorney Trilogy)

## Look
- Glass window chrome (translucent, blurred), glossy buttons, red close button, rounded corners
- Blue/teal gradient wallpaper (original artwork), taskbar with start orb, system-tray clock
- Sidebar gadgets: clock, a "case status" gadget (files unlocked 3/6)
- Explorer-style Files window: breadcrumb bar, details pane, padlock overlay on locked files
- Mail styled like a desktop mail client; Messages like an old IM client
- Lock prompts styled as an "Access denied / permission needed" dialog
- Fonts: Segoe UI, falling back to Tahoma/system sans
- Original assets only. No Microsoft logos, wallpapers, icons or startup sounds, and do not call it Windows

## Tech
- **7.css** (Windows 7 / Aero CSS library, MIT) gets most of the chrome for free. Verify the license and that it works with React before committing.
- Window manager: a Zustand store of windows (id, position, z-index, minimized). Use react-rnd or a small custom drag handler. No resize/snap.
- `backdrop-filter: blur()` for the glass; test in Chrome and Safari.

## Risks
- Pixel-perfect Vista will eat time. Aim for "reads as Vista", not a clone.
- Build the shell and the Files/Mail apps first; style polish last.
