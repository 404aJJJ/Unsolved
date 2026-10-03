# Game design (draft v2)

Working title: **Unsolved.exe**

## Premise (player-facing)
London, present day. A high-value diamond held at a bank ahead of an auction has been swapped or stolen. Discovery comes the morning after an appraisal. Six people of interest. The player works through case records on a detective's computer, unlocks supplementary evidence, and names who did it and how.

Spoiler policy: the solution, culprit and unlock answers are NOT in this repo's docs. They live in the team's private planning doc and, at runtime, only on the server. Docs here refer to evidence by file ID only.

## Core idea
The whole game is a **desktop operating system** the player pokes around in. Evidence is files. Locked files are opened by short **minigames**. Information found in one file is the key to the next. Finally the player writes up their theory and picks supporting evidence.

## The desktop
Icons on the desktop (each opens a window; on mobile each opens full-screen):

| App | Contents |
|---|---|
| **Files** | The six evidence files (01-06) shown as folders/docs, locked ones with a padlock |
| **Mail** | Appraisal correspondence, visitor registration, lab requests (rendered as real email UI) |
| **Messages** | Texts between suspects, chat threads |
| **Notes** | The player's notebook plus a clipboard of "clipped" snippets from any file |
| **Case Board** | Six suspect cards; pin clues and timeline items to them |
| **Terminal** | Where decrypt-style locks run |
| **Submit Report** | Final accusation (locked until all files are opened, but not auto-triggered) |

Desktop (primary): draggable, stackable windows, taskbar, clock. Mobile (stretch): phone-style app grid, one app at a time. Build the window manager as simple as possible; do not spend hours on resize/snap.

## Evidence structure (six files, stable IDs `01`-`06`)
- `01` Incident Report, `02` Interviews and Messages, `03` Appraisal Correspondence: open at start
- `04` and `05`: locked, unlocked from the starting records, in either order
- `06`: locked, needs a reference found in `05`
- No lock ever requires already knowing the culprit. Each unlock answer is found by reading an earlier file.

## Minigame locks
Each lock is one pluggable component with the same interface: it shows a prompt, takes the player's input, asks the server to validate, and offers hints. The **answer is always something retrievable from a prior file**, so the minigame is a skin over a retrieval puzzle, not a replacement for it.

| File | Lock style | Minigame idea | Answer type |
|---|---|---|---|
| 04 | Numeric | **Keypad / safe dial**: spin four digits; confirm by holding | 4 digits |
| 05 | Keyword | **Decrypt terminal**: letters scrambled or cipher-wheel; player types or arranges the codename | Word |
| 06 | Numeric | **Magnifier**: drag a lens over the gem image to find the engraving, then enter the digits | 4 digits |

Rules every lock follows:
- Trim whitespace and compare case-insensitively
- Numeric answers are four-digit strings
- Plain text input is always available as a fallback, so a broken minigame never blocks progress
- Hint ladder, offered progressively after wrong attempts, with **no lockout**
- Written text of the clue must stay readable. The magnifier never depends on image quality

### The "clip" mechanic (cross-file linking)
Any text in an open file can be **clipped** into Notes. Locks accept a clipped snippet by drag-and-drop. This makes "use content from files you already unlocked to open the next one" a literal, tactile action, and it doubles as the note-taking system.

## Accusation (end game)
Opening file 06 does not end the game. The player opens **Submit Report** and:
1. Names the culprit
2. Attaches supporting evidence to three claims: **opportunity**, **the false alibi**, **the matching replica**
3. Writes a free-text theory of how it happened

Server-side Gemini grades the theory against a hidden rubric (see tracks.md). The result screen **explains the chain of reasoning**, not just right/wrong, then plays the completion epilogue (recovery of the stone lives here, not as an evidence file).
Fallback if the AI is down: dropdown culprit plus evidence slots, graded by exact match.

## Content principles
- Text-first. Emails and texts are web components, not images
- Investigator transcriptions stand in for footage
- Keep file IDs stable. Keep solution text out of the player-facing UI and out of the client bundle

## Scope
MVP (must ship)
- Desktop shell with Files, Mail, Messages, Notes
- Six evidence files rendered
- All three locks working with plain-input fallback and hint ladder
- Submit Report with evidence slots and grading

Next
- The three minigame skins (keypad first, decrypt second, magnifier third)
- Clip-and-drag, Case Board
- Gemini grading, ElevenLabs narration/voiced interviews

Stretch
- Mobile app-grid layout, sound, additional cases

## Playtest
Before the demo, a teammate who did not write the clues plays from files 01-03. Check: every unlock answer is findable, every timestamp agrees across files, and the final explanation rests on independent evidence rather than motive alone.
