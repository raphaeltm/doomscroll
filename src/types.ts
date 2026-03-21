export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface Actor {
  name: string;
  type: 'state' | 'organization' | 'individual' | 'military' | 'media';
  description: string;
  sources?: Source[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  location: GeoLocation;
  actors: Actor[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  sources: Source[];
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
  weekSummary?: string;
  finalVideoUrl?: string;
  newsScript?: string;
  status: 'idle' | 'generating' | 'complete' | 'error';
  error?: string;
}

// --- Real-world context types ---

export interface GDELTEvent {
  title: string;
  url: string;
  domain: string;
  lat: number;
  lng: number;
  locationName: string;
  tone: number;
}

export interface WikidataActor {
  name: string;
  position: string;
  country: string;
}

export interface RealWorldContext {
  gdeltEvents: GDELTEvent[];
  actors: WikidataActor[];
}
