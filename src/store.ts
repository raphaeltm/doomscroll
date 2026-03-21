import { create } from 'zustand';
import type { Simulation, TimelineDay } from './types';

interface AppState {
  // API Keys
  claudeApiKey: string;
  videoApiKey: string;
  setClaudeApiKey: (key: string) => void;
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
}

export const useStore = create<AppState>((set) => ({
  claudeApiKey: '',
  videoApiKey: '',
  setClaudeApiKey: (key) => set({ claudeApiKey: key }),
  setVideoApiKey: (key) => set({ videoApiKey: key }),

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
}));
