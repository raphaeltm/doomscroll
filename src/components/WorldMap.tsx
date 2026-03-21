import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';
import type { TimelineEvent } from '../types';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const severityConfig: Record<string, { color: string; size: number; glow: string }> = {
  low: { color: '#3b82f6', size: 12, glow: '0 0 12px #3b82f680' },
  medium: { color: '#f59e0b', size: 14, glow: '0 0 16px #f59e0b80' },
  high: { color: '#ef4444', size: 16, glow: '0 0 20px #ef444480' },
  critical: { color: '#ff2d2d', size: 20, glow: '0 0 30px #ff2d2d99, 0 0 60px #ff2d2d44' },
};

function createIcon(severity: string) {
  const cfg = severityConfig[severity] || severityConfig.low;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${cfg.size}px; height: ${cfg.size}px;
      background: radial-gradient(circle, ${cfg.color}, ${cfg.color}99);
      border: 2px solid ${cfg.color};
      border-radius: 50%;
      box-shadow: ${cfg.glow};
    "></div>`,
    iconSize: [cfg.size, cfg.size],
    iconAnchor: [cfg.size / 2, cfg.size / 2],
  });
}

function MapUpdater({ events }: { events: TimelineEvent[] }) {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.location.lat, e.location.lng])
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 5 });
    }
  }, [events, map]);
  return null;
}

export function WorldMap() {
  const { simulation, selectedDay, setSelectedDay } = useStore();

  const events: TimelineEvent[] = [];
  if (simulation?.days) {
    const daysToShow = selectedDay
      ? simulation.days.filter((d) => d.day === selectedDay)
      : simulation.days;
    daysToShow.forEach((d) => events.push(...d.events));
  }

  return (
    <div className="flex-1 relative min-w-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
        style={{ background: '#0a0a0f' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.location.lat, event.location.lng]}
            icon={createIcon(event.severity)}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <strong className="text-base block">{event.title}</strong>
                <p className="text-gray-400 mt-1 text-xs">{event.location.name}</p>
                <p className="mt-2 text-gray-300">{event.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.actors.map((a) => (
                    <span
                      key={a.name}
                      className="inline-block bg-gray-700 rounded px-2 py-0.5 text-[10px] text-gray-300"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapUpdater events={events} />
      </MapContainer>

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none z-[400]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(10,10,15,0.3) 100%)',
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
