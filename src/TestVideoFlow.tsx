import { useState, useRef } from 'react';
import { useStore } from './store';
import { generateVideo, generateTTS, stitchVideos } from './api/video';
import { GoogleGenAI } from '@google/genai';

const mockDays = [
  { day: 1, summary: "Tensions rise as a naval blockade is spotted off the coast of Taiwan.", videoPrompt: "Cinematic shot of a naval blockade in the Pacific, heavy mist, dramatic lighting." },
  { day: 2, summary: "Cyberattacks disable communication lines across the island.", videoPrompt: "Glitchy screens in a dark command center, panicked technicians." },
  { day: 3, summary: "International response begins as carrier groups move into position.", videoPrompt: "Aircraft carrier cutting through choppy waves at sunset, silhouettes of fighter jets." },
  { day: 4, summary: "First skirmishes reported in the South China Sea.", videoPrompt: "Nighttime naval battle, tracers lighting up the sky, explosions on the horizon." },
  { day: 5, summary: "Global markets crash as supply chains are severed.", videoPrompt: "Wall Street ticker in red, blurred crowds moving frantically." },
  { day: 6, summary: "Diplomatic efforts fail; a formal declaration of war is issued.", videoPrompt: "Grim world leaders in a conference room, shadows and high contrast." },
  { day: 7, summary: "The conflict reaches a tipping point as major cities are evacuated.", videoPrompt: "Distant city skyline with smoke rising, empty highways, somber atmosphere." }
];

const HARDCODED_DAY_VIDEOS = [
  "https://v3b.fal.media/files/b/0a9311a9/QKRSCh91zJotiRGsZCkAk_f611d03d8ed64a01b59712205b36abb6.mp4",
  "https://v3b.fal.media/files/b/0a9311a9/oTdWT0UU62TUo2Y0SwpNz_0a9df5ac0aee48969938a2ad11c8d22c.mp4",
  "https://v3b.fal.media/files/b/0a9311a9/0a9xjRt4v7mxrUFKhappk_8467ec44eb744fbd82fc9cacce889a1c.mp4",
  "https://v3b.fal.media/files/b/0a9311a9/gsTUZ5e8BzFrqZhxdFjPP_51002e1f0f134276be6c3863400516e3.mp4",
  "https://v3b.fal.media/files/b/0a9311a9/RV8L3FnrHY2kSrJHFUyHp_3d7c510182334cd69487927a7a2f1fd2.mp4",
  "https://v3b.fal.media/files/b/0a9311aa/G-PP86B3ntH7-eZOv7wqr_3b37be1a854245a3984416a7e176a785.mp4",
  "https://v3b.fal.media/files/b/0a9311b0/HRhazEzBVaJocNPlHMwOg_bac83b5e39bb41d8b1ab93eae5e6e65e.mp4"
];

const HARDCODED_MERGED_VIDEO = "https://v3b.fal.media/files/b/0a931223/GzQWedxcKUvTZpKWM8NHU_merged_video.mp4";
const HARDCODED_NEWS_SCRIPT = "Breaking News! Hello, welcome to our breaking edition. An unprecedented global situation threatens peace! Alarms sounding worldwide as data indicates rapid escalation. Our cameras show monumental global stakes! Day One: Crisis unfolds! Massive naval fleets deploy, force unseen. Warships cut choppy seas, sun breaks through ominous clouds. Battle not just at sea! Day Two: Relentless cyber onslaught! Command centers fight digital war. \"System compromised!\" they shout, firewalls buckle. Override complete! Day Three: Global powers on full display! Aircraft carrier, fortress at sea, steaming through dramatic light, jets poised. Power unfolds! Day Four: Airspace contested! Reports of lightning-fast aerial engagements. Skies alive with conflict potential as intel races! Day Five: Human toll clear. Cities on high alert, emergency services scrambling. Evacuation orders as threat edges closer. It's lives! Day Six: Diplomatic efforts hit breaking point! World leaders grim as de-escalation fails. Peace narrows hourly! Day Seven: The world stands at a precipice! Future uncertain. Stay with us for continuous coverage!";
const HARDCODED_TTS_AUDIO = "https://v3b.fal.media/files/b/0a931248/3pSjX3U188WqVjK08Fv_O_final_audio.mp3"; // Placeholder or real cached audio

