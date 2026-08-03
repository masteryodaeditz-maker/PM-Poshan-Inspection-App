import { InspectionRecord, SchoolRecord, BlockName, SchoolCategory, ExportLogEntry, ExportType } from '../types';
import { supabase, INSPECTION_PHOTOS_BUCKET } from './supabaseClient';
import * as XLSX from 'xlsx-js-style';

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2; // 2 hours — enough for a normal admin session/export run, without leaving a leaked link usable for a full day

// ---------- DB row <-> app type mapping ----------

interface InspectionRow {
  id: string;
  created_at: string;
  block: string;
  school_name: string;
  school_category: string;
  management_type: string | null;
  student_count: number;
  attendance_boys: number | null;
  attendance_girls: number | null;
  aadhaar_boys: number | null;
  aadhaar_girls: number | null;
  photo_path: string | null;
  remarks: string | null;
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
    studentCount: row.student_count,
    attendanceBoys: row.attendance_boys ?? undefined,
    attendanceGirls: row.attendance_girls ?? undefined,
    aadhaarBoys: row.aadhaar_boys ?? undefined,
    aadhaarGirls: row.aadhaar_girls ?? undefined,
    photoUrl,
    remarks: row.remarks ?? undefined,
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
    student_count: record.studentCount,
    attendance_boys: record.attendanceBoys ?? null,
    attendance_girls: record.attendanceGirls ?? null,
    aadhaar_boys: record.aadhaarBoys ?? null,
    aadhaar_girls: record.aadhaarGirls ?? null,
    photo_path: photoPath,
    remarks: record.remarks ?? null,
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
  let photoPath: string | null = null;
  if (newRecord.photoUrl) {
    photoPath = await uploadPhoto(newRecord.photoUrl, newRecord.block, newRecord.schoolName);
  }

  // Officers no longer need direct SELECT/INSERT on `inspections`/`schools` —
  // this single RPC does the insert plus the compliance-rate calc and schools
  // upsert entirely server-side (security definer), using data the function
  // is allowed to see rather than data sent back to the browser first.
  const payload = recordToRow(newRecord, '', '', photoPath); // id/created_at filled server-side; kept for shape
  delete (payload as Record<string, unknown>).id;
  delete (payload as Record<string, unknown>).created_at;

  const { data, error } = await supabase.rpc('submit_inspection', { payload });
  if (error) { console.error('Could not save inspection', error); throw new Error('Could not save inspection. Please check your connection and try again.'); }

  const id = (data as { id: string }).id;
  const createdAt = (data as { created_at: string }).created_at;
  const row = recordToRow(newRecord, id, createdAt, photoPath);
  const photoUrl = photoPath ? (await signedUrlsForPaths([photoPath])).get(photoPath) : undefined;
  return rowToRecord(row as unknown as InspectionRow, photoUrl);
}

// Restricted lookup for the submission form's school-name autocomplete. Returns
// only name/block/category — never compliance rate or contact info — since
// officers only need this to avoid mistyping a school name.
export async function getSchoolDirectoryForSubmission(): Promise<SchoolRecord[]> {
  const { data, error } = await supabase.rpc('list_schools_directory');
  if (error) {
    console.error('Error fetching school directory', error);
    return [];
  }
  return (data || []).map((s: { id: string; name: string; block: string; category: string }) => ({
    id: s.id,
    name: s.name,
    block: s.block as SchoolRecord['block'],
    category: s.category as SchoolRecord['category'],
  }));
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
    lastInspected: row.last_inspected ?? undefined,
    headmasterContact: row.headmaster_contact ?? undefined,
  }));
}

// ---------- CSV export (unchanged shape, extended columns) ----------

// Prevents CSV/formula injection: if a free-text field (remarks, inspector
// name, etc — all inspector-entered) starts with =, +, -, @, or certain
// control characters, spreadsheet software like Excel may interpret it as a
// formula and execute it when the exported file is opened. Prefixing with a
// single quote neutralizes that while keeping the value readable.
function csvSafe(value: string): string {
  const v = value ?? '';
  const dangerous = /^[=+\-@\t\r]/;
  const escaped = dangerous.test(v) ? `'${v}` : v;
  return `"${escaped.replace(/"/g, '""')}"`;
}

