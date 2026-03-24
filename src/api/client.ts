import type { TimelineDay } from '../types';

export interface SimulationCallbacks {
  onDayGenerated?: (day: TimelineDay, dayIndex: number) => void;
  onStatusChange?: (status: string) => void;
}

export interface SimulationResult {
  title: string;
  days: TimelineDay[];
  weekSummary: string;
}

export async function runSimulation(
  prompt: string,
  callbacks?: SimulationCallbacks,
): Promise<SimulationResult> {
  // Start the simulation
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to start simulation: ${error}`);
  }

  const { id } = await res.json();

  // Stream results via SSE
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`/api/simulate/${id}/stream`);
    const days: TimelineDay[] = [];
    let title = '';
    let weekSummary = '';

    eventSource.addEventListener('status', (e) => {
      callbacks?.onStatusChange?.(e.data);
    });

    eventSource.addEventListener('day', (e) => {
      const day: TimelineDay = JSON.parse(e.data);
      days.push(day);
      callbacks?.onDayGenerated?.(day, days.length - 1);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      title = data.title;
      weekSummary = data.weekSummary;
      eventSource.close();
      resolve({ title, days, weekSummary });
    });

    eventSource.addEventListener('error', (e) => {
      eventSource.close();
      if (e instanceof MessageEvent) {
        reject(new Error(e.data));
      } else {
        reject(new Error('Connection to simulation stream lost'));
      }
    });
  });
}
