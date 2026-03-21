import { useState } from 'react';
import { useStore } from '../store';
import { runGeminiSimulation } from '../api/gemini';

export function Sidebar() {
  const [prompt, setPrompt] = useState('');
  const {
    googleApiKey,
    setGoogleApiKey,
    videoApiKey,
    setVideoApiKey,
    simulation,
    setSimulation,
    updateSimulation,
    addDay,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  const handleSubmit = async () => {
    if (!googleApiKey || !prompt.trim()) return;

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

  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-doom-red glow-pulse" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-doom-red uppercase">
            Doomscroll
          </h1>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.3em] ml-4">
          Geopolitical Simulator
        </p>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* API Keys */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-[0.15em] font-medium">
            Google AI API Key
          </label>
          <input
            type="password"
            value={googleApiKey}
            onChange={(e) => setGoogleApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-doom-red/50 focus:shadow-[0_0_15px_rgba(255,45,45,0.15)] transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-[0.15em] font-medium">
            Video API Key
            <span className="text-gray-600 ml-1">(optional)</span>
          </label>
          <input
            type="password"
            value={videoApiKey}
            onChange={(e) => setVideoApiKey(e.target.value)}
            placeholder="API key..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-doom-red/50 focus:shadow-[0_0_15px_rgba(255,45,45,0.15)] transition-all"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Scenario Input */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-[0.15em] font-medium">
            Scenario
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A massive cyberattack disables power grids across three NATO countries simultaneously..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-doom-red/50 focus:shadow-[0_0_15px_rgba(255,45,45,0.15)] transition-all resize-none leading-relaxed"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isGenerating || !googleApiKey || !prompt.trim()}
          className="w-full bg-doom-red hover:bg-red-500 disabled:bg-white/5 disabled:text-gray-600 disabled:border-white/10 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm uppercase tracking-[0.15em] border border-red-500/30 shadow-[0_0_20px_rgba(255,45,45,0.2)] hover:shadow-[0_0_40px_rgba(255,45,45,0.4)] active:scale-[0.98] disabled:shadow-none"
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest">
          Hackathon Build • Temporary Keys Only
        </p>
      </div>
    </div>
  );
}