export function exportInspectionsCSV(inspections: InspectionRecord[], rangeLabel?: { start: string | null; end: string | null }) {
  const headers = [
    'ID', 'Timestamp', 'Block', 'School Name', 'Category', 'Management Type',
    'Students Served', 'Boys', 'Girls', 'Aadhaar Boys', 'Aadhaar Girls',
    'Remarks', 'Inspector',
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
    csvSafe(i.block),
    csvSafe(i.schoolName),
    i.schoolCategory,
    csvSafe(i.managementType || ''),
    i.studentCount,
    i.attendanceBoys ?? '',
    i.attendanceGirls ?? '',
    i.aadhaarBoys ?? '',
    i.aadhaarGirls ?? '',
    csvSafe(i.remarks || ''),
    csvSafe(i.inspectorName || ''),
    i.mealsServedAllFiveDays === 'yes' ? 'Yes' : (i.mealsServedAllFiveDays === 'no' ? 'No' : ''),
    i.missedMealDaysCount ?? '',
    csvSafe(i.missedMealDaysReason || ''),
    i.kitchenShed || '',
    csvSafe(i.kitchenShedReason || ''),
    i.foodgrainsDelivered || '',
    i.foodgrainsReportedSDSEO || '',
    csvSafe(i.foodgrainsNoReportReason || ''),
    i.waterSupply || '',
    csvSafe(i.waterSupplyReason || ''),
    i.kitchenGarden || '',
    csvSafe(i.kitchenGardenType || ''),
    csvSafe(i.kitchenGardenReason || ''),
    i.monthlyFormMonth || '',
    i.utilizationCertMonth || '',
    i.submittedSDSEO || '',
    csvSafe(i.sdseoNonSubmissionReason || ''),
    i.meghSimsDaily || '',
    csvSafe(i.meghSimsNoReason || ''),
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

// ---------- Generic formatted .xlsx export (used by all Dashboard drill-downs) ----------

export interface XlsxColumn {
  header: string;
  width?: number; // character width; a sensible default is used if omitted
  // Pulls the cell value for one row. Return a primitive (string/number) —
  // dates should already be formatted to a display string by the caller.
  value: (row: any) => string | number | null | undefined;
}

const XLSX_HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFFFF' } },
  fill: { fgColor: { rgb: 'FF0F4C3A' } },
  alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
};

/**
 * Builds a single-sheet .xlsx file with a bold/colored header row, sensible
 * column widths, and an autofilter dropdown on every column — then triggers
 * a browser download. Used for every drill-down table export on the Dashboard.
 */
export function exportRowsXLSX(
  rows: any[],
  columns: XlsxColumn[],
  filenameBase: string,
  sheetName: string = 'Data'
) {
  const headerRow = columns.map(c => c.header);
  const dataRows = rows.map(row => columns.map(c => {
    const v = c.value(row);
    return v === null || v === undefined ? '' : v;
  }));

  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  // Bold, colored header row
  for (let col = 0; col < columns.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) ws[cellRef].s = XLSX_HEADER_STYLE;
  }

  // Column widths — use the provided width, or size to the header/content length
  ws['!cols'] = columns.map((c, idx) => {
    if (c.width) return { wch: c.width };
    const longestContent = dataRows.reduce((max, r) => {
      const cellStr = String(r[idx] ?? '');
      return Math.max(max, cellStr.length);
    }, c.header.length);
    return { wch: Math.min(Math.max(longestContent + 2, 12), 45) };
  });

  // Filter dropdowns on the header row across the full data range
  const lastCol = XLSX.utils.encode_col(columns.length - 1);
  const lastRow = dataRows.length + 1;
  ws['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };

  // Freeze the header row so it stays visible while scrolling
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const dateSuffix = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filenameBase}_${dateSuffix}.xlsx`);
}

// Same protection as csvSafe() above, adapted for XLSX cells (no CSV quoting
// needed here — just the leading-apostrophe convention that forces spreadsheet
// software to treat the value as plain text rather than a formula).
function xlsxSafe(value: string): string {
  const v = value ?? '';
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

export function exportInspectionsXLSX(inspections: InspectionRecord[], rangeLabel?: { start: string | null; end: string | null }) {
  const columns: XlsxColumn[] = [
    { header: 'Timestamp', width: 18, value: (i: InspectionRecord) => new Date(i.timestamp).toLocaleString() },
    { header: 'Block', width: 16, value: (i: InspectionRecord) => i.block },
    { header: 'School Name', width: 28, value: (i: InspectionRecord) => xlsxSafe(i.schoolName) },
    { header: 'Category', width: 12, value: (i: InspectionRecord) => i.schoolCategory },
    { header: 'Inspector', width: 18, value: (i: InspectionRecord) => xlsxSafe(i.inspectorName || '') },
    { header: 'Students Present', width: 14, value: (i: InspectionRecord) => i.studentCount },
    { header: 'Kitchen Functional', width: 16, value: (i: InspectionRecord) => i.kitchenShed === 'yes' ? 'Yes' : i.kitchenShed === 'no' ? 'No' : '' },
    { header: 'Water Supply', width: 14, value: (i: InspectionRecord) => i.waterSupply === 'yes' ? 'Yes' : i.waterSupply === 'no' ? 'No' : '' },
    { header: 'Foodgrain Delivered', width: 16, value: (i: InspectionRecord) => i.foodgrainsDelivered === 'yes' ? 'Yes' : i.foodgrainsDelivered === 'no' ? 'No' : '' },
    { header: 'Meals All 5 Days', width: 16, value: (i: InspectionRecord) => i.mealsServedAllFiveDays === 'yes' ? 'Yes' : i.mealsServedAllFiveDays === 'no' ? 'No' : '' },
    { header: 'Remarks', width: 30, value: (i: InspectionRecord) => xlsxSafe(i.remarks || '') },
  ];

  const filenameDateSuffix = rangeLabel && (rangeLabel.start || rangeLabel.end)
    ? `${rangeLabel.start || 'start'}_to_${rangeLabel.end || 'now'}`
    : 'all_time';
  exportRowsXLSX(inspections, columns, `PM_Poshan_Inspections_${filenameDateSuffix}`, 'Inspections');

  logExport('xlsx', rangeLabel?.start ?? null, rangeLabel?.end ?? null, inspections.length).catch(e => console.error('Could not log export', e));
}

// Note: bulk delete of inspection data/photos is intentionally not exposed in this
// app. Photos live in a real Supabase Storage bucket and can be deleted directly
// from the Supabase dashboard without touching the `inspections` table — deleting
// a photo file there never removes or alters the underlying inspection record.

// ---------- Export tracking ----------

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