export function TestVideoFlow() {
  const { videoApiKey, googleApiKey, setVideoApiKey } = useStore();
  const [status, setStatus] = useState('');
  
  // Granular Toggles
  const [useCachedDays, setUseCachedDays] = useState(true);
  const [useCachedMerged, setUseCachedMerged] = useState(true);
  const [useCachedScript, setUseCachedScript] = useState(true);
  const [useCachedTTS, setUseCachedTTS] = useState(false);

  const [dayVideos, setDayVideos] = useState<string[]>(new Array(7).fill(''));
  const [generatingDays, setGeneratingDays] = useState<boolean[]>(new Array(7).fill(false));
  const [finalVideo, setFinalVideo] = useState('');
  const [finalAudio, setFinalAudio] = useState('');
  const [newsScript, setNewsScript] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const syncPlayback = (type: 'play' | 'pause') => {
    if (type === 'play') {
      videoRef.current?.play();
      audioRef.current?.play();
    } else {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  };

  const generateDayVideo = async (index: number) => {
    if (!videoApiKey) return alert('Need Fal.ai Key');
    const newGenerating = [...generatingDays];
    newGenerating[index] = true;
    setGeneratingDays(newGenerating);
    try {
      const url = await generateVideo(videoApiKey, mockDays[index].videoPrompt);
      const newVideos = [...dayVideos];
      newVideos[index] = url;
      setDayVideos(newVideos);
    } catch (e) {
      console.error(e);
    } finally {
      const finishedGenerating = [...generatingDays];
      finishedGenerating[index] = false;
      setGeneratingDays(finishedGenerating);
    }
  };

  const runFullFlow = async () => {
    if (!videoApiKey || !googleApiKey) return alert('Need both API keys');

    try {
      let currentDayVideos = [...dayVideos];
      let currentMergedVideo = "";
      let script = "";
      let audioUrl = "";

      // Step 1: Handle Daily Videos
      if (useCachedDays) {
        setStatus('Using cached daily videos...');
        currentDayVideos = HARDCODED_DAY_VIDEOS;
        setDayVideos(currentDayVideos);
      } else {
        setStatus('Generating daily videos in parallel...');
        const videoPromises = mockDays.map(async (day, i) => {
          if (!currentDayVideos[i]) {
            setGeneratingDays(prev => { const n = [...prev]; n[i] = true; return n; });
            try {
              const url = await generateVideo(videoApiKey, day.videoPrompt);
              currentDayVideos[i] = url;
              setDayVideos([...currentDayVideos]);
            } finally {
              setGeneratingDays(prev => { const n = [...prev]; n[i] = false; return n; });
            }
          }
        });
        await Promise.all(videoPromises);
      }

      // Step 2: Handle Merged Video
      if (useCachedMerged) {
        setStatus('Using cached merged video...');
        currentMergedVideo = HARDCODED_MERGED_VIDEO;
      } else {
        setStatus('Step 1/4: Merging all video scenes...');
        currentMergedVideo = await stitchVideos(videoApiKey, currentDayVideos, '');
      }

      // Step 3: Handle News Script
      if (useCachedScript) {
        setStatus('Using cached news script...');
        script = HARDCODED_NEWS_SCRIPT;
      } else {
        const { describeVideo } = await import('./api/video');
        setStatus('Step 2/4: Analyzing video content...');
        const visualDescription = await describeVideo(videoApiKey, currentMergedVideo);

        setStatus('Step 3/4: Drafting news script...');
        const ai = new GoogleGenAI({ apiKey: googleApiKey });
        const scriptPrompt = `
          You are a high-energy TV news anchor. You need to write a script for a 51-second broadcast.
          
          TIMING GUIDE:
          - 0:00-0:04 (4s): Intro Music/Graphics (Start with a punchy "Breaking News!")
          - 0:04-0:09 (5s): Anchor intro (Introduce the global crisis)
          - 0:09-0:51 (42s): Rapid coverage of 7 days of escalation (roughly 6 seconds of speech per day).
          
          Visual description of scenes: ${visualDescription}
          
          REQUIREMENTS:
          - Total word count MUST be between 180 and 210 words to fill the 51 seconds at a fast news pace.
          - Cover all 7 days mentioned in the description.
          - Keep the energy extremely high.
          - Output ONLY the script text, no timestamps, no stage directions.
        `;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: scriptPrompt,
        });
        script = response.text ?? '';
      }
      setNewsScript(script);

      // Step 4: Handle TTS
      if (useCachedTTS) {
        setStatus('Using cached TTS audio...');
        audioUrl = HARDCODED_TTS_AUDIO;
      } else {
        setStatus('Step 3/3: Generating TTS reporter voice...');
        audioUrl = await generateTTS(videoApiKey, script);
      }
      setFinalAudio(audioUrl);

      // Final Stitch (Now handled by browser sync)
      setStatus('Complete! Ready for dual playback.');
      setFinalVideo(currentMergedVideo);

    } catch (e) {
      console.error(e);
      setStatus('Error: ' + (e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-gray-900 overflow-y-auto p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-doom-red">Video Flow Tester</h1>
          <button onClick={() => window.location.reload()} className="text-sm text-gray-400 hover:text-white">Exit Test</button>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1.5 font-bold">Fal.ai API Key</label>
              <input 
                type="password" 
                value={videoApiKey} 
                onChange={(e) => setVideoApiKey(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-doom-red outline-none transition-colors"
              />
            </div>
            
            <div className="space-y-2 border-t border-gray-700 pt-4">
              <span className="text-[10px] uppercase text-gray-500 font-bold block mb-2">Granular Cache Toggles</span>
              {[
                { label: 'Use Cached Day Videos', state: useCachedDays, set: setUseCachedDays },
                { label: 'Use Cached Merged Video', state: useCachedMerged, set: setUseCachedMerged },
                { label: 'Use Cached News Script', state: useCachedScript, set: setUseCachedScript },
                { label: 'Use Cached TTS Audio', state: useCachedTTS, set: setUseCachedTTS }
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3 group cursor-pointer" onClick={() => t.set(!t.state)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.state ? 'bg-doom-red border-doom-red' : 'border-gray-500 bg-gray-700'}`}>
                    {t.state && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className={`text-xs transition-colors ${t.state ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col justify-end gap-3">
             <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 mb-auto">
               <span className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Current Strategy</span>
               <p className="text-[11px] text-gray-400 leading-relaxed">
                 {useCachedDays && useCachedMerged && useCachedScript && useCachedTTS 
                   ? "Instant verification of final audio-visual mix using all cached assets."
                   : "Hybrid flow with some live generation. Recommended for testing logic changes."}
               </p>
             </div>
            <button 
              onClick={runFullFlow}
              className="w-full bg-doom-red hover:bg-red-500 py-4 rounded-xl font-bold shadow-lg shadow-doom-red/20 transition-all active:scale-95 text-lg"
            >
              Start Selected Flow
            </button>
          </div>
        </div>

        {status && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-blue-400 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm font-medium">{status}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-1 h-6 bg-doom-red rounded-full" />
              Daily Assets
            </h2>
            <div className="grid gap-4">
              {mockDays.map((day, i) => (
                <div key={day.day} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-doom-red font-mono">DAY {day.day}</span>
                    <button 
                      onClick={() => generateDayVideo(i)}
                      disabled={generatingDays[i]}
                      className="text-[10px] bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-600 disabled:opacity-50 font-bold uppercase tracking-wider transition-colors"
                    >
                      {generatingDays[i] ? 'Generating...' : dayVideos[i] ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">{day.summary}</p>
                  {dayVideos[i] && (
                    <video src={dayVideos[i]} controls className="w-full rounded-lg border border-gray-700 bg-black aspect-video" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-1 h-6 bg-doom-red rounded-full" />
              Final Broadcast
            </h2>
            <div className="space-y-6">
              {newsScript && (
                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                  <span className="text-[10px] uppercase text-gray-500 block mb-3 font-bold tracking-widest">Active News Script</span>
                  <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600">
                    <p className="text-sm italic font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">{newsScript}</p>
                  </div>
                </div>
              )}
              {finalVideo && (
                <div className="bg-gray-800 p-1 rounded-2xl border-2 border-doom-red/30 overflow-hidden group">
                  <div className="bg-doom-red/10 px-4 py-2 flex items-center justify-between border-b border-doom-red/20">
                    <span className="text-[10px] uppercase text-doom-red font-bold tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-doom-red animate-pulse" />
                      Live Broadcast (Dual Playback)
                    </span>
                    <button 
                      onClick={() => {
                        if (videoRef.current?.paused) syncPlayback('play');
                        else syncPlayback('pause');
                      }}
                      className="bg-doom-red/20 hover:bg-doom-red text-doom-red hover:text-white text-[9px] px-3 py-1 rounded-lg border border-doom-red/30 transition-all font-bold uppercase tracking-wider"
                    >
                      {videoRef.current?.paused ? 'Play Sync' : 'Pause Sync'}
                    </button>
                  </div>
                  <div className="relative group">
                    <video 
                      ref={videoRef}
                      src={finalVideo} 
                      className="w-full bg-black aspect-video"
                      onPlay={() => audioRef.current?.play()}
                      onPause={() => audioRef.current?.pause()}
                      onSeeked={(e) => {
                        if (audioRef.current) audioRef.current.currentTime = e.currentTarget.currentTime;
                      }}
                    />
                    {finalAudio && (
                      <div className="p-4 bg-gray-900/80 border-t border-gray-700">
                        <span className="text-[9px] uppercase text-gray-500 font-bold block mb-2">Synchronized Reporter Voice</span>
                        <audio 
                          ref={audioRef}
                          src={finalAudio}
                          className="w-full h-8"
                          controls
                        />
                        <div className="mt-2 flex items-center justify-between">
                           <span className="text-[9px] text-gray-500 italic">Background Video: 40% vol | Voiceover: 100% vol</span>
                           <input 
                             type="range" 
                             min="0" max="1" step="0.1" 
                             defaultValue="0.4"
                             onChange={(e) => { if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value); }}
                             className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-doom-red"
                           />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!finalVideo && !status && (
                <div className="h-64 rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-xs uppercase tracking-widest font-bold">Awaiting Pipeline Start</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
