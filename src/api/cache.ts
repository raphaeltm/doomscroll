import type { TimelineDay } from '../types';

// --- Simple hash for cache keys ---

function hashPrompt(prompt: string): string {
  const normalized = prompt.trim().toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

// --- Simulation cache (localStorage) ---

interface CachedSimulation {
  title: string;
  days: TimelineDay[];
  weekSummary: string;
  cachedAt: number;
}

const SIM_PREFIX = 'doomscroll:sim:';

export function getCachedSimulation(
  prompt: string,
): CachedSimulation | null {
  try {
    const key = SIM_PREFIX + hashPrompt(prompt);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSimulation;
  } catch {
    return null;
  }
}

export function cacheSimulation(
  prompt: string,
  result: { title: string; days: TimelineDay[]; weekSummary: string },
): void {
  try {
    const key = SIM_PREFIX + hashPrompt(prompt);
    const entry: CachedSimulation = { ...result, cachedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently skip
  }
}

// --- Video cache (IndexedDB) ---

const DB_NAME = 'doomscroll-video-cache';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function videoKey(prompt: string, dayNumber: number): string {
  return `${hashPrompt(prompt)}:day${dayNumber}`;
}

export async function cacheVideo(
  prompt: string,
  dayNumber: number,
  blobUrl: string,
): Promise<void> {
  try {
    const resp = await fetch(blobUrl);
    const blob = await resp.blob();
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, videoKey(prompt, dayNumber));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // silently skip
  }
}

export async function getCachedVideo(
  prompt: string,
  dayNumber: number,
): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(videoKey(prompt, dayNumber));
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function restoreVideosForSimulation(
  prompt: string,
  days: TimelineDay[],
): Promise<TimelineDay[]> {
  const results = await Promise.all(
    days.map((day) => getCachedVideo(prompt, day.day)),
  );
  return days.map((day, i) =>
    results[i] ? { ...day, videoUrl: results[i]! } : day,
  );
}
