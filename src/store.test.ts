import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('store', () => {
  beforeEach(() => {
    useStore.setState({
      simulation: null,
      selectedDay: null,
      sidebarOpen: true,
      timelineOpen: true,
    });
  });

  it('sets simulation', () => {
    const sim = {
      id: '1',
      prompt: 'test',
      title: 'Test',
      days: [],
      status: 'idle' as const,
    };
    useStore.getState().setSimulation(sim);
    expect(useStore.getState().simulation?.title).toBe('Test');
  });

  it('adds a day to simulation', () => {
    useStore.getState().setSimulation({
      id: '1',
      prompt: 'test',
      title: 'Test',
      days: [],
      status: 'generating',
    });

    useStore.getState().addDay({
      day: 1,
      date: 'Day 1',
      summary: 'First day',
      events: [],
    });

    expect(useStore.getState().simulation?.days).toHaveLength(1);
    expect(useStore.getState().simulation?.days[0].summary).toBe('First day');
  });

  it('selects a day', () => {
    useStore.getState().setSelectedDay(3);
    expect(useStore.getState().selectedDay).toBe(3);
  });
});
