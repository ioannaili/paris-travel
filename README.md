# Paris Trip Planner - Step 1

Backend foundation using Next.js App Router, TypeScript, and Supabase.

## What is included

- Supabase auth (login only, no signup page)
- Session-based login with persistent auth cookies
- Protected API routes
- Database schema SQL
- Minimal `/login` and `/dashboard` pages

## Environment setup

1. Copy `.env.example` to `.env.local`
2. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database setup (Supabase SQL editor)

Run `supabase/schema.sql`.

This creates:
- `users`
- `activities`
- `votes`
- `programs`

Also includes:
- vote enum (`yes`, `maybe`, `no`)
- unique vote per user/activity
- foreign keys
- row-level security policies

## Auth model

- Accounts are created manually in Supabase Auth
- Users log in at `/login` with email/password
- On success they are redirected to `/dashboard`
- `/dashboard` greets by `users.name` (fallback: email prefix)

## API routes

- `GET /api/user` - logged user
- `GET /api/activities` - list activities
- `POST /api/activity` - create activity
- `POST /api/vote` - create/update current user's vote
- `GET /api/votes` - list votes

All API routes require an authenticated session.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
