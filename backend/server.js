import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(__dirname, "videos");
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is required. Set it in backend/.env or as an environment variable.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const app = express();

app.use(cors());
app.use(express.json());
app.use("/videos", express.static(VIDEOS_DIR));

// Build a cinematic prompt from the event JSON
function buildPrompt(event) {
  const parts = [];

  parts.push(`Breaking news scene: ${event.title || "A major geopolitical event unfolds"}.`);

  if (event.description) {
    parts.push(event.description);
  }

  if (event.location?.name) {
    parts.push(`Set in ${event.location.name}.`);
  }

  if (event.actors?.length) {
    const actorNames = event.actors.map((a) => a.name || a).join(", ");
    parts.push(`Key figures involved: ${actorNames}.`);
  }

  if (event.scene) {
    parts.push(event.scene);
  }

  // Force no dialogue/voice, just ambient audio
  parts.push(
    "Cinematic news footage style. No spoken dialogue or voiceover. Only ambient background sounds and dramatic music."
  );

  return parts.join(" ");
}

// POST /api/generate-video
// Body: event JSON (title, description, location, actors, scene, severity, etc.)
// Returns: { videoUrl: string }
app.post("/api/generate-video", async (req, res) => {
  const event = req.body;

  if (!event || Object.keys(event).length === 0) {
    return res.status(400).json({ error: "Request body must be a non-empty event JSON" });
  }

  const prompt = buildPrompt(event);
  const videoId = uuidv4();
  const filename = `${videoId}.mp4`;
  const filepath = path.join(VIDEOS_DIR, filename);

  console.log(`[generate-video] Starting generation for: "${event.title || "untitled"}"`);
  console.log(`[generate-video] Prompt: ${prompt}`);

  try {
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: 6,
        aspectRatio: "16:9",
      },
    });

    // Poll until done
    while (!operation.done) {
      console.log(`[generate-video] Waiting for video ${videoId}...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    // Download the video
    await ai.files.download({
      file: operation.response.generatedVideos[0].video,
      downloadPath: filepath,
    });

    const videoUrl = `http://localhost:${PORT}/videos/${filename}`;
    console.log(`[generate-video] Done: ${videoUrl}`);

    res.json({ videoUrl });
  } catch (err) {
    console.error("[generate-video] Error:", err);
    res.status(500).json({ error: err.message || "Video generation failed" });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
