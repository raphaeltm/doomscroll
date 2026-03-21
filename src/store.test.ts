import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('store', () => {
  beforeEach(() => {
    useStore.setState({
      claudeApiKey: '',
      videoApiKey: '',
      simulation: null,
      selectedDay: null,
      sidebarOpen: true,
    });
  });

  it('sets API keys', () => {
    useStore.getState().setClaudeApiKey('test-key');
    expect(useStore.getState().claudeApiKey).toBe('test-key');
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

  it('updates a day', () => {
    useStore.getState().setSimulation({
      id: '1',
      prompt: 'test',
      title: 'Test',
      days: [{ day: 1, date: 'Day 1', summary: 'First', events: [] }],
      status: 'complete',
    });

    useStore.getState().updateDay(1, { summary: 'Updated' });
    expect(useStore.getState().simulation?.days[0].summary).toBe('Updated');
  });

  it('selects a day', () => {
    useStore.getState().setSelectedDay(3);
    expect(useStore.getState().selectedDay).toBe(3);
  });
});
