import { useState } from 'react';
import { useStore } from '../store';
import { runGeminiSimulation } from '../api/gemini';

const exampleScenarios = [
  "A massive cyberattack disables power grids across three NATO countries",
  "China establishes a naval blockade around Taiwan",
  "A rogue AI system takes control of global financial markets",
];

export function Sidebar() {
  const [prompt, setPrompt] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const {
    googleApiKey,
    setGoogleApiKey,
    videoApiKey,
    setVideoApiKey,
    simulation,
    setSimulation,
    updateSimulation,
    addDay,
    sidebarOpen,
    setSidebarOpen,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  // Auto-expand settings when API key is missing
  const needsKey = !googleApiKey;
  const showSettings = showApiKeys || needsKey;

  const handleSubmit = async () => {
    if (!googleApiKey || !prompt.trim()) return;

    setSidebarOpen(false);

    setSimulation({
      id: crypto.randomUUID(),
      prompt,
      title: 'Generating...',
      days: [],
      status: 'generating',
    });

    try {
      const result = await runGeminiSimulation(googleApiKey, prompt, (day) => {
        addDay(day);
      });
      updateSimulation({
        title: result.title,
        weekSummary: result.weekSummary,
        status: 'complete',
        days: result.days,
      });
    } catch (err) {
      updateSimulation({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
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
        {/* Scenario Input — first */}
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
          disabled={isGenerating || !googleApiKey || !prompt.trim()}
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

        {simulation?.error && (
          <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 text-sm text-red-400">
            {simulation.error}
          </div>
        )}

        {/* Collapsible API Keys */}
        <div className="border-t border-doom-border pt-3">
          <button
            type="button"
            onClick={() => setShowApiKeys(!showSettings || needsKey ? !showApiKeys : !showSettings)}
            className="flex items-center justify-between w-full text-xs text-doom-text-muted hover:text-doom-text transition-colors focus:outline-none"
          >
            <span className="flex items-center gap-1.5 font-medium">
              API Keys
              {googleApiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Key configured" />
              )}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showSettings && (
            <div className="mt-3 space-y-3 animate-fade-slide-in">
              <div className="space-y-1.5">
                <label className="block text-xs text-doom-text-muted font-medium">
                  Google AI API Key
                </label>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full bg-doom-surface border border-doom-border rounded-lg px-3 py-2.5 text-sm text-doom-text placeholder-doom-text-faint focus:outline-none focus-visible:border-doom-red focus-visible:ring-1 focus-visible:ring-doom-red/30 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs text-doom-text-muted font-medium">
                  Video API Key
                  <span className="text-doom-text-faint ml-1">(optional)</span>
                </label>
                <input
                  type="password"
                  value={videoApiKey}
                  onChange={(e) => setVideoApiKey(e.target.value)}
                  placeholder="API key..."
                  className="w-full bg-doom-surface border border-doom-border rounded-lg px-3 py-2.5 text-sm text-doom-text placeholder-doom-text-faint focus:outline-none focus-visible:border-doom-red focus-visible:ring-1 focus-visible:ring-doom-red/30 transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-doom-border">
        <p className="text-xs text-doom-text-faint text-center">
          Hackathon build — temporary keys only
        </p>
      </div>
    </div>
  );
}
