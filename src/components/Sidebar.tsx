import { useState } from 'react';
import { useStore } from '../store';
import { runGeminiSimulation } from '../api/gemini';
import { getCachedSimulation, cacheSimulation, cacheVideo } from '../api/cache';
import { buildVideoPrompt } from '../api/videoPrompt';
import { generateVideo } from '../api/video';

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
    generationStatus,
    setGenerationStatus,
    useCachedMode,
    setUseCachedMode,
    uploadedImage,
    setUploadedImage,
  } = useStore();

  const isGenerating = simulation?.status === 'generating';

  // Auto-expand settings when API key is missing
  const needsKey = !googleApiKey;
  const showSettings = showApiKeys || needsKey;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    if (useCachedMode) {
      setSidebarOpen(false);
      
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const jitter = (base: number) => base + Math.random() * base * 0.6;

      setSimulation({
        id: 'cached-simulation',
        prompt,
        title: 'Generating...',
        days: [],
        status: 'generating',
      });

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

      const cachedDays = [
        { 
          day: 1, 
          date: 'Day 1', 
          summary: "Crisis unfolds as massive naval fleets deploy in a show of force unseen in decades. Warships cut through choppy seas while the sun breaks through ominous clouds, signaling that the battle is brewing not just at sea but across multiple domains.",
          videoPrompt: "Cinematic shot of a naval blockade in the Pacific, heavy mist, dramatic lighting.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311a9/QKRSCh91zJotiRGsZCkAk_f611d03d8ed64a01b59712205b36abb6.mp4",
          events: [{ id: 'e1', title: 'Naval Blockade', description: 'Strategic naval blockade established in the Taiwan Strait, with dozens of warships forming a perimeter that effectively halts commercial shipping and heightens global alarm.', severity: 'high', location: { lat: 23.5, lng: 120.5, name: 'Taiwan Strait' }, actors: [], sources: [] }]
        },
        { 
          day: 2, 
          date: 'Day 2', 
          summary: "A relentless cyber onslaught begins as command centers around the world fight a desperate digital war. Systems are compromised, firewalls buckle under the pressure, and technicians shout as critical overrides are completed by unknown actors.",
          videoPrompt: "Glitchy screens in a dark command center, panicked technicians.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311a9/oTdWT0UU62TUo2Y0SwpNz_0a9df5ac0aee48969938a2ad11c8d22c.mp4",
          events: [{ id: 'e2', title: 'Cyber Onslaught', description: 'Nationwide communication blackout reported after localized server farms are hit with highly sophisticated malware, leaving millions without internet or cellular service.', severity: 'critical', location: { lat: 25.0, lng: 121.5, name: 'Taipei' }, actors: [], sources: [] }]
        },
        { 
          day: 3, 
          date: 'Day 3', 
          summary: "Global powers are now on full display as massive aircraft carriers, true fortresses at sea, steam through dramatic light with jets poised for action. The scale of the power unfolding across the Pacific suggests a conflict of unprecedented proportions.",
          videoPrompt: "Aircraft carrier cutting through choppy waves at sunset, silhouettes of fighter jets.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311a9/0a9xjRt4v7mxrUFKhappk_8467ec44eb744fbd82fc9cacce889a1c.mp4",
          events: [{ id: 'e3', title: 'Carrier Strike Group', description: 'International carrier strike groups arrive in the Philippine Sea, conducting high-intensity drills while maintaining a state of maximum combat readiness.', severity: 'high', location: { lat: 20.0, lng: 125.0, name: 'Philippine Sea' }, actors: [], sources: [] }]
        },
        { 
          day: 4, 
          date: 'Day 4', 
          summary: "Airspace becomes contested as reports come in of lightning-fast aerial engagements. The skies are alive with conflict potential while intelligence services race to keep up with the rapid pace of the escalating skirmishes.",
          videoPrompt: "Nighttime naval battle, tracers lighting up the sky, explosions on the horizon.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311a9/gsTUZ5e8BzFrqZhxdFjPP_51002e1f0f134276be6c3863400516e3.mp4",
          events: [{ id: 'e4', title: 'Airspace Skirmish', description: 'High-altitude engagement over the South China Sea results in multiple aircraft losses, marking the first direct kinetic conflict between major power air forces.', severity: 'critical', location: { lat: 18.0, lng: 115.0, name: 'South China Sea' }, actors: [], sources: [] }]
        },
        { 
          day: 5, 
          date: 'Day 5', 
          summary: "The human toll becomes clear as cities are placed on high alert and emergency services scramble to manage the chaos. Evacuation orders are issued as the threat edges closer, making it clear that it's no longer just about politics—it's about lives.",
          videoPrompt: "Wall Street ticker in red, blurred crowds moving frantically.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311a9/RV8L3FnrHY2kSrJHFUyHp_3d7c510182334cd69487927a7a2f1fd2.mp4",
          events: [{ id: 'e5', title: 'Economic Collapse', description: 'Panic selling hits Wall Street and other global financial centers, leading to a temporary halt in trading as supply chain severance fears drive markets to a historic crash.', severity: 'medium', location: { lat: 40.7, lng: -74.0, name: 'New York' }, actors: [], sources: [] }]
        },
        { 
          day: 6, 
          date: 'Day 6', 
          summary: "Diplomatic efforts hit a breaking point as world leaders emerge from conference rooms looking grim and exhausted. Every attempt at de-escalation has failed, and the window for a peaceful resolution narrows by the hour.",
          videoPrompt: "Grim world leaders in a conference room, shadows and high contrast.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311aa/G-PP86B3ntH7-eZOv7wqr_3b37be1a854245a3984416a7e176a785.mp4",
          events: [{ id: 'e6', title: 'Talks Fail', description: 'Formal declaration of war issued by multiple nations following the collapse of the Berlin summit, leading to the immediate recall of all diplomatic staff.', severity: 'high', location: { lat: 52.5, lng: 13.4, name: 'Berlin' }, actors: [], sources: [] }]
        },
        { 
          day: 7, 
          date: 'Day 7', 
          summary: "The world stands at a precipice as the future becomes increasingly uncertain. Major cities are now being evacuated in a somber atmosphere, while the international community watches and waits for the next move in this continuous coverage of a global crisis.",
          videoPrompt: "Distant city skyline with smoke rising, empty highways, somber atmosphere.",
          videoUrl: "https://v3b.fal.media/files/b/0a9311b0/HRhazEzBVaJocNPlHMwOg_bac83b5e39bb41d8b1ab93eae5e6e65e.mp4",
          events: [{ id: 'e7', title: 'City Evacuations', description: 'Mass civilian exodus from Hong Kong and other major regional hubs as large-scale military mobilization is observed across all theaters of the conflict.', severity: 'critical', location: { lat: 22.3, lng: 114.1, name: 'Hong Kong' }, actors: [], sources: [] }]
        }
      ];
      
      for (let i = 0; i < cachedDays.length; i++) {
        setGenerationStatus(`Simulating day ${i + 1} of 7...`);
        await delay(jitter(1500));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useStore.getState().addDay(cachedDays[i] as any);
        await delay(jitter(500));
      }

      setGenerationStatus('Analyzing escalation arc...');
      await delay(jitter(1600));
      setGenerationStatus('Generating summary...');
      await delay(jitter(1400));

      updateSimulation({
        title: 'Global Crisis: The Seven Day Descent',
        weekSummary: 'A series of rapid escalations led to an unprecedented global conflict. What began as localized tensions quickly spiraled into a multi-theater engagement, testing the limits of international diplomacy and military response.',
        newsScript: 'Breaking News! Hello, welcome to our breaking edition. An unprecedented global situation threatens peace! Alarms sounding worldwide as data indicates rapid escalation. Our cameras show monumental global stakes! Day One: Crisis unfolds! Massive naval fleets deploy, force unseen. Warships cut choppy seas, sun breaks through ominous clouds. Battle not just at sea! Day Two: Relentless cyber onslaught! Command centers fight digital war. "System compromised!" they shout, firewalls buckle. Override complete! Day Three: Global powers on full display! Aircraft carrier, fortress at sea, steaming through dramatic light, jets poised. Power unfolds! Day Four: Airspace contested! Reports of lightning-fast aerial engagements. Skies alive with conflict potential as intel races! Day Five: Human toll clear. Cities on high alert, emergency services scrambling. Evacuation orders as threat edges closer. It\'s lives! Day Six: Diplomatic efforts hit breaking point! World leaders grim as de-escalation fails. Peace narrows hourly! Day Seven: The world stands at a precipice! Future uncertain. Stay with us for continuous coverage!',
        finalVideoUrl: 'https://v3b.fal.media/files/b/0a931223/GzQWedxcKUvTZpKWM8NHU_merged_video.mp4',
        finalAudioUrl: 'https://v3b.fal.media/files/b/0a9312b7/VVNeGXhwCB-kLOXKvwo3A_speech.mp3',
        status: 'complete',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        days: cachedDays as any,
      });
      setGenerationStatus('');
      return;
    }

    if (!googleApiKey) return;

    // REAL SIMULATION FLOW WITH AUTOMATIC CACHING
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
        videoApiKey,
        onDayGenerated: (day) => {
          if (useStore.getState().simulation?.days.some(d => d.day === day.day)) {
            useStore.getState().updateDay(day.day, day);
          } else {
            useStore.getState().addDay(day);
          }

          // Auto-trigger video generation and cache it
          if (vKey && day.videoPrompt && !day.videoUrl) {
            const cleanPrompt = buildVideoPrompt(day);
            useStore.getState().updateDay(day.day, { videoGenerating: true });
            generateVideo(vKey, cleanPrompt)
              .then((videoUrl) => {
                useStore.getState().updateDay(day.day, { videoUrl, videoGenerating: false });
                cacheVideo(prompt, day.day, videoUrl);
              })
              .catch(() => {
                useStore.getState().updateDay(day.day, { videoGenerating: false });
              });
          }
        },
        onStatusChange: (status) => setGenerationStatus(status),
      });

      // Stitch final video if we have video API key
      let finalVideoUrl = '';
      let finalAudioUrl = '';
      if (videoApiKey) {
        setGenerationStatus('Generating final broadcast...');
        const { generateTTS, stitchVideos } = await import('../api/video');
        finalAudioUrl = await generateTTS(videoApiKey, result.newsScript);
        const dayVideoUrls = result.days.map(d => d.videoUrl).filter(u => u) as string[];
        finalVideoUrl = await stitchVideos(videoApiKey, dayVideoUrls, finalAudioUrl);
      }

      updateSimulation({
        title: result.title,
        weekSummary: result.weekSummary,
        newsScript: result.newsScript,
        finalVideoUrl,
        finalAudioUrl,
        status: 'complete',
        days: result.days,
      });

      // Cache the full result
      cacheSimulation(prompt, {
        title: result.title,
        days: result.days,
        weekSummary: result.weekSummary,
        newsScript: result.newsScript,
        finalVideoUrl,
        finalAudioUrl,
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

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-xs text-doom-text-muted font-medium">
            Upload Intel (Optional)
          </label>
          <div className="relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-32 bg-doom-surface border-2 border-dashed border-doom-border rounded-xl cursor-pointer hover:border-doom-red/50 hover:bg-doom-surface/80 transition-all overflow-hidden"
            >
              {uploadedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-doom-text-muted">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  <span className="text-[10px] text-doom-text-faint uppercase font-bold tracking-wider">Select Intel Image</span>
                </div>
              )}
            </label>
            {uploadedImage && (
              <button
                onClick={(e) => { e.preventDefault(); setUploadedImage(null); }}
                className="absolute -top-2 -right-2 bg-doom-panel border border-doom-border rounded-full p-1 text-doom-text-muted hover:text-doom-red transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            id="cached-mode"
            checked={useCachedMode}
            onChange={(e) => setUseCachedMode(e.target.checked)}
            className="w-4 h-4 rounded border-doom-border bg-doom-surface text-doom-red focus:ring-doom-red/30 cursor-pointer"
          />
          <label htmlFor="cached-mode" className="text-xs text-doom-text-muted cursor-pointer select-none">
            Use Cached Simulation (Instant)
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isGenerating || (!useCachedMode && !googleApiKey) || !prompt.trim()}
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
              width="14" height="14"
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
          Grounded in real data
        </p>
      </div>
    </div>
  );
}
