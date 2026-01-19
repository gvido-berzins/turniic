# TURNIIC - Tournament Scoring Web App

A production-ready tournament scoring web application built with Next.js and Supabase.

## Features

- **Public Leaderboard** (`/`) - View tournament standings with total points and tie-breaking
- **Participant Details** (`/p/[id]`) - View individual participant's round-by-round scores
- **Admin Interface** (`/admin`) - Mobile-first PWA for tournament management
  - Manage participants (`/admin/participants`)
  - Manage rounds (`/admin/rounds`) 
  - Enter scores (`/admin/scores/[roundId]`)
- **PWA Support** - Add to home screen functionality for mobile admin
- **No Authentication** - Open access with admin via hidden URL

## Tech Stack

- Next.js 15 (TypeScript, App Router)
- Supabase (PostgreSQL database)
- Tailwind CSS (Styling)
- Zod (Validation)
- PWA (Progressive Web App)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account and project

### 2. Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. Database Setup

1. In your Supabase project dashboard, go to the SQL Editor
2. Run the migration file to create the database schema:
   ```sql
   -- Copy and paste the contents of supabase/migrations/20250119000001_create_tables.sql
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at:
- Public leaderboard: http://localhost:3000
- Admin interface: http://localhost:3000/admin

### 6. Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel Deployment

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Database Migration

Run the SQL migration in your production Supabase project:
```sql
-- Execute the contents of supabase/migrations/20250119000001_create_tables.sql
```

## Usage

### Admin Workflow

1. Navigate to `/admin` (bookmark this URL on mobile devices)
2. Add participants in **Participants** section
3. Create tournament rounds in **Rounds** section
4. Enter scores for each round using the **Scores** button next to each round
5. View live leaderboard at the root URL

### PWA Installation

On mobile devices:
1. Navigate to `/admin`
2. Use browser's "Add to Home Screen" feature
3. Access admin functions directly from home screen

### Scoring

- Scores are entered per round for all participants
- Leaderboard sorts by total points (descending)
- Tie-breaker: highest latest-round points, then alphabetical by name
- Real-time updates across all users

## Project Structure

```
src/
├── app/
│   ├── admin/                 # Admin interface pages
│   │   ├── participants/      # Participant management
│   │   ├── rounds/           # Round management  
│   │   └── scores/[roundId]/ # Score entry
│   ├── p/[id]/               # Participant detail pages
│   ├── layout.tsx            # Root layout with PWA setup
│   └── page.tsx              # Public leaderboard
├── lib/
│   ├── schemas.ts            # Zod validation schemas
│   └── supabase.ts           # Supabase client config
public/
├── manifest.json             # PWA manifest
├── sw.js                     # Service worker
└── icon-*.png               # PWA icons (placeholders)
supabase/
└── migrations/               # Database schema
```

## Database Schema

- **participants**: `id`, `name`, `created_at`
- **rounds**: `id`, `name`, `round_number`, `created_at`  
- **scores**: `id`, `participant_id`, `round_id`, `points`, `created_at`, `updated_at`

Constraints:
- Unique constraint on `(participant_id, round_id)` in scores table
- Foreign key relationships with cascade deletes
- Automatic `updated_at` triggers

## Color Scheme

- White background (`#ffffff`)
- Black text (`#000000`)
- Red accents (`#dc2626`) for buttons, headers, links

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks (if available)
```

## License

This project is built for tournament scoring with no authentication requirements.
