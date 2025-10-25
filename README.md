# Memora

A voice-first AI companion application for dementia care, preserving dignity and connection for those navigating cognitive challenges.

**Built for Cal Hacks 12.0 • October 2025**

---

## Overview

Memora is a **frontend-only PWA prototype** demonstrating a comprehensive dementia care companion system. The interface showcases:
- Cinematic voice interaction with animated waveforms
- Three-tier persistent memory architecture
- Family-focused caregiver dashboard
- Real-time activity monitoring (simulated)

**Current Status**: UI prototype with mock data. All voice interactions, AI features, and backend functionality are simulated.

### Ethical Design: Patient vs Caregiver Separation

Memora implements two distinct interfaces designed for different users:

**Patient Interface** (`/patient`) - For John (person with dementia):
- Voice-first companion with simple, supportive UI
- Orientation cues: date, time, weather
- "I'm here with you" reassuring language
- **NO surveillance data** - preserves dignity
- **NO cognitive metrics** - no shame or anxiety

**Caregiver Dashboard** (`/dashboard.html`) - For Ava (family caregiver):
- Analytics and monitoring tools
- Timeline of events, alerts, activities
- 3-tier memory system management
- Voice Chat with edit functionality
- AI-generated insights

**Why this matters**: Showing a dementia patient their own "engagement scores" or "wandering alerts" is harmful and undignified. Our separation ensures the patient experiences supportive companionship while caregivers get the tools they need.

---

## Features

### 🎙️ Patient Experience
- **Voice-First Interface** - Cinematic UI with painterly waveform animations and typewriter transcript
- **Three-Tier Memory System** - Visual representation of Core, Archival, and Alert memory layers
- **PWA Support** - Install as native app on any device (iOS, Android, Desktop)
- **Accessibility** - High contrast, large touch targets, voice-first interaction model

### 📊 Caregiver Dashboard
- **Overview** - Engagement scores, activities, medications, sleep quality, mood tracking, AI insights, memory moments
- **Voice Chat** - Purple-themed chat interface with persistent bottom bar, message timestamps, edit/checkpoint functionality
- **Timeline** - Complete activity history (placeholder)
- **Insights** - Conversation patterns and behavioral analysis (placeholder)
- **Memory System** - Three-tier memory visualization with Core Memory, Archival Memory, and Alert Configuration
- **Settings** - Alert and notification management (placeholder)
- **Accessibility** - Jargon simplification toggle, Read Aloud feature for elderly caregivers

---

## Tech Stack

### Frontend
- **Next.js 16.0.0** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5.6.2** - Type safety
- **Tailwind CSS 3.4.10** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **date-fns 3.6.0** - Date formatting

### AI & Backend (Planned)
- **Groq (Kimi K2)** - 280k context window for deep memory analysis and pattern detection
- **Claude (Haiku 4.5)** - Ultra-fast inference for real-time patient conversations
- **Context7** - Up-to-date documentation retrieval for AI integrations
- **LiveKit** - Real-time voice communication
- **Deepgram** - Speech-to-text processing
- **Letta** - Persistent 3-tier memory management (Core, Archival, Alert)
- **ChromaDB** - Vector database for Letta's archival memory storage
- **Clerk** - User authentication

**Multi-Model Strategy**: Kimi K2 handles complex analysis with massive context (memory updates, pattern detection), while Claude Haiku provides instant conversational responses. Letta manages the 3-tier memory architecture with ChromaDB providing persistent vector storage for semantic search over long-term memories. This hybrid approach optimizes for both quality and speed.

**Note**: Backend is not implemented. All features are simulated with mock data.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/memora.git
cd memora
```

2. Install dependencies
```bash
npm install
```

3. Run development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
/
├── app/                       # Next.js App Router
│   ├── layout.tsx            # Root layout with PWA metadata
│   ├── page.tsx              # Redirects to landing page
│   ├── patient/              # Voice interface (React)
│   ├── sign-in/              # Auth page → redirects to dashboard
│   ├── sign-up/              # Registration → redirects to dashboard
│   └── dashboard/            # Old Next.js dashboard (deprecated)
│
├── components/               # React components
│   ├── VoiceInterface.tsx    # State machine, waveform, transcript
│   ├── PainterlyWaveform.tsx # Canvas particle animation
│   └── ConversationTranscript.tsx # Typewriter effect
│
├── data/
│   └── mock-data.ts          # All demo data (patient, timeline, insights, memory)
│
├── hooks/
│   └── useMockVoiceConnection.ts # Simulated audio levels
│
├── lib/
│   └── types.ts              # TypeScript definitions
│
├── public/                   # Static files (main application)
│   ├── dashboard.html        # ⭐ Main dashboard (static HTML, client-side routing)
│   ├── memora-cinematic.html # ⭐ Landing page (static HTML)
│   ├── manifest.json         # PWA configuration
│   ├── service-worker.js     # PWA offline support
│   └── *.png, *.svg          # Images and assets
│
└── tailwind.config.ts        # Custom color palette (lavender/sage)
```

---

## Routes

