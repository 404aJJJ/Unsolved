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
