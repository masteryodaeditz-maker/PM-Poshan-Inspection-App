import { InspectionRecord, SchoolRecord, BlockName, SchoolCategory, ExportLogEntry, ExportType } from '../types';
import { supabase, INSPECTION_PHOTOS_BUCKET } from './supabaseClient';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours — covers a full working session / Friday export run

// ---------- DB row <-> app type mapping ----------

interface InspectionRow {
  id: string;
  created_at: string;
  block: string;
  school_name: string;
  school_category: string;
  management_type: string | null;
  meal_served: string;
  student_count: number;
  expected_student_count: number;
  attendance_boys: number | null;
  attendance_girls: number | null;
  aadhaar_boys: number | null;
  aadhaar_girls: number | null;
  photo_path: string | null;
  latitude: string | null;
  longitude: string | null;
  remarks: string | null;
  issue_category: string | null;
  inspector_name: string | null;
  meals_served_all_five_days: string | null;
  missed_meal_days_count: number | null;
  missed_meal_days_reason: string | null;
  kitchen_shed: string | null;
  kitchen_shed_reason: string | null;
  foodgrains_delivered: string | null;
  foodgrains_reported_sdseo: string | null;
  foodgrains_no_report_reason: string | null;
  water_supply: string | null;
  water_supply_reason: string | null;
  kitchen_garden: string | null;
  kitchen_garden_type: string | null;
  kitchen_garden_reason: string | null;
  monthly_form_month: string | null;
  utilization_cert_month: string | null;
  submitted_sdseo: string | null;
  sdseo_non_submission_reason: string | null;
  meghsims_daily: string | null;
  meghsims_no_reason: string | null;
}

function rowToRecord(row: InspectionRow, photoUrl?: string): InspectionRecord {
  return {
    id: row.id,
    timestamp: row.created_at,
    block: row.block as BlockName,
    schoolName: row.school_name,
    schoolCategory: row.school_category as SchoolCategory,
    managementType: row.management_type ?? undefined,
    mealServed: row.meal_served as 'yes' | 'no',
    studentCount: row.student_count,
    expectedStudentCount: row.expected_student_count,
    attendanceBoys: row.attendance_boys ?? undefined,
    attendanceGirls: row.attendance_girls ?? undefined,
    aadhaarBoys: row.aadhaar_boys ?? undefined,
    aadhaarGirls: row.aadhaar_girls ?? undefined,
    photoUrl,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    remarks: row.remarks ?? undefined,
    issueCategory: (row.issue_category as InspectionRecord['issueCategory']) ?? undefined,
    inspectorName: row.inspector_name ?? undefined,
    mealsServedAllFiveDays: (row.meals_served_all_five_days as 'yes' | 'no') ?? undefined,
    missedMealDaysCount: row.missed_meal_days_count ?? undefined,
    missedMealDaysReason: row.missed_meal_days_reason ?? undefined,
    kitchenShed: (row.kitchen_shed as 'yes' | 'no') ?? undefined,
    kitchenShedReason: row.kitchen_shed_reason ?? undefined,
    foodgrainsDelivered: (row.foodgrains_delivered as 'yes' | 'no') ?? undefined,
    foodgrainsReportedSDSEO: (row.foodgrains_reported_sdseo as 'yes' | 'no') ?? undefined,
    foodgrainsNoReportReason: row.foodgrains_no_report_reason ?? undefined,
    waterSupply: (row.water_supply as 'yes' | 'no') ?? undefined,
    waterSupplyReason: row.water_supply_reason ?? undefined,
    kitchenGarden: (row.kitchen_garden as 'yes' | 'no') ?? undefined,
    kitchenGardenType: row.kitchen_garden_type ?? undefined,
    kitchenGardenReason: row.kitchen_garden_reason ?? undefined,
    monthlyFormMonth: row.monthly_form_month ?? undefined,
    utilizationCertMonth: row.utilization_cert_month ?? undefined,
    submittedSDSEO: (row.submitted_sdseo as 'yes' | 'no') ?? undefined,
    sdseoNonSubmissionReason: row.sdseo_non_submission_reason ?? undefined,
    meghSimsDaily: (row.meghsims_daily as 'yes' | 'no') ?? undefined,
    meghSimsNoReason: row.meghsims_no_reason ?? undefined,
  };
}

