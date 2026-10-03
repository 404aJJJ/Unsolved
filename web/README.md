# web

Frontend for Unsolved.exe. See the root README to run it, and `docs/api.md` for the API contract.

- `src/shell/` – desktop, windows, taskbar, start menu, login, icons
- `src/apps/` – Case Files, lock prompt, case viewer, Mail, Messages, Notes, Case Board, Submit Report
- `src/components/content.tsx` – `DocView`, `EmailView`, `MessageThread`, `InterviewView`
- `src/content/` – types and public case content (files 01-03 only)
- `src/store/` – window manager and game state (Zustand; game state persists in localStorage)
- `src/api/` – API client; `vite.config.ts` holds the dev mock API
