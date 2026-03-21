import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGDELTEvents, fetchWikidataActors, fetchRealWorldContext } from './sources';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchGDELTEvents', () => {
  it('returns events from GDELT GeoJSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [
            {
              geometry: { coordinates: [35.2, 31.7] },
              properties: {
                name: 'Tensions rise in region',
                url: 'https://example.com/article1',
                domain: 'example.com',
                tone: -3.5,
              },
            },
          ],
        }),
    });

    const events = await fetchGDELTEvents('conflict in the middle east');
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Tensions rise in region');
    expect(events[0].lat).toBe(31.7);
    expect(events[0].lng).toBe(35.2);
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
      json: () => Promise.resolve({ features: [] }),
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
