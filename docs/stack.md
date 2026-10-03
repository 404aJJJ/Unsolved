# Stack decision

Game type: UI-heavy and state-heavy (evidence boards, dialogue, notebook, accusations). It is not action or physics. That points to a UI framework, not a game engine.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Vite + React + TS** | Biggest ecosystem, everyone likely knows it, fast HMR, easy state (Zustand), easy deploy | Slightly more boilerplate than Svelte | **Recommended** |
| Vite + Svelte | Cleanest syntax, tiny bundles, built-in animation/transitions | Smaller ecosystem, fewer teammates know it | Good if the team already knows it |
| Vanilla JS (current scaffold) | Zero tooling | State and UI get messy past ~3 screens | Fine for a prototype only |
| Next.js | SSR, routing | Overkill, slower setup, no backend needed | No |
| Phaser / PixiJS | Real game engine | Painful for text and UI-heavy screens, bad accessibility | Only for a mini-game inside a case |

## Recommended details
- **Vite + React + TypeScript**: `npm create vite@latest`, template `react-ts`
- **State**: Zustand (one store for found clues, notes, visited locations, accusation)
- **Routing**: react-router, or just a `screen` field in the store (simpler)
- **Styling**: plain CSS modules or Tailwind, mobile-first from day one
- **Content**: cases are JSON in `data/cases/`, so writers never touch code
- **Persistence**: `localStorage` for progress (no backend needed)
- **Animation**: Framer Motion for card flips and evidence reveals
- **Deploy**: Vercel or Netlify (connect the repo, get a URL on every push)
- **Mobile**: responsive CSS now, PWA manifest later if time allows

## Decision needed from the team
1. Does everyone know React? If not, pick whatever 2 of 3 know best.
2. Tailwind or plain CSS?

## Backend options (optional, not needed for MVP)
The browser side must be JS/TS. Other languages can only run behind it as an API.

| Option | Use | Cost |
|---|---|---|
| Python (FastAPI) | Serve cases, check accusations server-side, saves, leaderboard | Second app to deploy; fastest to write |
| SQL (SQLite/Postgres) | Store cases, suspects, clues, saves | Only useful once there is a backend |
| Java (Spring Boot) | Same as FastAPI | Slowest setup; only if the team knows Java |
| Pyodide (Python in browser) | Python client-side | Heavy; skip |

Why a backend: a static site ships the answer in its JSON, so players can read the culprit in devtools. A server that only returns right or wrong avoids that.

Possible SQL mechanic: a bank-records terminal where the player filters or queries access logs, camera timestamps and transactions. Offer point-and-click filters alongside it so it is not SQL-only.

Plan: static MVP first, then FastAPI + SQLite if time allows.
