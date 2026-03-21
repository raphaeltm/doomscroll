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

### 5. Visual QA with Playwright
Before shipping, visually verify the feature works:
- Make sure the dev server is running (`npx vite --host 0.0.0.0` on port 5173). If not, start it in the background.
- Use Playwright to take a screenshot of the app:
  ```ts
  import { chromium } from 'playwright';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/doomscroll-qa.png' });
  await browser.close();
  ```
- Read the screenshot and verify:
  - The feature is visible and working as expected
  - The UI looks correct — no layout breaks, overlapping elements, or visual regressions
  - The dark theme / doom aesthetic is maintained
- If anything looks wrong, fix it and re-screenshot until it's right
- If the feature requires interaction (clicking buttons, filling inputs), use Playwright to simulate that and screenshot the result

### 6. Ship
- Use the `/ship` skill to create a PR, wait for CI, and merge

## Important
- Don't ask for permission at each step — just do it
- If something fails, fix it and move on
- Keep the user updated with brief status messages at milestones
- This is a hackathon — speed over perfection
