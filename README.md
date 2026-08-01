<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# PM Poshan Inspection App — East Khasi Hills

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/48fd05ee-aaad-447a-867c-7b8c35fcf461

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (only needed if you use AI features — not required for the inspection/dashboard flow)
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

## What changed from the original AI Studio draft

- Top navigation now only shows **Inspect Form** and **Dashboard** — School Directory moved inside the password-protected Dashboard.
- Removed the public "X Today" counter that was visible without logging in.
- Removed all mock/seed data — the app now starts empty and the School Directory is built automatically from real submitted inspections.
- Removed a stock "example photo" picker in the Evidence step that let inspectors submit a fake photo instead of real evidence.
- Dashboard KPI cards and block compliance bars now only reflect real data (no more random placeholder percentages).
- Added photo export: a **Download** button per record, a download option in the photo preview, and an **Export Photos** button that zips every currently-visible photo (organized by block/school/date) for your weekly report.
- "Reset to seed data" replaced with a **Clear All Data** action that asks for confirmation first.

