---
title: TURNIIC
colors: red, white, black
theme: cards
description: Tournament scoring web app mainly for a card game tournament
security: level 0 - one time application with no risk
---

Build a production-ready tournament scoring web app with:
- Public leaderboard (no login)
- Mobile updater admin (PWA, add-to-home-screen) for adding participants, rounds/games, and entering round points for all participants
- No authentication/authorization at all (no passcodes, no device restrictions). Admin updater is simply a hidden URL.
- Each round points are viewable per participant + total points
- Leaderboard sorted by total points (descending). Tie-breaker: highest latest-round points, then alphabetical name.

Tech stack:
- Next.js (TypeScript, App Router)
- Supabase Postgres
- Tailwind CSS
- Deployable to Vercel
- Supabase JS client

Routing:
- `/` public leaderboard
- `/p/[id]` participant detail (per-round + total)
- `/admin` mobile updater (PWA). This route is not linked anywhere in the UI, only accessible if you know the URL.
- `/admin/participants` manage participants
- `/admin/rounds` manage rounds
- `/admin/scores/[roundId]` grid entry for round scores (all participants)

Data model:
- participants(id, name, created_at)
- rounds(id, name, round_number, created_at)
- scores(id, participant_id, round_id, points, created_at, updated_at)
Constraints:
- unique(participant_id, round_id) in scores
- rounds sorted by round_number

Features:
Admin (mobile-first):
- Add/edit/delete participants
- Create/edit/delete rounds
- Enter/update points for all participants in a round (grid UI with sticky name column, numeric inputs, autosave button)
- View totals per participant while editing
Public:
- Leaderboard table (responsive, fast)
- Participant detail page: list all rounds with points + total

UI/Design:
- Color scheme strictly: white background, black text, red accents
- Clean, minimal, mobile-first, large tap targets on admin PWA
- Add PWA support (manifest + icons placeholders + service worker)

Implementation details:
- Use Tailwind for styling
- Use Zod for input validation
- Use Supabase directly from the client for all reads/writes (since there is no auth requirement)
- Provide SQL migration(s) to create tables and indexes
- Provide README with setup, env vars, local dev, and deploy steps
- Provide `.env.local.example` with Supabase URL + anon key

Deliverables:
- Full Next.js project code
- Supabase SQL migrations (schema)
- README with exact commands
- Example .env.local template
