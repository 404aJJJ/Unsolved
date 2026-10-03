# Case format

One case lives in `data/cases/<id>/`. Writers edit text, devs read it. Solution data is NOT in this folder (see below).

## `case.json` (public, ships to the client)
```json
{
  "id": "case-001",
  "title": "Unsolved.exe",
  "premise": "...",
  "suspects": [{ "id": "s1", "name": "...", "age": 0, "occupation": "...", "background": "..." }],
  "files": [
    { "id": "01", "title": "Incident Report", "app": "files", "locked": false, "content": "01.md" },
    { "id": "04", "title": "Access and Activity Audit", "app": "files", "locked": true,
      "lock": { "type": "numeric", "digits": 4, "prompt": "...", "hints": ["...", "...", "..."] } }
  ]
}
```

- `content` points to a markdown file; emails and texts use a small structured format (below)
- `lock.type`: `numeric` | `keyword`
- Hints are ordered, shown progressively
- **No answers in this file**

## Server-only (never in the client or the repo docs)
- Unlock answers, validated by `POST /unlock { fileId, answer }`
- Accusation rubric (culprit, method, required evidence per claim)
- Locked file contents should also be served only after a successful unlock, so they cannot be read from the bundle

## Content files
Emails/messages are authored as markdown with front matter:
```
---
type: email
from: ...
to: ...
subject: ...
time: Day 1, 4:12PM
---
Body text.
```
Times use "Day 1 / Day 2" consistently until a calendar date is chosen. All times London local.

## Validator (Java lane)
Checks: IDs unique, lock references resolve, every unlock answer appears in an earlier file (answers supplied via a private file passed to the tool), no timestamp conflicts between files.
