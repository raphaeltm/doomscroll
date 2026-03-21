import { useStore } from '../store';

const severityBadge: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  critical: 'bg-red-600/30 text-red-300 border border-red-500/50 animate-pulse',
};

const severityDot: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
  critical: 'bg-red-400 animate-pulse',
};

export function Timeline() {
  const { simulation, selectedDay, setSelectedDay } = useStore();

  if (!simulation || simulation.days.length === 0) {
    return (
      <div className="w-[420px] bg-doom-panel border-l border-doom-border flex flex-col items-center justify-center shrink-0">
        {simulation?.status === 'generating' ? (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-doom-red/30 border-t-doom-red rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-xs uppercase tracking-[0.2em]">
              Generating timeline...
            </p>
          </div>
        ) : (
          <div className="text-center px-8">
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-doom-border to-transparent mx-auto mb-4" />
            <p className="text-gray-600 text-xs uppercase tracking-[0.2em]">
              Timeline
            </p>
            <p className="text-gray-700 text-[10px] mt-2">
              Run a simulation to begin
            </p>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-doom-border to-transparent mx-auto mt-4" />
          </div>
        )}
      </div>
    );
  }

  const daysToShow = selectedDay
    ? simulation.days.filter((d) => d.day === selectedDay)
    : simulation.days;

  return (
    <div className="w-[420px] bg-doom-panel border-l border-doom-border flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-doom-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-500 uppercase tracking-[0.15em] font-medium">
            Simulation Complete
          </span>
        </div>
        <h2 className="text-lg font-bold text-white leading-tight">
          {simulation.title}
        </h2>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
          {simulation.days.length} days • {simulation.days.reduce((n, d) => n + d.events.length, 0)} events
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {daysToShow.map((day) => (
          <div
            key={day.day}
            className="border-b border-doom-border/50 cursor-pointer hover:bg-doom-surface/50 transition-all group"
            onClick={() =>
              setSelectedDay(selectedDay === day.day ? null : day.day)
            }
          >
            <div className="p-5">
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-doom-red font-black text-lg">
                    {String(day.day).padStart(2, '0')}
                  </span>
                  <div className="w-6 h-px bg-doom-red/30" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                    {day.date}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600">
                  {day.events.length} events
                </span>
              </div>

              <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                {day.summary}
              </p>

              {/* Events */}
              <div className="space-y-2">
                {day.events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-doom-dark/80 rounded-lg p-3 text-xs border border-doom-border/30 group-hover:border-doom-border/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[event.severity]}`} />
                        <span className="font-semibold text-gray-200">
                          {event.title}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${severityBadge[event.severity]}`}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-gray-500 leading-relaxed">
                      {event.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-gray-600">
                      <span className="text-[10px]">📍</span>
                      <span className="text-[10px]">{event.location.name}</span>
                    </div>
                    {event.actors.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {event.actors.map((a) => (
                          <span
                            key={a.name}
                            className="bg-doom-surface rounded px-1.5 py-0.5 text-[9px] text-gray-400 border border-doom-border/30"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Video prompt */}
              {day.videoPrompt && (
                <div className="mt-3 bg-doom-dark/50 rounded-lg p-3 border border-doom-border/30">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-gray-600 mb-1.5 font-medium">
                    Video Prompt
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed italic">
                    "{day.videoPrompt}"
                  </p>
                  {day.videoUrl ? (
                    <video
                      src={day.videoUrl}
                      controls
                      className="mt-2 w-full rounded-lg"
                    />
                  ) : (
                    <button className="mt-2 w-full bg-doom-surface hover:bg-doom-border text-gray-400 hover:text-white text-[10px] py-2 rounded-lg transition-all uppercase tracking-widest font-medium border border-doom-border/50">
                      {day.videoGenerating
                        ? 'Generating...'
                        : '▶ Generate Video'}
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
