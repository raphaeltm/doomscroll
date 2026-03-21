import { withCache } from './cache';
import type { GDELTEvent, WikidataActor, RealWorldContext } from '../types';

// --- GDELT GEO 2.0 API ---

function extractKeywords(scenario: string): string {
  // Extract meaningful words, skip common stop words
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

  // Take the top 5 most distinctive words
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

export async function fetchGDELTEvents(scenario: string): Promise<GDELTEvent[]> {
  const keywords = extractKeywords(scenario);
  if (!keywords) return [];

  return withCache(`gdelt_${keywords}`, async () => {
    // Use the DOC API (ArtList mode) — the GEO API endpoint has been removed
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(keywords)}&mode=ArtList&format=json&timespan=3d&maxrecords=50`;

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      const articles = data.articles;
      if (!Array.isArray(articles)) return [];

      // Take top 20 events, deduplicated by title
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
  });
}

// --- Wikidata SPARQL ---

export async function fetchWikidataActors(scenario: string): Promise<WikidataActor[]> {
  const countryIds = extractCountries(scenario);
  if (countryIds.length === 0) return [];

  return withCache(`wikidata_${countryIds.sort().join('_')}`, async () => {
    const values = countryIds.sort().map((id) => `wd:${id}`).join(' ');
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
      const data = await res.json();

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
  });
}

// --- Fetch all real-world context in parallel ---

export async function fetchRealWorldContext(scenario: string): Promise<RealWorldContext> {
  const [gdeltEvents, actors] = await Promise.all([
    fetchGDELTEvents(scenario),
    fetchWikidataActors(scenario),
  ]);

  return { gdeltEvents, actors };
}
