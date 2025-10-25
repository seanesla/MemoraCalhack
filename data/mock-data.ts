import { addMinutes, subHours, subMinutes, formatISO } from "date-fns";
import type { CareState } from "@/lib/types";

const now = new Date();

export const mockCareState: CareState = {
  patient: {
    id: "patient-001",
    name: "John Smith",
    age: 72,
    preferredName: "John",
    locationLabel: "Berkeley, CA",
    caregiverName: "Ava Smith",
    diagnosisStage: "Early-stage Alzheimer's",
    lastCheckIn: formatISO(subMinutes(now, 42)),
    currentRoutineFocus: "Evening wind-down & medication prep"
  },
  sensors: [
    {
      id: "accelerometer",
      label: "Accelerometer",
      status: "online",
      lastPing: formatISO(subMinutes(now, 3)),
      notes: "Sampling cadence auto-adjusted for bedtime routine."
    },
    {
      id: "geolocation",
      label: "Geolocation",
      status: "online",
      lastPing: formatISO(subMinutes(now, 5))
    },
    {
      id: "microphone",
      label: "Microphone",
      status: "degraded",
      lastPing: formatISO(subMinutes(now, 18)),
      notes: "Background TV noise detected. Sensitivity auto-tuned."
    },
    {
      id: "app_usage",
      label: "App Activity",
      status: "online",
      lastPing: formatISO(subMinutes(now, 11))
    }
  ],
  activity: [
    {
      id: "evt-001",
      timestamp: formatISO(subMinutes(now, 6)),
      type: "conversation",
      severity: "info",
      summary: "Evening medication reminder acknowledged",
      details: {
        conversationSummary: "Patient confirmed taking Leqembi at 8:15 PM."
      }
    },
    {
      id: "evt-002",
      timestamp: formatISO(subMinutes(now, 28)),
      type: "sensor_alert",
      severity: "warning",
      summary: "Possible wandering pattern outside quiet hours",
      details: {
        sensorData: {
          distance: "142 m from safe radius",
          direction: "Northwest",
          confidence: "0.73"
        },
        location: { lat: 37.877, lon: -122.268, label: "Side yard walkway" },
        followUpAction: "Caregiver text check-in triggered"
      }
    },
    {
      id: "evt-003",
      timestamp: formatISO(subMinutes(now, 54)),
      type: "pattern_change",
      severity: "info",
      summary: "Routine variance: skipped evening journaling",
      details: {
        followUpAction: "Agent suggested reminiscing prompt instead"
      }
    },
    {
      id: "evt-005",
      timestamp: formatISO(subHours(now, 3)),
      type: "memory_update",
      severity: "info",
      summary: "Core memory updated: granddaughter recital details",
      details: {
        conversationSummary: "New memory cue about upcoming recital added"
      }
    }
  ],
  insights: {
    mood: "positive",
    streakDays: 4,
    averageLatencySeconds: 1.8,
    frequentQuestions: [
      { question: "What time is Ava visiting tomorrow?", count: 5 },
      { question: "Where did I put my reading glasses?", count: 3 },
      { question: "What day is it today?", count: 2 }
    ],
    concerns: [
      "Mild confusion about weekend schedule",
      "Occasional frustration around misplaced items"
    ],
    positiveMoments: [
      "Remembered granddaughter Lily's piano recital without prompt",
      "Shared detailed story about honeymoon in Big Sur"
    ],
    memoryTopicsToReinforce: [
      "Tomorrow's brunch with Mark",
      "Medication cadence post-dinner",
      "Where emergency contact card is stored"
    ],
    lastUpdated: formatISO(subMinutes(now, 9))
  },
  coreMemory: [
    {
      key: "persona",
      label: "Agent Persona",
      value:
        "Speak with warmth, steady pacing, and gentle affirmations. Offer grounding sensory cues when anxiety rises.",
      editable: true,
      reasoning: "Defines conversation style and tone. Stored in Core Memory because it's checked on every response to maintain consistent, appropriate communication. Manually editable by caregiver to adjust as John's needs change."
    },
    {
      key: "human",
      label: "Patient Profile",
      value:
        "John Smith, 72. Retired middle-school literature teacher. Married to Ava. Loves jazz piano, gardening, and storytelling about road trips. Finds comfort in soft instrumental music and mint tea. Grandchildren: Lily (9), Mateo (6).",
      editable: true,
      reasoning: "Personal details referenced in 85% of conversations for personalization. Kept in Core Memory for <200ms retrieval time. Essential for maintaining continuity and preventing repetitive questions."
    },
    {
      key: "context",
      label: "Current Context",
      value:
        "It is Thursday evening. Earlier today John walked in Live Oak Park. Ava is preparing for tomorrow's brunch with neighbors. Weather is cool and foggy.",
      autoUpdate: true,
      reasoning: "Auto-updated every 6 hours based on: time of day, recent conversations, caregiver calendar, local weather API. Provides situational awareness for contextually relevant responses without asking John to repeat information."
    }
  ],
  archivalMemory: [
    {
      id: "arch-001",
      createdAt: formatISO(subHours(now, 4)),
      title: "Lily's recital excitement",
      summary:
        "Discussed Lily's piano recital program and scheduled gentle reminders for morning practice cues.",
      tags: ["family", "upcoming", "music"],
      tone: "celebratory",
      reasoning: "Stored because: John mentioned Lily 3 times in this conversation (emotional significance detected). Tagged 'family' for semantic search. Will auto-archive after recital date passes unless John references it again."
    },
    {
      id: "arch-002",
      createdAt: formatISO(subHours(now, 8)),
      title: "Garden routine anchoring",
      summary:
        "Captured John's joy describing tomato vines; built sensory prompt for weekend watering routine.",
      tags: ["routine", "nature", "memory-cue"],
      tone: "reflective",
      reasoning: "Stored because: Positive affect detected (tone analysis: 8.2/10). Routine patterns help with orientation and autonomy. Tagged 'memory-cue' to trigger weekend watering reminders without seeming robotic."
    },
  ],
  alerts: {
    wanderingDetection: {
      enabled: true,
      safeRadiusMeters: 110,
      quietHours: { start: "21:00", end: "06:00" },
      channels: ["sms", "email"],
      reasoning: "110m threshold based on John's walking pattern analysis (last 30 days): 95% of walks stay within this radius. Quiet hours prevent false alerts during sleep. Can be disabled by John at any time via privacy controls."
    },
    activityPatterns: {
      enabled: true,
      inactivityThresholdHours: 3,
      channels: ["push"],
      reasoning: "3-hour threshold calibrated from John's typical activity rhythm. Baseline: usually active for 10-15 minutes every 2 hours during daytime. Alert triggers if no movement detected for 3+ consecutive hours (9:00-21:00 only)."
    }
  },
  voiceSession: {
    live: false,
    activeParticipants: 1,
    lastSession: {
      startedAt: formatISO(subMinutes(now, 90)),
      durationMinutes: 24,
      transcriptSummary:
        "Focused on evening anchors, gratitude exercise, and prepping questions for tomorrow's visit."
    },
    upcomingPrompt:
      "Suggest reminiscing about John's first classroom and favorite student stories after dinner."
  }
};

export const mockAlertChannels = [
  {
    id: "sms",
    label: "Text Message",
    description: "Fastest delivery, requires caregiver backup number."
  },
  {
    id: "email",
    label: "Email",
    description: "Send detailed context with follow-up checklist."
  },
  {
    id: "push",
    label: "Push Notification",
    description: "Send to Memora caregiver mobile app in real time."
  }
] as const;
