# DoomScroll

Geopolitical event simulator. Enter a scenario, get a 7-day crisis timeline visualized on a 3D globe.

![Tech](https://img.shields.io/badge/React-19-blue) ![Tech](https://img.shields.io/badge/Gemini-2.5-orange) ![Tech](https://img.shields.io/badge/Vite-8-purple)

## How it works

1. **You describe a scenario** — e.g. "A massive cyberattack disables power grids across NATO countries"
2. **Real-world grounding** — the app fetches recent news from [GDELT](https://www.gdeltproject.org/) and current world leaders from [Wikidata](https://www.wikidata.org/) to anchor the simulation in reality
3. **AI generates the timeline** — Google Gemini identifies key actors (with Google Search grounding), then generates 3–5 geolocated events per day for 7 days, with causal chains linking events across days
4. **3D globe visualization** — events appear as severity-colored pins on an interactive globe, with arcs showing how earlier events trigger later ones
5. **Optional video generation** — Gemini Veo generates short cinematic clips for each day

## Tech stack

- **Frontend:** React + TypeScript, Tailwind CSS v4, Vite
- **3D Globe:** [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (THREE.js)
- **AI:** Google Gemini 2.5 (Flash for actors/summaries, Pro for day generation), Veo 3.1 for video
- **Data:** GDELT news API, Wikidata SPARQL
- **State:** Zustand · **Validation:** Zod

## Setup

```bash
npm install
npm run dev
```

You'll need a [Google Gemini API key](https://aistudio.google.com/apikey) — enter it in the sidebar when the app loads.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck + production build |
| `npm test` | Run unit tests |
| `npm run check` | Lint + typecheck + tests |
