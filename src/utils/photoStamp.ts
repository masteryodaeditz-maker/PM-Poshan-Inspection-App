// Burns inspection context — date/time, school, block, inspector, GPS
// coordinates, and a reverse-geocoded address — directly into the photo
// pixels, the same way dedicated "GPS Map Camera" apps do. This makes the
// evidence self-describing even if it's later exported, printed, or
// separated from its database record.

export interface PhotoStampInfo {
  latitude?: string;
  longitude?: string;
  address?: string | null;
  schoolName?: string;
  block?: string;
  inspectorName?: string;
  when?: Date;
}

// Reverse-geocodes via OpenStreetMap's free Nominatim API. Best-effort only:
// on any failure (offline, rate-limited, request blocked) we just omit the
// address line rather than block the photo stamp on it.
export async function reverseGeocode(lat: string, lng: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=17&addressdetails=0`,
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.display_name === 'string' ? data.display_name : null;
  } catch {
    return null;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const FONT_FAMILY = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

// Draws a dark gradient panel with white text over the bottom of the photo
// and returns a brand-new JPEG data URL. The source image is never mutated —
// callers decide whether to replace the on-screen photo with the result.
export function stampPhoto(sourceDataUrl: string, info: PhotoStampInfo): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(sourceDataUrl); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const when = info.when || new Date();
        const dateLabel = when.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const headerParts = [info.schoolName, info.block ? `${info.block} Block` : null].filter(Boolean) as string[];

        type Row = { text: string; weight: number; size: number };
        const pad = Math.max(14, Math.round(canvas.width * 0.025));
        const fontSize = Math.max(13, Math.round(canvas.width * 0.024));
        const smallFontSize = Math.max(11, Math.round(fontSize * 0.8));
        const maxTextWidth = canvas.width - pad * 2 - 12;

        const sourceRows: { text: string; weight: number; size: number }[] = [];
        if (headerParts.length) sourceRows.push({ text: headerParts.join(' \u2022 '), weight: 700, size: fontSize });
        if (info.inspectorName) sourceRows.push({ text: `Inspector: ${info.inspectorName}`, weight: 500, size: smallFontSize });
        sourceRows.push({ text: dateLabel, weight: 500, size: smallFontSize });
        if (info.latitude && info.longitude) {
          sourceRows.push({ text: `GPS: ${info.latitude}, ${info.longitude}`, weight: 500, size: smallFontSize });
        }
        if (info.address) {
          sourceRows.push({ text: info.address, weight: 400, size: smallFontSize });
        }

        const wrapped: Row[] = [];
        sourceRows.forEach((row) => {
          ctx.font = `${row.weight} ${row.size}px ${FONT_FAMILY}`;
          wrapText(ctx, row.text, maxTextWidth).forEach((line) =>
            wrapped.push({ text: line, weight: row.weight, size: row.size })
          );
        });

        const lineGap = 6;
        const panelHeight = wrapped.reduce((sum, r) => sum + r.size + lineGap, 0) + pad * 1.6;
        const panelTop = Math.max(0, canvas.height - panelHeight);

        const gradient = ctx.createLinearGradient(0, panelTop, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.35, 'rgba(0,0,0,0.55)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, panelTop, canvas.width, canvas.height - panelTop);

        // Accent bar echoing the app's forest-green identity.
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, panelTop, Math.max(4, Math.round(canvas.width * 0.008)), canvas.height - panelTop);

        let y = canvas.height - pad * 0.8;
        for (let i = wrapped.length - 1; i >= 0; i--) {
          const row = wrapped[i];
          ctx.font = `${row.weight} ${row.size}px ${FONT_FAMILY}`;
          ctx.fillStyle = '#FFFFFF';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(row.text, pad + 10, y);
          y -= row.size + lineGap;
        }

        // Small corner tag identifying this as a verified inspection capture.
        const tag = 'PM POSHAN INSPECTION';
        ctx.font = `700 ${smallFontSize}px ${FONT_FAMILY}`;
        const tagWidth = ctx.measureText(tag).width;
        const tagPadX = 10;
        const tagBoxW = tagWidth + tagPadX * 2;
        const tagBoxH = smallFontSize + 12;
        ctx.fillStyle = 'rgba(15,76,58,0.85)';
        ctx.fillRect(canvas.width - tagBoxW - pad * 0.5, pad * 0.5, tagBoxW, tagBoxH);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tag, canvas.width - tagBoxW - pad * 0.5 + tagPadX, pad * 0.5 + tagBoxH - 8);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not stamp photo'));
      }
    };
    img.onerror = () => reject(new Error('Could not load photo for GPS stamping'));
    img.src = sourceDataUrl;
  });
}
