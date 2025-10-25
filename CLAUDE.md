# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memora is a **frontend-only Next.js PWA prototype** for a dementia care companion application, built for Cal Hacks 12.0. The application uses a **hybrid architecture**:
- Landing page and dashboard are static HTML files
- Auth pages and voice interface use Next.js App Router
- All backend features (voice, AI, memory) are simulated with mock data

**Critical**: This is a UI prototype only. No backend exists. All data is hardcoded or mocked.

### Patient vs Caregiver Separation (Ethical Design)

**CRITICAL ARCHITECTURAL DECISION**: Memora has two distinct interfaces designed for different users:

#### **Patient Interface** (`/patient`)
- **User**: John Smith (person with dementia)
- **Purpose**: Supportive voice companion
- **Features**:
  - Voice-first interaction (large, simple UI)
  - Orientation cues (date, time, weather)
  - "I'm here with you" reassuring language
  - **Privacy Dashboard** - John controls what data caregivers can see
    - Toggle switches for: Conversations, Location Tracking, Medication Tracking, Activity Monitoring
    - Warning notifications when toggling privacy settings (e.g., "Ava will be notified. Wandering alerts will be disabled.")
    - All changes logged and caregivers notified via consent notifications
  - NO cognitive performance metrics shown to patient
  - NO surveillance metrics visible (alerts, tracking events hidden from this interface)
- **Why**: Showing a dementia patient caregiver surveillance metrics (location tracking, behavioral analytics) is **harmful**. The patient interface provides supportive companionship with privacy controls.

#### **Caregiver Dashboard** (`/dashboard.html`)
- **User**: Ava Smith (caregiver/family member)
- **Purpose**: Monitoring and insights with transparency
- **Features**:
  - **Consent Notifications** - When John changes privacy settings, Ava sees notifications explaining:
    - What John changed
    - When the change occurred
    - Impact on caregiver tools (e.g., "Walking Monitoring alerts will not function while this is disabled")
  - **AI Reasoning Explanations** - All memory system decisions show transparent explanations:
    - Technical metrics (e.g., "Referenced in 85% of conversations", "<200ms retrieval time")
    - Detection algorithms (e.g., "Tone analysis: 8.2/10")
    - Calibration data (e.g., "110m threshold based on John's walking pattern analysis (last 30 days): 95% of walks stay within this radius")
  - **Behavioral Metrics** (replaces vague "engagement score"):
    - Response Time (1.8s vs 2.1s baseline)
    - Unprompted Memory Recall (2 instances with specific examples)
    - Temporal Orientation (2 date checks, within normal range)
    - Question Repetition (5× vs 2-3× baseline, with actionable insight)
  - Timeline of events (medication, alerts, activities)
  - Memory system management (3-tier architecture with reasoning)
  - Voice Chat interface (purple accents, edit functionality)
  - Alert configuration
- **Why**: Caregivers need analytics to provide better care. Transparency-first design: honest about data collection, explicit about algorithms, patient has consent controls.

**In Demo**: The dashboard shows "Ava Smith - Caregiver" in the sidebar, not "John Smith - Patient". This emphasizes that caregivers use this interface, not patients.

### Transparency-First Design Philosophy

**Core Principle**: Be honest about what the system does. Dementia care involves surveillance - location tracking, behavioral monitoring, conversation analysis. **Don't hide it. Don't euphemize it. Make it transparent and consensual.**

**Implementation**:

1. **Patient Privacy Controls** (`components/VoiceInterface.tsx`)
   - Patient has granular toggles for all data collection
   - Each toggle shows clear warning about consequences
   - Caregivers are immediately notified of changes
   - No data collection happens without patient awareness

2. **AI Reasoning Explanations** (`public/dashboard.html`, `data/mock-data.ts`)
   - Every memory decision shows WHY it was made
   - Technical metrics exposed (retrieval time, usage frequency, tone scores)
   - Algorithm calibration data visible (baseline thresholds, detection patterns)
   - Acknowledges uncertainty ("May indicate anxiety" not "Indicates anxiety")

