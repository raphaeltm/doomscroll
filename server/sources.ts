import type { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// --- Types ---

export interface GDELTEvent {
  title: string;
  url: string;
  domain: string;
  lat: number;
  lng: number;
  locationName: string;
  tone: number;
}

export interface WikidataActor {
  name: string;
  position: string;
  country: string;
}

export interface RealWorldContext {
  gdeltEvents: GDELTEvent[];
  actors: WikidataActor[];
}

// --- Zod schemas for LLM extraction ---

const FAST_MODEL = 'gemini-2.5-flash';

const keywordsSchema = z.object({
  keywords: z.array(z.string()).describe('3-6 concise search keywords for finding relevant news articles'),
});

const countriesSchema = z.object({
  countries: z.array(z.string()).describe('Standardized English country names relevant to the scenario'),
});

// --- LLM-powered extraction with fallback ---

async function extractKeywordsWithLLM(ai: GoogleGenAI, scenario: string): Promise<string> {
  const jsonSchema = z.toJSONSchema(keywordsSchema);
  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: `Extract 3-6 concise search keywords from this geopolitical scenario for querying a news API. Focus on the most specific and distinctive terms (country names, leader names, organization names, event types). Return only the keywords.\n\nScenario: ${scenario}`,
    config: {
      systemInstruction: 'You extract search keywords from geopolitical scenarios. Return concise, specific terms that would find relevant news articles.',
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema as Record<string, unknown>,
    },
  });
  const result = keywordsSchema.parse(JSON.parse(response.text ?? ''));
  return result.keywords.join(' ');
}

async function extractCountriesWithLLM(ai: GoogleGenAI, scenario: string): Promise<string[]> {
  const jsonSchema = z.toJSONSchema(countriesSchema);
  const response = await ai.models.generateContent({
    model: FAST_MODEL,
    contents: `Identify all countries and political entities relevant to this geopolitical scenario. Include directly mentioned countries AND implied ones (e.g. "NATO's eastern flank" implies Poland, Romania, Baltic states). Use standardized English country names.\n\nScenario: ${scenario}`,
    config: {
      systemInstruction: 'You identify countries relevant to geopolitical scenarios. Return standardized English country names only.',
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema as Record<string, unknown>,
    },
  });
  const result = countriesSchema.parse(JSON.parse(response.text ?? ''));
  return result.countries;
}

// --- Fallback string-based extraction ---

function extractKeywords(scenario: string): string {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
    'not', 'so', 'yet', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
    'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its',
    'they', 'them', 'their', 'we', 'us', 'our', 'he', 'him', 'his',
    'she', 'her', 'about', 'up', 'all', 'also', 'while', 'simultaneously',
    'across', 'massive', 'several', 'multiple', 'three', 'two',
  ]);

  const words = scenario
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return words.slice(0, 5).join(' ');
}

// Common country name mappings for Wikidata entity IDs
const COUNTRY_ENTITIES: Record<string, string> = {
  'united states': 'Q30', 'usa': 'Q30', 'us': 'Q30', 'america': 'Q30',
  'united kingdom': 'Q145', 'uk': 'Q145', 'britain': 'Q145', 'england': 'Q145',
  'china': 'Q148', 'russia': 'Q159', 'france': 'Q142', 'germany': 'Q183',
  'japan': 'Q17', 'india': 'Q668', 'brazil': 'Q155', 'canada': 'Q16',
  'australia': 'Q408', 'italy': 'Q38', 'spain': 'Q29', 'mexico': 'Q96',
  'south korea': 'Q884', 'korea': 'Q884', 'north korea': 'Q423',
  'turkey': 'Q43', 'iran': 'Q794', 'iraq': 'Q796', 'israel': 'Q801',
  'saudi arabia': 'Q851', 'egypt': 'Q79', 'pakistan': 'Q843',
  'ukraine': 'Q212', 'poland': 'Q36', 'taiwan': 'Q865', 'nigeria': 'Q1033',
  'south africa': 'Q258', 'argentina': 'Q414', 'indonesia': 'Q252',
  'nato': 'Q7184', 'european union': 'Q458', 'eu': 'Q458',
  'syria': 'Q858', 'afghanistan': 'Q889', 'libya': 'Q1016',
  'sweden': 'Q34', 'norway': 'Q20', 'finland': 'Q33', 'denmark': 'Q35',
  'netherlands': 'Q55', 'belgium': 'Q31', 'switzerland': 'Q39',
  'portugal': 'Q45', 'greece': 'Q41', 'romania': 'Q218',
};

