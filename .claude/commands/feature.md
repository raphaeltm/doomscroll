---
description: "Implement a feature end-to-end: research, implement, test, PR, merge"
---

# Feature Implementation Workflow

You are implementing a feature for the DoomScroll hackathon app. Work autonomously through the full cycle.

## Input
The user will describe the feature: $ARGUMENTS

## Steps

### 1. Research (use subagents in parallel)
- **Codebase research**: Use an Explore agent to understand the current code relevant to this feature. Look at existing components, store shape, types, and patterns.
- **Best practices research**: If the feature involves a library or API you're not sure about, use a web search to find current docs/examples.

### 2. Plan
- Based on research, decide which files to create/modify
- Keep it minimal — hackathon speed
- Share a 2-3 bullet plan with the user before implementing

### 3. Implement
- Create a feature branch: `feat/<short-name>`
- Write the code following patterns in CLAUDE.md
- Use `type` imports for TypeScript types
- Keep files under 150 lines
- Use Tailwind, Zustand, and existing patterns

### 4. Test
- Add simple smoke tests for new components
- Run `npm run check` (lint + typecheck + tests)
- Fix any issues

### 5. Ship
- Use the `/ship` skill to create a PR, wait for CI, and merge

## Important
- Don't ask for permission at each step — just do it
- If something fails, fix it and move on
- Keep the user updated with brief status messages at milestones
- This is a hackathon — speed over perfection