function recordToRow(record: Omit<InspectionRecord, 'id' | 'timestamp'>, id: string, createdAt: string, photoPath: string | null) {
  return {
    id,
    created_at: createdAt,
    block: record.block,
    school_name: record.schoolName,
    school_category: record.schoolCategory,
    management_type: record.managementType ?? null,
    meal_served: record.mealServed,
    student_count: record.studentCount,
    expected_student_count: record.expectedStudentCount,
    attendance_boys: record.attendanceBoys ?? null,
    attendance_girls: record.attendanceGirls ?? null,
    aadhaar_boys: record.aadhaarBoys ?? null,
    aadhaar_girls: record.aadhaarGirls ?? null,
    photo_path: photoPath,
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    remarks: record.remarks ?? null,
    issue_category: record.issueCategory ?? null,
    inspector_name: record.inspectorName ?? null,
    meals_served_all_five_days: record.mealsServedAllFiveDays ?? null,
    missed_meal_days_count: record.missedMealDaysCount ?? null,
    missed_meal_days_reason: record.missedMealDaysReason ?? null,
    kitchen_shed: record.kitchenShed ?? null,
    kitchen_shed_reason: record.kitchenShedReason ?? null,
    foodgrains_delivered: record.foodgrainsDelivered ?? null,
    foodgrains_reported_sdseo: record.foodgrainsReportedSDSEO ?? null,
    foodgrains_no_report_reason: record.foodgrainsNoReportReason ?? null,
    water_supply: record.waterSupply ?? null,
    water_supply_reason: record.waterSupplyReason ?? null,
    kitchen_garden: record.kitchenGarden ?? null,
    kitchen_garden_type: record.kitchenGardenType ?? null,
    kitchen_garden_reason: record.kitchenGardenReason ?? null,
    monthly_form_month: record.monthlyFormMonth ?? null,
    utilization_cert_month: record.utilizationCertMonth ?? null,
    submitted_sdseo: record.submittedSDSEO ?? null,
    sdseo_non_submission_reason: record.sdseoNonSubmissionReason ?? null,
    meghsims_daily: record.meghSimsDaily ?? null,
    meghsims_no_reason: record.meghSimsNoReason ?? null,
  };
}

// ---------- Photo helpers ----------

function safeFileSegment(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'photo';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Downscale + re-encode a photo (data URL from the camera/gallery input) before it ever
// leaves the device, so a weekly batch of inspection photos doesn't burn through storage
// or mobile data. Keeps things under ~1280px on the long edge, JPEG quality 0.72.
export function compressPhotoDataUrl(dataUrl: string, maxDimension = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl); // fall back to original rather than failing the whole submit
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not load photo for compression'));
    img.src = dataUrl;
  });
}

async function uploadPhoto(dataUrl: string, block: string, schoolName: string): Promise<string> {
  const compressed = await compressPhotoDataUrl(dataUrl);
  const blob = dataUrlToBlob(compressed);
  const path = `${safeFileSegment(block)}/${safeFileSegment(schoolName)}_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(INSPECTION_PHOTOS_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) { console.error('Photo upload failed', error); throw new Error('Could not upload photo. Please try again.'); }
  return path;
}

async function signedUrlsForPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data, error } = await supabase.storage
    .from(INSPECTION_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error('Error creating signed URLs', error);
    return map;
  }
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  });
  return map;
}

// ---------- Inspections ----------

export async function getInspections(): Promise<InspectionRecord[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inspections', error);
    return [];
  }

  const rows = (data || []) as InspectionRow[];
  const photoPaths = rows.filter((r) => r.photo_path).map((r) => r.photo_path as string);
  const urlMap = await signedUrlsForPaths(photoPaths);

  return rows.map((row) => rowToRecord(row, row.photo_path ? urlMap.get(row.photo_path) : undefined));
}

export async function saveInspection(newRecord: Omit<InspectionRecord, 'id' | 'timestamp'>): Promise<InspectionRecord> {
  const id = `INSP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
  const createdAt = new Date().toISOString();

  let photoPath: string | null = null;
  if (newRecord.photoUrl) {
    photoPath = await uploadPhoto(newRecord.photoUrl, newRecord.block, newRecord.schoolName);
  }

  const row = recordToRow(newRecord, id, createdAt, photoPath);
  const { error } = await supabase.from('inspections').insert(row);
  if (error) { console.error('Could not save inspection', error); throw new Error('Could not save inspection. Please check your connection and try again.'); }

  const photoUrl = photoPath ? (await signedUrlsForPaths([photoPath])).get(photoPath) : undefined;
  const record = rowToRecord(row as unknown as InspectionRow, photoUrl);

  await upsertSchoolFromInspection(record);

  return record;
}

