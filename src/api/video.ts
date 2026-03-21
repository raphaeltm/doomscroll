import { GoogleGenAI } from '@google/genai';

const POLL_INTERVAL_MS = 10_000;

/**
 * Generate a video using Gemini's Veo model directly from the browser.
 * Returns a blob URL that can be used as a <video> src.
 */
export async function generateVideo(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  // Start video generation
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      durationSeconds: 6,
      aspectRatio: '16:9',
    },
  });

  // Poll until done
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  // Get the video file reference
  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video?.uri) {
    throw new Error('No video was generated');
  }

  // The URI may already have query params (e.g. ?alt=media), so use & if needed
  const separator = video.uri.includes('?') ? '&' : '?';
  const downloadUrl = `${video.uri}${separator}key=${apiKey}`;
  const resp = await fetch(downloadUrl);
  if (!resp.ok) {
    throw new Error(`Failed to download video: ${resp.status}`);
  }
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}
