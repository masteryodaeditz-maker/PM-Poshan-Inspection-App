-- PM Poshan Inspection App — Milestone 3 schema (real auth + locked-down RLS)
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> Run
--
-- This replaces the old "anon full access / using (true)" policies with real
-- Supabase Auth checks. Before running this, read SECURITY_SETUP.md — you need
-- to create two Supabase Auth users first (one officer, one admin) or the app
-- will have nobody who can log in.

-- 1. Inspections table (mirrors src/types.ts InspectionRecord)
create table if not exists inspections (
  id text primary key,
  created_at timestamptz not null default now(),
  block text not null,
  school_name text not null,
  school_category text not null,
  management_type text,
  student_count int not null default 0,
  attendance_boys int,
  attendance_girls int,
  aadhaar_boys int,
  aadhaar_girls int,
  photo_path text,          -- path inside the storage bucket, not a public URL
  remarks text,
  inspector_name text,
  meals_served_all_five_days text,
  missed_meal_days_count int,
  missed_meal_days_reason text,

  -- Facilities checklist
  kitchen_shed text,
  kitchen_shed_reason text,
  foodgrains_delivered text,
  foodgrains_reported_sdseo text,
  foodgrains_no_report_reason text,
  water_supply text,
  water_supply_reason text,
  kitchen_garden text,
  kitchen_garden_type text,
  kitchen_garden_reason text,

  -- Reporting compliance
  monthly_form_month text,
  utilization_cert_month text,
  submitted_sdseo text,
  sdseo_non_submission_reason text,
  meghsims_daily text,
  meghsims_no_reason text
);

create index if not exists inspections_school_name_idx on inspections (school_name);
create index if not exists inspections_block_idx on inspections (block);
create index if not exists inspections_created_at_idx on inspections (created_at desc);

-- 2. Schools directory (kept as a real table so multiple inspectors share it live)
create table if not exists schools (
  id text primary key,
  name text not null,
  block text not null,
  category text not null,
  last_inspected timestamptz,
  headmaster_contact text,
  unique (name)
);

-- 2b. Export log — tracks every CSV/photo export so the Dashboard can show
-- "last exported" per week and avoid duplicate/forgotten exports.
create table if not exists export_log (
  id text primary key,
  export_type text not null check (export_type in ('csv', 'xlsx', 'photos')),
  exported_at timestamptz not null default now(),
  range_start date,
  range_end date,
  record_count int not null default 0
);

create index if not exists export_log_exported_at_idx on export_log (exported_at desc);

-- 3. Profiles — links a Supabase Auth user to a role. Created manually for the
-- two seed accounts (see SECURITY_SETUP.md); no public sign-up flow exists.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('officer', 'admin')),
  created_at timestamptz not null default now()
);

-- Helper functions used inside RLS policies. security definer + fixed search_path
-- so they can read `profiles` regardless of the caller's own row-level access.
create or replace function public.current_role_is(required_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = required_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role_is('admin');
$$;

create or replace function public.is_officer_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('officer', 'admin')
  );
$$;

-- 4. Row Level Security — real checks now, not using (true).
alter table inspections enable row level security;
alter table schools enable row level security;
alter table export_log enable row level security;
alter table profiles enable row level security;

-- inspections: officers + admin can read and submit; only admin can edit/delete rows directly
-- (bulk deletes go through the admin_* functions below, not raw DELETE, but we still
-- restrict direct DELETE/UPDATE to admin as defense in depth).
drop policy if exists "anon full access inspections" on inspections;
drop policy if exists "read inspections" on inspections;
drop policy if exists "insert inspections" on inspections;
drop policy if exists "update inspections" on inspections;
drop policy if exists "delete inspections" on inspections;

create policy "read inspections" on inspections
  for select using (public.is_admin());
create policy "insert inspections" on inspections
  for insert with check (public.is_admin());
create policy "update inspections" on inspections
  for update using (public.is_admin()) with check (public.is_admin());
create policy "delete inspections" on inspections
  for delete using (public.is_admin());

-- schools: admin only. Officers never touch this table directly — submission
-- (including the schools upsert) goes through submit_inspection() below, and
-- the school-name autocomplete goes through list_schools_directory() below,
-- both security-definer functions that expose only what's needed.
drop policy if exists "anon full access schools" on schools;
drop policy if exists "read schools" on schools;
drop policy if exists "write schools" on schools;
drop policy if exists "update schools" on schools;
drop policy if exists "delete schools" on schools;

create policy "read schools" on schools
  for select using (public.is_admin());
create policy "write schools" on schools
  for insert with check (public.is_admin());
create policy "update schools" on schools
  for update using (public.is_admin()) with check (public.is_admin());
create policy "delete schools" on schools
  for delete using (public.is_admin());

