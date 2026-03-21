import { useStore } from '../store';

const severityBadge: Record<string, string> = {
  low: 'bg-blue-900 text-blue-300',
  medium: 'bg-yellow-900 text-yellow-300',
  high: 'bg-red-900 text-red-300',
  critical: 'bg-red-800 text-red-200 animate-pulse',
};

export function Timeline() {
  const { simulation, selectedDay, setSelectedDay } = useStore();

  if (!simulation || simulation.days.length === 0) {
    return (
      <div className="w-96 bg-gray-900 border-l border-gray-700 flex items-center justify-center">
        <p className="text-gray-500 text-sm text-center px-8">
          {simulation?.status === 'generating'
            ? 'Generating simulation...'
            : 'Run a simulation to see the timeline'}
        </p>
      </div>
    );
  }

  const daysToShow = selectedDay
    ? simulation.days.filter((d) => d.day === selectedDay)
    : simulation.days;

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">{simulation.title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          {simulation.days.length} days simulated
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {daysToShow.map((day) => (
          <div
            key={day.day}
            className="border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors"
            onClick={() =>
              setSelectedDay(selectedDay === day.day ? null : day.day)
            }
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-400">
                  Day {day.day}
                </h3>
                <span className="text-xs text-gray-500">{day.date}</span>
              </div>
              <p className="text-sm text-gray-300 mt-1">{day.summary}</p>

              {/* Events */}
              <div className="mt-3 space-y-2">
                {day.events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-gray-800 rounded p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-white">
                        {event.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${severityBadge[event.severity]}`}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-1">{event.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-gray-500">
                      <span>📍 {event.location.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {event.actors.map((a) => (
                        <span
                          key={a.name}
                          className="bg-gray-700 rounded px-1.5 py-0.5 text-[10px] text-gray-300"
                        >
                          {a.name} ({a.type})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Video section placeholder */}
              {day.videoPrompt && (
                <div className="mt-3 bg-gray-800 rounded p-3 border border-gray-700">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Video Prompt
                  </div>
                  <p className="text-xs text-gray-400">{day.videoPrompt}</p>
                  {day.videoUrl ? (
                    <video
                      src={day.videoUrl}
                      controls
                      className="mt-2 w-full rounded"
                    />
                  ) : (
                    <button className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded transition-colors">
                      {day.videoGenerating
                        ? 'Generating...'
                        : 'Generate Video'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
