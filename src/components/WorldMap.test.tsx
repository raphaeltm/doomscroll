import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import { useStore } from '../store';

// Polyfill ResizeObserver for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

const { GlobeMock } = vi.hoisted(() => ({
  GlobeMock: vi.fn().mockImplementation(() => null),
}));
vi.mock('react-globe.gl', () => ({
  __esModule: true,
  default: GlobeMock,
}));

describe('WorldMap', () => {
  beforeEach(() => {
    useStore.setState({ simulation: null, selectedDay: null, timelineOpen: true });
  });

  it('renders empty state when no simulation', () => {
    render(<WorldMap />);
    expect(screen.getByText('DOOMSCROLL')).toBeInTheDocument();
    expect(screen.getByText('Enter a scenario to begin')).toBeInTheDocument();
  });

  it('hides hero empty state during generation', () => {
    useStore.setState({
      simulation: {
        id: '1',
        prompt: 'test',
        title: 'Test',
        days: [],
        status: 'generating',
      },
    });
    render(<WorldMap />);
    expect(screen.queryByText('DOOMSCROLL')).not.toBeInTheDocument();
  });

  it('renders day selector when simulation has days', () => {
    useStore.setState({
      simulation: {
        id: '1',
        prompt: 'test',
        title: 'Test',
        days: [
          { day: 1, date: 'Day 1', summary: 'First', events: [] },
          { day: 2, date: 'Day 2', summary: 'Second', events: [] },
        ],
        status: 'complete',
      },
    });
    render(<WorldMap />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('D1')).toBeInTheDocument();
    expect(screen.getByText('D2')).toBeInTheDocument();
  });

  it('passes arcsData to Globe when events have triggeredBy', () => {
    useStore.setState({
      simulation: {
        id: '1',
        prompt: 'test',
        title: 'Test',
        days: [
          {
            day: 1, date: 'Day 1', summary: 'First', events: [
              { id: 'day1-event1', title: 'E1', description: '', location: { lat: 10, lng: 20, name: 'A' }, actors: [], severity: 'low' },
            ],
          },
          {
            day: 2, date: 'Day 2', summary: 'Second', events: [
              { id: 'day2-event1', title: 'E2', description: '', location: { lat: 30, lng: 40, name: 'B' }, actors: [], severity: 'high', triggeredBy: ['day1-event1'] },
            ],
          },
        ],
        status: 'complete',
      },
      selectedDay: null,
    });
    render(<WorldMap />);
    const lastCall = GlobeMock.mock.calls.at(-1);
    if (lastCall) {
      const props = lastCall[0];
      expect(props.arcsData).toEqual([
        { startLat: 10, startLng: 20, endLat: 30, endLng: 40, color: '#ef4444' },
      ]);
    }
  });
});
