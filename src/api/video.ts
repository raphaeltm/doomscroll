// Video generation and stitching using fal.ai

const INTRO_VIDEO_URL = 'https://v3b.fal.media/files/b/0a930ec5/kSmZNRTzNJ7DkGgZEdu9-_output.mp4';
const LADY_VIDEO_URL = 'https://v3b.fal.media/files/b/0a930eb3/3xAZn2sT4JrtlwjyzoZ9k_e35315b4c76c478faafef9b57d102398.mp4';

async function falRequest(apiKey: string, model: string, body: Record<string, unknown>) {
  const response = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
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
  if (!apiKey) {
    console.warn('No fal.ai API key provided, skipping video generation');
    return '';
  }

  try {
    const result = await falRequest(apiKey, "fal-ai/veo3.1/fast", {
      prompt,
      duration: "8s",
      aspect_ratio: "16:9",
    });
    return result.video.url;
  } catch (error) {
    console.error('Video generation failed:', error);
    return '';
  }
}

export async function generateTTS(apiKey: string, text: string): Promise<string> {
  const result = await falRequest(apiKey, "fal-ai/minimax-tts/text-to-speech/turbo", {
    text,
    voice_speed: 1.2,
  });
  return result.audio.url;
}

export async function describeVideo(apiKey: string, videoUrl: string): Promise<string> {
  const result = await falRequest(apiKey, "fal-ai/video-understanding", {
    video_url: videoUrl,
    prompt: "Provide a detailed, scene-by-scene description of this news broadcast. Mention what happens in the intro, what the news anchor is doing, and then describe the subsequent 7 scenes in detail. Note the visual transitions.",
  });
  return result.output;
}

export async function getMediaMetadata(apiKey: string, mediaUrl: string): Promise<{ duration: number }> {
  try {
    const result = await falRequest(apiKey, "fal-ai/ffmpeg-api/metadata", {
      media_url: mediaUrl,
    });
    return { duration: result.media.duration };
  } catch (e) {
    console.error(`Metadata fetch failed for ${mediaUrl}:`, e);
    throw new Error(`Failed to analyze media file at ${mediaUrl}. It may have expired.`);
  }
}

export async function stitchVideos(
  apiKey: string,
  videoUrls: string[],
  audioUrl: string,
  baseVideoUrl?: string,
): Promise<string> {
  if (!apiKey) return '';

  const allVideos = [INTRO_VIDEO_URL, LADY_VIDEO_URL, ...videoUrls.filter(u => u)];
  
  try {
    let mergedVideoUrl = baseVideoUrl;

    if (!mergedVideoUrl) {
      // 1. Merge all videos into one first to have a base
      console.log('Step 1: Merging video clips...');
      const mergeResult = await falRequest(apiKey, "fal-ai/ffmpeg-api/merge-videos", {
        video_urls: allVideos,
      });
      mergedVideoUrl = mergeResult.video.url;
    }

    if (!audioUrl) return mergedVideoUrl;

    // Fetch durations for compose (it requires them)
    console.log('Fetching metadata for composition...');
    const [videoMeta, audioMeta] = await Promise.all([
      getMediaMetadata(apiKey, mergedVideoUrl),
      getMediaMetadata(apiKey, audioUrl)
    ]);

    // 2. Use compose to mix the merged video's audio with the new voiceover
    // We want the original video track (visuals), 
    // PLUS the original audio track (low volume),
    // PLUS the new voiceover (full volume).
    console.log('Step 2: Mixing audio with compose...', { videoDuration: videoMeta.duration, audioDuration: audioMeta.duration });
    const result = await falRequest(apiKey, "fal-ai/ffmpeg-api/compose", {
      tracks: [
        {
          id: "visuals",
          type: "video",
          keyframes: [{ 
            url: mergedVideoUrl, 
            timestamp: 0,
            duration: videoMeta.duration
          }]
        },
        {
          id: "original_audio",
          type: "audio", // Extracted from the video
          volume: 0.4,
          keyframes: [{ 
            url: mergedVideoUrl, 
            timestamp: 0,
            duration: videoMeta.duration
          }]
        },
        {
          id: "voiceover",
          type: "audio",
          volume: 1.0,
          keyframes: [{ 
            url: audioUrl, 
            timestamp: 0,
            duration: audioMeta.duration
          }]
        }
      ]
    });

    return result.video_url || result.url;
  } catch (error) {
    console.error('Stitching failed:', error);
    // Fallback to simple merge if compose fails
    try {
      const mergeResult = await falRequest(apiKey, "fal-ai/ffmpeg-api/merge-videos", {
        video_urls: allVideos,
      });
      return mergeResult.video.url;
    } catch (e) {
      return '';
    }
  }
}
