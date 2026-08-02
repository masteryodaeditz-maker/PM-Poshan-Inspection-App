-- Cleanup migration: removes fields that were never actually collected by
-- the inspection form and were silently hardcoded ("meal_served" always
-- 'yes', "expected_student_count" always 120), which in turn corrupted
-- schools.enrolled_students and schools.compliance_rate on every submission.
--
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run even if some of these columns/values don't exist — every
-- statement below is defensive (IF EXISTS / OR REPLACE).
--
-- Run this AFTER deploying the updated frontend code and AFTER re-running
-- the updated submit_inspection() function from schema.sql (or just run
-- the whole schema.sql again — every statement in it is idempotent).

-- 1. Drop the fake/hardcoded columns from inspections.
alter table inspections drop column if exists meal_served;
alter table inspections drop column if exists expected_student_count;

-- 1b. Drop issue_category too — same pattern (declared, submitted, but no
--     form input anywhere ever set it, so every row has this as null).
alter table inspections drop column if exists issue_category;

-- 2. Drop the corrupted derived columns from schools. These were fed
--    entirely by the hardcoded values above, so every existing row's
--    enrolled_students (frozen at 120) and compliance_rate (frozen at
--    100%) is fabricated data, not a real historical record worth keeping.
alter table schools drop column if exists enrolled_students;
alter table schools drop column if exists compliance_rate;

-- 3. Re-point submit_inspection() at the cleaned-up schema. This is the
--    exact same function now defined in schema.sql — included here too so
--    this file can be run standalone without re-running the whole schema.
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
    aadhaar_boys, aadhaar_girls, photo_path, latitude, longitude, remarks,
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
    payload->>'photo_path', payload->>'latitude', payload->>'longitude', payload->>'remarks',
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