async function upsertSchoolFromInspection(record: InspectionRecord) {
  const { data: history, error: historyError } = await supabase
    .from('inspections')
    .select('meal_served')
    .ilike('school_name', record.schoolName);

  if (historyError) {
    console.error('Error computing compliance rate', historyError);
  }

  const servedCount = (history || []).filter((h) => h.meal_served === 'yes').length;
  const total = (history || []).length || 1;
  const complianceRate = Math.round((servedCount / total) * 100);
  const primaryCategory = (record.schoolCategory.split(',')[0].trim() || 'LP') as SchoolRecord['category'];

  const { data: existing } = await supabase
    .from('schools')
    .select('id')
    .ilike('name', record.schoolName)
    .maybeSingle();

  const schoolRow = {
    id: existing?.id || `SCH-${Date.now().toString().slice(-6)}`,
    name: record.schoolName,
    block: record.block,
    category: primaryCategory,
    enrolled_students: record.expectedStudentCount || 0,
    last_inspected: record.timestamp,
    compliance_rate: complianceRate,
  };

  const { error } = await supabase.from('schools').upsert(schoolRow, { onConflict: 'id' });
  if (error) console.error('Error upserting school', error);
}

export async function getSchools(): Promise<SchoolRecord[]> {
  const { data, error } = await supabase.from('schools').select('*').order('name');
  if (error) {
    console.error('Error fetching schools', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    block: row.block as BlockName,
    category: row.category as SchoolCategory,
    enrolledStudents: row.enrolled_students,
    lastInspected: row.last_inspected ?? undefined,
    complianceRate: row.compliance_rate,
    headmasterContact: row.headmaster_contact ?? undefined,
  }));
}

// ---------- CSV export (unchanged shape, extended columns) ----------

