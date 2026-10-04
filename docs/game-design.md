# Game design (draft v2)

Working title: **Unsolved.exe**

## Premise (player-facing)
London, present day. A high-value diamond held at a bank ahead of an auction has been swapped or stolen. Discovery comes the morning after an appraisal. Six people of interest. The player works through case records on a detective's computer, unlocks supplementary evidence, and names who did it and how.

Spoiler policy: the solution, culprit and unlock answers are NOT in this repo's docs. They live in the team's private planning doc and, at runtime, only on the server. Docs here refer to evidence by file ID only.

## Core idea
The whole game is a **desktop operating system** the player pokes around in. Evidence is files. Locked files are opened by short **minigames**. Information found in one file is the key to the next. Finally the player writes up their theory and picks supporting evidence.

## UI
Windows Vista / Aero-style desktop. Full direction in [ui-direction.md](ui-direction.md).

Apps (icons on the desktop, each opens a draggable window):

| App | Contents |
|---|---|
| **Files** | The six evidence files (01-06), padlocks on locked ones |
| **Mail** | Appraisal correspondence, visitor registration, lab requests |
| **Messages** | Texts between suspects, chat threads |
| **Notes** | Notebook plus clipboard of clipped snippets |
| **Case Board** | Six suspect cards; pin clues to them |
| **Submit Report** | Final accusation / cross-examination (not auto-triggered) |

Desktop only for now; mobile is on hold.

## Evidence structure (six files, stable IDs `01`-`06`)
- `01` Incident Report, `02` Interviews and Messages, `03` Appraisal Correspondence: open at start
- `04` and `05`: locked, unlocked from the starting records, in either order
- `06`: locked, needs a reference found in `05`
- No lock ever requires already knowing the culprit. Each unlock answer is found by reading an earlier file.

## Minigames
Locks are pluggable components with one interface: prompt, input, server validation, hints. **The answer is always retrievable from a prior file**, so a minigame is a skin over a retrieval puzzle.

| Where | Minigame | Inspiration | Answer |
|---|---|---|---|
| File 04 lock | **PIN dialog**: simple permission-prompt keypad | Vista UAC | 4 digits |
| File 05 lock | **Hack**: scrolling character grid; lock onto the codename's letters in order before the timer ends | GTA Online hacking | Word |
| File 06 lock | **Magnifier**: drag a lens over the gem image to find the engraving, enter the digits | Arkham-style scan | 4 digits |
| Submit Report | **Cross-examination**: statements from the suspect's interview shown one at a time; player picks Press or Present Evidence on the contradicting one | Ace Attorney | Evidence choice |

Cross-examination replaces the plain evidence slots in the accusation. Three contradictions map to the three claims: opportunity, the false alibi, the matching replica. Wrong presentations cost "credibility" (a soft penalty that affects the final rating). There is no game over.

Rules every lock follows:
- Trim whitespace; compare case-insensitively; numeric answers are four-digit strings
- Plain text input is always available as a fallback, so a broken minigame never blocks progress
- Hint ladder, offered progressively after wrong attempts, with no lockout
- The written clue stays readable; the magnifier never depends on image quality
- The hack minigame has no hard fail: running out of time restarts it

### The "clip" mechanic (cross-file linking)
Any text in an open file can be **clipped** into Notes. Locks accept a clipped snippet by drag-and-drop. This makes "use content from files you already unlocked to open the next one" a literal, tactile action, and it doubles as the note-taking system.

## Accusation (end game)
Opening file 06 does not end the game. The player opens **Submit Report**:
1. Names the culprit
2. Cross-examines the suspect: present the right evidence at the right statement for opportunity, the false alibi and the matching replica
3. Writes a free-text theory of how it happened

Server-side Gemini grades the theory against a hidden rubric (see tracks.md). The result screen **explains the chain of reasoning**, then plays the epilogue (recovery of the stone lives here, not in an evidence file). Fallback if the AI is down: dropdown culprit plus the cross-examination, graded by exact match.

## Content principles
- Text-first. Emails and texts are web components, not images
- Investigator transcriptions stand in for footage
- Keep file IDs stable. Keep solution text out of the player-facing UI and out of the client bundle

## Scope
Build order (each step is shippable on its own):
1. Vista shell: windows, taskbar, Files, Mail, Messages, Notes
2. Six files rendered; locks as plain inputs with hint ladder
3. Submit Report with plain evidence slots and grading
4. Minigames: GTA-style hack, then cross-examination, then magnifier
5. Clip-and-drag, Case Board, Gemini grading, ElevenLabs voice

Stretch: sound, mobile, extra cases.

## Playtest
Before the demo, a teammate who did not write the clues plays from files 01-03. Check: every unlock answer is findable, every timestamp agrees across files, and the final explanation rests on independent evidence rather than motive alone.

## Game modes
- **Timed (default):** 30:00 to file the final report. The clock counts down in the case panel and the taskbar, warns at 5:00 and 1:00, and turns red under five minutes. It follows the wall clock, so leaving the tab does not pause it. At zero the current draft is filed automatically (an empty draft counts as accusing no one) and the player sees the normal explanation.
- **Untimed:** the clock counts up and only runs while the tab is visible.
- The mode is chosen on the log-on screen at the start of a game and locked until the case is restarted. Restarting returns to the log-on screen.

## Narration
Nothing plays on its own. Documents, emails, chat threads and the verdict have a **Listen** button (server voice when available, the browser's voice otherwise). The taskbar Voice chip has mute, volume, stop and an **Auto-read** toggle that is **off** by default for players who want everything read as it opens.
