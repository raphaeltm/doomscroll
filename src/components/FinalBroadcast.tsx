import { useRef } from 'react';
import { useStore } from '../store';

const HARDCODED_FINAL_VIDEO = "https://v3b.fal.media/files/b/0a931223/GzQWedxcKUvTZpKWM8NHU_merged_video.mp4";
const HARDCODED_FINAL_AUDIO = "https://v3b.fal.media/files/b/0a9312b7/VVNeGXhwCB-kLOXKvwo3A_speech.mp3";

export function FinalBroadcast() {
  const { simulation } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!simulation || !simulation.weekSummary) return null;

  const hasVideo = simulation.finalVideoUrl || HARDCODED_FINAL_VIDEO;

  if (!hasVideo) return null;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-[320px] bg-doom-panel/90 backdrop-blur-md border border-doom-border rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-slide-in">
      <div className="bg-doom-red/20 px-3 py-1.5 flex items-center justify-between border-b border-doom-red/20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-doom-red animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-doom-red font-mono">
            Final Broadcast
          </span>
        </div>
      </div>
      
      <div className="p-3 bg-doom-surface/30">
        <p className="text-[10px] text-doom-text-muted leading-relaxed italic mb-3">
          {simulation.weekSummary}
        </p>
        
        <div className="relative rounded-lg overflow-hidden border border-doom-border/50 bg-black aspect-video">
          <video
            ref={videoRef}
            src={simulation.finalVideoUrl || HARDCODED_FINAL_VIDEO}
            controls
            autoPlay
            muted
            className="w-full h-full"
            onPlay={() => audioRef.current?.play()}
            onPause={() => audioRef.current?.pause()}
            onSeeked={(e) => {
              if (audioRef.current) audioRef.current.currentTime = e.currentTarget.currentTime;
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (video.currentTime >= 10) {
                if (video.muted) video.muted = false;
              } else {
                if (!video.muted) video.muted = true;
              }
            }}
          />
          <div className="hidden">
            <audio 
              ref={audioRef}
              src={simulation.finalAudioUrl || HARDCODED_FINAL_AUDIO}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
