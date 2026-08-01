-- One-time cleanup: removes the delete-password system that's no longer used
-- now that the delete feature has been removed from the app. Run this ONCE in
-- Supabase's SQL Editor. Safe to run even if some of these already don't
-- exist (IF EXISTS handles that).

drop function if exists public.admin_clear_all_data(text);
drop function if exists public.admin_clear_data_range(date, date, text);
drop function if exists public.admin_verify_delete_password(text);
drop function if exists public.verify_delete_password(text);
drop table if exists public.security_settings;

-- Note: this does NOT remove the pgcrypto extension itself, since other
-- things in a Postgres database can reasonably use it — dropping an
-- extension is a more invasive action than this cleanup calls for, and
-- leaving it enabled has no security downside.
