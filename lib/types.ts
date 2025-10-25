// Type definitions for Memora care data structures

export interface Patient {
  id: string;
  name: string;
  age: number;
  preferredName: string;
  locationLabel: string;
  caregiverName: string;
  diagnosisStage: string;
  lastCheckIn: string;
  currentRoutineFocus: string;
}

export interface Sensor {
  id: string;
  label: string;
  status: "online" | "offline" | "degraded";
  lastPing: string;
  notes?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "conversation" | "sensor_alert" | "pattern_change" | "memory_update";
  severity: "info" | "warning" | "critical";
  summary: string;
  details: {
    conversationSummary?: string;
    sensorData?: {
      distance?: string;
      direction?: string;
      confidence?: string;
      accelerationPeak?: string;
      stillnessDurationSeconds?: number;
    };
    location?: {
      lat: number;
      lon: number;
      label: string;
    };
    followUpAction?: string;
  };
}

export interface FrequentQuestion {
  question: string;
  count: number;
}

export interface Insights {
  mood: string;
  streakDays: number;
  averageLatencySeconds: number;
  frequentQuestions: FrequentQuestion[];
  concerns: string[];
  positiveMoments: string[];
  memoryTopicsToReinforce: string[];
  lastUpdated: string;
}

export interface CoreMemoryBlock {
  key: string;
  label: string;
  value: string;
  editable?: boolean;
  autoUpdate?: boolean;
  reasoning?: string;
}

export interface ArchivalMemoryEntry {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  tags: string[];
  tone: "celebratory" | "reflective" | "alert";
  reasoning?: string;
}

export interface AlertConfig {
  enabled: boolean;
  sensitivity?: "low" | "medium" | "high";
  escalationDelaySeconds?: number;
  channels: string[];
  safeRadiusMeters?: number;
  quietHours?: {
    start: string;
    end: string;
  };
  inactivityThresholdHours?: number;
  reasoning?: string;
}

export interface Alerts {
  wanderingDetection: AlertConfig;
  activityPatterns: AlertConfig;
}

export interface VoiceSession {
  live: boolean;
  activeParticipants: number;
  lastSession: {
    startedAt: string;
    durationMinutes: number;
    transcriptSummary: string;
  };
  upcomingPrompt: string;
}

export interface CareState {
  patient: Patient;
  sensors: Sensor[];
  activity: ActivityEvent[];
  insights: Insights;
  coreMemory: CoreMemoryBlock[];
  archivalMemory: ArchivalMemoryEntry[];
  alerts: Alerts;
  voiceSession: VoiceSession;
}

export interface AlertChannel {
  id: string;
  label: string;
  description: string;
}
