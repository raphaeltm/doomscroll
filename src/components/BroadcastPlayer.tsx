import { useRef } from 'react';
import { useStore } from '../store';

export function BroadcastPlayer() {
  const { simulation } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!simulation) return null;

  const { finalVideoUrl, finalAudioUrl, overviewGenerating, overviewError } = simulation;

  if (overviewGenerating) {
    return (
      <div className="px-5 py-4 border-b border-doom-border bg-doom-surface/30">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-doom-text-faint/30 border-t-doom-red rounded-full animate-spin" />
          <span className="text-xs text-doom-text-muted">
            Producing broadcast overview...
          </span>
        </div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="px-5 py-3 border-b border-doom-border bg-red-950/20">
        <span className="text-xs text-red-400">
          Broadcast failed: {overviewError}
        </span>
      </div>
    );
  }

  if (!finalVideoUrl) return null;

  const syncPlay = () => audioRef.current?.play();
  const syncPause = () => audioRef.current?.pause();
  const syncSeek = () => {
    if (audioRef.current && videoRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };

  return (
    <div className="border-b border-doom-border bg-doom-dark/50">
      <div className="px-5 pt-4 pb-1">
        <div className="text-[10px] uppercase tracking-wider text-doom-red font-bold font-mono mb-2">
          Broadcast Overview
        </div>
        <video
          ref={videoRef}
          src={finalVideoUrl}
          controls
          onPlay={syncPlay}
          onPause={syncPause}
          onSeeked={syncSeek}
          className="w-full rounded-lg"
        />
        {finalAudioUrl && (
          <audio ref={audioRef} src={finalAudioUrl} preload="auto" />
        )}
      </div>
      {simulation.newsScript && (
        <div className="px-5 py-3">
          <p className="text-[11px] text-doom-text-muted leading-relaxed italic font-mono max-h-20 overflow-y-auto">
            {simulation.newsScript}
          </p>
        </div>
      )}
    </div>
  );
}
