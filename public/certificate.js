// High-resolution A4 landscape certificate, generated locally in the visitor's browser.
// Content is rendered from the real kiosk handoff; no sample names, dates or signatures.
const WIDTH = 2480;
const HEIGHT = 1754;
const C = {
  navy: '#132b56',
  navyDeep: '#0a1d3e',
  gold: '#c69a3a',
  goldLight: '#efdba8',
  paper: '#fffefb',
  ivory: '#fcf7ec',
  muted: '#66748b',
  border: '#d9b76e'
};
const THAI_FONT = '"Noto Sans Thai", Tahoma, Arial, sans-serif';

function roundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
}

function rule(ctx, x1, y1, x2, y2, color = C.gold, width = 3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function label(ctx, value, x, y, size, weight, color, maxWidth) {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = weight + ' ' + size + 'px ' + THAI_FONT;
  ctx.fillText(value, x, y, maxWidth);
}

function nameFontSize(ctx, name) {
  let size = 100;
  while (size > 48) {
    ctx.font = '700 ' + size + 'px ' + THAI_FONT;
    if (ctx.measureText(name).width < 1580) break;
    size -= 3;
  }
  return size;
}

function drawCorners(ctx) {
  // Navy and champagne-gold sweeps echo the international certificate style.
  ctx.fillStyle = C.navyDeep;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(690, 0);
  ctx.bezierCurveTo(470, 45, 240, 168, 0, 236);
  ctx.closePath();
  ctx.fill();
  const gold = ctx.createLinearGradient(0, 0, 575, 190);
  gold.addColorStop(0, '#f8df96');
  gold.addColorStop(.6, C.gold);
  gold.addColorStop(1, '#e9c776');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(0, 80);
  ctx.bezierCurveTo(240, 110, 360, 32, 520, 0);
  ctx.lineTo(675, 0);
  ctx.bezierCurveTo(440, 65, 215, 185, 0, 191);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.navyDeep;
  ctx.beginPath();
  ctx.moveTo(WIDTH, HEIGHT);
  ctx.lineTo(WIDTH - 690, HEIGHT);
  ctx.bezierCurveTo(WIDTH - 420, HEIGHT - 80, WIDTH - 235, HEIGHT - 230, WIDTH, HEIGHT - 278);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(WIDTH, HEIGHT - 72);
  ctx.bezierCurveTo(WIDTH - 170, HEIGHT - 115, WIDTH - 330, HEIGHT - 24, WIDTH - 500, HEIGHT);
  ctx.lineTo(WIDTH - 690, HEIGHT);
  ctx.bezierCurveTo(WIDTH - 475, HEIGHT - 70, WIDTH - 230, HEIGHT - 191, WIDTH, HEIGHT - 214);
  ctx.closePath();
  ctx.fill();
}

function drawCertificate(ctx, portrait, payload, name, logos, issuedDate) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  glow.addColorStop(0, '#f6f9fd');
  glow.addColorStop(.5, C.paper);
  glow.addColorStop(1, '#f9f4e9');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawCorners(ctx);

  // Quiet, print-safe frame with subtle inner gold line.
  roundedRect(ctx, 35, 35, WIDTH - 70, HEIGHT - 70, 22, null, C.gold, 5);
  roundedRect(ctx, 52, 52, WIDTH - 104, HEIGHT - 104, 17, null, C.goldLight, 2);

  // Official logos; never redraw their text or emblem.
  const logoSize = 174;
  logos.forEach((logo, i) => {
    if (logo) ctx.drawImage(logo, i === 0 ? 1003 : 1303, 120, logoSize, logoSize);
  });
  rule(ctx, WIDTH / 2, 157, WIDTH / 2, 265, '#e3c988', 3);
  label(ctx, 'FOOD & FIT  ·  CALORIE QUEST', WIDTH / 2, 371, 33, '700', C.navy, 950);

  label(ctx, 'เกียรติบัตร', WIDTH / 2, 555, 145, '700', C.navyDeep, 1000);
  rule(ctx, 510, 514, 740, 514, C.gold, 4);
  rule(ctx, WIDTH - 740, 514, WIDTH - 510, 514, C.gold, 4);
  label(ctx, 'CERTIFICATE OF PARTICIPATION', WIDTH / 2, 615, 30, '700', '#9d7528', 980);

  label(ctx, 'มอบให้แก่', WIDTH / 2, 727, 42, '500', C.navy, 650);
  roundedRect(ctx, 378, 770, 1724, 164, 24, C.ivory, C.gold, 4);
  roundedRect(ctx, 395, 787, 1690, 130, 16, null, '#e9d4a4', 2);
  label(ctx, name, WIDTH / 2, 874, nameFontSize(ctx, name), '700', C.navyDeep, 1570);

  label(ctx, 'ได้เข้าร่วมกิจกรรมเรียนรู้เรื่องอาหารและสุขภาพ', WIDTH / 2, 1044, 49, '700', C.navy, 1950);
  label(ctx, 'ขอชื่นชมในการเรียนรู้และการดูแลสุขภาพของตนเอง', WIDTH / 2, 1110, 35, '400', C.muted, 1750);

  // Activity figures are always from the kiosk's real payload.
  roundedRect(ctx, 432, 1207, 1497, 228, 22, '#fffefa', '#d8b66b', 3);
  roundedRect(ctx, 906, 1175, 546, 61, 28, '#f5e7c8', C.gold, 2);
  label(ctx, 'ผลการเรียนรู้ในกิจกรรม', WIDTH / 2 - 61, 1218, 32, '700', C.navy, 515);
  rule(ctx, 1182, 1257, 1182, 1390, '#d9be88', 3);
  label(ctx, 'พลังงานจากอาหารที่เลือก', 790, 1285, 31, '500', C.muted, 620);
  label(ctx, Number(payload.totalKcal).toLocaleString('th-TH') + ' kcal', 790, 1374, 62, '700', C.navyDeep, 650);
  label(ctx, 'อาหารครบจาก 5 หมู่', 1540, 1285, 31, '500', C.muted, 620);
  label(ctx, String(payload.groupsCount) + ' / 5 หมู่', 1540, 1374, 62, '700', C.navyDeep, 630);

  // Preserve the visitor's assembled kiosk character as a small keepsake.
  roundedRect(ctx, 1972, 1166, 306, 275, 24, '#f6f8fa', '#d5b77f', 3);
  const inset = { x: 1990, y: 1180, w: 270, h: 241 };
  const scale = Math.min(inset.w / portrait.width, inset.h / portrait.height);
  const w = portrait.width * scale;
  const h = portrait.height * scale;
  ctx.drawImage(portrait, inset.x + (inset.w - w) / 2, inset.y + (inset.h - h) / 2, w, h);

  label(ctx, 'ให้ไว้ ณ วันที่ ' + issuedDate, WIDTH / 2, 1516, 34, '500', C.navy, 1280);
  rule(ctx, 380, 1505, 785, 1505, '#debf7e', 2);
  rule(ctx, 1695, 1505, 2100, 1505, '#debf7e', 2);

  // Signature placeholders intentionally have no forged signature.
  rule(ctx, 435, 1600, 978, 1600, C.gold, 2);
  rule(ctx, 1502, 1600, 2045, 1600, C.gold, 2);
  label(ctx, 'ผู้จัดกิจกรรม', 708, 1645, 28, '500', C.muted, 480);
  label(ctx, 'ศูนย์วิทยาศาสตร์เพื่อการศึกษาขอนแก่น', 1774, 1645, 26, '500', C.muted, 560);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('เปิดภาพตัวละครไม่สำเร็จ กรุณาสแกน QR ใหม่'));
    image.src = source;
  });
}

function loadLogo(source) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

export async function createCertificateBlob(payload, recipientName) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const portrait = await loadImage(payload.portraitDataUrl);
  const logos = await Promise.all([
    loadLogo('/logos/learning-encouragement.webp'),
    loadLogo('/logos/science-education.webp')
  ]);
  const date = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok'
  }).format(new Date());
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('เบราว์เซอร์นี้สร้างภาพใบประกาศไม่ได้');
  drawCertificate(ctx, portrait, payload, recipientName, logos, date);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob
      ? resolve(blob)
      : reject(new Error('บันทึกภาพใบประกาศไม่สำเร็จ กรุณาลองอีกครั้ง')), 'image/png');
  });
}