3. **Consent Notifications** (`public/dashboard.html`)
   - When patient changes privacy settings, caregiver sees notification
   - Shows what changed, when, and impact on monitoring tools
   - Respectful language: "John chose to disable Location Tracking" not "Location disabled"

4. **Behavioral Metrics Replace Vanity Scores** (`public/dashboard.html`)
   - No "9.2/10 engagement score" - meaningless number
   - Specific, observable behaviors: response time, memory recall, orientation
   - Comparison to patient's own baseline, not generic ideal
   - Honest clinical notes with actionable insights

**Language Guidelines**:
- ❌ "boundary-respecting communication" → ✅ "Caregiver insights with patient consent controls"
- ❌ "Pattern detection without intrusive surveillance" → ✅ "Behavioral pattern analysis with transparent data collection"
- ❌ "preserving dignity" (while building surveillance) → ✅ "providing support" (honest about capabilities)
- ❌ "NO surveillance data" → ✅ "Privacy dashboard - John controls what data caregivers see"

## Development Commands

```bash
# Start development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Generate Tailwind CSS (auto-runs in prepare hook)
npm run prepare
```

## Architecture

### Hybrid Next.js + Static HTML Setup

The application uses two different systems:

**Static HTML Files** (in `/public/`):
- `memora-cinematic.html` - Landing page (1086 lines, self-contained)
- `dashboard.html` - Caregiver dashboard (850 lines, single-page app with JS routing)

**Next.js App Router** (in `/app/`):
- `/` - Redirects to `/memora-cinematic.html`
- `/sign-in` - Auth page → redirects to `/dashboard.html` on submit
- `/sign-up` - Registration page → redirects to `/dashboard.html` on submit
- `/patient` - Voice interface (uses React components)
- `/dashboard/*` - Old Next.js dashboard (deprecated, redirects to `/dashboard.html`)

### Critical Routing Rules

1. **All dashboard links** must point to `/dashboard.html` (NOT `/dashboard` or `/dashboard/timeline`)
2. **Sign-in/sign-up forms** redirect to `/dashboard.html` on submit via `window.location.href`
3. **Landing page CTA** links to `/dashboard.html`
4. **Dashboard is fully client-side** - JavaScript switches pages by toggling `display: none/block`

### Static Dashboard Architecture (`public/dashboard.html`)

Single HTML file containing:
- 5 pages (Overview, Timeline, Insights, Memories, Settings) - only Overview has content
- CSS-in-`<style>` for all styling
- JavaScript-in-`<script>` for page navigation
- All fonts loaded via Google Fonts CDN

**Critical CSS Pattern - `transform: scale(0.8)` on body:**

```css
html {
  overflow: hidden;  /* CRITICAL: Prevents page scrolling */
  width: 100%;
  height: 100%;
}

body {
  transform: scale(0.8);
  transform-origin: top left;
  width: 125%;        /* 100% / 0.8 */
  height: 125%;       /* 100% / 0.8 */
  overflow: hidden;   /* CRITICAL: Prevents page scrolling */
}

.dashboard-container {
  height: 125vh;      /* NOT 100vh - compensates for scale */
  overflow: hidden;
}

.sidebar {
  height: 125vh;      /* NOT 100vh */
  overflow: hidden;   /* Sidebar must NOT scroll */
}

.main-content {
  height: 125vh;      /* NOT 100vh */
  overflow-y: auto;   /* ONLY main content scrolls */
}
```

**Why 125vh?**
- Body is scaled to 0.8 of its layout size
- 100vh in layout space becomes 80vh visually after scaling
- To get 100vh visually, we need: 100vh ÷ 0.8 = 125vh in layout space
- **Rule**: All heights/min-heights that should be "full viewport" must use `125vh`

