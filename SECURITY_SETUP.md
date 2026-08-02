# Security Setup — Real Auth (Milestone 3)

This replaces the fake client-side password with real Supabase Auth. Nothing
goes live until you do the steps below in your own Supabase project — I don't
have your project credentials, so I can't do this part for you.

## 1. Create the two accounts in Supabase

Go to your Supabase project → **Authentication → Users → Add user** → "Create new user".
Create both of these (use "Auto Confirm User" so no email verification is needed):

| Role    | Email                          | Password        |
|---------|---------------------------------|------------------|
| Officer | `officer@pmposhan.internal`     | pick a strong password — this is what all field officers will type in the app |
| Admin   | your admin's real email address | pick a strong, unique password not used anywhere else |

After creating each user, **copy their User UID** (shown in the Users table) — you need it for step 3.

⚠️ **Do not write real passwords in this file, in chat, in commit messages, or
anywhere else this project gets shared.** Set both passwords directly in the
Supabase dashboard (Authentication → Users → Add user), store them in a
password manager, and never paste them back into a doc like this one.

**If an admin password was ever written down in this file, in chat, or in a
commit in this project's history, treat it as compromised: rotate it now**
(Authentication → Users → click the user → Reset password), and scrub the old
value from `git log` or any shared chat history if you can.

## 2. Run the new schema

Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`
(the new version, already updated in your project files), and run it. This:
- Rewrites all RLS policies to check real login state instead of `using (true)`
- Adds the `profiles` table (role lookup)
- Adds the `admin_clear_all_data()` / `admin_clear_data_range()` functions the delete buttons now call

Safe to re-run if you ever tweak it — everything uses `create or replace` / `if not exists`.

## 3. Assign roles

Still in the SQL Editor, run this (replace the UIDs with the ones you copied in step 1):

```sql
insert into profiles (id, role) values
  ('OFFICER-USER-UID-HERE', 'officer'),
  ('ADMIN-USER-UID-HERE', 'admin');
```

Without this step, both accounts can log in but the app will treat them as
having no role (RLS will reject everything).

## 4. Deploy the updated code

No new environment variables needed — same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
as before. Just deploy the updated `src/` folder as usual.

## 5. Test before trusting it

- Open the app in an incognito window → you should see the new login screen, not the form.
- Log in as **Officer** → you should be able to submit an inspection, but there should be
  no "Dashboard" tab anywhere.
- Log in as **Admin** → you should see the Dashboard with all data, and the delete/clear
  buttons should work.
- Open dev tools → Network tab while logged in as Officer → confirm you don't see any
  inspection list data being fetched (only your own submission going out).
- Try logging out and directly hitting the site — confirm the form doesn't flash any data
  before the login screen appears.

## 6. Remove the now-unused delete-password system

The bulk-delete feature has been removed from the app (deletion now happens
directly in Supabase's own dashboard instead). Run `supabase/cleanup_delete_password.sql`
once in **SQL Editor → New query** to remove the now-unused functions and password
table that powered the old delete feature — safe to run, they're not referenced
by anything anymore.

## What changed, in one line each

- **Critical fix (earlier round)**: `verify_delete_password` had no login check of its own and Postgres grants function access to everyone by default — anyone, with no login at all, could have called it directly to brute-force the delete password from outside the app. This whole system has since been removed entirely along with the delete feature itself.
- Added `vercel.json` with security headers (clickjacking protection, MIME-sniffing protection) — didn't touch camera/GPS permissions since the app needs those
- Bulk delete removed from the app UI and database entirely — data deletion now only happens directly in Supabase's dashboard, by whoever has access to that

- Fake SHA-256 password → real Supabase Auth session (server-verified, not crackable from the JS bundle)
- `using (true)` RLS on every table → policies that check your actual role via `auth.uid()`
- Data fetched on page load regardless of login → data only fetched after a real admin session exists
