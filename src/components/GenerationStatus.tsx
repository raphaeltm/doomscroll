import { useStore } from '../store';

export function GenerationStatus() {
  const simulation = useStore((s) => s.simulation);
  const generationStatus = useStore((s) => s.generationStatus);

  const isGenerating = simulation?.status === 'generating';
  if (!isGenerating || !generationStatus) return null;

  const daysComplete = simulation?.days.length ?? 0;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[900] pointer-events-none flex flex-col items-center gap-3">
      <div className="flex items-center gap-3 bg-doom-panel/80 backdrop-blur-md border border-doom-border rounded-full px-5 py-3 shadow-2xl shadow-black/50">
        <span className="w-3 h-3 border-2 border-doom-red/30 border-t-doom-red rounded-full animate-spin" />
        <span className="text-sm text-doom-text font-medium tracking-wide">
          {generationStatus}
        </span>
      </div>
      {daysComplete > 0 && (
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i < daysComplete ? 'bg-doom-red' : 'bg-doom-border'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
