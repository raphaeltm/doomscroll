import Anthropic from '@anthropic-ai/sdk';
import type { TimelineDay } from '../types';

const SYSTEM_PROMPT = `You are a geopolitical simulation engine. Given a scenario, you generate a detailed 7-day timeline of how events would unfold.

You MUST respond with valid JSON matching this exact structure:
{
  "title": "Short title for the simulation",
  "days": [
    {
      "day": 1,
      "date": "Day 1 - [descriptive date]",
      "summary": "Brief summary of the day's events",
      "events": [
        {
          "id": "unique-id",
          "title": "Event title",
          "description": "Detailed description of what happens",
          "location": {
            "lat": 48.8566,
            "lng": 2.3522,
            "name": "Paris, France"
          },
          "actors": [
            {
              "name": "Actor name",
              "type": "state|organization|individual|military|media",
              "description": "What this actor does"
            }
          ],
          "severity": "low|medium|high|critical"
        }
      ],
      "videoPrompt": "A cinematic prompt describing the key visual of this day for video generation"
    }
  ]
}

Make it realistic, detailed, and geographically accurate. Each day should have 2-5 events across different locations. Include diverse actors (governments, military, media, NGOs, individuals). Escalate tension naturally over the 7 days.`;

export async function generateSimulation(
  apiKey: string,
  prompt: string,
  onDayGenerated?: (day: TimelineDay, dayIndex: number) => void
): Promise<{ title: string; days: TimelineDay[] }> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Simulate the following geopolitical scenario over 7 days:\n\n${prompt}`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();
  const data = JSON.parse(jsonStr);

  // Notify for each day as if streaming
  if (onDayGenerated) {
    for (let i = 0; i < data.days.length; i++) {
      onDayGenerated(data.days[i], i);
      // Small delay to create streaming effect on map
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return data;
}
