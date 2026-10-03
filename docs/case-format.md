# Case format

Each case lives in `data/cases/<id>/case.json`. Writers edit JSON, devs build the engine.

```json
{
  "id": "case-001",
  "title": "The Missing Ledger",
  "brief": "Text shown on the intro screen",
  "locations": [{ "id": "study", "name": "The Study", "image": "study.jpg", "evidence": ["ev-1"] }],
  "evidence": [{ "id": "ev-1", "name": "Torn note", "description": "...", "image": "note.png", "reveals": ["clue-1"] }],
  "suspects": [{
    "id": "s-1", "name": "...", "bio": "...", "portrait": "s1.png",
    "interview": [{ "id": "q1", "question": "Where were you at 9pm?", "answer": "...", "unlockedBy": null, "contradictedBy": "ev-1" }]
  }],
  "solution": { "culprit": "s-1", "motive": "...", "method": "..." }
}
```

Rules:
- IDs are unique within a case and referenced by other fields.
- Images live in `public/assets/images/<case-id>/`.
- `unlockedBy` gates a question behind a found clue.
