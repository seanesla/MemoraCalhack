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
- **User**: Dorothy H. (person with dementia)
- **Purpose**: Supportive voice companion
- **Features**:
  - Voice-first interaction (large, simple UI)
  - Orientation cues (date, time, weather)
  - "I'm here with you" reassuring language
  - NO surveillance data shown
  - NO cognitive performance metrics
  - NO wandering alerts or fall detection events
- **Why**: Showing a dementia patient their own "engagement scores" or "wandering alerts" is **shame-inducing and harmful**. The patient interface preserves dignity.

#### **Caregiver Dashboard** (`/dashboard.html`)
- **User**: Ava Smith (caregiver/family member)
- **Purpose**: Monitoring and insights
- **Features**:
  - Timeline of events (medication, alerts, activities)
  - Memory system management (3-tier architecture)
  - Voice Chat interface (purple accents, edit functionality)
  - AI-generated insights and pattern detection
  - Alert configuration and settings
- **Why**: Caregivers need analytics to provide better care, but this data should NEVER be visible to the patient.

**In Demo**: The dashboard shows "Ava Smith - Caregiver" in the sidebar, not "Dorothy H. - Patient". This emphasizes that caregivers use this interface, not patients.

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

**Critical CSS Pattern - `transform: scale(0.67)` on body:**

```css
html {
  overflow: hidden;  /* CRITICAL: Prevents page scrolling */
  width: 100%;
  height: 100%;
}

body {
  transform: scale(0.67);
  transform-origin: top left;
  width: 149.25%;     /* 100% / 0.67 */
  height: 149.25%;    /* 100% / 0.67 */
  overflow: hidden;   /* CRITICAL: Prevents page scrolling */
}

.dashboard-container {
  height: 149.25vh;   /* NOT 100vh - compensates for scale */
  overflow: hidden;
}

.sidebar {
  height: 149.25vh;   /* NOT 100vh */
  overflow: hidden;   /* Sidebar must NOT scroll */
}

.main-content {
  height: 149.25vh;   /* NOT 100vh */
  overflow-y: auto;   /* ONLY main content scrolls */
}
```

**Why 149.25vh?**
- Body is scaled to 0.67 of its layout size
- 100vh in layout space becomes 67vh visually after scaling
- To get 100vh visually, we need: 100vh ÷ 0.67 = 149.25vh in layout space
- **Rule**: All heights/min-heights that should be "full viewport" must use `149.25vh`

**Scrolling Behavior:**
- `html` and `body` have `overflow: hidden` to prevent page-level scrolling
- Sidebar has `overflow: hidden` - it must NOT scroll
- Only `.main-content` has `overflow-y: auto` - it's the scrollable area
- Dashboard container uses `display: flex` with fixed sidebar and flex main content

### Landing Page Architecture (`public/memora-cinematic.html`)

Single-file landing page with:
- Cinematic film grain effect (fixed pseudo-element with SVG noise)
- Scroll-triggered parallax effects
- Smooth scroll wrapper for momentum scrolling
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

### Accessibility Features

**Jargon Simplifier** (`lib/jargon-simplifier.ts`):
- Maps technical/medical terms to plain language
- Examples: "Leqembi" → "memory medication", "Safe radius" → "safe walking area"
- Toggle in dashboard toolbar ("Simple Language" button)
- Designed for elderly users with varying tech literacy

**Read Aloud** (Dashboard toolbar):
- Text-to-speech for current page content
- Slower rate (0.85) for elderly users
- Simplifies jargon before speaking
- Helps users with vision or reading difficulties

**Design Principles**:
- High contrast (pure black #000000 background, white #FFFFFF text)
- Large touch targets (minimum 44px, many 72px+)
- Simple navigation patterns
- Voice-first interaction model
- No complex gestures required

## Critical Styling Rules

### Logo Consistency

Logo and "MEMORA" text must be identical on landing page and dashboard:

```css
/* Both pages MUST use: */
.logo-image {
  width: 96px;
  height: 96px;
  filter: invert(1) brightness(1.2);
}

.logo-text {
  font-family: 'Inconsolata', monospace;
  font-size: 40px;              /* 2.5rem on landing page */
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #FFFFFF;               /* var(--ink) on landing page */
}
```

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
- Base size: `12px` (due to scale transform)

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

**Cause**: Using `100vh` with `transform: scale(0.67)` on body.

**Solution**: Always use `149.25vh` for full-height elements:
```css
/* WRONG */
.sidebar { min-height: 100vh; }

/* CORRECT */
.sidebar { height: 149.25vh; }
```

### 2. Unwanted Scrolling

**Problem**: Entire page scrolls (sidebar moves with scroll).

**Cause**: Browser window is scrollable because body is 149.25% of viewport.

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

### 4. Logo Size Mismatch

**Problem**: Logo appears different sizes on landing vs dashboard.

**Cause**: Different font sizes or image dimensions in CSS.

**Solution**: Both must use `96px` image, `40px` (or `2.5rem`) text:
```css
.logo-image { width: 96px; height: 96px; }
.logo-text { font-size: 40px; } /* or 2.5rem */
```

### 5. Fixed Positioning with Transform

**Problem**: `position: fixed` doesn't work correctly on sidebar.

**Cause**: `transform: scale(0.67)` on parent creates new stacking context.

**Solution**: Don't use `position: fixed` on elements inside scaled container. Use flexbox with `overflow: hidden` instead.

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
2. User section ("Dorothy H.") stays at bottom of sidebar
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
  - Retrieves current documentation for Groq, LiveKit, Deepgram, Letta
  - Provides code examples and best practices
  - Keeps AI integrations current

### Data Flow

```
Patient speaks → Deepgram (STT) → Claude Haiku (fast response) → LiveKit (TTS)
                                    ↓
                            Async: Groq Kimi K2 (280k context)
                                    ↓
                            Letta Memory Updates
                                    ↓
                            Caregiver Dashboard Insights
```

## Known Issues & Limitations

1. **No Backend** - All voice/AI/memory features are currently simulated with mock data
2. **No Authentication** - Sign-in/sign-up are placeholders, always redirect to dashboard
3. **No Persistence** - All data resets on page refresh (Letta integration planned)
4. **No Real Voice** - Audio waveform is simulated (LiveKit + Deepgram integration planned)
5. **Dashboard Content** - Only "Overview" and "Voice Chat" pages have real content; Timeline, Insights, Settings are placeholders
6. **Scale Transform** - The `transform: scale(0.67)` approach is a hack; ideally redesign to fit viewport naturally

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
