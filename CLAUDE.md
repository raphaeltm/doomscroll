# DoomScroll - Geopolitical Event Simulator

## Project Overview
Hackathon app that simulates multi-actor geopolitical events. User provides a scenario, Gemini generates a 7-day timeline with geolocated events and actors grounded in real-world data (GDELT news, Wikidata leaders, Google Search). Videos can be generated per day using Gemini Veo.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS v4 (via @tailwindcss/vite plugin, custom doom theme in `src/index.css`)
- react-globe.gl for 3D globe visualization (THREE.js under the hood)
- Zustand for state management
- Zod for structured output schema validation
- Vitest + React Testing Library for unit tests, Playwright available for E2E
- Google Gemini API (`@google/genai` — called directly from browser, hackathon with temp keys)
- Video generation via Gemini Veo (`veo-3.1-generate-preview`)

## Architecture
- `src/store.ts` — Zustand store, single source of truth
- `src/api/gemini.ts` — Gemini API calls with Zod-validated structured output (gemini-2.5-flash for actors/summary, gemini-2.5-pro for day generation)
- `src/api/video.ts` — Gemini Veo video generation (poll-based, returns blob URLs)
- `src/api/sources.ts` — Real-world context fetching (GDELT DOC API for news, Wikidata SPARQL for current world leaders)
- `src/components/WorldMap.tsx` — 3D globe with event pins, day selector, auto-rotation, fly-to
- `src/components/Sidebar.tsx` — Scenario input, API key management, example scenarios, video test panel
- `src/components/Timeline.tsx` — Right-panel day-by-day timeline with events, actor badges, video generation per day
- `src/components/GenerationStatus.tsx` — Centered overlay showing generation progress
- `src/App.tsx` — Root layout (WorldMap + GenerationStatus + Sidebar + Timeline)
- `src/types.ts` — Shared TypeScript types
- `src/index.css` — Tailwind v4 @theme config (doom color palette, actor/severity colors)

## Commands
- `npm run dev` — start dev server (binds 0.0.0.0)
- `npm run build` — typecheck + production build
- `npm test` — run vitest (unit tests)
- `npm run test:watch` — run vitest in watch mode
- `npm run lint` — run ESLint
- `npm run check` — run lint + typecheck + tests (CI pipeline)

## Workflow
- All features go through PRs, never push directly to main
- Use `/feature` slash command to implement features end-to-end
- Use `/ship` slash command to create PR, wait for CI, and merge
- Branch naming: `feat/<short-description>`
- CI runs `npm run check` on push to main and on PRs (GitHub Actions, Node 20)

## Key Patterns
- API keys are persisted to localStorage and loaded into Zustand on init
- Gemini API returns structured JSON validated with Zod schemas (7 days, each with events containing lat/lng, actors, descriptions, severity, video prompts)
- Real-world grounding pipeline: GDELT DOC API fetches recent news, Wikidata SPARQL fetches current world leaders, Google Search grounding researches each actor — all fed into Gemini prompts
- Events appear on the 3D globe as colored points (severity-based colors and sizes) with rich HTML tooltips
- Actor sources (from Google Search grounding) propagate through events and show as clickable links in the timeline
- Keep components simple and flat — no over-abstraction
- Use Tailwind utility classes directly; custom CSS limited to scrollbar styling and animations in `index.css`
- Store exposes `__store` on `window` in dev mode for E2E testing

## Code Style
- Functional components only
- Prefer inline Tailwind over separate style files
- Keep files small (<150 lines ideally)
- Types in `src/types.ts`, not scattered across files
- Use `type` imports for type-only imports (`import type { Foo }`)
- No over-engineering — hackathon speed, not production polish

## Testing
- Keep tests simple: smoke tests, key logic, store behavior
- Use vitest + jsdom + @testing-library/react
- Test files live next to source: `Foo.tsx` -> `Foo.test.tsx`
- Don't test implementation details, test behavior
- Every new component should have at minimum a render smoke test
