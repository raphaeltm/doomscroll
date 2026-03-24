import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { fetchRealWorldContext } from './sources.js';
import type { RealWorldContext } from './sources.js';

const FAST_MODEL = 'gemini-2.5-flash';
const DETAIL_MODEL = 'gemini-2.5-pro';

// --- Types ---

interface Source {
  title: string;
  url: string;
}

interface Actor {
  name: string;
  type: 'state' | 'organization' | 'individual' | 'military' | 'media';
  description: string;
  sources?: Source[];
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; name: string };
  actors: Actor[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredBy?: string[];
}

interface TimelineDay {
  day: number;
  date: string;
  summary: string;
  events: TimelineEvent[];
}

// --- Zod schemas for structured output ---

const actorSchema = z.object({
  name: z.string(),
  type: z.enum(['state', 'organization', 'individual', 'military', 'media']),
  description: z.string(),
});

const actorsResponseSchema = z.object({
  actors: z.array(actorSchema),
});

const actionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.object({ lat: z.number(), lng: z.number(), name: z.string() }),
  actors: z.array(actorSchema),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  triggeredBy: z.array(z.string()).optional(),
});

const dayResponseSchema = z.object({
  date: z.string(),
  summary: z.string(),
  events: z.array(actionSchema),
  updatedActors: z.array(actorSchema),
});

const weekSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
});

// --- Helper to call Gemini with structured output ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGemini<S extends z.ZodObject<any>>(
  ai: GoogleGenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  schema: S,
): Promise<z.infer<S>> {
  const jsonSchema = z.toJSONSchema(schema);
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema as Record<string, unknown>,
    },
  });
  const text = response.text ?? '';
  return schema.parse(JSON.parse(text));
}

// --- Build real-world context block ---

function buildContextBlock(context: RealWorldContext): string {
  const parts: string[] = [];

  if (context.gdeltEvents.length > 0) {
    parts.push('=== REAL RECENT NEWS EVENTS (from GDELT) ===');
    for (const ev of context.gdeltEvents.slice(0, 15)) {
      parts.push(`- "${ev.title}" (${ev.locationName}) [source: ${ev.url}]`);
    }
  }

  if (context.actors.length > 0) {
    parts.push('\n=== REAL CURRENT LEADERS (from Wikidata) ===');
    for (const actor of context.actors) {
      parts.push(`- ${actor.name}: ${actor.position} of ${actor.country}`);
    }
  }

  if (parts.length === 0) return '';
  return '\n\n' + parts.join('\n');
}

// --- Identify actors (with Google Search grounding, fallback to structured output) ---

const ACTOR_SYSTEM_PROMPT = `You are a geopolitical analyst. You MUST respond in English regardless of the input language.

You MUST use the real-world context data provided below (current leaders from Wikidata, recent news from GDELT) as your primary source of truth. Do NOT rely on your training data for current leadership positions — the provided context reflects the real world right now.

Given a scenario and real-world context, identify the 4-8 key actors (states, organizations, military forces, media outlets, individuals) who would be most involved. Use REAL names of current leaders and organizations based on the provided context. Be specific and accurate.`;

async function identifyActors(ai: GoogleGenAI, prompt: string, contextBlock: string): Promise<Actor[]> {
  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `${ACTOR_SYSTEM_PROMPT}\n\nToday's date is ${today}.\n\nYou MUST respond with ONLY a JSON object matching this schema: { "actors": [{ "name": string, "type": "state"|"organization"|"individual"|"military"|"media", "description": string }] }\n\nDo NOT include any text before or after the JSON.`;

  const userPrompt = `Identify the key geopolitical actors in this scenario:\n\n${prompt}${contextBlock}`;

  // Try with Google Search grounding first
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const json = jsonMatch[1].trim();
      const result = actorsResponseSchema.parse(JSON.parse(json));
      return result.actors;
    }
  } catch {
    // Grounded call failed to produce valid JSON — fall through to structured output
  }

  // Fallback: structured output without grounding (guaranteed JSON)
  const result = await callGemini(
    ai,
    FAST_MODEL,
    `${ACTOR_SYSTEM_PROMPT}\n\nToday's date is ${today}.`,
    userPrompt,
    actorsResponseSchema,
  );
  return result.actors;
}

// --- Research actors via Google Search ---

