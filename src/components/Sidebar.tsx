import { useState } from 'react';
import { useStore } from '../store';
import { runSimulation } from '../api/client';

const exampleScenarios = [
  "A massive cyberattack disables power grids across three NATO countries",
  "China establishes a naval blockade around Taiwan",
  "A rogue AI system takes control of global financial markets",
];

export function Sidebar() {
  const [prompt, setPrompt] = useState('');
  const {
    simulation,
    setSimulation,
    updateSimulation,
    addDay,
    sidebarOpen,
    setSidebarOpen,
    generationStatus,
    setGenerationStatus,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setSidebarOpen(false);

    setSimulation({
      id: crypto.randomUUID(),
      prompt,
      title: 'Generating...',
      days: [],
      status: 'generating',
    });

    try {
      const result = await runSimulation(prompt, {
        onDayGenerated: (day) => addDay(day),
        onStatusChange: (status) => setGenerationStatus(status),
      });

      updateSimulation({
        title: result.title,
        weekSummary: result.weekSummary,
        status: 'complete',
        days: result.days,
      });
      setGenerationStatus('');
    } catch (err) {
      updateSimulation({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setGenerationStatus('');
    }
  };

  // Collapsed toggle strip
  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-[1000] bg-doom-panel/90 backdrop-blur-md border border-doom-border rounded-lg px-2 py-3 flex flex-col items-center gap-2 hover:bg-doom-surface transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-doom-red" />
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-doom-text-muted">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] bg-doom-panel/90 backdrop-blur-md border border-doom-border rounded-xl flex flex-col overflow-y-auto shadow-2xl shadow-black/50 transition-transform duration-300">
      {/* Header */}
      <div className="p-5 border-b border-doom-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-doom-red" />
            <h1 className="text-xl font-bold tracking-wide text-doom-red font-mono">
              DoomScroll
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-doom-text-faint hover:text-doom-text transition-colors p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-doom-text-muted mt-1 ml-4">
          Geopolitical Simulator
        </p>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {/* Scenario Input */}
        <div className="space-y-1.5">
          <label className="block text-xs text-doom-text-muted font-medium">
            Scenario
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A massive cyberattack disables power grids across three NATO countries simultaneously..."
            rows={6}
            className="w-full bg-doom-surface border border-doom-border rounded-lg px-3 py-2.5 text-sm text-doom-text placeholder-doom-text-faint focus:outline-none focus-visible:border-doom-red focus-visible:ring-1 focus-visible:ring-doom-red/30 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Example scenario chips */}
        <div className="flex flex-wrap gap-1.5">
          {exampleScenarios.map((scenario) => (
            <button
              key={scenario}
              onClick={() => setPrompt(scenario)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-doom-surface border border-doom-border text-doom-text-muted hover:text-doom-text hover:border-doom-red/30 transition-colors truncate max-w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50"
            >
              {scenario.slice(0, 45)}...
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-doom-red hover:bg-red-500 disabled:bg-doom-surface disabled:text-doom-text-faint disabled:border-doom-border text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm border border-doom-red/40 hover:border-red-400/40 active:scale-[0.98] disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-doom-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-doom-panel"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating...
            </span>
          ) : (
            'Run Simulation'
          )}
        </button>

        {/* Status message */}
        {isGenerating && generationStatus && (
          <div className="flex items-center gap-2 bg-doom-surface rounded-lg px-3 py-2 border border-doom-border">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-doom-text-muted uppercase tracking-widest">
              {generationStatus}
            </span>
          </div>
        )}

        {simulation?.error && (
          <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 text-sm text-red-400">
            {simulation.error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-doom-border">
        <p className="text-xs text-doom-text-faint text-center">
          Grounded in real data
        </p>
      </div>
    </div>
  );
}
