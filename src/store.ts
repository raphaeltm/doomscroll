import { create } from 'zustand';
import type { Simulation, TimelineDay } from './types';

interface AppState {
  // API Keys
  googleApiKey: string;
  videoApiKey: string;
  setGoogleApiKey: (key: string) => void;
  setVideoApiKey: (key: string) => void;

  // Simulation
  simulation: Simulation | null;
  setSimulation: (sim: Simulation | null) => void;
  updateSimulation: (updates: Partial<Simulation>) => void;
  addDay: (day: TimelineDay) => void;
  updateDay: (dayNumber: number, updates: Partial<TimelineDay>) => void;

  // UI State
  selectedDay: number | null;
  setSelectedDay: (day: number | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  timelineOpen: boolean;
  setTimelineOpen: (open: boolean) => void;
  generationStatus: string;
  setGenerationStatus: (status: string) => void;
  useCachedMode: boolean;
  setUseCachedMode: (enabled: boolean) => void;
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  googleApiKey: localStorage.getItem('googleApiKey') ?? '',
  videoApiKey: localStorage.getItem('videoApiKey') ?? '',
  setGoogleApiKey: (key) => {
    localStorage.setItem('googleApiKey', key);
    set({ googleApiKey: key });
  },
  setVideoApiKey: (key) => {
    localStorage.setItem('videoApiKey', key);
    set({ videoApiKey: key });
  },

  simulation: null,
  setSimulation: (sim) => set({ simulation: sim }),
  updateSimulation: (updates) =>
    set((state) => ({
      simulation: state.simulation
        ? { ...state.simulation, ...updates }
        : null,
    })),
  addDay: (day) =>
    set((state) => ({
      simulation: state.simulation
        ? { ...state.simulation, days: [...state.simulation.days, day] }
        : null,
    })),
  updateDay: (dayNumber, updates) =>
    set((state) => ({
      simulation: state.simulation
        ? {
            ...state.simulation,
            days: state.simulation.days.map((d) =>
              d.day === dayNumber ? { ...d, ...updates } : d
            ),
          }
        : null,
    })),

  selectedDay: null,
  setSelectedDay: (day) => set({ selectedDay: day }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  timelineOpen: true,
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  generationStatus: '',
  setGenerationStatus: (status) => set({ generationStatus: status }),
  useCachedMode: true,
  setUseCachedMode: (enabled) => set({ useCachedMode: enabled }),
  uploadedImage: null,
  setUploadedImage: (image) => set({ uploadedImage: image }),
}));

// Expose store for E2E testing (dev only)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__store = useStore;
}
