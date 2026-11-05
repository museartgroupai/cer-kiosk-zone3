const WIDTH = 2480;
const HEIGHT = 1754;
const PAPER = '#fffdf7';
const INK = '#21483d';
const MUTED = '#6d7c71';
const GOLD = '#bd9145';
const GREEN = '#197052';

function roundedRect(ctx, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function fitFont(ctx, text, maxWidth, startingSize, family = '"Noto Sans Thai", Tahoma, sans-serif') {
  let size = startingSize;
  while (size > 42) {
    ctx.font = `700 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('เปิดภาพตัวละครไม่สำเร็จ กรุณาสแกน QR ใหม่'));
    image.src = dataUrl;
  });
}

function drawCertificate(ctx, image, payload, recipientName, logos = []) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  wash.addColorStop(0, 'rgba(230, 242, 232, .44)');
  wash.addColorStop(.58, 'rgba(255, 253, 247, 0)');
  wash.addColorStop(1, 'rgba(242, 231, 204, .5)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  roundedRect(ctx, 54, 54, WIDTH - 108, HEIGHT - 108, 24, null, GOLD, 6);
  roundedRect(ctx, 72, 72, WIDTH - 144, HEIGHT - 144, 17, null, '#d9c596', 2);

  // Official organizer logos, kept away from the certificate title and participant.
  logos.forEach((logo, index) => {
    if (!logo) return;
    const size = 156;
    const x = index === 0 ? 174 : WIDTH - 174 - size;
    ctx.drawImage(logo, x, 130, size, size);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = GREEN;
  ctx.font = '700 44px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('FOOD & FIT  ·  CALORIE QUEST', 1240, 190);
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(1240, 278, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = '700 112px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('เกียรติบัตร', 1240, 415);
  ctx.fillStyle = MUTED;
  ctx.font = '500 42px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('มอบให้แก่', 1135, 535);

  const nameSize = fitFont(ctx, recipientName, 1430, 92);
  ctx.font = `700 ${nameSize}px "Noto Sans Thai", Tahoma, sans-serif`;
  ctx.fillStyle = '#184f3d';
  ctx.fillText(recipientName, 1115, 680);

  ctx.fillStyle = '#8a7250';
  ctx.fillRect(410, 745, 1410, 3);
  ctx.fillStyle = '#405c4f';
  ctx.font = '500 39px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('ได้เข้าร่วมกิจกรรมเรียนรู้เรื่องอาหารและสุขภาพ', 1115, 825);
  ctx.font = '500 30px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('ขอชื่นชมในการเรียนรู้และดูแลสุขภาพของตนเอง', 1115, 882);

  const imageBox = { x: 1780, y: 370, width: 520, height: 970 };
  roundedRect(ctx, imageBox.x - 32, imageBox.y - 42, imageBox.width + 64, imageBox.height + 84, 28, 'rgba(242, 249, 243, .72)', '#d7e4d8', 3);
  const scale = Math.min(imageBox.width / image.width, imageBox.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, imageBox.x + (imageBox.width - drawWidth) / 2, imageBox.y + (imageBox.height - drawHeight) / 2, drawWidth, drawHeight);

  const cardY = 1030;
  const cardW = 620;
  const cardH = 218;
  roundedRect(ctx, 275, cardY, cardW, cardH, 24, '#fffaf0', '#e4c98e', 3);
  roundedRect(ctx, 940, cardY, cardW, cardH, 24, '#f0faf3', '#a9d5ba', 3);
  ctx.fillStyle = MUTED;
  ctx.font = '700 30px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('พลังงานจากอาหารที่เลือก', 585, cardY + 61);
  ctx.fillStyle = '#a34d25';
  ctx.font = '700 61px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(`${Number(payload.totalKcal).toLocaleString('th-TH')} kcal`, 585, cardY + 143);
  ctx.fillStyle = MUTED;
  ctx.font = '700 30px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('อาหาร 5 หมู่', 1250, cardY + 61);
  ctx.fillStyle = GREEN;
  ctx.font = '700 61px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText(`${payload.groupsCount} / 5 หมู่`, 1250, cardY + 143);

  ctx.fillStyle = MUTED;
  ctx.font = '500 25px "Noto Sans Thai", Tahoma, sans-serif';
  ctx.fillText('จัดทำจากผลกิจกรรมการเรียนรู้ · ไม่มีการจัดเก็บชื่อผู้รับใบประกาศ', WIDTH / 2, 1465);
  ctx.fillStyle = GOLD;
  ctx.fillRect(1050, 1510, 380, 3);
}

function loadLogo(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null); // Certificate remains usable if an asset is unavailable.
    image.src = url;
  });
}

export async function createCertificateBlob(payload, recipientName) {
  if (document.fonts?.ready) await document.fonts.ready;
  const image = await imageFromDataUrl(payload.portraitDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('เบราว์เซอร์นี้สร้างภาพใบประกาศไม่ได้');
  const logos = await Promise.all([
    loadLogo('/logos/learning-encouragement.webp'),
    loadLogo('/logos/science-education.webp')
  ]);
  drawCertificate(context, image, payload, recipientName, logos);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob
      ? resolve(blob)
      : reject(new Error('บันทึกภาพใบประกาศไม่สำเร็จ กรุณาลองอีกครั้ง')), 'image/png');
  });
}
