import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Actor, TimelineDay, TimelineEvent, RealWorldContext } from '../types';
import { fetchRealWorldContext } from './sources';

const FAST_MODEL = 'gemini-2.5-flash';
const DETAIL_MODEL = 'gemini-2.5-pro';

// --- Zod schemas for structured output ---

const sourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

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
  sources: z.array(sourceSchema),
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

// --- Step 0: Research via Google Search grounding ---

async function researchScenario(
  ai: GoogleGenAI,
  prompt: string,
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Research the current real-world context for this geopolitical scenario. Focus on: recent related events, key actors currently in power, ongoing tensions, and relevant background. Be factual and cite specific details.\n\nScenario: ${prompt}`,
      config: {
        systemInstruction: 'You are a geopolitical research assistant. Provide factual, well-sourced research on current events and actors relevant to the scenario. Include specific names, dates, and details.',
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text ?? '';
  } catch {
    // Google Search grounding may fail — continue without it
    return '';
  }
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

async function generateDay(
  ai: GoogleGenAI,
  prompt: string,
  actors: Actor[],
  previousDays: TimelineDay[],
  dayNumber: number,
  contextBlock: string,
): Promise<{ day: TimelineDay; updatedActors: Actor[] }> {
  const actorList = actors
    .map((a) => `${a.name} (${a.type}): ${a.description}`)
    .join('\n');
  const prevContext = buildPreviousDaysContext(previousDays);

  const result = await callGemini(
    ai,
    DETAIL_MODEL,
    `You are a geopolitical simulation engine. Generate realistic events for a single day in a crisis scenario. Each event must have precise GPS coordinates (lat/lng) for real locations. Include 3-5 events across different locations. Escalate tension naturally based on previous days. Also update the actor list — add new actors that emerge, update descriptions for existing ones, and keep actors that are still relevant.

IMPORTANT: Use REAL names of current world leaders, real organizations, and real locations based on the provided context. For each event, include a "sources" array with 1-2 relevant source references (title and URL) from the real-world context provided or from your knowledge of real news sources. If referencing real events, cite the actual source.`,
    `Scenario: ${prompt}\n\nActive actors:\n${actorList}\n\nPrevious days:\n${prevContext}${contextBlock}\n\nGenerate Day ${dayNumber} of 7. Provide events with sources, a day summary, a cinematic video prompt, and an updated actor list.`,
    dayResponseSchema,
  );

  const events: TimelineEvent[] = result.events.map((e, i) => ({
    ...e,
    id: `day${dayNumber}-event${i + 1}`,
    sources: e.sources || [],
  }));

  const day: TimelineDay = {
    day: dayNumber,
    date: result.date,
    summary: result.summary,
    events,
    videoPrompt: result.videoPrompt,
  };

  return { day, updatedActors: result.updatedActors };
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

  // Step 0: Fetch real-world context + research in parallel
  callbacks?.onStatusChange?.('Fetching real-world data...');
  const [realWorldContext, research] = await Promise.all([
    fetchRealWorldContext(prompt),
    researchScenario(ai, prompt),
  ]);

  // Build context block from pre-fetched data + research
  let contextBlock = buildContextBlock(realWorldContext);
  if (research) {
    contextBlock += '\n\n=== GOOGLE SEARCH RESEARCH ===\n' + research;
  }

  // Step 1: Identify actors (grounded in real data)
  callbacks?.onStatusChange?.('Identifying actors...');
  let actors = await identifyActors(ai, prompt, contextBlock);

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
