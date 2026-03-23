// Video generation and stitching using fal.ai

const INTRO_VIDEO_URL = 'https://v3b.fal.media/files/b/0a930ec5/kSmZNRTzNJ7DkGgZEdu9-_output.mp4';
const LADY_VIDEO_URL = 'https://v3b.fal.media/files/b/0a930eb3/3xAZn2sT4JrtlwjyzoZ9k_e35315b4c76c478faafef9b57d102398.mp4';

async function falRequest(apiKey: string, model: string, body: Record<string, unknown>) {
  const response = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai error (${model}): ${err}`);
  }
  return await response.json();
}

export async function generateVideo(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const result = await falRequest(apiKey, 'fal-ai/veo3.1/fast', {
    prompt,
    duration: '8s',
    aspect_ratio: '16:9',
  });
  return result.video.url;
}

export async function generateTTS(apiKey: string, text: string): Promise<string> {
  const result = await falRequest(apiKey, 'fal-ai/minimax-tts/text-to-speech/turbo', {
    text,
    voice_speed: 1.2,
  });
  return result.audio.url;
}

async function getMediaMetadata(apiKey: string, mediaUrl: string): Promise<{ duration: number }> {
  const result = await falRequest(apiKey, 'fal-ai/ffmpeg-api/metadata', {
    media_url: mediaUrl,
  });
  return { duration: result.media.duration };
}

export async function stitchVideos(
  apiKey: string,
  videoUrls: string[],
  audioUrl: string,
): Promise<string> {
  const allVideos = [INTRO_VIDEO_URL, LADY_VIDEO_URL, ...videoUrls.filter((u) => u)];

  // Step 1: Merge all video clips
  const mergeResult = await falRequest(apiKey, 'fal-ai/ffmpeg-api/merge-videos', {
    video_urls: allVideos,
  });
  const mergedVideoUrl: string = mergeResult.video.url;

  if (!audioUrl) return mergedVideoUrl;

  // Step 2: Compose merged video with voiceover audio
  const [videoMeta, audioMeta] = await Promise.all([
    getMediaMetadata(apiKey, mergedVideoUrl),
    getMediaMetadata(apiKey, audioUrl),
  ]);

  const result = await falRequest(apiKey, 'fal-ai/ffmpeg-api/compose', {
    tracks: [
      {
        id: 'visuals',
        type: 'video',
        keyframes: [{ url: mergedVideoUrl, timestamp: 0, duration: videoMeta.duration }],
      },
      {
        id: 'original_audio',
        type: 'audio',
        volume: 0.4,
        keyframes: [{ url: mergedVideoUrl, timestamp: 0, duration: videoMeta.duration }],
      },
      {
        id: 'voiceover',
        type: 'audio',
        volume: 1.0,
        keyframes: [{ url: audioUrl, timestamp: 0, duration: audioMeta.duration }],
      },
    ],
  });

  return result.video_url || result.url;
}
