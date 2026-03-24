import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { runSimulation } from './simulate.js';

const app = new Hono();

// --- In-flight simulations ---

interface SimulationState {
  prompt: string;
  listeners: Set<(event: string, data: string) => void>;
  started: boolean;
}

const simulations = new Map<string, SimulationState>();

// --- API Routes ---

app.post('/api/simulate', async (c) => {
  const body = await c.req.json<{ prompt: string }>();
  if (!body.prompt?.trim()) {
    return c.text('Missing prompt', 400);
  }

  const id = crypto.randomUUID();
  simulations.set(id, {
    prompt: body.prompt,
    listeners: new Set(),
    started: false,
  });

  // Clean up after 10 minutes
  setTimeout(() => simulations.delete(id), 10 * 60 * 1000);

  return c.json({ id });
});

app.get('/api/simulate/:id/stream', (c) => {
  const id = c.req.param('id');
  const sim = simulations.get(id);
  if (!sim) {
    return c.text('Simulation not found', 404);
  }

  return streamSSE(c, async (stream) => {
    // Register this listener
    const send = (event: string, data: string) => {
      stream.writeSSE({ event, data }).catch(() => {});
    };
    sim.listeners.add(send);

    // Start simulation if not already running
    if (!sim.started) {
      sim.started = true;
      runSimulation(sim.prompt, {
        onStatus: (status) => {
          for (const listener of sim.listeners) listener('status', status);
        },
        onDay: (day) => {
          for (const listener of sim.listeners) listener('day', JSON.stringify(day));
        },
        onComplete: (data) => {
          for (const listener of sim.listeners) listener('complete', JSON.stringify(data));
          // Clean up after completion
          setTimeout(() => simulations.delete(id), 30_000);
        },
        onError: (error) => {
          for (const listener of sim.listeners) listener('error', error);
          simulations.delete(id);
        },
      });
    }

    // Keep the stream open until the client disconnects
    await new Promise<void>((resolve) => {
      stream.onAbort(() => {
        sim.listeners.delete(send);
        resolve();
      });
    });
  });
});

// --- GDELT proxy (replaces nginx proxy) ---

app.get('/api/gdelt/doc', async (c) => {
  const query = c.req.url.split('?')[1] || '';
  const url = `https://api.gdeltproject.org/api/v2/doc?${query}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Encoding': '' },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch {
    return c.text('GDELT proxy error', 502);
  }
});

// --- Static files (production) ---

app.use('/*', serveStatic({ root: './dist' }));
app.use('/*', serveStatic({ root: './dist', path: 'index.html' }));

// --- Start server ---

const port = parseInt(process.env.PORT || '8080', 10);
console.log(`Server starting on port ${port}`);
serve({ fetch: app.fetch, port });
