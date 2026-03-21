# DoomScroll - Geopolitical Event Simulator

## Project Overview
Hackathon app that simulates multi-actor geopolitical events. User provides a scenario, Claude generates a 7-day timeline with geolocated events and actors, then videos are generated for each day.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS (via @tailwindcss/vite plugin)
- React-Leaflet for world map
- Zustand for state management
- Claude API (called directly from browser - hackathon, temporary keys)
- Video generation API (Luma/Runway, TBD)

## Architecture
- `src/store.ts` — Zustand store, single source of truth
- `src/api/claude.ts` — Claude API calls with structured output
- `src/api/video.ts` — Video generation API calls
- `src/components/` — React components (Sidebar, WorldMap, Timeline, etc.)
- `src/types.ts` — Shared TypeScript types

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint

## Key Patterns
- API keys are stored in Zustand store (in-memory only, not persisted) — this is intentional for the hackathon
- Claude API returns structured JSON for the timeline (7 days, each with events containing lat/lng, actors, descriptions)
- Events stream onto the map as pins as Claude responds
- Keep components simple and flat — no over-abstraction
- Use Tailwind utility classes directly, no custom CSS unless absolutely necessary
- dangerouslyAllowBrowser: true is fine for Anthropic SDK — hackathon with temp keys

## Code Style
- Functional components only
- Prefer inline Tailwind over separate style files
- Keep files small (<150 lines ideally)
- Types in types.ts, not scattered across files
