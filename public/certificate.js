// A4 landscape certificate; print-ready text remains vector-sharp on canvas.
// The decorative WebP has no embedded words, logos, names, dates or signatures.
const WIDTH = 2480;
const HEIGHT = 1754;
const PURPLE = '#40166b';
const PURPLE_DEEP = '#2e105a';
const GOLD = '#bc8523';
const GOLD_LIGHT = '#f1dca8';
const THAI_FONT = '"Noto Sans Thai", Tahoma, Arial, sans-serif';

function roundedRect(ctx, x, y, w, h, radius, fill, border, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function line(ctx, x1, y1, x2, y2, color = GOLD, width = 3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function text(ctx, value, x, y, size, weight, color, maxWidth) {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = weight + ' ' + size + 'px ' + THAI_FONT;
  ctx.fillText(value, x, y, maxWidth);
}

function fittedNameSize(ctx, name) {
  let size = 112;
  while (size > 44) {
    ctx.font = '700 ' + size + 'px ' + THAI_FONT;
    if (ctx.measureText(name).width <= 1570) break;
    size -= 3;
  }
  return size;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ไม่สามารถโหลดภาพตัวละครได้ กรุณาสแกนใหม่'));
    image.src = src;
  });
}

function optionalImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

// Dedicated lower-left safe area. It never crosses the central text or issue date.
export const PORTRAIT_AREA = Object.freeze({ x: 116, y: 1168, width: 510, height: 508 });

export function fitPortraitToArea(sourceWidth, sourceHeight) {
  if (!(sourceWidth > 0 && sourceHeight > 0)) return null;
  const scale = Math.min(PORTRAIT_AREA.width / sourceWidth, PORTRAIT_AREA.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: PORTRAIT_AREA.x + (PORTRAIT_AREA.width - width) / 2,
    y: PORTRAIT_AREA.y + PORTRAIT_AREA.height - height,
    width,
    height
  };
}

