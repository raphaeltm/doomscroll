import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Actor, Source, TimelineDay, TimelineEvent, RealWorldContext } from '../types';
import { fetchRealWorldContext } from './sources';

const FAST_MODEL = 'gemini-2.5-flash';
const DETAIL_MODEL = 'gemini-2.5-pro';

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
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string(),
  }),
  actors: z.array(actorSchema),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

const dayResponseSchema = z.object({
  date: z.string(),
  summary: z.string(),
  events: z.array(actionSchema),
  videoPrompt: z.string(),
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

// --- Build real-world context block for prompts ---

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

// --- Step 1: Identify actors ---

async function identifyActors(
  ai: GoogleGenAI,
  prompt: string,
  contextBlock: string,
): Promise<Actor[]> {
  const result = await callGemini(
    ai,
    FAST_MODEL,
    `You are a geopolitical analyst. Given a scenario and real-world context, identify the 4-8 key actors (states, organizations, military forces, media outlets, individuals) who would be most involved. Use REAL names of current leaders and organizations based on the provided context. Be specific and accurate.`,
    `Identify the key geopolitical actors in this scenario:\n\n${prompt}${contextBlock}`,
    actorsResponseSchema,
  );
  return result.actors;
}

// --- Step 1b: Research actors via Google Search ---

async function researchActor(
  ai: GoogleGenAI,
  actor: Actor,
  scenario: string,
): Promise<Source[]> {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Research "${actor.name}" in the context of: ${scenario}\n\nProvide a brief factual summary of who they are, their current role, and any recent relevant actions or statements. Focus on verified facts only.`,
      config: {
        systemInstruction: 'You are a factual research assistant. Provide only verified, real-world information about this actor/entity. Be concise.',
        tools: [{ googleSearch: {} }],
      },
    });

    // Extract grounding sources from the response metadata
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
  onStatusChange?: (status: string) => void,
): Promise<Actor[]> {
  onStatusChange?.('Researching actors...');

  // Research all actors in parallel
  const sourceResults = await Promise.all(
    actors.map((actor) => researchActor(ai, actor, scenario)),
  );

  return actors.map((actor, i) => ({
    ...actor,
    sources: sourceResults[i],
  }));
}

// --- Step 2: Generate day actions + summary ---

function buildPreviousDaysContext(previousDays: TimelineDay[]): string {
  if (previousDays.length === 0) return 'This is the first day.';
  return previousDays
    .map(
      (d) =>
        `Day ${d.day} (${d.date}): ${d.summary}\nEvents: ${d.events.map((e) => `- ${e.title} at ${e.location.name}`).join('\n')}`,
    )
    .join('\n\n');
}

function buildActorContext(actors: Actor[]): string {
  return actors
    .map((a) => {
      const srcInfo = a.sources?.length
        ? ` [${a.sources.length} source(s)]`
        : '';
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
    `You are a geopolitical simulation engine. Generate realistic events for a single day in a crisis scenario. Each event must have precise GPS coordinates (lat/lng) for real locations. Include 3-5 events across different locations. Escalate tension naturally based on previous days. Also update the actor list — add new actors that emerge, update descriptions for existing ones, and keep actors that are still relevant.

Use REAL names of current world leaders, real organizations, and real locations based on the provided context.`,
    `Scenario: ${prompt}\n\nActive actors:\n${actorList}\n\nPrevious days:\n${prevContext}${contextBlock}\n\nGenerate Day ${dayNumber} of 7. Provide events, a day summary, a cinematic video prompt, and an updated actor list.

IMPORTANT for the videoPrompt field: The video prompt must be completely abstract and cinematic. Do NOT include any real names, titles, positions, organizations, countries, or identifying information. Instead use generic terms like "officials", "diplomats", "military personnel", "leaders", "figures in suits". Describe only the visual scene, mood, lighting, and atmosphere. Example: "A tense meeting in a dimly lit modern conference room, figures in dark suits around a long table, rain streaking down floor-to-ceiling windows, emergency red lighting reflecting off polished surfaces." The prompt should work as a standalone cinematic scene description with no real-world references.`,
    dayResponseSchema,
  );

  // Attach sources from known actors to event actors
  const actorSourceMap = new Map<string, Source[]>();
  for (const a of actors) {
    if (a.sources?.length) {
      actorSourceMap.set(a.name, a.sources);
    }
  }

  const events: TimelineEvent[] = result.events.map((e, i) => ({
    ...e,
    id: `day${dayNumber}-event${i + 1}`,
    actors: e.actors.map((a) => ({
      ...a,
      sources: actorSourceMap.get(a.name) ?? undefined,
    })),
  }));

  // Carry sources forward to updated actors too
  const updatedActors: Actor[] = result.updatedActors.map((a) => ({
    ...a,
    sources: actorSourceMap.get(a.name) ?? undefined,
  }));

  const day: TimelineDay = {
    day: dayNumber,
    date: result.date,
    summary: result.summary,
    events,
    videoPrompt: result.videoPrompt,
  };

  return { day, updatedActors };
}

// --- Step 3: Week summary ---

async function generateWeekSummary(
  ai: GoogleGenAI,
  prompt: string,
  days: TimelineDay[],
): Promise<{ title: string; summary: string }> {
  const daysContext = days
    .map((d) => `Day ${d.day}: ${d.summary}`)
    .join('\n');

  return callGemini(
    ai,
    FAST_MODEL,
    `You are a geopolitical analyst. Summarize a 7-day crisis simulation into a concise title and 2-3 paragraph summary. The title should be a punchy headline (under 60 chars). The summary should cover the arc: how it started, escalated, and where it stands.`,
    `Original scenario: ${prompt}\n\nDay-by-day summaries:\n${daysContext}\n\nProvide a title and overall week summary.`,
    weekSummarySchema,
  );
}

// --- Main orchestrator ---

export interface SimulationCallbacks {
  onDayGenerated?: (day: TimelineDay, dayIndex: number) => void;
  onStatusChange?: (status: string) => void;
}

export async function runGeminiSimulation(
  apiKey: string,
  prompt: string,
  callbacks?: SimulationCallbacks,
): Promise<{ title: string; days: TimelineDay[]; weekSummary: string }> {
  const ai = new GoogleGenAI({ apiKey });

  // Step 0: Fetch real-world context (GDELT + Wikidata)
  callbacks?.onStatusChange?.('Fetching real-world data...');
  const realWorldContext = await fetchRealWorldContext(prompt, ai);
  const contextBlock = buildContextBlock(realWorldContext);

  // Step 1: Identify actors (grounded in real data)
  callbacks?.onStatusChange?.('Identifying actors...');
  let actors = await identifyActors(ai, prompt, contextBlock);

  // Step 1b: Research each actor via Google Search — attach real sources
  actors = await enrichActorsWithSources(ai, actors, prompt, callbacks?.onStatusChange);

  // Step 2: Generate each day iteratively
  const days: TimelineDay[] = [];
  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    callbacks?.onStatusChange?.(`Generating day ${dayNum} of 7...`);
    const { day, updatedActors } = await generateDay(
      ai,
      prompt,
      actors,
      days,
      dayNum,
      contextBlock,
    );
    days.push(day);
    actors = updatedActors;
    callbacks?.onDayGenerated?.(day, dayNum - 1);
  }

  // Step 3: Week summary
  callbacks?.onStatusChange?.('Generating summary...');
  const { title, summary } = await generateWeekSummary(ai, prompt, days);

  return { title, days, weekSummary: summary };
}
