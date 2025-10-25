/**
 * Shared State Management for Memora
 *
 * This module provides localStorage-based state synchronization between:
 * - Patient Interface (/patient)
 * - Caregiver Dashboard (/dashboard.html)
 *
 * Architecture:
 * - Patient reads Core Memory to customize AI responses
 * - Patient writes conversations and timeline events
 * - Dashboard reads conversations for Voice Chat display
 * - Dashboard writes Core Memory edits
 * - Dashboard reads timeline for activity history
 */

export interface MemoraConversation {
  id: string;
  timestamp: string;
  userMessage: string;
  assistantMessage: string;
  context?: string;
}

export interface MemoraCoreMemory {
  persona: string;
  patient: string;
  context: string;
}

export interface MemoraTimelineEvent {
  id: string;
  timestamp: string;
  type: 'conversation' | 'sensor_alert' | 'memory_update' | 'pattern_change';
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details?: Record<string, any>;
}

export interface MemoraInsights {
  frequentQuestions: Array<{ question: string; count: number }>;
  mood: 'positive' | 'neutral' | 'concerned';
  lastUpdated: string;
}

export interface MemoraSharedState {
  conversations: MemoraConversation[];
  coreMemory: MemoraCoreMemory;
  timeline: MemoraTimelineEvent[];
  insights: MemoraInsights;
}

// Storage keys
const STORAGE_KEY = 'memora_shared_state';
const CHANNEL_NAME = 'memora_sync';

// Initialize default state
const DEFAULT_STATE: MemoraSharedState = {
  conversations: [],
  coreMemory: {
    persona: "Speak with warmth, steady pacing, and gentle affirmations. Offer grounding sensory cues when anxiety rises.",
    patient: "John Smith, 72. Retired middle-school literature teacher. Married to Ava. Loves jazz piano, gardening, and storytelling about road trips. Finds comfort in soft instrumental music and mint tea. Grandchildren: Lily (9), Mateo (6).",
    context: "It is Thursday evening. Earlier today John walked in Live Oak Park. Ava is preparing for tomorrow's brunch with neighbors. Weather is cool and foggy."
  },
  timeline: [],
  insights: {
    frequentQuestions: [],
    mood: 'positive',
    lastUpdated: new Date().toISOString()
  }
};

/**
 * Get the current shared state from localStorage
 */
export function getSharedState(): MemoraSharedState {
  if (typeof window === 'undefined') return DEFAULT_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Initialize with default state
      setSharedState(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading shared state:', error);
    return DEFAULT_STATE;
  }
}

/**
 * Set the entire shared state
 */
export function setSharedState(state: MemoraSharedState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    broadcastStateChange('full_state_update', state);
  } catch (error) {
    console.error('Error writing shared state:', error);
  }
}

/**
 * Add a conversation to the shared state
 */
export function addConversation(conversation: Omit<MemoraConversation, 'id'>): string {
  const state = getSharedState();
  const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newConversation: MemoraConversation = { id, ...conversation };

  state.conversations.push(newConversation);
  setSharedState(state);
  broadcastStateChange('conversation_added', newConversation);

  // Also add to timeline
  addTimelineEvent({
    timestamp: conversation.timestamp,
    type: 'conversation',
    severity: 'info',
    summary: `Conversation: "${conversation.userMessage.substring(0, 50)}${conversation.userMessage.length > 50 ? '...' : ''}"`,
    details: {
      conversationId: id,
      userMessage: conversation.userMessage,
      assistantMessage: conversation.assistantMessage
    }
  });

  // Update insights with frequent questions
  updateFrequentQuestion(conversation.userMessage);

  return id;
}

/**
 * Get all conversations
 */
export function getConversations(): MemoraConversation[] {
  return getSharedState().conversations;
}

/**
 * Update Core Memory
 */
export function updateCoreMemory(updates: Partial<MemoraCoreMemory>): void {
  const state = getSharedState();
  state.coreMemory = { ...state.coreMemory, ...updates };
  setSharedState(state);
  broadcastStateChange('core_memory_updated', state.coreMemory);

  // Add to timeline
  addTimelineEvent({
    timestamp: new Date().toISOString(),
    type: 'memory_update',
    severity: 'info',
    summary: `Core Memory updated: ${Object.keys(updates).join(', ')}`,
    details: { updates }
  });
}

/**
 * Get Core Memory
 */
export function getCoreMemory(): MemoraCoreMemory {
  return getSharedState().coreMemory;
}

/**
 * Add a timeline event
 */
export function addTimelineEvent(event: Omit<MemoraTimelineEvent, 'id'>): string {
  const state = getSharedState();
  const id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newEvent: MemoraTimelineEvent = { id, ...event };

  state.timeline.unshift(newEvent); // Add to beginning (newest first)

  // Keep only last 50 events to avoid bloat
  if (state.timeline.length > 50) {
    state.timeline = state.timeline.slice(0, 50);
  }

  setSharedState(state);
  broadcastStateChange('timeline_event_added', newEvent);

  return id;
}

/**
 * Get timeline events
 */
export function getTimelineEvents(): MemoraTimelineEvent[] {
  return getSharedState().timeline;
}

/**
 * Update frequent questions in insights
 */
function updateFrequentQuestion(question: string): void {
  const state = getSharedState();
  const existing = state.insights.frequentQuestions.find(fq => fq.question === question);

  if (existing) {
    existing.count++;
  } else {
    state.insights.frequentQuestions.push({ question, count: 1 });
  }

  // Sort by count descending and keep top 5
  state.insights.frequentQuestions.sort((a, b) => b.count - a.count);
  state.insights.frequentQuestions = state.insights.frequentQuestions.slice(0, 5);

  state.insights.lastUpdated = new Date().toISOString();
  setSharedState(state);
}

/**
 * Get insights
 */
export function getInsights(): MemoraInsights {
  return getSharedState().insights;
}

/**
 * Update insights
 */
export function updateInsights(updates: Partial<MemoraInsights>): void {
  const state = getSharedState();
  state.insights = { ...state.insights, ...updates, lastUpdated: new Date().toISOString() };
  setSharedState(state);
  broadcastStateChange('insights_updated', state.insights);
}

/**
 * Clear all shared state (for demo reset)
 */
export function clearSharedState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  broadcastStateChange('state_cleared', null);
}

/**
 * BroadcastChannel for real-time cross-tab sync
 */
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !window.BroadcastChannel) {
    return null;
  }

  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  return broadcastChannel;
}

/**
 * Broadcast a state change to other tabs
 */
function broadcastStateChange(type: string, data: any): void {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({ type, data, timestamp: new Date().toISOString() });
  }
}

/**
 * Listen for state changes from other tabs
 */
export function onStateChange(callback: (type: string, data: any) => void): () => void {
  const channel = getBroadcastChannel();
  if (!channel) {
    return () => {}; // No-op cleanup
  }

  const handler = (event: MessageEvent) => {
    callback(event.data.type, event.data.data);
  };

  channel.addEventListener('message', handler);

  // Return cleanup function
  return () => {
    channel.removeEventListener('message', handler);
  };
}

/**
 * Initialize shared state (call this on app load)
 */
export function initSharedState(): void {
  // Ensure default state exists
  getSharedState();
}