// Trim unused transparent padding around uploaded characters without cutting their outline.
// If the image is opaque, preserve the full image rather than guessing a crop.
function visiblePortraitBounds(portrait) {
  const fallback = { x: 0, y: 0, width: portrait.width, height: portrait.height };
  try {
    const probe = document.createElement('canvas');
    probe.width = 128;
    probe.height = 128;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return fallback;
    pctx.drawImage(portrait, 0, 0, probe.width, probe.height);
    const pixels = pctx.getImageData(0, 0, probe.width, probe.height).data;
    let minX = probe.width, minY = probe.height, maxX = -1, maxY = -1, visible = 0;
    for (let y = 0; y < probe.height; y++) {
      for (let x = 0; x < probe.width; x++) {
        if (pixels[(y * probe.width + x) * 4 + 3] < 30) continue;
        visible++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    // Do not crop solid backgrounds or tiny/incomplete silhouettes.
    if (maxX < 0 || visible > probe.width * probe.height * 0.93) return fallback;
    const margin = 4;
    const x = Math.max(0, minX - margin) / probe.width * portrait.width;
    const y = Math.max(0, minY - margin) / probe.height * portrait.height;
    const right = Math.min(probe.width, maxX + 1 + margin) / probe.width * portrait.width;
    const bottom = Math.min(probe.height, maxY + 1 + margin) / probe.height * portrait.height;
    return { x, y, width: right - x, height: bottom - y };
  } catch {
    return fallback;
  }
}

function drawLargePortrait(ctx, portrait) {
  const source = visiblePortraitBounds(portrait);
  const layout = fitPortraitToArea(source.width, source.height);
  if (!layout) return;

  // A soft grounding shadow, no rigid box behind the visitor's character.
  ctx.save();
  ctx.fillStyle = 'rgba(79, 42, 111, 0.11)';
  ctx.beginPath();
  ctx.ellipse(layout.x + layout.width / 2, PORTRAIT_AREA.y + PORTRAIT_AREA.height - 8,
    Math.min(layout.width * 0.42, 154), 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(portrait, source.x, source.y, source.width, source.height,
    layout.x, layout.y, layout.width, layout.height);
  ctx.restore();
}

function drawCertificate(ctx, portrait, name, logos, background, date) {
  ctx.fillStyle = '#fefcff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (background) {
    // The light decorative image is used only as background; all text is drawn dynamically.
    ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
  }

  // Keep the print border crisp despite the lightweight decorative background.
  roundedRect(ctx, 40, 40, WIDTH - 80, HEIGHT - 80, 14, null, '#ba8c32', 4);
  roundedRect(ctx, 56, 56, WIDTH - 112, HEIGHT - 112, 10, null, '#ead5a6', 2);

  // Real supplied official logos, never AI-redrawn symbols.
  const logoSize = 165;
  logos.forEach((logo, index) => {
    if (logo) ctx.drawImage(logo, index === 0 ? 1041 : 1274, 139, logoSize, logoSize);
  });
  line(ctx, WIDTH / 2, 171, WIDTH / 2, 270, '#e8c773', 3);

  text(ctx, 'ศูนย์วิทยาศาสตร์เพื่อการศึกษาขอนแก่น', WIDTH / 2, 405, 59, '700', PURPLE_DEEP, 1900);
  text(ctx, 'กรมส่งเสริมการเรียนรู้', WIDTH / 2, 470, 34, '600', PURPLE, 1100);

  text(ctx, 'เกียรติบัตร', WIDTH / 2, 660, 145, '700', PURPLE_DEEP, 1100);
  line(ctx, 520, 622, 750, 622, GOLD, 5);
  line(ctx, WIDTH - 750, 622, WIDTH - 520, 622, GOLD, 5);

  text(ctx, 'ขอมอบเกียรติบัตรฉบับนี้ให้แก่', WIDTH / 2, 754, 43, '500', PURPLE, 1400);

  // Prominent editable-by-data-only recipient panel; locked by the portal after issue.
  const grad = ctx.createLinearGradient(335, 850, 2145, 1020);
  grad.addColorStop(0, '#4a168a');
  grad.addColorStop(.52, '#642099');
  grad.addColorStop(1, '#3a116f');
  roundedRect(ctx, 345, 814, 1790, 204, 43, grad, GOLD, 7);
  roundedRect(ctx, 359, 829, 1762, 175, 32, null, '#e6bd64', 3);
  text(ctx, name, WIDTH / 2, 950, fittedNameSize(ctx, name), '700', '#fffdfd', 1550);

  text(ctx, 'ได้เข้าร่วมกิจกรรมเรียนรู้เรื่องอาหารและสุขภาพ', WIDTH / 2, 1123, 53, '700', PURPLE, 2010);
  text(ctx, 'ขอชื่นชมความตั้งใจในการเรียนรู้และการดูแลสุขภาพของตนเอง', WIDTH / 2, 1200, 34, '500', '#60477b', 1950);

  // Larger 3/4-style character in the lower-left, outside the name and date zones.
  drawLargePortrait(ctx, portrait);

  line(ctx, 820, 1333, 1105, 1333, '#cfaa65', 2);
  line(ctx, 1375, 1333, 1660, 1333, '#cfaa65', 2);
  text(ctx, 'ให้ไว้ ณ วันที่ ' + date, WIDTH / 2, 1433, 44, '600', PURPLE_DEEP, 1300);

  // This certificate deliberately has no signature, signature placeholder or signer line.
}

export async function createCertificateBlob(payload, recipientName) {
  if (document.fonts?.ready) await document.fonts.ready;
  const [portrait, background, logo1, logo2] = await Promise.all([
    loadImage(payload.portraitDataUrl),
    // Prefer the newly generated high-resolution background. Keep WebP as a legacy fallback.
    optionalImage('/certificate-background.avif').then(image =>
      image ? image : optionalImage('/certificate-background.webp')),
    optionalImage('/logos/learning-encouragement.webp'),
    optionalImage('/logos/science-education.webp')
  ]);
  const date = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok'
  }).format(new Date());
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างเกียรติบัตร');
  drawCertificate(ctx, portrait, recipientName, [logo1, logo2], background, date);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob
      ? resolve(blob)
      : reject(new Error('บันทึกเกียรติบัตรไม่สำเร็จ กรุณาลองใหม่')), 'image/png');
  });
}
