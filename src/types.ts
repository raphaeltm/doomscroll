export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface Actor {
  name: string;
  type: 'state' | 'organization' | 'individual' | 'military' | 'media';
  description: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  location: GeoLocation;
  actors: Actor[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TimelineDay {
  day: number;
  date: string;
  summary: string;
  events: TimelineEvent[];
  videoUrl?: string;
  videoPrompt?: string;
  videoGenerating?: boolean;
}

export interface Simulation {
  id: string;
  prompt: string;
  title: string;
  days: TimelineDay[];
  status: 'idle' | 'generating' | 'complete' | 'error';
  error?: string;
}
