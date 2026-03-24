import { create } from 'zustand';
import type { Simulation, TimelineDay } from './types';

interface AppState {
  // Simulation
  simulation: Simulation | null;
  setSimulation: (sim: Simulation | null) => void;
  updateSimulation: (updates: Partial<Simulation>) => void;
  addDay: (day: TimelineDay) => void;

  // UI State
  selectedDay: number | null;
  setSelectedDay: (day: number | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  timelineOpen: boolean;
  setTimelineOpen: (open: boolean) => void;
  generationStatus: string;
  setGenerationStatus: (status: string) => void;
}

export const useStore = create<AppState>((set) => ({
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

  selectedDay: null,
  setSelectedDay: (day) => set({ selectedDay: day }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  timelineOpen: true,
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  generationStatus: '',
  setGenerationStatus: (status) => set({ generationStatus: status }),
}));

// Expose store for E2E testing (dev only)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__store = useStore;
}
