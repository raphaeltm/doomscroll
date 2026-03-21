import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';
import type { TimelineEvent } from '../types';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Leaflet + Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const severityColors: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

function createIcon(severity: string) {
  const color = severityColors[severity] || '#3b82f6';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 16px; height: 16px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}80;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function MapUpdater({ events }: { events: TimelineEvent[] }) {
  const map = useMap();
  useEffect(() => {
    if (events.length > 0) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.location.lat, e.location.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [events, map]);
  return null;
}

export function WorldMap() {
  const { simulation, selectedDay, setSelectedDay } = useStore();

  // Get events to display: selected day only, or all
  const events: TimelineEvent[] = [];
  if (simulation?.days) {
    const daysToShow = selectedDay
      ? simulation.days.filter((d) => d.day === selectedDay)
      : simulation.days;
    daysToShow.forEach((d) => events.push(...d.events));
  }

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
        style={{ background: '#1a1a2e' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.location.lat, event.location.lng]}
            icon={createIcon(event.severity)}
          >
            <Popup>
              <div className="text-sm">
                <strong className="text-base">{event.title}</strong>
                <p className="text-gray-600 mt-1">{event.location.name}</p>
                <p className="mt-2">{event.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.actors.map((a) => (
                    <span
                      key={a.name}
                      className="inline-block bg-gray-100 rounded px-2 py-0.5 text-xs"
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

      {/* Day selector overlay */}
      {simulation && simulation.days.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-gray-900/90 rounded-lg p-2 backdrop-blur">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedDay === null
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {simulation.days.map((d) => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedDay === d.day
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              D{d.day}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
