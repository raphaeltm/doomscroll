import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import { useStore } from '../store';

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

vi.mock('react-globe.gl', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => null),
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
});
