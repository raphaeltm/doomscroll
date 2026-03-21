# MiroFish-Inspired Architecture Integration Plan

## Context

[MiroFish](https://github.com/666ghj/MiroFish) is a multi-agent swarm intelligence engine that predicts the ripple effects of hypothetical events using a 5-stage pipeline: seed ingestion, ontology generation, knowledge graph construction, agent persona generation, and OASIS multi-agent simulation. This document outlines how to integrate its most valuable patterns into DoomScroll's existing architecture.

**Source analysis:** [DeepWiki deep research](https://deepwiki.com/search/we-are-building-an-application_0425e5c0-802b-40d5-8c89-015cfd4255c9?mode=deep)

---

## Current DoomScroll Architecture (Baseline)

```
User Scenario → GDELT/Wikidata Context → Gemini Actor Identification
→ 7x Sequential Day Generation → Week Summary → Globe + Timeline UI
```

**What we have today:**
- Single-pass generation: Gemini generates actors once, then iterates day-by-day
- Shallow real-world grounding: GDELT headlines + Wikidata leader names injected as context
- Actor evolution: actors are "updated" per day but only as a flat list passed forward
- No persistent world state between days beyond the previous day's JSON
- No agent autonomy — Gemini role-plays all actors simultaneously
- No knowledge graph or relationship tracking
- No report synthesis or agent interview capability

**What works well (keep):**
- Streaming days to UI as they generate (immediate visual feedback)
- GDELT + Wikidata grounding (real names, real places, real headlines)
- Structured output via Zod schemas (reliable JSON from LLM)
- react-globe.gl visualization with severity-based styling
- Zustand store as single source of truth

---

## Gap Analysis: DoomScroll vs. MiroFish

| Capability | DoomScroll Today | MiroFish | Gap |
|---|---|---|---|
| **Input processing** | Raw text prompt | Seed documents (PDF/MD/TXT) with LLM extraction | Minor — we already extract keywords for GDELT |
| **Ontology** | Hardcoded 5 actor types | LLM-generated entity + relationship schema (10 types) | **Major** — we have no relationship modeling |
| **Knowledge graph** | None | Zep GraphRAG with temporal edges | **Major** — no persistent world state |
| **Agent personas** | Name + type + description | MBTI, stance, sentiment bias, memory, influence weight | **Significant** — our actors are shallow |
| **Simulation** | Single LLM generates all events | OASIS multi-agent sim with parallel platforms | **Major** — no agent autonomy |
| **World evolution** | Previous day JSON passed as context | Graph memory updates after each round | **Significant** — no structured state tracking |
| **Report generation** | Week summary (1 LLM call) | ReACT agent with 4 tools + iterative reasoning | **Moderate** — we have a summary, but no deep analysis |
| **Agent interview** | None | Live first-person Q&A with simulated agents | **Major** — entirely new capability |

---

## Integration Strategy: 4 Phases

The key constraint is that DoomScroll runs entirely in the browser with no backend. MiroFish requires Python + Zep + OASIS. We need to adapt its patterns to work within our Gemini-in-browser architecture, taking the conceptual wins without the infrastructure overhead.

### Phase 1: Rich Actor System + Ontology Generation

**Goal:** Replace the flat actor list with structured, persona-rich agents that have relationships, stances, and influence weights.

**What changes:**

1. **New type: `ActorPersona`** (extends current `Actor`)

```typescript
// src/types.ts

type ActorPersona = {
  id: string
  name: string
  type: 'state_leader' | 'military_commander' | 'diplomat' | 'intelligence' |
        'intergovernmental_org' | 'media_outlet' | 'economic_actor' |
        'non_state_actor' | 'individual' | 'organization'
  description: string
  country?: string
  // MiroFish-inspired additions:
  stance: 'supportive' | 'opposing' | 'neutral' | 'observer'
  sentimentBias: number           // -1.0 to +1.0
  influenceWeight: number         // 0.1 to 5.0
  decisionStyle: string           // e.g. "cautious diplomat", "aggressive hawk"
  knownPositions: string[]        // past actions/statements relevant to scenario
  sources: Source[]
}
```

2. **New type: `Relationship`**

```typescript
type Relationship = {
  fromActorId: string
  toActorId: string
  type: 'alliance' | 'rivalry' | 'dependency' | 'negotiation' | 'conflict' | 'sanctions'
  strength: number                // 0.0 to 1.0
  description: string
  validFrom?: string              // ISO date — when this relationship started
  invalidFrom?: string            // ISO date — when it ended (temporal edges)
}
```

3. **Ontology generation step** (new Gemini call before actor identification)

```
Scenario + GDELT context
    → Gemini-Flash: "What entity types and relationship types exist in this scenario?"
    → Returns: { entityTypes: string[], relationshipTypes: string[] }
    → Used to constrain actor generation and relationship modeling
```

4. **Enhanced actor identification** (modify existing Step 1 in `gemini.ts`)

The current actor identification prompt asks for 4-8 actors with name, type, description. We extend it to also generate:
- Stance toward the scenario event
- Sentiment bias
- Influence weight (major powers 3-5x, minor actors 0.5-1x)
- Decision-making style
- Known positions (grounded in GDELT/Wikidata context)
- Pairwise relationships between all actors

**Integration point:** `src/api/gemini.ts` — modify `identifyActors()` to return `ActorPersona[]` + `Relationship[]`.

**Prompt engineering:** The key insight from MiroFish is that entities must be *actors that can take action* — not abstract concepts. "Sanctions" is a relationship edge, not an entity. "US Treasury Department" is an entity.

**Effort:** Medium. Extends existing actor identification with richer schema. No new infrastructure.

---

### Phase 2: In-Memory World State Graph

**Goal:** Replace the "pass previous day's JSON as context" approach with a structured world state that tracks entities, relationships, and facts with temporal validity.

**What changes:**

1. **New module: `src/state/world-graph.ts`**

A lightweight in-memory graph (no Zep/Neo4j needed — we're in the browser):

```typescript
type WorldNode = {
  id: string
  actor: ActorPersona
  // Evolves over time:
  currentStance: ActorPersona['stance']
  currentSentiment: number
}

type WorldEdge = {
  relationship: Relationship
  // Temporal validity:
  createdOnDay: number
  expiredOnDay?: number           // null = still active
}

type WorldFact = {
  id: string
  statement: string               // e.g. "US imposed sanctions on Russia's energy sector"
  actorIds: string[]              // actors involved
  day: number                     // when this fact became true
  supersededBy?: string           // id of fact that replaced this one
}

type WorldGraph = {
  nodes: Map<string, WorldNode>
  edges: WorldEdge[]
  facts: WorldFact[]

  // Query methods:
  getActiveRelationships(day: number): WorldEdge[]
  getActorFacts(actorId: string): WorldFact[]
  getRelationshipsBetween(a: string, b: string): WorldEdge[]
  addFact(fact: WorldFact): void
  expireRelationship(edgeIndex: number, day: number): void
  updateActorStance(actorId: string, stance: string, sentiment: number): void
}
```

2. **World state serialization for prompts**

Instead of dumping the entire previous day's JSON into the next day's prompt, we serialize the world graph into a structured context block:

```
CURRENT WORLD STATE (after Day 3):

ACTORS:
- [Xi Jinping] (state_leader, China) — stance: opposing, influence: 5.0
  Known for: "Warned of 'severe consequences' if sanctions proceed"
- [NATO Secretary General] (intergovernmental_org) — stance: supportive, influence: 4.0
  Known for: "Called emergency session, pledged allied solidarity"

ACTIVE RELATIONSHIPS:
- China ←conflict→ United States (strength: 0.9, since Day 1)
- NATO ←alliance→ United States (strength: 1.0, since Day 0)
- China ←sanctions→ EU (strength: 0.6, since Day 2)

RECENT FACTS:
- Day 2: "EU expanded sanctions to include Chinese semiconductor imports"
- Day 3: "China recalled ambassador from Brussels"
- Day 3: "US carrier group repositioned to South China Sea"

EXPIRED RELATIONSHIPS:
- China ←negotiation→ EU (Day 0-2, expired: sanctions replaced diplomacy)
```

This is far more structured than a raw JSON dump and gives Gemini better context for generating causally coherent events.

3. **After each day generation:** Parse events into graph updates

```
Day N events generated
    → Extract new facts from events
    → Update actor stances based on what happened
    → Create/expire relationships based on events
    → Graph is ready for Day N+1 context
```

**Integration point:** After `addDay()` in the simulation loop, call `worldGraph.update(dayEvents)`.

**Key insight from MiroFish:** The temporal edges are what make predictions non-static. By tracking when relationships started and ended, Day 7's generation can reason about *trajectories* — "this alliance has been weakening since Day 3" — not just snapshots.

**Effort:** Medium-high. New module, but no external dependencies. The graph is just TypeScript Maps and arrays.

---

### Phase 3: Multi-Perspective Simulation

**Goal:** Instead of one Gemini call generating all events for a day, run multiple "perspective" calls — each from a different actor's viewpoint — then synthesize.

**Why this matters:** MiroFish's core insight is that emergent behavior comes from agents acting independently. When one LLM generates everything, events are narratively coherent but lack the *surprise* of conflicting actor decisions.

**What changes:**

1. **Per-actor day generation** (parallel Gemini calls)

For each day, instead of one call:
```
// Current: 1 call per day
generateDay(scenario, actors, previousDays, worldState) → events[]
```

We run N calls (one per major actor group):
```
// New: 1 call per actor perspective
Promise.all([
  generateActorPerspective(scenario, worldState, actorGroup="US/NATO bloc"),
  generateActorPerspective(scenario, worldState, actorGroup="China/allies"),
  generateActorPerspective(scenario, worldState, actorGroup="EU/neutral"),
  generateActorPerspective(scenario, worldState, actorGroup="media/observers"),
])
→ perspectiveEvents[][]
```

Each perspective call generates what *that actor group would do* given the current world state:
- What actions they take
- How they respond to the previous day's events
- What their internal deliberation looks like

2. **Event synthesis** (new Gemini call)

A synthesis step reconciles the parallel perspectives:
```
synthesizeDay(perspectiveEvents, worldState)
→ reconciledEvents[] + conflictNotes[]
```

This call:
- Merges compatible events
- Resolves contradictions (two actors can't both control the same territory)
- Identifies emergent dynamics (two independent actions that create an unintended escalation)
- Produces the final canonical event list for the day

3. **Conflict detection**

When actors' independent actions conflict, the synthesis step must decide outcomes based on influence weights:

```typescript
// Actor A (influence: 4.5) attempts to blockade strait
// Actor B (influence: 2.0) attempts to run blockade
// → Synthesis: Blockade succeeds, but B's attempt creates international incident
```

**Integration point:** Replace the inner loop in `runGeminiSimulation()`. The outer structure (7 days, streaming to UI) stays the same.

**Cost consideration:** This multiplies Gemini API calls by ~4-5x per day. For a hackathon this is acceptable. For production, consider running only 2-3 perspectives (top actors by influence weight).

**Effort:** High. Requires significant prompt engineering and a new synthesis step. But the result is dramatically more realistic emergent behavior.

---

### Phase 4: Analysis Agent + Actor Interviews

**Goal:** After the 7-day simulation completes, provide a ReACT-style analysis agent that can interrogate the simulation results, and allow users to "interview" individual actors.

**What changes:**

1. **Analysis agent** (post-simulation)

A new Gemini call with tool-use (function calling) that can:

| Tool | Purpose |
|---|---|
| `searchFacts(query)` | Search world graph facts by keyword |
| `getTimeline(actorId)` | Get full timeline of an actor's actions across 7 days |
| `getRelationshipHistory(actorA, actorB)` | How a relationship evolved over the simulation |
| `compareStances(day1, day7)` | How actor stances shifted from start to end |

The agent generates a structured prediction report:
```
## Simulation Analysis: "China-Taiwan Escalation Scenario"

### Most Likely Outcome (Day 7 trajectory)
...

### Key Turning Points
- Day 3: EU sanctions triggered Chinese ambassador recall, escalating from economic to diplomatic crisis
- Day 5: US carrier repositioning was the point of no return for military posturing

### Actor Behavior Summary
| Actor | Starting Stance | Ending Stance | Key Actions |
|---|---|---|---|
| China | Opposing | Aggressive | Recalled ambassador, military exercises, trade restrictions |
| US | Supportive (of Taiwan) | Committed | Carrier group, arms deal, sanctions |

### Wildcard Risks
- Media amplification created public pressure that constrained diplomatic options
- Russia's opportunistic resource deal with China was an emergent alliance shift
```

2. **Actor interview UI** (new component)

A chat-like interface where the user can ask questions to any simulated actor:

```
User: "President Xi, why did you recall the ambassador on Day 3?"

[Gemini, in-character as Xi persona with full world graph context]:
"The EU's decision to expand sanctions to semiconductors was a direct attack on
China's technological sovereignty. Diplomatic engagement requires mutual respect —
Brussels chose escalation, and we responded proportionally. The ambassador recall
was a measured signal; military action would have been disproportionate at that stage."
```

Implementation:
- New component: `src/components/ActorInterview.tsx`
- Uses Gemini with a system prompt that includes the actor's full persona, their action history from the world graph, and instructions to respond in-character
- Each response grounded in actual simulation events (no hallucinated actions)

3. **New UI flow:**

```
Simulation Complete
    → Timeline (existing) — browse day-by-day events
    → Analysis Report (new) — structured prediction document
    → Actor Interview (new) — chat with any actor
```

The Analysis and Interview tabs appear in the Timeline panel after simulation completes.

**Integration point:** New components + new Gemini calls. No changes to existing simulation pipeline.

**Effort:** Medium. Mostly prompt engineering + a new chat component. The world graph from Phase 2 provides all the context needed.

---

## Implementation Priority & Dependencies

```
Phase 1: Rich Actors ──────────┐
  (no dependencies)             │
                                ▼
Phase 2: World State Graph ─────┐
  (depends on Phase 1 types)    │
                                ▼
Phase 3: Multi-Perspective ─────┐
  (depends on Phase 2 graph)    │
                                ▼
Phase 4: Analysis + Interview ──┘
  (depends on Phase 2 graph)
```

**Phases 3 and 4 are independent of each other** — they both depend on Phase 2 but can be built in parallel.

**Recommended order for maximum impact:**
1. **Phase 1** — Quick win, makes actors feel real
2. **Phase 2** — Foundation for everything else
3. **Phase 4** — High user-facing impact (interview is a wow feature)
4. **Phase 3** — Most complex, highest simulation quality improvement

---

## What We Deliberately Skip

Some MiroFish patterns don't translate well to DoomScroll's browser-based architecture:

| MiroFish Pattern | Why We Skip It |
|---|---|
| **Zep GraphRAG** | Requires a server. Our in-memory graph achieves the same concept. |
| **OASIS simulation engine** | Python-based, multi-process. We approximate with parallel Gemini calls. |
| **MBTI personality typing** | Adds complexity without clear value. Decision style + stance is sufficient. |
| **Seed document ingestion (PDF/TXT)** | Our input is a text prompt. Could add later but not core. |
| **Twitter/Reddit platform simulation** | DoomScroll models geopolitical events, not social media. We adapt "platforms" as "arenas" (diplomatic, military, economic, media). |
| **Full ReACT loop (5 tool calls per section)** | Overkill for a hackathon. A single structured analysis call with Gemini function calling covers 80% of the value. |

---

## File Changes Summary

### New files:
- `src/types.ts` — Extended with `ActorPersona`, `Relationship`, `WorldFact` (modify existing)
- `src/state/world-graph.ts` — In-memory world state graph
- `src/api/analysis.ts` — Post-simulation analysis agent
- `src/components/ActorInterview.tsx` — Chat interface for actor Q&A
- `src/components/AnalysisReport.tsx` — Structured prediction report display

### Modified files:
- `src/api/gemini.ts` — Ontology generation, enhanced actors, multi-perspective simulation, world graph updates
- `src/store.ts` — Add world graph to store, add analysis/interview state
- `src/components/Timeline.tsx` — Add Analysis and Interview tabs
- `src/components/Sidebar.tsx` — Minor: show richer actor info during generation

### Unchanged files:
- `src/components/WorldMap.tsx` — No changes needed (events still have same lat/lng/severity shape)
- `src/components/GenerationStatus.tsx` — No changes needed
- `src/api/sources.ts` — No changes needed (GDELT + Wikidata stay as-is)
- `src/api/video.ts` — No changes needed

---

## Open Questions

1. **Cost:** Multi-perspective simulation (Phase 3) multiplies API calls ~4-5x. Is this acceptable for the hackathon demo, or should we limit to 2-3 perspectives?

2. **Latency:** Current 7-day generation takes ~60-90 seconds. Adding ontology + richer actors (Phase 1) adds ~10 seconds. Multi-perspective (Phase 3) could double total time. Is the quality tradeoff worth the wait?

3. **Actor interview persistence:** Should interview conversations persist in the store, or are they ephemeral? For a hackathon, ephemeral is simpler.

4. **World graph visualization:** Should we visualize the relationship graph on the globe (edges between actor locations)? This would be visually striking but adds UI complexity.
