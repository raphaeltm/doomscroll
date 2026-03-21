import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { useStore } from '../store';
import type { TimelineEvent } from '../types';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

const severityColors: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#e53e3e',
};

const severityRadius: Record<string, number> = {
  low: 0.3,
  medium: 0.4,
  high: 0.5,
  critical: 0.7,
};

const severityAltitude: Record<string, number> = {
  low: 0.01,
  medium: 0.02,
  high: 0.03,
  critical: 0.05,
};

function getAtmosphereColor(selectedDay: number | null): string {
  if (selectedDay === null) return '#3b82f6';
  if (selectedDay <= 2) return '#3b82f6';
  if (selectedDay <= 4) return '#f59e0b';
  return '#e53e3e';
}

export function WorldMap() {
  const { simulation, selectedDay, setSelectedDay, timelineOpen, setTimelineOpen } = useStore();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const events = useMemo(() => {
    const result: TimelineEvent[] = [];
    if (simulation?.days) {
      const daysToShow = selectedDay
        ? simulation.days.filter((d) => d.day === selectedDay)
        : simulation.days;
      daysToShow.forEach((d) => result.push(...d.events));
    }
    return result;
  }, [simulation, selectedDay]);

  const atmosphereColor = useMemo(
    () => getAtmosphereColor(simulation?.days.length ? selectedDay : null),
    [selectedDay, simulation?.days.length],
  );

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Auto-rotation setup
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls() as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      addEventListener: (e: string, fn: () => void) => void;
      removeEventListener: (e: string, fn: () => void) => void;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    const stopRotation = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener('start', stopRotation);
    return () => controls.removeEventListener('start', stopRotation);
  }, [dims.width]); // re-run after globe mounts

  // Stable reference for fly-to
  const eventCount = events.length;
  const centroid = useMemo(() => {
    if (events.length === 0) return null;
    return {
      lat: events.reduce((s, e) => s + e.location.lat, 0) / events.length,
      lng: events.reduce((s, e) => s + e.location.lng, 0) / events.length,
    };
  }, [events]);

  // Fly to events when they change
  useEffect(() => {
    if (!globeRef.current || !centroid) return;
    globeRef.current.pointOfView({ lat: centroid.lat, lng: centroid.lng, altitude: 2 }, 1000);
  }, [eventCount, selectedDay, centroid]);

  const getPointColor = useCallback(
    (d: object) => severityColors[(d as TimelineEvent).severity] || severityColors.low,
    [],
  );
  const getPointRadius = useCallback(
    (d: object) => severityRadius[(d as TimelineEvent).severity] || severityRadius.low,
    [],
  );
  const getPointAltitude = useCallback(
    (d: object) => severityAltitude[(d as TimelineEvent).severity] || severityAltitude.low,
    [],
  );
  const actorTypeColors: Record<string, string> = {
    state: '#818cf8',
    military: '#94a3b8',
    organization: '#2dd4bf',
    individual: '#fbbf24',
    media: '#a78bfa',
  };

  const getPointLabel = useCallback(
    (d: object) => {
      const ev = d as TimelineEvent;
      const severityColor = severityColors[ev.severity] || severityColors.low;
      return `<div style="background:#14141e;border:1px solid #2a2a3a;border-left:3px solid ${severityColor};border-radius:8px;padding:12px;min-width:200px;max-width:280px;font-family:system-ui,sans-serif;">
        <strong style="font-size:13px;display:block;color:#c8c8d0;">${ev.title}</strong>
        <p style="color:#8888a0;margin:4px 0 0;font-size:11px;">${ev.location.name}</p>
        <p style="color:#c8c8d0;margin:8px 0 0;font-size:12px;line-height:1.5;">${ev.description}</p>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${ev.actors.map((a) => {
            const c = actorTypeColors[a.type] || '#8888a0';
            return `<span style="background:${c}15;border:1px solid ${c}30;border-radius:4px;padding:2px 6px;font-size:10px;color:${c};">${a.name}</span>`;
          }).join('')}
        </div>
        <span style="display:inline-block;margin-top:8px;font-size:10px;font-weight:600;text-transform:uppercase;color:${severityColor};">${ev.severity}</span>
      </div>`;
    },
    [],
  );

  const isGenerating = simulation?.status === 'generating';
  const daysGenerated = simulation?.days.length ?? 0;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      {dims.width > 0 && (
        <Globe
          ref={globeRef}
          width={dims.width}
          height={dims.height}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor={atmosphereColor}
          atmosphereAltitude={0.12}
          animateIn={true}
          pointsData={events}
          pointLat={(d: object) => (d as TimelineEvent).location.lat}
          pointLng={(d: object) => (d as TimelineEvent).location.lng}
          pointColor={getPointColor}
          pointRadius={getPointRadius}
          pointAltitude={getPointAltitude}
          pointLabel={getPointLabel}
          pointsMerge={false}
          pointsTransitionDuration={800}
        />
      )}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[400]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(12,12,20,0.3) 100%)",
        }}
      />

      {/* Day selector */}
      {simulation && simulation.days.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-doom-panel/95 rounded-lg p-1 backdrop-blur-sm border border-doom-border shadow-lg shadow-black/40">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50 ${
              selectedDay === null
                ? "bg-doom-red text-white scale-105"
                : "text-doom-text-muted hover:text-white hover:bg-doom-surface"
            }`}
          >
            All
          </button>
          {simulation.days.map(d => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50 ${
                selectedDay === d.day
                  ? "bg-doom-red text-white scale-105"
                  : "text-doom-text-muted hover:text-white hover:bg-doom-surface"
              }`}
            >
              D{d.day}
            </button>
          ))}
        </div>
      )}

      {/* Timeline toggle tab (visible when timeline is collapsed) */}
      {!timelineOpen && simulation && simulation.days.length > 0 && (
        <button
          onClick={() => setTimelineOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-[1000] bg-doom-panel/90 backdrop-blur-md border border-r-0 border-doom-border rounded-l-lg px-1.5 py-4 text-doom-text-muted hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-[10px] font-mono mt-1 block [writing-mode:vertical-lr]">Timeline</span>
        </button>
      )}

      {/* Hero empty state */}
      {(!simulation || simulation.days.length === 0) && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="text-center">
            <h1 className="font-mono text-5xl font-bold tracking-widest text-white" style={{ textShadow: '0 0 40px rgba(229, 62, 62, 0.4), 0 0 80px rgba(229, 62, 62, 0.2)' }}>
              DOOMSCROLL
            </h1>
            <p className="text-doom-text-muted text-sm mt-3 tracking-wide">
              7-day geopolitical crisis simulator
            </p>
            <p className="text-doom-text-faint text-xs mt-2">
              Enter a scenario to begin
            </p>
          </div>
        </div>
      )}

      {/* Generating progress state */}
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="text-center">
            <p className="text-doom-text-muted text-sm font-mono mb-4">
              Generating Day {daysGenerated + 1} of 7...
            </p>
            <div className="flex gap-1.5 justify-center">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-1.5 rounded-full transition-colors duration-500 ${
                    i < daysGenerated ? 'bg-doom-red' : 'bg-doom-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
