import { useState } from 'react';
import { useStore } from '../store';
import { generateSimulation } from '../api/claude';

export function Sidebar() {
  const [prompt, setPrompt] = useState('');
  const {
    claudeApiKey,
    setClaudeApiKey,
    videoApiKey,
    setVideoApiKey,
    simulation,
    setSimulation,
    updateSimulation,
    addDay,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  const handleSubmit = async () => {
    if (!claudeApiKey || !prompt.trim()) return;

    setSimulation({
      id: crypto.randomUUID(),
      prompt,
      title: 'Generating...',
      days: [],
      status: 'generating',
    });

    try {
      const result = await generateSimulation(claudeApiKey, prompt, (day) => {
        addDay(day);
      });
      updateSimulation({
        title: result.title,
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
    <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-red-500 tracking-wider">
          DOOMSCROLL
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Geopolitical Event Simulator
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* API Keys */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide">
            Claude API Key
          </label>
          <input
            type="password"
            value={claudeApiKey}
            onChange={(e) => setClaudeApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide">
            Video API Key (optional)
          </label>
          <input
            type="password"
            value={videoApiKey}
            onChange={(e) => setVideoApiKey(e.target.value)}
            placeholder="API key..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Scenario Input */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-400 uppercase tracking-wide">
            Scenario
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a geopolitical event to simulate..."
            rows={6}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isGenerating || !claudeApiKey || !prompt.trim()}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm uppercase tracking-wide"
        >
          {isGenerating ? 'Simulating...' : 'Run Simulation'}
        </button>

        {simulation?.error && (
          <div className="bg-red-900/50 border border-red-700 rounded p-3 text-sm text-red-300">
            {simulation.error}
          </div>
        )}
      </div>
    </div>
  );
}