### Main Application
- **`/`** - Landing page (static HTML with cinematic design)
- **`/dashboard.html`** - Caregiver dashboard (single-page app with JS navigation)
- **`/patient`** - Voice interface demo (React component)
- **`/sign-in`** - Sign in page (redirects to dashboard)
- **`/sign-up`** - Registration page (redirects to dashboard)

### Dashboard Pages (Internal Navigation)
Access via sidebar in `/dashboard.html`:
- **Overview** - Today's engagement, activities, medications, sleep, mood, insights, memory moments
- **Timeline** - Activity history (placeholder)
- **Insights** - Conversation patterns (placeholder)
- **Memories** - Three-tier memory system visualization
- **Settings** - Alert configuration (placeholder)

**Note**: Dashboard uses client-side JavaScript navigation. All pages are in a single HTML file.

---

## Development

### Commands
```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm run prepare  # Generate Tailwind CSS
```

### Mock Data
All demo data is in `data/mock-data.ts`. Contains:
- Patient profile (John Smith, 72, early-stage Alzheimer's)
- 4 sensors with status (accelerometer, geolocation, microphone, app activity)
- 5 timeline events (medication reminder, wandering alert, fall detection, etc.)
- Conversation insights (frequent questions, mood, concerns)
- 3-tier memory blocks (core, archival, alerts)

### Voice Interface
Located at `/patient`. Uses state machine:
```
idle → listening (1.5s) → thinking (1.5s) → speaking (3.5s) → idle
```
Hardcoded transcript: "What day is it today?"
Hardcoded response: "Today is Wednesday, October 23rd..."

Modify timings and text in `components/VoiceInterface.tsx`.

### Three-Tier Memory System
Visualized on **Memories** page in dashboard:

**Tier 1 - Core Memory** (Gold borders):
- Agent Persona (how AI should speak)
- Patient Profile (personal information)
- Current Context (auto-updated situational awareness)

**Tier 2 - Archival Memory** (White borders):
- Historical conversation memories
- Timestamped entries with tags
- Searchable archive of interactions

**Tier 3 - Alert Configuration** (Green status):
- Fall Detection
- Wandering Detection
- Activity Pattern Monitoring

---

## Design Philosophy

### Cinematic Editorial Aesthetic
- **Film grain overlay** - Subtle texture for warmth
- **Vignette effects** - Focus attention on content
- **Color palette** - Pure black (#000000), white (#FFFFFF), gold accent (#FFB74D)
- **Typography** - Inter (UI), Inconsolata (logo/monospace), Space Grotesk/Literata (landing)
- **Generous whitespace** - Large touch targets, clear hierarchy

### Accessibility First
- High contrast text (WCAG AAA)
- Large touch targets (min 44px)
- Simple navigation patterns
- Voice-first interaction model
- No complex gestures required

---

## Architecture Notes

### Hybrid Static HTML + Next.js
The application uses two systems:

**Static HTML** (`/public/`):
- Landing page: `memora-cinematic.html` (1086 lines)
- Dashboard: `dashboard.html` (850+ lines, single-page app with client-side routing)
- Served directly by Next.js static file handler

**Next.js App Router** (`/app/`):
- Voice interface (`/patient`)
- Auth pages (`/sign-in`, `/sign-up`)
- Root redirect (`/`)

### Dashboard Scale Transform
Dashboard uses `transform: scale(0.67)` on body for visual sizing:
```css
body {
  transform: scale(0.67);
  transform-origin: top left;
  width: 149.25%;   /* 100% / 0.67 */
  height: 149.25%;  /* 100% / 0.67 */
}
```
All full-height elements use `149.25vh` instead of `100vh` to compensate for scaling.

---

## Future Integration

This frontend is designed to integrate with:
- **Groq API (Kimi K2)** for deep memory analysis with 280k context window
- **Claude (Haiku 4.5)** for ultra-fast real-time patient conversations
- **LiveKit** for real-time voice communication
- **Deepgram** for speech-to-text
- **Letta** for persistent 3-tier memory management (Core, Archival, Alert)
- **ChromaDB** for vector storage of Letta's archival memory embeddings
- **Clerk** for user authentication

**Memory Architecture**: Letta manages the 3-tier memory system while ChromaDB provides persistent vector storage for semantic search over long-term conversation history.

See `CLAUDE.md` for detailed architecture documentation.

---

## Known Limitations

- ❌ No backend - all data is static mock data
- ❌ No real authentication - sign-in always redirects to dashboard
- ❌ No persistence - page refresh resets all data
- ❌ No real voice - audio waveform is simulated with random values
- ❌ Timeline, Insights, Settings pages are placeholders
- ❌ No API calls or external services

---

## Contributing

This is a hackathon prototype. Contributions welcome for:
- UI/UX improvements
- Accessibility enhancements
- PWA features (offline support, notifications)
- Additional mock data scenarios
- Documentation

---

## License

MIT License - see LICENSE file for details

---

## Acknowledgments

Built with care at **Cal Hacks 12.0**

**Technologies**: Next.js • React • TypeScript • Tailwind CSS • Groq • Claude • LiveKit • Deepgram • Letta • ChromaDB • Clerk

---

**Note**: This is a frontend prototype demonstrating UI/UX concepts. AI features, voice processing, and real-time functionality are simulated with mock data. Backend integration is planned for future development.
