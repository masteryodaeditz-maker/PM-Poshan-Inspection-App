-- PM Poshan Inspection App — Milestone 2 schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> Run

-- 1. Inspections table (mirrors src/types.ts InspectionRecord)
create table if not exists inspections (
  id text primary key,
  created_at timestamptz not null default now(),
  block text not null,
  school_name text not null,
  school_category text not null,
  management_type text,
  meal_served text not null,
  student_count int not null default 0,
  expected_student_count int not null default 0,
  attendance_boys int,
  attendance_girls int,
  aadhaar_boys int,
  aadhaar_girls int,
  photo_path text,          -- path inside the storage bucket, not a public URL
  latitude text,
  longitude text,
  remarks text,
  issue_category text,
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
  enrolled_students int not null default 0,
  last_inspected timestamptz,
  compliance_rate int not null default 0,
  headmaster_contact text,
  unique (name)
);

-- 3. Row Level Security
-- This app currently gates the Dashboard with a client-side password only (no real user
-- accounts), matching the existing security model described in the README. These policies
-- allow the anon (public) key to read/write, same trust level as the current localStorage
-- version. If you add real auth later (Milestone 3+), tighten these to auth.uid()-based checks.
alter table inspections enable row level security;
alter table schools enable row level security;

drop policy if exists "anon full access inspections" on inspections;
create policy "anon full access inspections" on inspections
  for all using (true) with check (true);

drop policy if exists "anon full access schools" on schools;
create policy "anon full access schools" on schools
  for all using (true) with check (true);

-- 4. Storage bucket for inspection photos (private; the app generates signed URLs to view/download)
insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;

drop policy if exists "anon full access inspection photos" on storage.objects;
create policy "anon full access inspection photos" on storage.objects
  for all using (bucket_id = 'inspection-photos') with check (bucket_id = 'inspection-photos');
