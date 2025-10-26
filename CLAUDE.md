# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memora is a **full-stack dementia care companion** built for Cal Hacks 12.0 (Phase 11.3). The application uses a **hybrid architecture**:
- Landing page and dashboard are static HTML files (`public/*.html`)
- Patient voice interface uses Next.js App Router with React components
- Backend: Supabase PostgreSQL + Prisma ORM + 18 API endpoints
- AI: Claude Haiku 4.5 (real-time) + Letta (memory) + ChromaDB (archival) + Deepgram (voice)

### Patient vs Caregiver Separation (Ethical Design)

**Patient Interface** (`/patient`): Voice-first companion with privacy controls. NO cognitive scores shown. Patient toggles control what caregivers can see (conversations, location, medications, activities).

**Caregiver Dashboard** (`/dashboard.html`): Monitoring analytics with transparency. Shows consent notifications when patient changes settings. All AI decisions include technical explanations (retrieval time, tone scores, algorithm details). Behavioral metrics use patient's own baseline, not vanity scores.

**Design Principle**: Be honest about surveillance (location tracking, conversation analysis). Don't euphemize it. Make it transparent and consensual.

## Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
supabase start    # Start local DB (postgresql://postgres:postgres@127.0.0.1:54322/postgres)
npx vitest run    # Run 37+ tests (real APIs, no mocks)
```

## Architecture

### Hybrid Architecture

**Static HTML**: Landing (`memora-cinematic.html`) and caregiver dashboard (`dashboard.html`) served from `/public/`
**Next.js**: Patient voice interface (`/patient`), auth pages (`/sign-in`, `/sign-up`), onboarding (`/onboarding`)
**API Routes**: 18 endpoints in `app/api/` (conversations, audio, patients, medications, activities, sleep, privacy, onboarding)

**Routing Rules**: All dashboard links → `/dashboard.html` (NOT `/dashboard`). Dashboard uses client-side JS navigation (toggles `display: none/block`).

### Critical: Dashboard Scale Transform (`dashboard.html`)

Dashboard uses `transform: scale(0.8)` on body, which breaks `100vh` calculations:

```css
body { transform: scale(0.8); width: 125%; height: 125%; }
html, body { overflow: hidden; }  /* Prevent page scroll */
.sidebar { height: 125vh; overflow: hidden; }  /* Must NOT scroll */
.main-content { height: 125vh; overflow-y: auto; }  /* ONLY scrollable area */
```

**Rule**: Use `125vh` for full-height elements (100vh ÷ 0.8 = 125vh). Sidebar must never scroll.

### Voice Interface (`components/VoiceInterface.tsx`)

- Real Deepgram STT/TTS integration (`/api/audio/transcribe`, `/api/audio/speak`)
- Real Claude Haiku 4.5 responses (`/api/conversation`)
- Real Letta memory + ChromaDB archival search
- State machine: `idle → listening → thinking → speaking → idle`
- Stores conversations in Supabase PostgreSQL

### Design

- **Colors**: Black #000000, white #FFFFFF, gold #FFB74D (active nav), purple #A78BFA (voice chat accents)
- **WCAG AAA**: All contrast ratios >7:1
- **Touch**: Minimum 44px targets

## Key Files

- **Static HTML**: `public/dashboard.html` (caregiver), `public/memora-cinematic.html` (landing)
- **Voice UI**: `components/VoiceInterface.tsx`, `app/patient/page.tsx`
- **Auth**: `app/sign-in/`, `app/sign-up/`, `app/onboarding/page.tsx`, `middleware.ts`
- **API**: `app/api/conversation/`, `app/api/audio/`, `app/api/patients/[id]/`, `app/api/onboard/`
- **Database**: `prisma/schema.prisma`, `lib/prisma.ts`, `lib/letta.ts`, `lib/claude.ts`
- **Mock Data**: `data/mock-data.ts` (only used in `dashboard.html`, NOT in voice interface or APIs)
- **Fonts**: Inter (dashboard), Inconsolata (logos), Literata/Space Grotesk (landing)

## Common Gotchas

1. **Dashboard Heights**: Always use `125vh` (NOT `100vh`) because of `scale(0.8)`. Sidebar must have `overflow: hidden`.
2. **Dashboard Routing**: Always link to `/dashboard.html` (NOT `/dashboard` or `/dashboard/timeline`).
3. **Fixed Positioning**: Doesn't work inside `scale(0.8)` container. Use flexbox instead.
4. **Logo Sizes**: Landing (48px) vs Dashboard (96px) - intentionally different for compact header vs visibility.

## Development Workflow

- **Static HTML** (`dashboard.html`, `memora-cinematic.html`): Edit directly, refresh browser (no build step)
- **Voice Interface** (`components/VoiceInterface.tsx`): Edit, dev server auto-reloads, test at `/patient`
- **API Routes** (`app/api/**/*`): Edit, dev server auto-reloads, test with real Supabase + Letta
- **Database**: Run `npx prisma db push` after schema changes
- **Tests**: Run `npx vitest run` (37+ tests use real APIs, no business logic mocks)

## AI Architecture (Phase 11.3)

**Implemented**:
- **Claude Haiku 4.5**: Real-time conversation responses (`lib/claude.ts`, `/api/conversation`)
- **Deepgram**: STT (`/api/audio/transcribe`) + TTS (`/api/audio/speak`)
- **Letta**: 3-tier memory (Core, Archival, Alert) with agent creation (`lib/letta.ts`, `/api/onboard`)
- **ChromaDB**: Vector storage for Letta archival memory (semantic search over past conversations)
- **Supabase PostgreSQL**: 13 tables storing patients, conversations, messages, medications, activities, privacy consents

**Planned**:
- **Groq (Kimi K2)**: Deep analysis with 280k context window for behavioral insights (not yet integrated)
- **LiveKit**: Real-time WebRTC voice (token endpoint exists, UI integration pending)

**Data Flow**: Patient speaks → Deepgram STT → Claude Haiku response → Deepgram TTS → Letta updates archival memory → ChromaDB stores embeddings

## Environment Setup

```bash
# Required .env variables
DATABASE_URL=              # Supabase PostgreSQL
ANTHROPIC_API_KEY=         # Claude Haiku 4.5
DEEPGRAM_API_KEY=          # STT/TTS
LETTA_API_KEY=             # Memory system
CLERK_SECRET_KEY=          # Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Optional (planned)
GROQ_API_KEY=              # Kimi K2 (not yet used)
LIVEKIT_URL=               # WebRTC (endpoint ready, UI pending)
```

## Current Limitations

- **Groq integration**: Not yet active (env var exists but not called in code)
- **LiveKit voice**: Token endpoint works but voice UI doesn't use it yet
- **Dashboard pages**: Only Overview and Voice Chat have real content; Timeline, Insights, Settings are placeholders
- **Scale transform**: The `scale(0.8)` approach is a workaround for dashboard sizing
