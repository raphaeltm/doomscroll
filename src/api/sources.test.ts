import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGDELTEvents, fetchWikidataActors, fetchRealWorldContext } from './sources';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchGDELTEvents', () => {
  it('returns events from GDELT DOC API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          articles: [
            {
              title: 'Tensions rise in region',
              url: 'https://example.com/article1',
              domain: 'example.com',
              sourcecountry: 'Israel',
            },
          ],
        }),
    });

    const events = await fetchGDELTEvents('conflict in the middle east');
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Tensions rise in region');
    expect(events[0].locationName).toBe('Israel');
    expect(events[0].url).toBe('https://example.com/article1');
  });

  it('returns empty array on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const events = await fetchGDELTEvents('test scenario');
    expect(events).toEqual([]);
  });

  it('returns empty array for empty scenario', async () => {
    const events = await fetchGDELTEvents('the a an is');
    expect(events).toEqual([]);
  });
});

describe('fetchWikidataActors', () => {
  it('returns actors from SPARQL response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: {
            bindings: [
              {
                leaderLabel: { value: 'Joe Biden' },
                positionLabel: { value: 'Head of State' },
                countryLabel: { value: 'United States of America' },
              },
            ],
          },
        }),
    });

    const actors = await fetchWikidataActors('United States foreign policy');
    expect(actors).toHaveLength(1);
    expect(actors[0].name).toBe('Joe Biden');
    expect(actors[0].position).toBe('Head of State');
  });

  it('returns empty array when no countries found', async () => {
    const actors = await fetchWikidataActors('abstract philosophical debate');
    expect(actors).toEqual([]);
  });

  it('returns empty array on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const actors = await fetchWikidataActors('Russia Ukraine conflict');
    expect(actors).toEqual([]);
  });
});

describe('fetchRealWorldContext', () => {
  it('fetches GDELT and Wikidata in parallel', async () => {
    // First call: GDELT
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ articles: [] }),
    });
    // Second call: Wikidata
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: { bindings: [] } }),
    });

    const context = await fetchRealWorldContext('China Taiwan tensions');
    expect(context.gdeltEvents).toEqual([]);
    expect(context.actors).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
