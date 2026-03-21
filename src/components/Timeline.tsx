import { useState } from 'react';
import { useStore } from '../store';
import { generateVideo } from '../api/video';
import { buildVideoPrompt } from '../api/videoPrompt';
import type { Actor, TimelineDay } from '../types';

const severityBadge: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  critical: 'bg-red-600/30 text-red-300 border border-red-500/50',
};

const severityDot: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
  critical: 'bg-red-400 animate-pulse',
};

const severityBorder: Record<string, string> = {
  low: 'border-l-sev-low',
  medium: 'border-l-sev-medium',
  high: 'border-l-sev-high',
  critical: 'border-l-sev-critical',
};

const actorTypeStyle: Record<Actor['type'], string> = {
  state: 'bg-actor-state/10 text-actor-state border-actor-state/20',
  military: 'bg-actor-military/10 text-actor-military border-actor-military/20',
  organization: 'bg-actor-org/10 text-actor-org border-actor-org/20',
  individual: 'bg-actor-individual/10 text-actor-individual border-actor-individual/20',
  media: 'bg-actor-media/10 text-actor-media border-actor-media/20',
};

function getDayColor(day: number): string {
  if (day <= 2) return 'text-blue-400';
  if (day <= 4) return 'text-amber-400';
  return 'text-red-400';
}

function getDayBorderWidth(day: number): string {
  if (day <= 2) return 'border-l-2';
  if (day <= 4) return 'border-l-3';
  return 'border-l-4';
}

function getDayBgTint(day: number): string {
  if (day <= 2) return '';
  if (day <= 4) return 'bg-amber-950/5';
  if (day <= 5) return 'bg-red-950/5';
  if (day <= 6) return 'bg-red-950/10';
  return 'bg-red-950/15';
}

const SUMMARY_TRUNCATE = 120;