function extractCountries(scenario: string): string[] {
  const lower = scenario.toLowerCase();
  const found: string[] = [];
  for (const [name, id] of Object.entries(COUNTRY_ENTITIES)) {
    if (lower.includes(name) && !found.includes(id)) {
      found.push(id);
    }
  }
  return found;
}

function mapCountryNamesToIds(countryNames: string[]): string[] {
  const ids: string[] = [];
  for (const name of countryNames) {
    const lower = name.toLowerCase();
    const id = COUNTRY_ENTITIES[lower];
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

// --- GDELT DOC API ---

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/doc';

export async function fetchGDELTEvents(scenario: string, ai?: GoogleGenAI): Promise<GDELTEvent[]> {
  let keywords: string;
  if (ai) {
    try {
      keywords = await extractKeywordsWithLLM(ai, scenario);
    } catch {
      keywords = extractKeywords(scenario);
    }
  } else {
    keywords = extractKeywords(scenario);
  }
  if (!keywords) return [];

  const url = `${GDELT_BASE}?query=${encodeURIComponent(keywords)}&mode=ArtList&format=json&timespan=3d&maxrecords=50`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { articles?: Array<Record<string, string>> };

    const articles = data.articles;
    if (!Array.isArray(articles)) return [];

    const seen = new Set<string>();
    const events: GDELTEvent[] = [];

    for (const article of articles) {
      if (events.length >= 20) break;
      const title = article.title || '';
      if (!title || seen.has(title)) continue;
      seen.add(title);

      events.push({
        title,
        url: article.url || '',
        domain: article.domain || '',
        lat: 0,
        lng: 0,
        locationName: article.sourcecountry || '',
        tone: 0,
      });
    }
    return events;
  } catch {
    return [];
  }
}

// --- Wikidata SPARQL ---

export async function fetchWikidataActors(scenario: string, ai?: GoogleGenAI): Promise<WikidataActor[]> {
  let countryIds: string[];
  if (ai) {
    try {
      const countryNames = await extractCountriesWithLLM(ai, scenario);
      countryIds = mapCountryNamesToIds(countryNames);
      if (countryIds.length === 0) {
        countryIds = extractCountries(scenario);
      }
    } catch {
      countryIds = extractCountries(scenario);
    }
  } else {
    countryIds = extractCountries(scenario);
  }
  if (countryIds.length === 0) return [];

  const values = countryIds.map((id) => `wd:${id}`).join(' ');
  const sparql = `
    SELECT ?country ?countryLabel ?leader ?leaderLabel ?positionLabel WHERE {
      VALUES ?country { ${values} }
      {
        ?country wdt:P35 ?leader .
        ?country p:P35 ?stmt .
        ?stmt ps:P35 ?leader .
        OPTIONAL { ?stmt pq:P580 ?start }
        FILTER NOT EXISTS { ?stmt pq:P582 ?end }
        BIND("Head of State" AS ?positionLabel)
      } UNION {
        ?country wdt:P6 ?leader .
        ?country p:P6 ?stmt2 .
        ?stmt2 ps:P6 ?leader .
        OPTIONAL { ?stmt2 pq:P580 ?start }
        FILTER NOT EXISTS { ?stmt2 pq:P582 ?end }
        BIND("Head of Government" AS ?positionLabel)
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    }
  `;

  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/sparql-results+json' },
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: { bindings?: Array<Record<string, { value?: string }>> } };

    const seen = new Set<string>();
    const actors: WikidataActor[] = [];

    for (const binding of data.results?.bindings || []) {
      const name = binding.leaderLabel?.value || '';
      if (!name || seen.has(name)) continue;
      seen.add(name);

      actors.push({
        name,
        position: binding.positionLabel?.value || '',
        country: binding.countryLabel?.value || '',
      });
    }
    return actors;
  } catch {
    return [];
  }
}

// --- Fetch all real-world context in parallel ---

export async function fetchRealWorldContext(scenario: string, ai?: GoogleGenAI): Promise<RealWorldContext> {
  const [gdeltEvents, actors] = await Promise.all([
    fetchGDELTEvents(scenario, ai),
    fetchWikidataActors(scenario, ai),
  ]);

  return { gdeltEvents, actors };
}
