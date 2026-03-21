import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { useStore } from '../store';
import type { TimelineEvent } from '../types';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

const severityColors: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#ff2d2d',
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

export function WorldMap() {
  const { simulation, selectedDay, setSelectedDay } = useStore();
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
  const getPointLabel = useCallback(
    (d: object) => {
      const ev = d as TimelineEvent;
      return `<div style="background:#1a1a28;border:1px solid #2a2a3d;border-radius:12px;padding:12px;min-width:200px;box-shadow:0 0 30px rgba(255,45,45,0.15);font-family:Inter,system-ui,sans-serif;">
        <strong style="font-size:14px;display:block;color:#f3f4f6;">${ev.title}</strong>
        <p style="color:#9ca3af;margin:4px 0 0;font-size:11px;">${ev.location.name}</p>
        <p style="color:#d1d5db;margin:8px 0 0;font-size:13px;">${ev.description}</p>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${ev.actors.map((a) => `<span style="background:#374151;border-radius:4px;padding:2px 8px;font-size:10px;color:#d1d5db;">${a.name}</span>`).join('')}
        </div>
      </div>`;
    },
    [],
  );

  return (
    <div ref={containerRef} className="flex-1 relative min-w-0 h-full overflow-hidden">
      {dims.width > 0 && (
        <Globe
          ref={globeRef}
          width={dims.width}
          height={dims.height}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#ff2d2d"
          atmosphereAltitude={0.15}
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
            'radial-gradient(ellipse at center, transparent 60%, rgba(10,10,15,0.3) 100%)',
        }}
      />

      {/* Day selector */}
      {simulation && simulation.days.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-doom-panel/95 rounded-xl p-1.5 backdrop-blur-md border border-doom-border shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              selectedDay === null
                ? 'bg-doom-red text-white shadow-[0_0_15px_rgba(255,45,45,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-doom-surface'
            }`}
          >
            All
          </button>
          {simulation.days.map((d) => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                selectedDay === d.day
                  ? 'bg-doom-red text-white shadow-[0_0_15px_rgba(255,45,45,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-doom-surface'
              }`}
            >
              D{d.day}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(!simulation || simulation.days.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4 opacity-20">🌍</div>
            <p className="text-gray-600 text-sm uppercase tracking-[0.2em]">
              {simulation?.status === 'generating'
                ? 'Generating events...'
                : 'Awaiting scenario'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