export function exportInspectionsCSV(inspections: InspectionRecord[], rangeLabel?: { start: string | null; end: string | null }) {
  const headers = [
    'ID', 'Timestamp', 'Block', 'School Name', 'Category', 'Management Type',
    'Meal Served', 'Students Served', 'Boys', 'Girls', 'Aadhaar Boys', 'Aadhaar Girls',
    'Latitude', 'Longitude', 'Issue Category', 'Remarks', 'Inspector',
    'Meals Served All 5 Working Days', 'Days Missed', 'Reason for Missed Days',
    'Kitchen Shed', 'Kitchen Shed Reason', 'Foodgrains Delivered', 'Foodgrains Reported to SDSEO',
    'Foodgrains No-Report Reason', 'Water Supply', 'Water Supply Reason',
    'Kitchen Garden', 'Kitchen Garden Type', 'Kitchen Garden Reason',
    'Monthly Form Month', 'UC Month', 'SDSEO Submitted', 'SDSEO Non-Submission Reason',
    'MeghSIMS Daily', 'MeghSIMS No Reason'
  ];
  const rows = inspections.map(i => [
    i.id,
    new Date(i.timestamp).toLocaleString(),
    `"${i.block}"`,
    `"${i.schoolName}"`,
    i.schoolCategory,
    `"${i.managementType || ''}"`,
    i.mealServed === 'yes' ? 'Served' : 'Missed',
    i.studentCount,
    i.attendanceBoys ?? '',
    i.attendanceGirls ?? '',
    i.aadhaarBoys ?? '',
    i.aadhaarGirls ?? '',
    i.latitude || '',
    i.longitude || '',
    `"${i.issueCategory || ''}"`,
    `"${(i.remarks || '').replace(/"/g, '""')}"`,
    `"${i.inspectorName || ''}"`,
    i.mealsServedAllFiveDays === 'yes' ? 'Yes' : (i.mealsServedAllFiveDays === 'no' ? 'No' : ''),
    i.missedMealDaysCount ?? '',
    `"${(i.missedMealDaysReason || '').replace(/"/g, '""')}"`,
    i.kitchenShed || '',
    `"${(i.kitchenShedReason || '').replace(/"/g, '""')}"`,
    i.foodgrainsDelivered || '',
    i.foodgrainsReportedSDSEO || '',
    `"${(i.foodgrainsNoReportReason || '').replace(/"/g, '""')}"`,
    i.waterSupply || '',
    `"${(i.waterSupplyReason || '').replace(/"/g, '""')}"`,
    i.kitchenGarden || '',
    `"${i.kitchenGardenType || ''}"`,
    `"${(i.kitchenGardenReason || '').replace(/"/g, '""')}"`,
    i.monthlyFormMonth || '',
    i.utilizationCertMonth || '',
    i.submittedSDSEO || '',
    `"${(i.sdseoNonSubmissionReason || '').replace(/"/g, '""')}"`,
    i.meghSimsDaily || '',
    `"${(i.meghSimsNoReason || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const filenameDateSuffix = rangeLabel && (rangeLabel.start || rangeLabel.end)
    ? `${rangeLabel.start || 'start'}_to_${rangeLabel.end || 'now'}`
    : new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `PM_Poshan_Inspections_${filenameDateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logExport('csv', rangeLabel?.start ?? null, rangeLabel?.end ?? null, inspections.length).catch(e => console.error('Could not log export', e));
}

// ---------- Clear all data (Supabase-backed) ----------

export async function clearAllData(deletePassword: string) {
  const confirmed = window.confirm(
    'This will permanently delete every inspection, school record, and photo from the shared Supabase project for everyone. This cannot be undone. Continue?'
  );
  if (!confirmed) return;

  // Remove photos from storage first
  const { data: rows } = await supabase.from('inspections').select('photo_path');
  const paths = (rows || []).map((r) => r.photo_path).filter(Boolean) as string[];
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(INSPECTION_PHOTOS_BUCKET).remove(paths);
    if (removeError) console.error('Error removing photos', removeError);
  }

  // Row deletes go through a Postgres function that re-checks the caller is an
  // authenticated admin AND the delete password, entirely server-side. There is
  // nothing here for someone to crack from the JS bundle — the password hash
  // never leaves Postgres.
  const { error: rpcError } = await supabase.rpc('admin_clear_all_data', { delete_password: deletePassword });
  if (rpcError) {
    if (rpcError.message.includes('Incorrect delete password')) throw new Error('Incorrect delete password.');
    console.error('Could not clear data', rpcError);
    throw new Error('Could not clear data. Please try again.');
  }

  window.location.reload();
}

// Delete only the photo files for inspections in [startISO, endISO] (either bound can be null =
// open-ended). Keeps every inspection record — school, attendance, checklist, everything —
// just clears the photo_path so the record no longer has an attached image.
export async function clearPhotosInRange(startISO: string | null, endISO: string | null, deletePassword: string): Promise<number> {
  const { error: verifyError } = await supabase.rpc('admin_verify_delete_password', { candidate: deletePassword });
  if (verifyError) {
    if (verifyError.message.includes('Incorrect delete password')) throw new Error('Incorrect delete password.');
    console.error('Could not verify delete password', verifyError);
    throw new Error('Could not verify password. Please try again.');
  }

  let query = supabase.from('inspections').select('id, photo_path').not('photo_path', 'is', null);
  if (startISO) query = query.gte('created_at', `${startISO}T00:00:00`);
  if (endISO) query = query.lte('created_at', `${endISO}T23:59:59`);
  const { data, error } = await query;
  if (error) { console.error('Could not find photos to delete', error); throw new Error('Could not find photos to delete. Please try again.'); }

  const rows = data || [];
  const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(INSPECTION_PHOTOS_BUCKET).remove(paths);
    if (removeError) { console.error('Could not delete photo files', removeError); throw new Error('Could not delete photo files. Please try again.'); }
  }
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const { error: updateError } = await supabase.from('inspections').update({ photo_path: null }).in('id', ids);
    if (updateError) { console.error('Could not clear photo references', updateError); throw new Error('Could not update photo records. Please try again.'); }
  }
  return rows.length;
}

