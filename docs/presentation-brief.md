# Briefing notes: slides, presentation and demo

For whoever is writing the slides and helping run the demo. Spoiler-free on purpose. The solution, unlock answers and a demo run-sheet are in `docs/private/demo-script.md` (gitignored; get it from James).

## The one-liner
**Unsolved.exe** is a detective casefile game that runs in the browser as a fake Vista-style desktop. Evidence is files, locked files are opened by minigames, and the clue to each lock is hidden in a file you already opened. Built at RowdyHacks '26.

## The pitch (30 seconds)
London, present day. A famous diamond held at a bank was swapped during an appraisal and nobody noticed until the next morning. Six people of interest. You get a detective's computer: incident report, interviews, emails. Dig through the files, crack the locks, then file a report naming who did it and how. An AI grades your reasoning and explains what you got right and what you missed.

## What makes it different (slide material)
1. **The whole game is an operating system.** Windows, taskbar, Mail, Messages, Notes, Files. Original artwork; "reads as Vista", no Microsoft assets, and we never call it Windows.
2. **Locks are retrieval puzzles, not guesses.** Every unlock answer is findable in an earlier file. A hint ladder appears after wrong attempts and there is no lockout.
3. **Three different minigames** skin the locks: a UAC-style PIN pad, a GTA-style hacking grid, and a magnifier you drag over the gem to find an engraving. A plain text box is always available as a fallback.
4. **The answer never ships to the browser.** Unlock answers, locked file contents and the grading rubric live only on the server. Players cannot read the culprit out of devtools.
5. **Free-text accusation graded by Gemini.** You write your theory in your own words. The server grades it against a hidden rubric and the result screen explains the reasoning chain without handing over missed answers.
6. **Character voices (ElevenLabs).** Nothing autoplays. Chat messages, interview statements and character emails have a Listen button; each person speaks in their own voice, and the message being spoken is highlighted. Case documents and the verdict are not narrated.
7. **Graceful fallbacks.** With every AI feature off the game still plays (static grading, browser voice).

## Prize tracks and the honest claim for each
| Track | What to say | Where to point in the demo |
|---|---|---|
| **Vultr** | The whole game runs on one Vultr Cloud Compute server: Docker compose, Caddy for HTTPS, FastAPI + SQLite, per-player sessions via cookie | Open the live URL; mention the deploy script |
| **GoDaddy** | Domain registered through GoDaddy and pointed at the Vultr server | Show the URL bar. **Confirm with James this is actually done before claiming it** (the guide says the A record still had to be created) |
| **ElevenLabs** | Narration for documents, emails, chats and the verdict | Click Listen on a document; Voice chip in the taskbar |
| **Gemini** | Free-text theory graded server-side with structured JSON output, prompt-injection guard, cached verdicts, static fallback | The Submit Report flow |

Skipped on purpose: Tiger Data, Solana, Presage. If a judge asks, the answer is "no natural fit; we focused on one polished case".

## Tech stack (one slide)
- **Frontend:** React + TypeScript + Vite + Zustand, hand-built window manager, 7.css-style glass chrome
- **Backend:** Python FastAPI, SQLite for per-player progress and notes
- **AI/voice:** Gemini API (grading), ElevenLabs (narration)
- **Deploy:** Vultr + Docker + Caddy; static assets as WebP (~90% smaller) and public files served as plain static files
- **Team lanes:** frontend/foundation, Python backend, content, QA tooling

## What is and is not built (do not over-claim)
| Done | Not done / partial |
|---|---|
| Vista shell, draggable windows, taskbar, clock, widgets | **Ace Attorney-style cross-examination is not built.** Submit Report is currently a form: pick the culprit, attach up to three records, write a theory |
| Files, Mail, Messages, Notes apps; six evidence files | Clip-and-drag into Notes and Case Board pinning are not done |
| All three lock minigames (PIN, hack, magnifier) | Java QA lane (validator, API tests) is not a shipped feature |
| Server-side unlocks, per-player sessions, hint ladder | Gemini and ElevenLabs need real keys on the server; check they are set on the live deploy before demoing |
| Gemini-graded accusation, verdict with reasoning chain | Mobile layout (desktop only) |
| Timed mode (30:00) and untimed mode | Single case only |
| Narration (opt-in), boot screen with real server checks | |
| Deployed to Vultr | |

Slides should show the Case Board and cross-examination only as "next steps", not as features.

## Suggested slide outline (8-10 slides)
1. Title and one-liner
2. The problem/idea: detective games where the puzzle is reading, not guessing
3. The case premise (no spoilers)
4. The desktop: screenshot of the shell with Files, Mail, Messages open
5. Locks as minigames: three screenshots (PIN, hack, magnifier)
6. Server-side secrets: why the answer never reaches the browser (simple diagram: browser -> `/api/unlock` -> server)
7. AI grading and narration (Gemini, ElevenLabs)
8. Architecture and deploy (Vultr, Docker, Caddy, FastAPI)
9. What we would build next (cross-examination, Case Board, more cases)
10. Team and thanks

## Demo tips
- Run from the **live Vultr URL**, not localhost, since that is the Vultr claim. Have localhost as a backup.
- Start a **fresh player** (private window or clear cookies): progress is per browser via cookie, so an old session will skip the locks you want to show.
- The log-on screen asks for a mode. **Timed** is more dramatic; **Untimed** is safer if you are talking while playing.
- Do not narrate-by-default; press Listen on a chat thread once for effect (the voices are the point).
- Never open the Test Lab on the live site; it should be off in production.
- Rehearse the winning path from the private script at least twice and time it. The full path should fit a 3-4 minute demo.
- Have the failure plan ready: if Gemini is slow or down, the verdict falls back to static grading. Say so rather than waiting in silence.

## Terms and wording
- It is a **casefile game**, the evidence items are **files 01-06**, the final step is the **report** (button: Submit Report).
- Refer to the case as **PB-062** and the setting as **a London bank**. Do not name the culprit, the swap method, or any unlock answer in slides, README, or Devpost.
- Say "Vista-style", not "Windows".

## Where to find things
- Repo: https://github.com/404aJJJ/Unsolved (branches `James`, `Noah`, `Bad-Alex`; deploy from `main`)
- Design: `docs/game-design.md`, `docs/ui-direction.md`
- Prize plans: `docs/tracks.md`
- API and deploy: `docs/api.md`, `docs/deploy-vultr.md`
- Run it locally: `README.md` (needs `server/private/case-private.json` from the team to unlock files 04-06)
