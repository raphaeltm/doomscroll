import { useState } from 'react';
import { useStore } from '../store';
import { runGeminiSimulation } from '../api/gemini';
import { generateVideo } from '../api/video';
import { buildVideoPrompt } from '../api/videoPrompt';
import { getCachedSimulation, cacheSimulation, cacheVideo, restoreVideosForSimulation } from '../api/cache';

const exampleScenarios = [
  "A massive cyberattack disables power grids across three NATO countries",
  "China establishes a naval blockade around Taiwan",
  "A rogue AI system takes control of global financial markets",
];

export function Sidebar() {
  const [prompt, setPrompt] = useState('');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showVideoTest, setShowVideoTest] = useState(false);
  const [videoTestJson, setVideoTestJson] = useState('');
  const [videoTestStatus, setVideoTestStatus] = useState('');
  const {
    googleApiKey,
    setGoogleApiKey,
    videoApiKey,
    setVideoApiKey,
    simulation,
    setSimulation,
    updateSimulation,
    addDay,
    updateDay,
    sidebarOpen,
    setSidebarOpen,
    generationStatus,
    setGenerationStatus,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  // Auto-expand settings when API key is missing
  const needsKey = !googleApiKey;
  const showSettings = showApiKeys || needsKey;

  const runSimulation = async (bypassCache: boolean) => {
    if (!googleApiKey || !prompt.trim()) return;

    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cached = getCachedSimulation(prompt);
      if (cached) {
        setSidebarOpen(false);
        const daysWithVideos = await restoreVideosForSimulation(prompt, cached.days);
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

        // Replay the generation flow with staggered delays
        setSimulation({
          id: crypto.randomUUID(),
          prompt,
          title: 'Generating...',
          days: [],
          status: 'generating',
        });

        const jitter = (base: number) => base + Math.random() * base * 0.6;

        setGenerationStatus('Fetching real-world data...');
        await delay(jitter(1800));
        setGenerationStatus('Scanning GDELT news feed...');
        await delay(jitter(1400));
        setGenerationStatus('Querying Wikidata for world leaders...');
        await delay(jitter(1200));
        setGenerationStatus('Identifying actors...');
        await delay(jitter(2000));
        setGenerationStatus('Researching actors...');
        await delay(jitter(2500));

        for (let i = 0; i < daysWithVideos.length; i++) {
          setGenerationStatus(`Simulating day ${i + 1} of 7...`);
          await delay(jitter(1500));
          addDay(daysWithVideos[i]);
          await delay(jitter(500));
        }

        setGenerationStatus('Analyzing escalation arc...');
        await delay(jitter(1600));
        setGenerationStatus('Generating summary...');
        await delay(jitter(1400));

        updateSimulation({
          title: cached.title,
          weekSummary: cached.weekSummary,
          status: 'complete',
          days: daysWithVideos,
        });
        setGenerationStatus('');
        return;
      }
    }

    setSidebarOpen(false);

    setSimulation({
      id: crypto.randomUUID(),
      prompt,
      title: 'Generating...',
      days: [],
      status: 'generating',
    });

    try {
      const vKey = videoApiKey || googleApiKey;
      const result = await runGeminiSimulation(googleApiKey, prompt, {
        onDayGenerated: (day) => {
          addDay(day);
          // Auto-trigger video generation for each day
          if (vKey && day.videoPrompt) {
            const cleanPrompt = buildVideoPrompt(day);
            updateDay(day.day, { videoGenerating: true });
            generateVideo(vKey, cleanPrompt)
              .then((videoUrl) => {
                updateDay(day.day, { videoUrl, videoGenerating: false });
                // Cache the video blob
                cacheVideo(prompt, day.day, videoUrl);
              })
              .catch((err) => {
                console.error(`Video generation failed for day ${day.day}:`, err);
                updateDay(day.day, { videoGenerating: false });
              });
          }
        },
        onStatusChange: (status) => setGenerationStatus(status),
      });
      updateSimulation({
        title: result.title,
        weekSummary: result.weekSummary,
        status: 'complete',
        days: result.days,
      });
      // Cache the simulation result
      cacheSimulation(prompt, {
        title: result.title,
        days: result.days,
        weekSummary: result.weekSummary,
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

  const handleSubmit = () => runSimulation(false);
  const handleRegenerate = () => runSimulation(true);

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

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isGenerating || !googleApiKey || !prompt.trim()}
            className="flex-1 bg-doom-red hover:bg-red-500 disabled:bg-doom-surface disabled:text-doom-text-faint disabled:border-doom-border text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm border border-doom-red/40 hover:border-red-400/40 active:scale-[0.98] disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-doom-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-doom-panel"
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
          {getCachedSimulation(prompt) && !isGenerating && (
            <button
              onClick={handleRegenerate}
              disabled={!googleApiKey || !prompt.trim()}
              title="Bypass cache and regenerate"
              className="bg-doom-surface hover:bg-doom-border text-doom-text-muted hover:text-white py-3 px-3 rounded-lg transition-colors text-sm border border-doom-border active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          )}
        </div>

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

        {/* Video Test Panel — hidden under API keys */}
        {showSettings && (
          <div className="border-t border-doom-border pt-3">
            <button
              type="button"
              onClick={() => setShowVideoTest(!showVideoTest)}
              className="flex items-center justify-between w-full text-xs text-doom-text-faint hover:text-doom-text-muted transition-colors focus:outline-none"
            >
              <span className="font-medium">Test Video Gen</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${showVideoTest ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showVideoTest && (
              <div className="mt-2 space-y-2 animate-fade-slide-in">
                <textarea
                  value={videoTestJson}
                  onChange={(e) => setVideoTestJson(e.target.value)}
                  placeholder='{"title":"NATO summit...","description":"...","location":{"lat":50.85,"lng":4.35,"name":"Brussels"},...}'
                  rows={5}
                  className="w-full bg-doom-surface border border-doom-border rounded-lg px-3 py-2 text-[11px] text-doom-text placeholder-doom-text-faint focus:outline-none focus-visible:border-doom-red focus-visible:ring-1 focus-visible:ring-doom-red/30 transition-colors resize-none font-mono leading-relaxed"
                />
                <button
                  onClick={async () => {
                    const key = videoApiKey || googleApiKey;
                    if (!key) {
                      setVideoTestStatus('Error: Set an API key first');
                      return;
                    }
                    let parsed;
                    try {
                      parsed = JSON.parse(videoTestJson);
                    } catch {
                      setVideoTestStatus('Error: Invalid JSON');
                      return;
                    }
                    // Build prompt from event JSON (same as backend buildPrompt)
                    const parts = [];
                    parts.push(`Breaking news scene: ${parsed.title || 'A major geopolitical event unfolds'}.`);
                    if (parsed.description) parts.push(parsed.description);
                    if (parsed.location?.name) parts.push(`Set in ${parsed.location.name}.`);
                    if (parsed.actors?.length) {
                      const names = parsed.actors.map((a: { name?: string }) => a.name || a).join(', ');
                      parts.push(`Key figures involved: ${names}.`);
                    }
                    if (parsed.scene) parts.push(parsed.scene);
                    parts.push('Cinematic news footage style. No spoken dialogue or voiceover. Only ambient background sounds and dramatic music.');
                    const prompt = parts.join(' ');

                    setVideoTestStatus('Generating... (this takes ~1-2 min)');
                    try {
                      const url = await generateVideo(key, prompt);
                      setVideoTestStatus(`Done! URL: ${url}`);
                      window.open(url, '_blank');
                    } catch (err) {
                      setVideoTestStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                  }}
                  disabled={videoTestStatus.startsWith('Generating')}
                  className="w-full bg-doom-surface hover:bg-doom-border text-doom-text-muted hover:text-white text-xs py-2 rounded-lg transition-colors font-medium border border-doom-border/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-doom-red/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {videoTestStatus.startsWith('Generating') ? 'Generating...' : 'Test Generate'}
                </button>
                {videoTestStatus && (
                  <p className={`text-[10px] break-all ${videoTestStatus.startsWith('Error') ? 'text-red-400' : videoTestStatus.startsWith('Done') ? 'text-green-400' : 'text-doom-text-muted'}`}>
                    {videoTestStatus}
                  </p>
                )}
              </div>
            )}
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
