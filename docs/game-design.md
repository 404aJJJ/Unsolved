# Game design (draft)

## Premise
A bank has been robbed. The player is the detective who must work out **who did it**, how, and why. Story, characters, setting and tone are being written by other teammates, so this doc covers design only.

## Pitch
A browser detective game. You get a case file, gather evidence, question suspects, and name the culprit. Think Carmen Sandiego's clue-chasing crossed with Unsolved Case Files' deduction.

## Core loop
1. Read the **case brief** (victim, setting, what happened)
2. **Investigate** locations and examine evidence to find clues
3. **Interview** suspects and pick dialogue questions
4. Log findings in the **notebook** and link clues together on a **board**
5. **Accuse**: write out a free-text theory (culprit, motive, method); AI grades it, with a dropdown fallback

## Screens
- Title and case select
- Case brief
- Location view (clickable hotspots or a list of places)
- Evidence inspector (zoom, read, rotate)
- Suspect interview (dialogue choices)
- Notebook / corkboard
- Accusation and results

## Mechanics options (pick 1-2 for MVP)
- Clue-linking: connect two clues to unlock a deduction
- Contradictions: catch a suspect's lie by presenting evidence
- Limited actions or time: Carmen-style, N moves to solve
- Unlockable hints with a score penalty
- Star rating by accuracy and efficiency

## MVP (must ship)
- 1 complete case, 3-4 suspects, ~8 clues, 2-3 locations
- Evidence inspector, interviews, notebook, accusation
- Works on desktop, readable on phone

## Stretch
- 2nd and 3rd case, case select
- Sound and ambience
- Mobile polish and PWA
- Hint system, achievements

## Bank-robbery fit (ideas, not decisions)
- Locations: lobby, vault, manager's office, back alley, security room
- Evidence types: camera footage timestamps, vault access logs, teller records, fingerprints, getaway-car sighting
- Suspect types: insider (employee), outside crew, customer with a grudge, red herring
- Natural contradiction mechanic: an alibi that conflicts with the access log
- Optional records terminal: filter or query logs and transactions (SQL-style) to find anomalies

## Open questions
- Tone: noir, modern, cozy mystery, sci-fi?
- Real-world-inspired case or fully fictional?
- Fixed solution or branching?
