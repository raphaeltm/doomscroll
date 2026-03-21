import { describe, it, expect } from 'vitest';
import { buildVideoPrompt } from './videoPrompt';
import type { TimelineDay } from '../types';

function makeDay(overrides: Partial<TimelineDay> = {}): TimelineDay {
  return {
    day: 1,
    date: '2026-03-21',
    summary: 'Tensions rise as officials meet.',
    events: [],
    ...overrides,
  };
}

describe('buildVideoPrompt', () => {
  it('uses the videoPrompt field when available', () => {
    const result = buildVideoPrompt(
      makeDay({ videoPrompt: 'A dark conference room with rain outside' }),
    );
    expect(result).toContain('dark conference room');
  });

  it('strips real names and titles from videoPrompt', () => {
    const result = buildVideoPrompt(
      makeDay({
        videoPrompt:
          'President Biden meets with Chancellor Scholz in a dimly lit room',
      }),
    );
    expect(result).not.toContain('Biden');
    expect(result).not.toContain('Scholz');
    expect(result).toContain('President');
    expect(result).toContain('Chancellor');
  });

  it('replaces org acronyms with generic terms', () => {
    const result = buildVideoPrompt(
      makeDay({ videoPrompt: 'NATO forces mobilize near the border' }),
    );
    expect(result).not.toContain('NATO');
    expect(result).toContain('an international organization');
  });

  it('falls back to summary when no videoPrompt', () => {
    const result = buildVideoPrompt(makeDay({ videoPrompt: undefined }));
    expect(result).toContain('Tensions rise');
    expect(result).toContain('Cinematic news footage');
  });
});
