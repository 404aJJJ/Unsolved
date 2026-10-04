# Roadmap and work plan

Based on the team story bible (private; see `docs/private/story-bible.md` locally). Deadline not yet recorded here: add it, then back-fill times.

## Lanes
| Lane | Owns | Skills |
|---|---|---|
| **Foundation / frontend** | Vista shell, windows, apps, file viewer, lock UI, Submit Report | JS/TS, React |
| **Backend** | FastAPI: unlock validation, locked-file serving, hints, accusation grading, Gemini, Vultr deploy | Python |
| **Content** | Turn the six Google Docs into app content; fix story issues; write missing lines | Writing |
| **Tooling / QA** | Case validator, API tests, playthrough test | Java |
| **Minigames** | PIN dialog, hack, magnifier, cross-examination | React/TS (frontend people; can pair) |
| **Extras** | ElevenLabs voice (backend call, frontend playback), GoDaddy domain, art | Python for the voice call, anyone for the rest |

Stack by lane: **React + Vite + TypeScript** for all frontend work (shell, apps, minigames). **Python (FastAPI)** for the backend. **Java only for tooling and QA** (tests and the case validator); nothing the player runs is in Java.

## Phases (each is shippable on its own)

### 1. Foundation (frontend lead)
- [x] Scaffold Vite + React + TS in `/web` (replace the placeholder files)
- [x] Vista shell: wallpaper, taskbar, start orb, clock, draggable windows (store of window state)
- [x] Desktop icons: Files, Mail, Messages, Notes, Case Board, Submit Report
- [x] Content components: `EmailView`, `MessageThread`, `DocView`, `InterviewView`
- [x] File registry with stable IDs `01`-`06`, locked state in a store
- [x] Mock API in the frontend so work never blocks on the backend

### 2. Contract and content (can start immediately, in parallel)
- [x] `docs/api.md`: endpoints and JSON shapes (frontend, backend and Java lane all code to this)
- [ ] Convert the six evidence Google Docs to structured content (markdown with front matter, see case-format.md)
- [ ] Resolve the story issues in the private issues list before anyone builds on the text
- [ ] Remove the in-doc authoring note from file 03 before it reaches the app
- [ ] Standardize time format across files (one style, "Day 1 / Day 2")
- [ ] Add the missing interview lines needed by cross-examination (see ui/minigame notes)
- [ ] Suspect profile cards (age, role, background) for Case Board

### 3. Backend (Python lane)
- [ ] FastAPI skeleton, CORS, run locally
- [ ] `GET /case` public data (suspects, files 01-03, lock prompts, hints)
- [ ] `POST /unlock {fileId, answer}`: server compares (trim, case-insensitive, 4-digit numeric strings); on success returns the file content
- [ ] Locked contents never served before unlock; unlocked state kept per session
- [x] `POST /accuse`: culprit, evidence claims, free-text theory; returns verdict, per-claim feedback, reasoning-chain explanation (dev implementation in `web/dev-api/accuse.ts`, Python port pending)
- [x] Gemini grading with structured JSON, prompt-injection guard, static fallback, cached verdicts (dev implementation; needs a real key to test live)
- [ ] Deploy to Vultr; register the domain at GoDaddy and point it at the deploy

### 4. Locks and minigames (build in this order)
- [x] Generic lock flow (`web/src/minigames/useUnlock.ts` + `LockDialog`): server validation, progressive hints, no lockout, plain-text fallback
- [x] File 04: PIN dialog (permission-prompt style)
- [x] File 05: GTA-style hack minigame
- [x] File 06: magnifier minigame (written text stays readable; plate comes from a `specimen` block in file 05)
- [ ] Submit Report: Ace Attorney-style cross-examination, then the free-text theory

### 5. Polish and demo
- [ ] Clip-and-drag into Notes, Case Board pinning
- [~] ElevenLabs narration: frontend ready (narrator, buttons, `/api/config` + `/api/narrate` contract, dev mock, browser-voice fallback); backend endpoint and voiced statements pending
- [ ] Sounds, animations, window polish
- [ ] Completion screen with the epilogue
- [ ] Playtest by someone who did not write the clues; fix anything unfindable
- [ ] Feature freeze 1-2 hours before the deadline; demo script and submission

## Tooling lane (Java)
- [ ] `/tests`: API tests against the contract, first for `/unlock` and `/accuse`
- [ ] Case validator: IDs resolve; every unlock answer appears in an earlier file; all timestamps agree across files
- [ ] Playthrough test: the winning path and a wrong-accusation path
- [ ] Bug list; retest after fixes

## Dependencies
- Frontend, backend and tooling all wait on `docs/api.md`: write it first
- Locks need real answers on the server (gitignored `server/private/` or env vars) before `/unlock` works
- Cross-examination needs content from the Content lane (statements per suspect)
- The final accusation needs the backend rubric

## Rules
- Each person on their own branch, small PRs into `main`; deploy from `main`
- Core game must work with every AI feature off
- Solution and answers stay server-side and out of committed docs