-- export_log: admin only (it's a Dashboard/export feature, officers never touch it)
drop policy if exists "anon full access export_log" on export_log;
drop policy if exists "admin all export_log" on export_log;
create policy "admin all export_log" on export_log
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: a user can read their own row (needed so the frontend can find out its
-- own role after login); nobody can self-assign a role via the client.
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles
  for select using (id = auth.uid());

-- 5. Storage bucket for inspection photos (private; the app generates signed URLs to view/download)
-- file_size_limit / allowed_mime_types are enforced by Postgres itself, not just the
-- browser — the frontend already compresses photos to JPEG under ~1280px before upload,
-- but without these, someone with valid officer credentials calling the Storage API
-- directly (Postman/curl, bypassing the app) could otherwise upload any file type/size.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon full access inspection photos" on storage.objects;
drop policy if exists "officer upload photos" on storage.objects;
drop policy if exists "admin read photos" on storage.objects;
drop policy if exists "admin delete photos" on storage.objects;

-- officers/admin can upload new photos during submission
create policy "officer upload photos" on storage.objects
  for insert with check (bucket_id = 'inspection-photos' and public.is_officer_or_admin());
-- only admin can read (generate signed URLs) or delete photos — officers never see the Dashboard
create policy "admin read photos" on storage.objects
  for select using (bucket_id = 'inspection-photos' and public.is_admin());
create policy "admin delete photos" on storage.objects
  for delete using (bucket_id = 'inspection-photos' and public.is_admin());

-- 6. Submission goes through a single security-definer function. This means the
-- officer role never needs direct SELECT on `inspections` (which contains
-- remarks, attendance, issue notes — sensitive) or `schools` (which contains
-- phone numbers). Compliance-rate calculation and the schools upsert both
-- happen here, inside Postgres, using data the function itself is allowed to
-- see — the calling browser session never touches those rows directly.
create or replace function public.submit_inspection(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
  created timestamptz := now();
  v_school_name text := payload->>'school_name';
  primary_category text;
  existing_school_id text;
  new_school_id text;
begin
  if not public.is_officer_or_admin() then
    raise exception 'Not authorized';
  end if;

  new_id := 'INSP-' || to_char(created, 'HH24MISSMS');

  insert into inspections (
    id, created_at, block, school_name, school_category, management_type,
    student_count, attendance_boys, attendance_girls,
    aadhaar_boys, aadhaar_girls, photo_path, remarks,
    inspector_name, meals_served_all_five_days, missed_meal_days_count, missed_meal_days_reason,
    kitchen_shed, kitchen_shed_reason, foodgrains_delivered, foodgrains_reported_sdseo,
    foodgrains_no_report_reason, water_supply, water_supply_reason, kitchen_garden,
    kitchen_garden_type, kitchen_garden_reason, monthly_form_month, utilization_cert_month,
    submitted_sdseo, sdseo_non_submission_reason, meghsims_daily, meghsims_no_reason
  ) values (
    new_id, created, payload->>'block', v_school_name, payload->>'school_category', payload->>'management_type',
    coalesce((payload->>'student_count')::int, 0),
    (payload->>'attendance_boys')::int, (payload->>'attendance_girls')::int,
    (payload->>'aadhaar_boys')::int, (payload->>'aadhaar_girls')::int,
    payload->>'photo_path', payload->>'remarks',
    payload->>'inspector_name', payload->>'meals_served_all_five_days', (payload->>'missed_meal_days_count')::int, payload->>'missed_meal_days_reason',
    payload->>'kitchen_shed', payload->>'kitchen_shed_reason', payload->>'foodgrains_delivered', payload->>'foodgrains_reported_sdseo',
    payload->>'foodgrains_no_report_reason', payload->>'water_supply', payload->>'water_supply_reason', payload->>'kitchen_garden',
    payload->>'kitchen_garden_type', payload->>'kitchen_garden_reason', payload->>'monthly_form_month', payload->>'utilization_cert_month',
    payload->>'submitted_sdseo', payload->>'sdseo_non_submission_reason', payload->>'meghsims_daily', payload->>'meghsims_no_reason'
  );

  primary_category := trim(split_part(coalesce(payload->>'school_category', 'LP'), ',', 1));

  select id into existing_school_id from schools where schools.name ilike v_school_name limit 1;
  new_school_id := coalesce(existing_school_id, 'SCH-' || to_char(created, 'HH24MISSMS'));

  insert into schools (id, name, block, category, last_inspected)
  values (new_school_id, v_school_name, payload->>'block', primary_category, created)
  on conflict (id) do update set
    block = excluded.block,
    category = excluded.category,
    last_inspected = excluded.last_inspected;

  return jsonb_build_object('id', new_id, 'created_at', created);
end;
$$;

-- Read-only lookup used only for the school-name autocomplete on the
-- submission form. Deliberately returns none of the sensitive columns
-- (headmaster_contact, last_inspected) — just enough to
-- power a dropdown.
create or replace function public.list_schools_directory()
returns table (id text, name text, block text, category text)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.name, s.block, s.category
  from schools s
  where public.is_officer_or_admin();
$$;

-- 7. Function-level access hardening. By default Postgres grants EXECUTE on
-- every new function to PUBLIC (which anon + authenticated inherit) unless
-- explicitly revoked.
--
-- IMPORTANT: is_admin() / is_officer_or_admin() / current_role_is() are NOT
-- touched here — every RLS policy above calls them directly (e.g.
-- `using (public.is_admin())`), which means whatever role is running a query
-- (anon or authenticated) must itself retain EXECUTE on them, or every one of
-- those policy checks starts erroring instead of evaluating true/false —
-- breaking reads/writes entirely rather than protecting anything.
--
-- Entry points the app actually calls via supabase.rpc(...) — restricted to
-- logged-in sessions only (authenticated), never anonymous visitors. Neither
-- of these is referenced inside an RLS policy, so this is safe.
revoke execute on function public.submit_inspection(jsonb) from public;
grant execute on function public.submit_inspection(jsonb) to authenticated;

revoke execute on function public.list_schools_directory() from public;
grant execute on function public.list_schools_directory() to authenticated;