**Scrolling Behavior:**
- `html` and `body` have `overflow: hidden` to prevent page-level scrolling
- Sidebar has `overflow: hidden` - it must NOT scroll
- Only `.main-content` has `overflow-y: auto` - it's the scrollable area
- Dashboard container uses `display: flex` with fixed sidebar and flex main content

### Landing Page Architecture (`public/memora-cinematic.html`)

Single-file landing page with:
- **Compact header** - Reduced height (1rem padding, 48px logo) for more content visibility
- **Section navigation** - Center nav bar with clickable section links: Memory, Voice, Features, Why Different
- **Smooth scroll** - Native `scrollIntoView({ behavior: 'smooth' })` for animated section jumps
- **Section anchors** - IDs added to main sections (#memory, #voice, #features, #difference)
- Cinematic film grain effect (fixed pseudo-element with SVG noise)
- Scroll-triggered parallax effects
- Scroll indicator (animated down arrow at bottom of hero)

### Next.js Components

**Patient Voice Interface** (`components/VoiceInterface.tsx` at `/patient`):
- State machine: `idle → listening → thinking → speaking → idle`
- Uses `useMockVoiceConnection` hook for simulated audio levels
- Hardcoded transcript: "What day is it today?"
- Hardcoded response: "Today is Wednesday, October 23rd..."
- Transition timings: 1.5s listening, 1.5s thinking, 3.5s speaking
- Large, simple UI with ambient context (date/time/weather)
- "I'm here with you" reassuring language

**Caregiver Voice Chat** (`/dashboard.html#voice` page):
- **Purple accent theme** (#A78BFA) - Send button, mic button, input focus
- **Persistent bottom bar** - [Mic] [Text Input] [Send] always visible
- **Message timestamps** - User messages show time (e.g., "4:30 PM"), AI messages don't
- **Edit functionality** - User can edit past messages with Save/Cancel buttons
- **Checkpoint system** - Editing a message deletes all subsequent messages and regenerates from that point
- **Simpler mic icon** - 72px circular button (no complex graphics)
- **Empty state** - Chat bubble icon (120px) with helpful text

**Mock Data System** (`data/mock-data.ts`):
- Single export: `mockCareState`
- Contains patient profile, sensors, timeline, insights, memories
- Uses `date-fns` for relative timestamps (`subHours`, `subMinutes`, `formatISO`)
- **No mutations persist** - page refresh resets everything

### Accessibility & Design Principles

**Design Principles**:
- **High contrast** - Pure black #000000 background, white #FFFFFF text
- **WCAG AAA compliant** - Verified contrast ratios:
  - Orange #FF9800: 9.61:1 (exceeds 7:1 requirement)
  - Gold #FFB74D: 12.32:1 (exceeds 7:1 requirement)
  - Green #4CAF50: 7.80:1 (exceeds 7:1 requirement)
- **Large touch targets** - Minimum 44px, many 72px+
- **Simple navigation patterns** - Section-based navigation with smooth scroll
- **Voice-first interaction model** - Patient interface prioritizes voice
- **No complex gestures required** - Single taps and simple interactions only

## Critical Styling Rules

### Logo Sizes

**IMPORTANT**: Logo sizes are currently DIFFERENT on landing page vs dashboard:

**Landing Page** (`memora-cinematic.html`):
```css
.logo img {
  width: 48px;
  height: 48px;
  filter: invert(1) brightness(1.2);
}

.logo-text {
  font-family: 'Inconsolata', monospace;
  font-size: 1.5rem;            /* 24px */
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink);
}
```

**Dashboard** (`dashboard.html`):
```css
.logo-image {
  width: 96px;
  height: 96px;
  filter: invert(1) brightness(1.2);
}

.logo-text {
  font-family: 'Inconsolata', monospace;
  font-size: 40px;              /* 40px */
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #FFFFFF;
}
```

**Note**: This inconsistency exists to keep landing page header compact (1rem padding) while dashboard uses larger logo for visibility.

### Color Palette

**Dashboard** (pure black/white with purple voice chat):
- Background: `#000000` (pure black)
- Text/Borders: `#FFFFFF` (pure white)
- Accent: `#FFB74D` (gold - active nav items)
- Voice Chat Accent: `#A78BFA` (purple - Send button, mic hover, input focus)
- Status Good: `#4CAF50` (green)
- Status Warning: `#FF9800` (orange)

**Landing Page** (cinematic):
- `--ink`: `#fafaf6` (off-white)
- `--paper`: `#0a0a0a` (near-black)
- `--accent`: `#d4a574` (warm gold)
- `--gray`: `#9a9a9a`

**Tailwind (unused in static files):**
- Lavender palette: `#d4c3dc` (logo background) to `#574361`
- Sage palette: `#8fa89f` (logo green) to `#2a3531`
- Neutral warm grays: `#fafaf9` to `#1f1e1e`

### Typography

**Dashboard**:
- Primary: `Inter` (400, 500, 600, 700)
- Logo: `Inconsolata` (400, 700, 900)
- Base size: `18px` (with scale(0.8) transform applied)

**Landing Page**:
- Body: `Literata` (serif)
- Headers: `Space Grotesk` (sans-serif)
- UI Text: `Inconsolata` (monospace)

## File Locations

### Core Static Files
- `/public/dashboard.html` - Main dashboard (850 lines)
- `/public/memora-cinematic.html` - Landing page (1086 lines)
- `/public/manifest.json` - PWA config
- `/public/service-worker.js` - PWA offline support
- `/public/memoralogo.svg` - Logo (571KB)
- `/public/hero-palace.png` - Landing hero image (1.2MB)
- `/public/memory-vortex.png` - Landing section image (2.1MB)

### Next.js App Structure
- `/app/page.tsx` - Redirects to `/memora-cinematic.html`
- `/app/patient/page.tsx` - Voice interface page
- `/app/sign-in/page.tsx` - Auth (redirects to `/dashboard.html`)
- `/app/sign-up/page.tsx` - Registration (redirects to `/dashboard.html`)
- `/app/dashboard/page.tsx` - Deprecated (redirects to `/dashboard.html`)
- `/app/dashboard/layout.tsx` - Deprecated dashboard layout (still has nav structure)

### Components
- `/components/VoiceInterface.tsx` - Main voice UI with state machine
- `/components/PainterlyWaveform.tsx` - Canvas particle animation for audio
- `/components/ConversationTranscript.tsx` - Typewriter text animation
- `/components/PWAInstallPrompt.tsx` - PWA install prompt

### Data & Utilities
- `/data/mock-data.ts` - All mock patient/timeline/insight data
- `/hooks/useMockVoiceConnection.ts` - Simulated audio levels
- `/lib/types.ts` - TypeScript type definitions
- `/app/auth.css` - Shared auth page styles

### Configuration
- `/tailwind.config.ts` - Tailwind config (custom color palette, spacing)
- `/next.config.mjs` - Next.js configuration
- `/package.json` - Dependencies

## Common Gotchas

### 1. Dashboard Height Issues

**Problem**: Sidebar only extends 1/3 down the page on content-light pages.

**Cause**: Using `100vh` with `transform: scale(0.8)` on body.

**Solution**: Always use `125vh` for full-height elements:
```css
/* WRONG */
.sidebar { min-height: 100vh; }

/* CORRECT */
.sidebar { height: 125vh; }
```

### 2. Unwanted Scrolling

**Problem**: Entire page scrolls (sidebar moves with scroll).

**Cause**: Browser window is scrollable because body is 125% of viewport.

**Solution**: `overflow: hidden` on both `html` and `body`:
```css
html { overflow: hidden; }
body { overflow: hidden; }
```

### 3. Dashboard Routing

**Problem**: Links go to `/dashboard/timeline` which no longer exists.

**Cause**: Old Next.js routes not updated after migration to static HTML.

**Solution**: All dashboard links must use `/dashboard.html`:
```tsx
// WRONG
<a href="/dashboard/timeline">Dashboard</a>

// CORRECT
<a href="/dashboard.html">Dashboard</a>
```

### 4. Logo Size Inconsistency (Current State)

**Current Situation**: Logo sizes are intentionally DIFFERENT on landing vs dashboard.

**Landing Page**: 48px image, 1.5rem (24px) text - for compact header
**Dashboard**: 96px image, 40px text - for visibility in scaled interface

**Why**: Landing page uses compact header (1rem padding) to maximize content space, while dashboard needs larger logo for visibility with scale(0.8) transform.

**If you need consistency**: Update landing page to 96px/40px OR update dashboard to 48px/24px.

### 5. Fixed Positioning with Transform

**Problem**: `position: fixed` doesn't work correctly on sidebar.

**Cause**: `transform: scale(0.8)` on parent creates new stacking context.

**Solution**: Don't use `position: fixed` on elements inside scaled container. Use flexbox with `overflow: hidden` instead.

### 6. Landing Page Section Navigation

**How it works**:
- Section links in center nav bar (#memory, #voice, #features, #difference)
- JavaScript prevents default anchor behavior
- Uses `scrollIntoView({ behavior: 'smooth', block: 'start' })` for animated scroll
- IDs added to main `<section>` elements for targeting

## Development Workflow

### Making Changes to Dashboard

1. Edit `/public/dashboard.html` directly
2. Refresh browser to see changes (no build step)
3. Test with Playwright:
   ```bash
   # Navigate and screenshot
   mcp__playwright__browser_navigate http://localhost:3000/dashboard.html
   mcp__playwright__browser_take_screenshot
   ```
4. Verify sidebar extends fully on all pages (not just Home)
5. Commit changes

### Making Changes to Landing Page

1. Edit `/public/memora-cinematic.html` directly
2. Refresh browser (no build step)
3. Test scroll indicator animation
4. Verify all links point to correct destinations
5. Commit changes

### Making Changes to Voice Interface

1. Edit `/components/VoiceInterface.tsx`
2. Dev server auto-reloads
3. Navigate to `/patient` to test
4. Modify state machine timings in `handlePress()` function
5. Update hardcoded transcript/response strings as needed

### Adding New Dashboard Page

1. Open `/public/dashboard.html`
2. Add new page div:
   ```html
   <div id="newpage-page" class="page">
     <div class="page-header">
       <h1 class="page-title">New Page</h1>
     </div>
   </div>
   ```
3. Add navigation link in sidebar:
   ```html
   <a href="#" class="nav-link" data-page="newpage">
     <svg class="nav-icon">...</svg>
     New Page
   </a>
   ```
4. JavaScript automatically handles navigation via `data-page` attribute

## Testing

### Browser Testing
- Navigate to `http://localhost:3000`
- Test all routes: `/`, `/sign-in`, `/sign-up`, `/patient`, `/dashboard.html`
- Verify dashboard page switching works (click sidebar nav items)
- Verify scrolling behavior (sidebar locked, main content scrollable)
- Test on different viewport sizes

### Playwright Testing (via MCP)
```javascript
// Navigate
mcp__playwright__browser_navigate("http://localhost:3000/dashboard.html")

// Take screenshot
mcp__playwright__browser_take_screenshot({ fullPage: true })

// Click navigation
mcp__playwright__browser_click({ element: "Settings", ref: "..." })

// Verify no console errors
mcp__playwright__browser_console_messages({ onlyErrors: true })
```

### Visual Regression Checks
After changes, verify:
1. Sidebar extends full height on ALL pages (Home, Timeline, Insights, Memories, Settings)
2. User section ("Ava Smith - Caregiver") stays at bottom of sidebar
3. Main content area is scrollable
4. No horizontal scroll on page
5. Logo and "MEMORA" text match between landing and dashboard

## Planned AI Architecture

### Multi-Model Strategy

Memora uses a **hybrid AI architecture** optimized for different use cases:

#### **Groq (Kimi K2)** - Quality & Deep Analysis
- **Model**: Kimi K2 with 280k context window
- **Use case**: Memory system analysis, long-term pattern detection
- **Why**: Massive context window allows analyzing entire conversation histories and patient data
- **Processes**:
  - 3-tier memory updates (Core, Archival, Alert)
  - Conversation pattern analysis
  - Caregiver insights generation
  - Behavioral trend detection

#### **Claude (Haiku 4.5)** - Fast Performance
- **Model**: claude-haiku-4-5 (latest)
- **Use case**: Real-time patient conversations
- **Why**: Ultra-fast inference for responsive voice interactions
- **Processes**:
  - Patient voice chat responses
  - Quick factual lookups
  - Safety-critical realtime decisions
  - Conversational flow management

#### **Context7** - Documentation Retrieval
- **Use case**: Up-to-date library documentation
- **Why**: Ensures AI responses use latest API patterns
- **Processes**:
  - Retrieves current documentation for Groq, LiveKit, Deepgram, Letta, ChromaDB
  - Provides code examples and best practices
  - Keeps AI integrations current

#### **Letta + ChromaDB** - Persistent Memory Architecture
- **Letta**: Stateful agent framework with 3-tier memory (Core, Archival, Alert)
- **ChromaDB**: Vector database providing persistent storage for Letta's archival memory
- **Use case**: Long-term memory with semantic search
- **Why**: ChromaDB stores embeddings for Letta's archival tier, enabling semantic retrieval of past conversations
- **Processes**:
  - Letta manages memory tiers and agent state
  - ChromaDB stores archival memory embeddings
  - Semantic search over patient conversation history
  - Pattern detection across long time periods

### Data Flow

```
Patient speaks → Deepgram (STT) → Claude Haiku (fast response) → LiveKit (TTS)
                                    ↓
                            Async: Groq Kimi K2 (280k context)
                                    ↓
                            Letta Memory Updates
                                    ↓
                            ChromaDB (Vector Storage)
                                    ↓
                            Caregiver Dashboard Insights
```

**Memory Pipeline**:
1. Conversation happens via Claude Haiku (real-time)
2. Groq Kimi K2 analyzes conversation with 280k context window
3. Letta updates 3-tier memory (Core, Archival, Alert)
4. ChromaDB stores archival memory embeddings for semantic search
5. Dashboard displays insights derived from memory analysis

## Backend Implementation Status (Active Development)

### ✅ Completed Components

1. **Database Schema** (13 tables in Supabase PostgreSQL)
   - patients, caregivers, conversations, messages
   - medications, medication_doses, privacy_consents
   - behavioral_metrics, patient_insights, alert_configurations
   - timeline_events, daily_activities, sleep_logs
   - Location: `prisma/schema.prisma` with Prisma migrations

2. **Onboarding Endpoint** (`POST /api/onboard`)
   - Location: `app/api/onboard/route.ts`
   - Creates Patient or Caregiver record in database
   - Creates Letta AI agent with memory blocks
   - Stores Letta agent ID in database
   - Zod validation for request body
   - Tested: 13 comprehensive tests with real API calls

3. **Authentication Integration**
   - Uses Clerk for user authentication
   - `auth()` function from `@clerk/nextjs/server`
   - Direct clerkId storage (no separate User model)
   - Works in Next.js middleware and API routes

4. **Letta AI Integration**
   - Location: `lib/letta.ts`
   - Real Letta API calls (no mocks)
   - Creates agents with 3-tier memory blocks (human, persona, patient_context)
   - Stores agent IDs in Patient records
   - Tested: 7 integration tests with real Letta API

5. **Testing Infrastructure**
   - Framework: Vitest with dotenv integration
   - Database: Real Supabase instance (local + cloud)
   - API calls: Real Letta API
   - Results: 37/37 tests passing
   - Location: `tests/db/`, `tests/api/`, `tests/integration/`

### 🔄 In Progress

1. **Middleware** (`app/middleware.ts`)
   - Protect routes requiring authentication
   - Redirect unauthenticated users to sign-in
   - Check if user is onboarded (Patient/Caregiver record exists)
   - Redirect not-yet-onboarded users to `/onboarding`

2. **Onboarding Page** (`app/onboarding/page.tsx`)
   - Form to collect role (Patient or Caregiver)
   - Collect role-specific data (name, age, email, etc.)
   - Submit to `POST /api/onboard`
   - Redirect to `/patient` or `/caregiver` on success

3. **Conversation API** (`POST /api/conversation`)
   - Accept message from user
   - Send to Letta agent via `client.agents.messages.send()`
   - Store in database
   - Return agent response

### ⏳ Planned Components

1. **Voice Interface** (`app/patient/page.tsx`)
   - LiveKit + Deepgram integration
   - Real speech-to-text and text-to-speech
   - Replace current hardcoded transcript

2. **Caregiver Routes** (`app/caregiver/dashboard`)
   - API endpoints for dashboard data
   - Behavioral metrics calculation
   - Memory management endpoints

### 🛠️ Development Setup

**Local Supabase Database**:
```bash
supabase start
# DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Environment Variables** (see `.env.example`):
- `DATABASE_URL` - Supabase PostgreSQL connection
- `LETTA_API_KEY` - Letta AI authentication
- `LETTA_BASE_URL` - Letta API endpoint (https://api.letta.com)
- `CLERK_SECRET_KEY` - Clerk authentication
- `GROQ_API_KEY` - Groq LLM access (future)

**Running Tests**:
```bash
npx vitest run tests/db/schema.test.ts tests/api/onboard.test.ts tests/integration/letta.test.ts
```

### Known Issues & Limitations

1. ✅ **Backend Now Exists** - Real PostgreSQL database with Prisma ORM
2. ✅ **Authentication Works** - Clerk integration with middleware redirects
3. ✅ **Data Persists** - All data stored in Supabase
4. ❌ **Voice Not Real** - Audio waveform is simulated (LiveKit + Deepgram planned)
5. ❌ **Dashboard Content** - Only "Overview" and "Voice Chat" pages have real content; Timeline, Insights, Settings are placeholders
6. ⚠️ **Scale Transform** - The `transform: scale(0.8)` approach on dashboard is a workaround
7. ⚠️ **Logo Inconsistency** - Landing page uses 48px logo, dashboard uses 96px logo (intentional)

## File Tree Summary

```
/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Deprecated - redirects to /dashboard.html
│   ├── patient/           # Voice interface page
│   ├── sign-in/           # Auth page
│   ├── sign-up/           # Registration page
│   └── layout.tsx         # Root layout with PWA metadata
├── components/            # React components
│   ├── VoiceInterface.tsx
│   ├── PainterlyWaveform.tsx
│   └── ConversationTranscript.tsx
├── data/
│   └── mock-data.ts       # All mock patient/timeline data
├── hooks/
│   └── useMockVoiceConnection.ts
├── lib/
│   └── types.ts           # TypeScript types
├── public/                # Static files (served directly)
│   ├── dashboard.html     # **Main dashboard (static HTML)**
│   ├── memora-cinematic.html # **Landing page (static HTML)**
│   ├── manifest.json      # PWA config
│   └── *.png, *.svg       # Images
├── tailwind.config.ts     # Tailwind config (not used in static HTML)
└── package.json
```

## User Preferences (from ~/.claude/CLAUDE.md)

- User is between amateur and intermediate skill level
- Prefers thorough explanations, not rushed
- Wants commits to be frequent
- Expects testing with Playwright MCP after each change
- Demands no shortcuts, no cutting corners
- Requires visual verification before claiming fixes work
