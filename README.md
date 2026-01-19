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

### Vercel Deployment (Recommended)

#### Step 1: Prepare Repository
1. Ensure your code is committed to a GitHub repository
2. Make sure `.env.local` is in your `.gitignore` (it should be by default)

#### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"New Project"**
3. Import your tournament app repository
4. Vercel will auto-detect it as a Next.js project
5. Click **"Deploy"** (initial deployment will fail due to missing environment variables)

#### Step 3: Configure Environment Variables
1. In your Vercel dashboard, go to your project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - **Variable Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase project URL (from Supabase dashboard → Settings → API)
   - **Variable Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - **Value**: Your Supabase anon/public key (from Supabase dashboard → Settings → API)
4. Set environment for: **Production**, **Preview**, and **Development**
5. Click **"Save"**

#### Step 4: Redeploy
1. Go to **Deployments** tab in your Vercel project
2. Click the **three dots** on the latest deployment → **"Redeploy"**
3. Your app should now deploy successfully

#### Step 5: Set Up Custom Domain (Optional)
1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

### Production Database Setup

#### Important: Use Production Supabase Project
1. Create a **separate Supabase project** for production (don't use your development database)
2. In your production Supabase project, go to **SQL Editor**
3. Run the migration to create tables:
   ```sql
   -- Copy and paste the contents of supabase/migrations/20250119000001_create_tables.sql
   ```
4. Verify tables are created in **Table Editor**

#### Security Configuration
1. In Supabase dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel domain to **Site URL** and **Redirect URLs**
3. In **Settings** → **API**, ensure **Row Level Security** is configured if needed

### Deployment Verification

After successful deployment:
1. Visit your Vercel URL to see the public leaderboard
2. Navigate to `/admin` to access the admin interface
3. Test adding participants and rounds
4. Verify score entry functionality
5. Check that the PWA manifest works (try "Add to Home Screen" on mobile)

### Environment Variables Reference

```bash
# Required for production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Troubleshooting Deployment

**Build fails:**
- Check that all dependencies are in `package.json`
- Verify TypeScript errors with `npm run build` locally

**Environment variables not working:**
- Ensure variable names start with `NEXT_PUBLIC_`
- Redeploy after adding/changing environment variables
- Check Vercel function logs for detailed errors

**Database connection issues:**
- Verify Supabase URL and key are correct
- Ensure production database has tables created via migration
- Check Supabase project status and billing

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