async function researchActor(ai: GoogleGenAI, actor: Actor, scenario: string): Promise<Source[]> {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Research "${actor.name}" in the context of: ${scenario}\n\nProvide a brief factual summary of who they are, their current role, and any recent relevant actions or statements. Focus on verified facts only.`,
      config: {
        systemInstruction: 'You are a factual research assistant. Provide only verified, real-world information about this actor/entity. Be concise.',
        tools: [{ googleSearch: {} }],
      },
    });

    const sources: Source[] = [];
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, url: chunk.web.uri });
        }
      }
    }
    return sources;
  } catch {
    return [];
  }
}

async function enrichActorsWithSources(
  ai: GoogleGenAI,
  actors: Actor[],
  scenario: string,
  onStatus?: (status: string) => void,
): Promise<Actor[]> {
  onStatus?.('Researching actors...');
  const sourceResults = await Promise.all(
    actors.map((actor) => researchActor(ai, actor, scenario)),
  );
  return actors.map((actor, i) => ({ ...actor, sources: sourceResults[i] }));
}

// --- Generate day ---

function buildPreviousDaysContext(previousDays: TimelineDay[]): string {
  if (previousDays.length === 0) return 'This is the first day.';
  return previousDays
    .map((d) =>
      `Day ${d.day} (${d.date}): ${d.summary}\nEvents:\n${d.events.map((e) => `- [${e.id}] ${e.title} at ${e.location.name}`).join('\n')}`,
    )
    .join('\n\n');
}

function buildActorContext(actors: Actor[]): string {
  return actors
    .map((a) => {
      const srcInfo = a.sources?.length ? ` [${a.sources.length} source(s)]` : '';
      return `${a.name} (${a.type}): ${a.description}${srcInfo}`;
    })
    .join('\n');
}

async function generateDay(
  ai: GoogleGenAI,
  prompt: string,
  actors: Actor[],
  previousDays: TimelineDay[],
  dayNumber: number,
  contextBlock: string,
): Promise<{ day: TimelineDay; updatedActors: Actor[] }> {
  const actorList = buildActorContext(actors);
  const prevContext = buildPreviousDaysContext(previousDays);

  const result = await callGemini(
    ai,
    DETAIL_MODEL,
    `You are a geopolitical simulation engine. Today's date is ${new Date().toISOString().split('T')[0]}.

You MUST use the real-world context data provided below (current leaders from Wikidata, recent news from GDELT) as your primary source of truth. Do NOT rely on your training data for current leadership positions — the provided context reflects the real world right now.

Generate realistic events for a single day in a crisis scenario. Each event must have precise GPS coordinates (lat/lng) for real locations. Include 3-5 events across different locations. Escalate tension naturally based on previous days. Also update the actor list — add new actors that emerge, update descriptions for existing ones, and keep actors that are still relevant.

Use REAL names of current world leaders, real organizations, and real locations based on the provided context.

Each event may include a "triggeredBy" field — an array of event IDs from previous days that directly caused or triggered this event. Use the exact IDs shown in square brackets in the previous days context (e.g. ["day1-event2", "day2-event1"]). Only reference events that are genuine causal triggers — not every event needs a trigger, and Day 1 events will have none.`,
    `Scenario: ${prompt}\n\nActive actors:\n${actorList}\n\nPrevious days:\n${prevContext}${contextBlock}\n\nGenerate Day ${dayNumber} of 7. Provide events, a day summary, and an updated actor list.`,
    dayResponseSchema,
  );

  const actorSourceMap = new Map<string, Source[]>();
  for (const a of actors) {
    if (a.sources?.length) {
      actorSourceMap.set(a.name, a.sources);
    }
  }

  const validEventIds = new Set(previousDays.flatMap((d) => d.events.map((e) => e.id)));

  const events: TimelineEvent[] = result.events.map((e, i) => {
    const triggeredBy = e.triggeredBy?.filter((id) => validEventIds.has(id));
    return {
      ...e,
      id: `day${dayNumber}-event${i + 1}`,
      triggeredBy: triggeredBy?.length ? triggeredBy : undefined,
      actors: e.actors.map((a) => ({
        ...a,
        sources: actorSourceMap.get(a.name) ?? undefined,
      })),
    };
  });

  const updatedActors: Actor[] = result.updatedActors.map((a) => ({
    ...a,
    sources: actorSourceMap.get(a.name) ?? undefined,
  }));

  const day: TimelineDay = {
    day: dayNumber,
    date: result.date,
    summary: result.summary,
    events,
  };

  return { day, updatedActors };
}

// --- Week summary ---

async function generateWeekSummary(
  ai: GoogleGenAI,
  prompt: string,
  days: TimelineDay[],
): Promise<{ title: string; summary: string }> {
  const daysContext = days.map((d) => `Day ${d.day}: ${d.summary}`).join('\n');
  return callGemini(
    ai,
    FAST_MODEL,
    `You are a geopolitical analyst. Summarize a 7-day crisis simulation into a concise title and 2-3 paragraph summary. The title should be a punchy headline (under 60 chars). The summary should cover the arc: how it started, escalated, and where it stands.`,
    `Original scenario: ${prompt}\n\nDay-by-day summaries:\n${daysContext}\n\nProvide a title and overall week summary.`,
    weekSummarySchema,
  );
}

// --- Main orchestrator ---

export interface SimulationEvents {
  onStatus: (status: string) => void;
  onDay: (day: TimelineDay) => void;
  onComplete: (data: { title: string; weekSummary: string }) => void;
  onError: (error: string) => void;
}

export async function runSimulation(prompt: string, events: SimulationEvents): Promise<void> {
  const ai = new GoogleGenAI({});

  try {
    // Step 0: Fetch real-world context
    events.onStatus('Fetching real-world data...');
    const realWorldContext = await fetchRealWorldContext(prompt, ai);
    const contextBlock = buildContextBlock(realWorldContext);

    // Step 1: Identify actors
    events.onStatus('Identifying actors...');
    let actors = await identifyActors(ai, prompt, contextBlock);

    // Step 1b: Enrich actors with sources
    actors = await enrichActorsWithSources(ai, actors, prompt, events.onStatus);

    // Step 2: Generate each day
    const days: TimelineDay[] = [];
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      events.onStatus(`Generating day ${dayNum} of 7...`);
      const { day, updatedActors } = await generateDay(ai, prompt, actors, days, dayNum, contextBlock);
      days.push(day);
      actors = updatedActors;
      events.onDay(day);
    }

    // Step 3: Week summary
    events.onStatus('Generating summary...');
    const { title, summary } = await generateWeekSummary(ai, prompt, days);

    events.onComplete({ title, weekSummary: summary });
  } catch (err) {
    events.onError(err instanceof Error ? err.message : 'Unknown error');
  }
}