function WeekSummary({ text }: { text: string }) {
  const needsTruncation = text.length > SUMMARY_TRUNCATE;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-5 py-3 border-b border-doom-border bg-doom-surface/30">
      <p className="text-xs text-doom-text-muted leading-relaxed italic">
        {needsTruncation && !expanded
          ? text.slice(0, SUMMARY_TRUNCATE).trimEnd() + '…'
          : text}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-doom-text-faint hover:text-doom-text mt-1 transition-colors focus:outline-none"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export function Timeline() {
  const { simulation, selectedDay, setSelectedDay, timelineOpen, setTimelineOpen, googleApiKey, videoApiKey, updateDay } = useStore();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEvent = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleGenerateVideo = async (day: TimelineDay) => {
    const key = videoApiKey || googleApiKey;
    if (!key) {
      alert('Please set a Google API key (or Video API key) in the sidebar.');
      return;
    }
    const cleanPrompt = buildVideoPrompt(day);
    updateDay(day.day, { videoGenerating: true });
    try {
      const videoUrl = await generateVideo(key, cleanPrompt);
      updateDay(day.day, { videoUrl, videoGenerating: false });
    } catch (err) {
      console.error('Video generation failed:', err);
      updateDay(day.day, { videoGenerating: false });
      alert(`Video generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!timelineOpen) return null;

  if (!simulation || simulation.days.length === 0) {
    return null;
  }

  const daysToShow = selectedDay
    ? simulation.days.filter((d) => d.day === selectedDay)
    : simulation.days;

  return (
    <div className="absolute right-0 top-0 h-full w-[420px] z-[900] bg-doom-panel/90 backdrop-blur-md border-l border-doom-border flex flex-col overflow-hidden shadow-2xl shadow-black/50 transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-doom-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-green-400 font-medium">
              Simulation Complete
            </span>
          </div>
          <button
            onClick={() => setTimelineOpen(false)}
            className="text-doom-text-faint hover:text-doom-text transition-colors p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <h2 className="text-xl font-bold text-white leading-tight">
          {simulation.title}
        </h2>
        <p className="text-xs text-doom-text-muted mt-1 font-mono">
          {simulation.days.length} days · {simulation.days.reduce((n, d) => n + d.events.length, 0)} events
        </p>
      </div>

      {/* Week summary — collapsible */}
      {simulation.weekSummary && <WeekSummary text={simulation.weekSummary} />}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {daysToShow.map((day) => (
          <div
            key={day.day}
            className={`border-b border-doom-border/50 cursor-pointer hover:bg-doom-surface/50 transition-colors group ${getDayBgTint(day.day)}`}
            onClick={() =>
              setSelectedDay(selectedDay === day.day ? null : day.day)
            }
          >
            <div className="p-5">
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-2xl tabular-nums font-mono ${getDayColor(day.day)}`}>
                    {String(day.day).padStart(2, '0')}
                  </span>
                  <div className="w-5 h-px bg-doom-border" />
                  <span className="text-xs text-doom-text-muted">
                    {day.date}
                  </span>
                </div>
                <span className="text-xs text-doom-text-faint font-mono">
                  {day.events.length} events
                </span>
              </div>

              <p className="text-sm text-doom-text leading-relaxed mb-3">
                {day.summary}
              </p>

              {/* Events */}
              <div className="space-y-2">
                {day.events.map((event, eventIndex) => {
                  const isExpanded = expandedEvents.has(event.id);
                  return (
                  <div
                    key={event.id}
                    className={`bg-doom-dark/80 rounded-lg p-3 text-xs border border-doom-border/30 ${getDayBorderWidth(day.day)} ${severityBorder[event.severity]} transition-colors animate-fade-slide-in cursor-pointer`}
                    style={{ animationDelay: `${eventIndex * 50}ms` }}
                    onClick={(e) => toggleEvent(event.id, e)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[event.severity]}`} />
                        <span className="font-semibold text-doom-text">
                          {event.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${severityBadge[event.severity]}`}
                        >
                          {event.severity}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-doom-text-faint transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                    {isExpanded && (
                      <>
                        <p className="text-doom-text-muted leading-relaxed mt-1.5">
                          {event.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-doom-text-faint">
                          <span className="text-[10px]">&#x1f4cd;</span>
                          <span className="text-[11px] font-mono">{event.location.name}</span>
                        </div>
                        {event.actors.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {event.actors.map((a) => (
                              a.sources && a.sources.length > 0 ? (
                                <a
                                  key={a.name}
                                  href={a.sources[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`${a.sources.length} source(s): ${a.sources.map(s => s.title).join(', ')}`}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border hover:brightness-125 transition-all ${actorTypeStyle[a.type] || 'bg-doom-surface text-doom-text-muted border-doom-border/30'}`}
                                >
                                  {a.name}
                                  <span className="text-[8px] opacity-60">🔗</span>
                                </a>
                              ) : (
                                <span
                                  key={a.name}
                                  className={`rounded px-1.5 py-0.5 text-[10px] border ${actorTypeStyle[a.type] || 'bg-doom-surface text-doom-text-muted border-doom-border/30'}`}
                                >
                                  {a.name}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* Video section */}
              {day.videoUrl ? (
                <div className="mt-3 bg-doom-dark/50 rounded-lg p-3 border border-doom-border/30">
                  <div className="text-[10px] uppercase tracking-wider text-doom-text-faint mb-1.5 font-medium font-mono">
                    Day {day.day} footage
                  </div>
                  <video
                    src={day.videoUrl}
                    controls
                    className="w-full rounded-lg"
                  />
                </div>
              ) : day.videoGenerating ? (
                <div className="mt-3 bg-doom-dark/50 rounded-lg p-3 border border-doom-border/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-doom-text-faint/30 border-t-doom-red rounded-full animate-spin" />
                    <span className="text-xs text-doom-text-muted">
                      Generating video...
                    </span>
                  </div>
                </div>
              ) : day.videoPrompt ? (
                <div className="mt-3 bg-doom-dark/50 rounded-lg p-3 border border-doom-border/30">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateVideo(day);
                    }}
                    className="w-full bg-doom-surface hover:bg-doom-border text-doom-text-muted hover:text-white text-xs py-2 rounded-lg transition-colors font-medium border border-doom-border/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50"
                  >
                    Generate Video
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
