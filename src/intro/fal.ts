import { fal } from '@fal-ai/client';

const TEMPLATE_VIDEO_PATH = '/intro-template.mp4';

// In-memory cache
const cache = new Map<string, string>();
let templateVideoUrl: string | null = null;

export function configureFal(apiKey: string) {
  fal.config({ credentials: apiKey });
}

/** Upload a local File to fal storage, returns a URL */
export async function uploadToFal(file: File): Promise<string> {
  const url = await fal.storage.upload(file);
  return url;
}

/** Fetch the template video from public/ and upload to fal (once) */
async function getTemplateVideoUrl(): Promise<string> {
  if (templateVideoUrl) return templateVideoUrl;

  const resp = await fetch(TEMPLATE_VIDEO_PATH);
  const blob = await resp.blob();
  const file = new File([blob], 'intro-template.mp4', { type: 'video/mp4' });
  templateVideoUrl = await fal.storage.upload(file);
  return templateVideoUrl;
}

/**
 * Swap a face into the template video using PixVerse via fal.ai.
 * Cached so the same image won't regenerate.
 */
export async function generateIntroVideo(
  imageUrl: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  const cached = cache.get(imageUrl);
  if (cached) return cached;

  onProgress?.('Uploading template video...');
  const videoUrl = await getTemplateVideoUrl();

  onProgress?.('Starting face swap...');
  const result = await fal.subscribe('fal-ai/pixverse/swap', {
    input: {
      video_url: videoUrl,
      image_url: imageUrl,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS' && onProgress) {
        update.logs.map((log) => log.message).forEach(onProgress);
      }
    },
  });

  const resultUrl = (result.data as { video?: { url?: string } })?.video?.url;
  if (!resultUrl) {
    throw new Error('No video URL in fal response');
  }

  cache.set(imageUrl, resultUrl);
  return resultUrl;
}
