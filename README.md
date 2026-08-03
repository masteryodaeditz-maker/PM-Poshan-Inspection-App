# PM Poshan Inspection App — East Khasi Hills

School inspection logging and dashboard for PM Poshan (Mid-Day Meal) monitoring.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key (Supabase dashboard → Settings → API).
3. Run the app:
   `npm run dev`
4. Build for deployment:
   `npm run build` (output goes to `dist/`)

## Dashboard access

The Dashboard (and School Directory inside it) requires signing in as an
**admin** account. This is real server-side authentication via Supabase Auth,
enforced by Postgres Row Level Security — not a client-side password check.

- There is no public sign-up flow. Two accounts exist: a shared **Officer**
  login (submit inspections only) and an **Admin** login (full dashboard +
  export access). See `SECURITY_SETUP.md` for how to create/rotate these
  accounts in your own Supabase project.
- Never write real passwords into this README, into commit messages, or into
  chat — set them directly in the Supabase dashboard and keep them in a
  password manager.
