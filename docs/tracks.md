# Prize tracks (RowdyHacks '26)

Source: https://www.mlh.com/events/rowdy-hacks/prizes (summary only; verify each sponsor's real rules before committing).

| Track | Plan | Priority | Owner |
|---|---|---|---|
| Tiger Data (Postgres/TimescaleDB) | Bank records terminal: vault access logs, camera timestamps, transactions stored as time-series; player searches for anomalies | High | SQL person |
| Vultr | Deploy FastAPI backend + database on Vultr | High | Python person |
| GoDaddy Registry | Register a domain for the game | High (10 min) | Anyone |
| ElevenLabs | Voiced suspects in interviews, narrator for case brief | Medium, after core loop works | Python/web |
| Gemini API | Free-form suspect interrogation; model gets only that suspect's knowledge; solution stays server-side | Medium, after core loop works | Python |
| Solana | No natural fit | Skip | - |
| Presage | Emotion tracking as lie detector; gimmicky and risky | Skip | - |

Rules
- API keys live in the backend `.env` (gitignored), never in the frontend.
- Core game must work with all AI features turned off (fallback to static dialogue).
- Do not spread across tracks until the single case is playable.

# Story tooling (Java lane)
Case compiler + validator CLI:
- Input: writers' markdown or spreadsheet export
- Output: `data/cases/<id>/case.json` (see case-format.md)
- Checks: IDs resolve, every clue reachable, solution deducible, no orphan evidence
