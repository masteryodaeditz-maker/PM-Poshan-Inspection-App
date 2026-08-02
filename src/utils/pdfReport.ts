import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import { InspectionRecord } from '../types';
import { logExport } from './storage';

// ---- Palette ----
// Deliberately a normal light/white report look, not the dark mockup — dark
// backgrounds with light text are harder to read once printed or viewed on
// low-brightness screens, and this needs to work as a plain government-style
// paper report. Only the layout/structure follows the mockup.
const COLORS = {
  forest: rgb(0.059, 0.298, 0.227),      // section labels / title, matches the app's forest green
  forestLight: rgb(0.91, 0.95, 0.93),    // light green tint for the photo placeholder box
  ink: rgb(0.11, 0.11, 0.11),            // primary text
  textSecondary: rgb(0.42, 0.42, 0.42),
  textFaint: rgb(0.6, 0.6, 0.6),
  line: rgb(0.86, 0.86, 0.86),
  danger: rgb(0.72, 0.2, 0.16),          // "No" answers / flagged issues
  white: rgb(1, 1, 1),
};

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = { top: 40, bottom: 44, left: 40, right: 40 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

interface DrawCtx {
  doc: PDFDocument;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = (text || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean === '') return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function addPage(ctx: DrawCtx) {
  const page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.pages.push(page);
  ctx.page = page;
  ctx.y = PAGE.height - MARGIN.top;
}

// Checked before every single draw call (not just once per inspection card) —
// this is what guarantees a long remarks/reason field can never visually run
// off the bottom of a page. If it doesn't fit, a new page starts right here,
// mid-section if necessary, rather than clipping or overlapping the footer.
function ensureSpace(ctx: DrawCtx, height: number) {
  if (ctx.y - height < MARGIN.bottom) {
    addPage(ctx);
  }
}

function drawLine(ctx: DrawCtx, y: number) {
  ctx.page.drawLine({
    start: { x: MARGIN.left, y },
    end: { x: PAGE.width - MARGIN.right, y },
    thickness: 0.75,
    color: COLORS.line,
  });
}

function drawWrappedText(ctx: DrawCtx, text: string, x: number, maxWidth: number, size: number, font: PDFFont, color: RGB, lineGap = 4) {
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    ensureSpace(ctx, size + lineGap);
    ctx.page.drawText(line, { x, y: ctx.y - size, size, font, color });
    ctx.y -= size + lineGap;
  }
}

function drawFullWidthReason(ctx: DrawCtx, label: string, text: string, regular: PDFFont, bold: PDFFont) {
  ensureSpace(ctx, 14);
  ctx.page.drawText(label, { x: MARGIN.left, y: ctx.y - 9, size: 9, font: regular, color: COLORS.textSecondary });
  ctx.y -= 13;
  drawWrappedText(ctx, text, MARGIN.left, CONTENT_WIDTH, 9.5, bold, COLORS.danger);
  ctx.y -= 4;
}

// Two label/value pairs side by side (left half / right half of the content width)
function drawTwoColumnRow(
  ctx: DrawCtx,
  leftLabel: string, leftValue: string,
  rightLabel: string, rightValue: string,
  leftColor: RGB = COLORS.ink, rightColor: RGB = COLORS.ink
) {
  ensureSpace(ctx, 34);
  const size = 9;
  const half = CONTENT_WIDTH / 2;
  const leftX = MARGIN.left;
  const rightX = MARGIN.left + half + 10;

  ctx.page.drawText(leftLabel, { x: leftX, y: ctx.y - size, size, font: ctx.regular, color: COLORS.textSecondary });
  ctx.page.drawText(leftValue || 'N/A', { x: leftX, y: ctx.y - size - 13, size: 10, font: ctx.bold, color: leftColor });

  ctx.page.drawText(rightLabel, { x: rightX, y: ctx.y - size, size, font: ctx.regular, color: COLORS.textSecondary });
  ctx.page.drawText(rightValue || 'N/A', { x: rightX, y: ctx.y - size - 13, size: 10, font: ctx.bold, color: rightColor });

  ctx.y -= 32;
}

function drawSectionLabel(ctx: DrawCtx, label: string) {
  ensureSpace(ctx, 20);
  ctx.y -= 4;
  ctx.page.drawText(label.toUpperCase(), { x: MARGIN.left, y: ctx.y - 9, size: 9, font: ctx.bold, color: COLORS.forest });
  ctx.y -= 16;
}

function fmtYesNo(v: string | undefined): string {
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return 'N/A';
}

// Fetches the already-signed, already-authorized photo URL the Dashboard already
// displays — no new permissions, no new endpoint. A failed fetch (expired signed
// URL, offline, etc.) just falls back to a placeholder box rather than breaking
// the whole export.
async function embedInspectionPhoto(ctx: DrawCtx, photoUrl: string | undefined) {
  if (!photoUrl) return null;
  try {
    const res = await fetch(photoUrl);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    return await ctx.doc.embedJpg(bytes);
  } catch (e) {
    console.error('Could not embed photo in PDF, skipping', e);
    return null;
  }
}

export async function exportInspectionsPDF(
  inspections: InspectionRecord[],
  rangeLabel?: { start: string | null; end: string | null },
  filterLabel?: string
) {
  if (inspections.length === 0) {
    alert('No inspections to export in the current list.');
    return;
  }

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: DrawCtx = { doc, pages: [], page: null as unknown as PDFPage, y: 0, regular, bold };
  addPage(ctx);

  // Report title (first page only)
  ctx.page.drawText('PM Poshan Weekly Inspection Report', { x: MARGIN.left, y: ctx.y - 18, size: 16, font: bold, color: COLORS.forest });
  ctx.y -= 24;
  const rangeText = rangeLabel && (rangeLabel.start || rangeLabel.end)
    ? `${rangeLabel.start || 'Beginning'} to ${rangeLabel.end || 'Now'}`
    : 'All Time';
  const subtitle = `${rangeText}${filterLabel ? ' \u00b7 ' + filterLabel : ''} \u00b7 ${inspections.length} inspection${inspections.length === 1 ? '' : 's'}`;
  ctx.page.drawText(subtitle, { x: MARGIN.left, y: ctx.y - 11, size: 10, font: regular, color: COLORS.textSecondary });
  ctx.y -= 22;
  drawLine(ctx, ctx.y);
  ctx.y -= 16;

  for (let idx = 0; idx < inspections.length; idx++) {
    const insp = inspections[idx];

    // Keep a card's header from being stranded alone at the bottom of a page
    ensureSpace(ctx, 90);

    // ---- Header ----
    const dateStr = new Date(insp.timestamp).toLocaleString(undefined, {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    ctx.page.drawText(insp.schoolName, { x: MARGIN.left, y: ctx.y - 13, size: 13, font: bold, color: COLORS.ink });
    const dateWidth = regular.widthOfTextAtSize(dateStr, 9);
    ctx.page.drawText(dateStr, { x: PAGE.width - MARGIN.right - dateWidth, y: ctx.y - 11, size: 9, font: regular, color: COLORS.textSecondary });
    ctx.y -= 18;

    const subLine = `${insp.block} Block \u00b7 Category ${insp.schoolCategory}${insp.managementType ? ' \u00b7 Management ' + insp.managementType : ''}`;
    ctx.page.drawText(subLine, { x: MARGIN.left, y: ctx.y - 10, size: 9, font: regular, color: COLORS.textSecondary });
    const inspectorLabel = `Inspector: ${insp.inspectorName || 'N/A'}`;
    const inspectorWidth = regular.widthOfTextAtSize(inspectorLabel, 9);
    ctx.page.drawText(inspectorLabel, { x: PAGE.width - MARGIN.right - inspectorWidth, y: ctx.y - 10, size: 9, font: regular, color: COLORS.textSecondary });
    ctx.y -= 18;

    // ---- Photo + GPS/Issue row ----
    ensureSpace(ctx, 66);
    const photoBoxSize = 60;
    const photoImage = await embedInspectionPhoto(ctx, insp.photoUrl);
    const rowTop = ctx.y;
    ctx.page.drawRectangle({
      x: MARGIN.left, y: rowTop - photoBoxSize, width: photoBoxSize, height: photoBoxSize,
      color: COLORS.forestLight, borderColor: COLORS.line, borderWidth: 0.75,
    });
    if (photoImage) {
      const scale = Math.min(photoBoxSize / photoImage.width, photoBoxSize / photoImage.height);
      const w = photoImage.width * scale;
      const h = photoImage.height * scale;
      ctx.page.drawImage(photoImage, {
        x: MARGIN.left + (photoBoxSize - w) / 2,
        y: rowTop - photoBoxSize + (photoBoxSize - h) / 2,
        width: w, height: h,
      });
    } else {
      ctx.page.drawText('No Photo', { x: MARGIN.left + 8, y: rowTop - photoBoxSize / 2 - 4, size: 8, font: regular, color: COLORS.textFaint });
    }

    const infoX = MARGIN.left + photoBoxSize + 16;
    const gpsText = insp.latitude && insp.longitude ? `${insp.latitude}, ${insp.longitude}` : 'Not recorded';
    ctx.page.drawText('GPS location', { x: infoX, y: rowTop - 10, size: 9, font: regular, color: COLORS.textSecondary });
    ctx.page.drawText(gpsText, { x: PAGE.width - MARGIN.right - bold.widthOfTextAtSize(gpsText, 9), y: rowTop - 10, size: 9, font: bold, color: COLORS.ink });

    ctx.y = rowTop - photoBoxSize - 12;
    drawLine(ctx, ctx.y);
    ctx.y -= 14;

    // ---- Attendance ----
    drawSectionLabel(ctx, 'Attendance');
    drawTwoColumnRow(ctx, 'Boys / Girls present', `${insp.attendanceBoys ?? 0} / ${insp.attendanceGirls ?? 0}`, 'Aadhaar boys / girls', `${insp.aadhaarBoys ?? 0} / ${insp.aadhaarGirls ?? 0}`);
    drawTwoColumnRow(
      ctx, 'Meals all 5 days', fmtYesNo(insp.mealsServedAllFiveDays),
      'Days missed', insp.mealsServedAllFiveDays === 'no' ? String(insp.missedMealDaysCount ?? 0) : 'N/A',
      insp.mealsServedAllFiveDays === 'no' ? COLORS.danger : COLORS.ink
    );
    if (insp.mealsServedAllFiveDays === 'no' && insp.missedMealDaysReason) {
      drawFullWidthReason(ctx, 'Reason for missed day(s)', insp.missedMealDaysReason, regular, bold);
    }

    // ---- Facilities ----
    drawSectionLabel(ctx, 'Facilities');
    drawTwoColumnRow(
      ctx, 'Kitchen shed', insp.kitchenShed === 'yes' ? 'Functional' : fmtYesNo(insp.kitchenShed),
      'Foodgrains delivered', fmtYesNo(insp.foodgrainsDelivered),
      insp.kitchenShed === 'no' ? COLORS.danger : COLORS.ink,
      insp.foodgrainsDelivered === 'no' ? COLORS.danger : COLORS.ink
    );
    if (insp.kitchenShed === 'no' && insp.kitchenShedReason) {
      drawFullWidthReason(ctx, 'Kitchen shed issue', insp.kitchenShedReason, regular, bold);
    }
    drawTwoColumnRow(
      ctx, 'Water supply', fmtYesNo(insp.waterSupply),
      'Foodgrains reported to SDSEO', insp.foodgrainsDelivered === 'no' ? fmtYesNo(insp.foodgrainsReportedSDSEO) : 'N/A',
      insp.waterSupply === 'no' ? COLORS.danger : COLORS.ink,
      insp.foodgrainsDelivered === 'no' && insp.foodgrainsReportedSDSEO === 'no' ? COLORS.danger : COLORS.ink
    );
    if (insp.waterSupply === 'no' && insp.waterSupplyReason) {
      drawFullWidthReason(ctx, 'Water supply issue', insp.waterSupplyReason, regular, bold);
    }
    if (insp.foodgrainsDelivered === 'no' && insp.foodgrainsReportedSDSEO === 'no' && insp.foodgrainsNoReportReason) {
      drawFullWidthReason(ctx, 'Foodgrains non-report reason', insp.foodgrainsNoReportReason, regular, bold);
    }
    drawTwoColumnRow(
      ctx, 'Kitchen garden', fmtYesNo(insp.kitchenGarden),
      'Garden type', insp.kitchenGarden === 'yes' ? (insp.kitchenGardenType || 'N/A') : 'N/A',
      insp.kitchenGarden === 'no' ? COLORS.danger : COLORS.ink
    );
    if (insp.kitchenGarden === 'no' && insp.kitchenGardenReason) {
      drawFullWidthReason(ctx, 'No kitchen garden \u2014 reason', insp.kitchenGardenReason, regular, bold);
    }

    // ---- Reporting compliance ----
    drawSectionLabel(ctx, 'Reporting compliance');
    drawTwoColumnRow(
      ctx, 'Monthly form month', insp.submittedSDSEO === 'yes' ? (insp.monthlyFormMonth || 'N/A') : 'Not reported',
      'UC month', insp.submittedSDSEO === 'yes' ? (insp.utilizationCertMonth || 'N/A') : 'Not reported'
    );
    drawTwoColumnRow(
      ctx, 'SDSEO submitted', fmtYesNo(insp.submittedSDSEO),
      'MeghSIMS daily', fmtYesNo(insp.meghSimsDaily),
      insp.submittedSDSEO === 'no' ? COLORS.danger : COLORS.ink,
      insp.meghSimsDaily === 'no' ? COLORS.danger : COLORS.ink
    );
    if (insp.submittedSDSEO === 'no' && insp.sdseoNonSubmissionReason) {
      drawFullWidthReason(ctx, 'SDSEO non-submission reason', insp.sdseoNonSubmissionReason, regular, bold);
    }
    if (insp.meghSimsDaily === 'no' && insp.meghSimsNoReason) {
      drawFullWidthReason(ctx, 'MeghSIMS non-reporting reason', insp.meghSimsNoReason, regular, bold);
    }

    // ---- Remarks ----
    if (insp.remarks && insp.remarks.trim().length > 0) {
      drawSectionLabel(ctx, 'Remarks');
      drawWrappedText(ctx, insp.remarks, MARGIN.left, CONTENT_WIDTH, 9.5, regular, COLORS.ink);
    }

    ctx.y -= 10;
    if (idx < inspections.length - 1) {
      ensureSpace(ctx, 4);
      drawLine(ctx, ctx.y);
      ctx.y -= 18;
    }
  }

  // Footer drawn last, once the true page count is known
  const generatedOn = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.pages.forEach((page, i) => {
    const footerText = `Page ${i + 1} of ${ctx.pages.length} \u00b7 PM Poshan weekly inspection report \u00b7 generated ${generatedOn}`;
    const footerWidth = regular.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (PAGE.width - footerWidth) / 2,
      y: 22,
      size: 8,
      font: regular,
      color: COLORS.textFaint,
    });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filenameDateSuffix = rangeLabel && (rangeLabel.start || rangeLabel.end)
    ? `${rangeLabel.start || 'start'}_to_${rangeLabel.end || 'now'}`
    : new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `PM_Poshan_Inspection_Report_${filenameDateSuffix}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  await logExport('pdf', rangeLabel?.start ?? null, rangeLabel?.end ?? null, inspections.length).catch((e) => console.error('Could not log export', e));
}
