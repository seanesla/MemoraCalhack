# Memora

A voice-first AI companion for dementia care with transparent patient consent controls.

**Built for Cal Hacks 12.0 (Phase 11.3) • October 2025**

---

## Overview

Memora is a **full-stack dementia care platform** with:
- Real voice interaction via Deepgram STT/TTS
- Claude Haiku 4.5 AI conversations
- Letta 3-tier memory with ChromaDB archival storage
- Supabase PostgreSQL backend (13 tables, 18 API endpoints)
- Clerk authentication with role-based access

### Ethical Design

**Patient Interface** (`/patient`): Voice-first companion, NO cognitive scores shown. Patient controls what caregivers see via privacy toggles.

**Caregiver Dashboard** (`/dashboard.html`): Monitoring analytics with consent notifications. All AI decisions show transparent explanations. Be honest about surveillance, don't euphemize it.

---

## Tech Stack

**Frontend**: Next.js 16 • React 19 • TypeScript • Tailwind CSS • Radix UI
**Backend**: Supabase PostgreSQL • Prisma ORM • Clerk Auth • 18 API endpoints
**AI**: Claude Haiku 4.5 (responses) • Letta (memory) • ChromaDB (archival) • Deepgram (voice) • Groq Kimi K2 (planned)
**Testing**: Vitest with 37+ tests (real APIs, no mocks)

---

## Getting Started

```bash
# Prerequisites: Node.js 18+, Supabase CLI (brew install supabase/tap/supabase)

git clone https://github.com/yourusername/memora.git
cd memora
npm install
supabase start                  # Start local PostgreSQL
cp .env.example .env            # Fill in API keys
npx prisma db push              # Apply schema
npm run dev                     # Start dev server
# Open http://localhost:3000

# Run tests (37+ tests, real APIs)
npx vitest run
```

**Key Routes**:
- `/` - Landing page
- `/patient` - Voice interface (React)
- `/dashboard.html` - Caregiver dashboard (static HTML with client-side routing)
- `/sign-in`, `/sign-up`, `/onboarding` - Auth flow

## Architecture

**Hybrid System**:
- Static HTML: Landing + caregiver dashboard (`public/*.html` with client-side JS routing)
- Next.js: Patient voice interface (`/patient`), auth pages, API routes
- Dashboard uses `scale(0.8)` transform → all full-height elements must use `125vh`

**3-Tier Memory** (Letta + ChromaDB):
- Core: Agent persona, patient profile, current context
- Archival: Historical conversations with semantic search (ChromaDB embeddings)
- Alerts: Wandering detection, activity patterns

**Design**: WCAG AAA compliant (7:1+ contrast), 44px+ touch targets, voice-first interaction

See `CLAUDE.md` for detailed architecture documentation.

---

## Current Limitations

- **Groq**: Not yet integrated (env var exists but unused)
- **LiveKit**: Token endpoint ready but voice UI doesn't use it yet
- **Dashboard pages**: Only Overview and Voice Chat have real content; Timeline, Insights, Settings are placeholders
- **Mock data**: `data/mock-data.ts` still used in `dashboard.html` (NOT in voice interface or APIs)

---

## License

MIT License

---

Built with care at **Cal Hacks 12.0**