// Delete inspection records (and their photos) in [startISO, endISO]. Leaves the schools
// table untouched — compliance stats stay as they were computed at the time.
export async function clearDataInRange(startISO: string | null, endISO: string | null, deletePassword: string): Promise<number> {
  let query = supabase.from('inspections').select('id, photo_path');
  if (startISO) query = query.gte('created_at', `${startISO}T00:00:00`);
  if (endISO) query = query.lte('created_at', `${endISO}T23:59:59`);
  const { data, error } = await query;
  if (error) { console.error('Could not find inspections to delete', error); throw new Error('Could not find inspections to delete. Please try again.'); }

  const rows = data || [];
  const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(INSPECTION_PHOTOS_BUCKET).remove(paths);
    if (removeError) console.error('Error removing some photos', removeError);
  }

  // Deletion itself runs server-side via a function that re-checks the admin
  // role AND the delete password, rather than a raw .delete() call from the browser.
  const { data: deletedCount, error: rpcError } = await supabase.rpc('admin_clear_data_range', {
    start_date: startISO,
    end_date: endISO,
    delete_password: deletePassword,
  });
  if (rpcError) {
    if (rpcError.message.includes('Incorrect delete password')) throw new Error('Incorrect delete password.');
    console.error('Could not delete inspections', rpcError);
    throw new Error('Could not delete inspections. Please try again.');
  }

  return (deletedCount as number) ?? rows.length;
}

// ---------- Export tracking (Weekly Export Tracker on the Dashboard) ----------

export async function logExport(exportType: ExportType, rangeStart: string | null, rangeEnd: string | null, recordCount: number) {
  const row = {
    id: `EXP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
    export_type: exportType,
    exported_at: new Date().toISOString(),
    range_start: rangeStart,
    range_end: rangeEnd,
    record_count: recordCount,
  };
  const { error } = await supabase.from('export_log').insert(row);
  if (error) console.error('Error logging export', error);
}

export async function getExportLog(): Promise<ExportLogEntry[]> {
  const { data, error } = await supabase
    .from('export_log')
    .select('*')
    .order('exported_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('Error fetching export log', error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    exportType: row.export_type as ExportType,
    exportedAt: row.exported_at,
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
    recordCount: row.record_count,
  }));
}

// ---------- Photo download helpers ----------

async function blobFromPhotoUrl(photoUrl: string): Promise<Blob> {
  if (photoUrl.startsWith('data:')) return dataUrlToBlob(photoUrl);
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`Could not download photo (${res.status})`);
  return res.blob();
}

function photoExtensionFromBlob(blob: Blob): string {
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function downloadInspectionPhoto(inspection: InspectionRecord) {
  if (!inspection.photoUrl) return;
  const dateStr = inspection.timestamp.split('T')[0];
  const blob = await blobFromPhotoUrl(inspection.photoUrl);
  const ext = photoExtensionFromBlob(blob);
  const filename = `${safeFileSegment(inspection.schoolName)}_${dateStr}.${ext}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Bundle every photo currently in view into a single ZIP for the Friday report.
export async function exportPhotosZip(inspections: InspectionRecord[], rangeLabel?: { start: string | null; end: string | null }) {
  const withPhotos = inspections.filter(i => !!i.photoUrl);
  if (withPhotos.length === 0) {
    alert('No photos to export in the current list.');
    return;
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const insp of withPhotos) {
    try {
      const dateStr = insp.timestamp.split('T')[0];
      const blockFolder = safeFileSegment(insp.block);
      const blob = await blobFromPhotoUrl(insp.photoUrl!);
      const ext = photoExtensionFromBlob(blob);
      let baseName = `${safeFileSegment(insp.schoolName)}_${dateStr}`;
      const count = usedNames.get(baseName) || 0;
      usedNames.set(baseName, count + 1);
      if (count > 0) baseName += `_${count + 1}`;

      zip.file(`${blockFolder}/${baseName}.${ext}`, blob);
    } catch (e) {
      console.error(`Skipping photo for ${insp.schoolName} (${insp.id})`, e);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const filenameDateSuffix = rangeLabel && (rangeLabel.start || rangeLabel.end)
    ? `${rangeLabel.start || 'start'}_to_${rangeLabel.end || 'now'}`
    : new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_Poshan_Photos_${filenameDateSuffix}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await logExport('photos', rangeLabel?.start ?? null, rangeLabel?.end ?? null, withPhotos.length).catch(e => console.error('Could not log export', e));
}
