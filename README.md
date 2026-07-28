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

The Dashboard (and School Directory inside it) is password-protected.

- **Default password:** `PMPoshan@EKH2026`
- To change it, see the instructions at the top of `src/utils/auth.ts` — you paste in a new SHA-256 hash, the plain password is never stored in the code.
- This is a client-side lock only (no backend yet), so treat it as a deterrent against casual snooping, not a substitute for real authentication. Ask if you want this moved to a real backend (e.g. Firebase Auth) before going live.

## What changed from the original AI Studio draft

- Top navigation now only shows **Inspect Form** and **Dashboard** — School Directory moved inside the password-protected Dashboard.
- Removed the public "X Today" counter that was visible without logging in.
- Removed all mock/seed data — the app now starts empty and the School Directory is built automatically from real submitted inspections.
- Removed a stock "example photo" picker in the Evidence step that let inspectors submit a fake photo instead of real evidence.
- Dashboard KPI cards and block compliance bars now only reflect real data (no more random placeholder percentages).
- Added photo export: a **Download** button per record, a download option in the photo preview, and an **Export Photos** button that zips every currently-visible photo (organized by block/school/date) for your weekly report.
- "Reset to seed data" replaced with a **Clear All Data** action that asks for confirmation first.

