# DoomScroll - Geopolitical Event Simulator

## Project Overview
Hackathon app that simulates multi-actor geopolitical events. User provides a scenario, Claude generates a 7-day timeline with geolocated events and actors, then videos are generated for each day.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- React-Leaflet for world map (dark CARTO tiles)
- Zustand for state management
- Vitest + React Testing Library for tests
- Claude API (called directly from browser - hackathon, temporary keys)
- Video generation API (Luma/Runway, TBD)

## Architecture
- `src/store.ts` — Zustand store, single source of truth
- `src/api/claude.ts` — Claude API calls with structured output
- `src/api/video.ts` — Video generation API calls
- `src/components/` — React components (Sidebar, WorldMap, Timeline, etc.)
- `src/types.ts` — Shared TypeScript types

## Commands
- `npm run dev` — start dev server (binds 0.0.0.0)
- `npm run build` — typecheck + production build
- `npm test` — run vitest (unit tests)
- `npm run lint` — run ESLint
- `npm run check` — run lint + typecheck + tests (CI pipeline)

## Workflow
- All features go through PRs, never push directly to main
- Use `/feature` slash command to implement features end-to-end
- Use `/ship` slash command to create PR, wait for CI, and merge
- Branch naming: `feat/<short-description>`

## Key Patterns
- API keys are stored in Zustand store (in-memory only, not persisted) — this is intentional for the hackathon
- Claude API returns structured JSON for the timeline (7 days, each with events containing lat/lng, actors, descriptions)
- Events stream onto the map as pins as Claude responds
- Keep components simple and flat — no over-abstraction
- Use Tailwind utility classes directly, no custom CSS unless absolutely necessary
- `dangerouslyAllowBrowser: true` is fine for Anthropic SDK — hackathon with temp keys

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
- Test files live next to source: `Foo.tsx` → `Foo.test.tsx`
- Don't test implementation details, test behavior
- Every new component should have at minimum a render smoke test
