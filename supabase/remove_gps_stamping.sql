-- Removes the GPS/location fields from the inspections table.
--
-- Why: the app used to stamp raw device GPS coordinates (with a hardcoded
-- fallback location when the real GPS reading failed or timed out) onto
-- inspection photos and store them alongside the record. That made photos
-- look like verified location evidence even when the coordinates were
-- fake/fallback data. The app no longer captures, transmits, stores, or
-- stamps any location data at all — inspectors instead get example
-- reference photos to guide what a useful evidence photo looks like.
--
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run even if a column has already been dropped (IF EXISTS).

alter table inspections drop column if exists latitude;
alter table inspections drop column if exists longitude;

-- Re-point submit_inspection() at the new column set so it no longer tries
-- to insert into latitude/longitude (which no longer exist). This
-- create-or-replace supersedes the version shipped in
-- cleanup_fake_meal_and_enrollment_fields.sql — that file is left as a
-- historical record and should not be re-run after this one.
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
