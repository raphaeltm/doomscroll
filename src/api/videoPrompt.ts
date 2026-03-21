import type { TimelineDay } from '../types';

/**
 * Build a clean, abstract video prompt from a day's data.
 * Strips all identifying information (names, positions, organizations, countries).
 * Falls back to the day's videoPrompt if available, otherwise builds from events.
 */
export function buildVideoPrompt(day: TimelineDay): string {
  // If the AI already generated a videoPrompt, use it (it should already be clean
  // per our prompt instructions, but sanitize just in case)
  if (day.videoPrompt) {
    return sanitizePrompt(day.videoPrompt);
  }

  // Fallback: build from day summary
  const parts: string[] = [];
  parts.push(`Breaking news scene: ${sanitizePrompt(day.summary)}.`);
  parts.push(
    'Cinematic news footage style. No spoken dialogue or voiceover. Only ambient background sounds and dramatic music.',
  );
  return parts.join(' ');
}

/** Remove real names, titles, and other identifying info from a prompt */
function sanitizePrompt(text: string): string {
  // Remove common title patterns like "President X", "General Y", etc.
  let cleaned = text
    .replace(
      /\b(President|Prime Minister|Chancellor|Secretary|General|Admiral|Commander|Minister|Senator|Ambassador|Director|Chairman|Chief)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g,
      (match) => match.split(/\s+/)[0],
    );

  // Remove organization-specific acronyms that might identify specific entities
  // but keep generic scene descriptions intact
  cleaned = cleaned.replace(/\b(NATO|UN|EU|OSCE|ASEAN|BRICS)\b/g, 'an international organization');

  return cleaned;
}
