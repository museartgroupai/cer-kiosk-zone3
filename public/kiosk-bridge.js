const MAX_IMAGE_DATA_URL_CHARS = 280 * 1024;

function canvasToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('อ่านภาพตัวละครไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}

export async function createPortraitDataUrl(sourceCanvas) {
  if (!sourceCanvas || typeof sourceCanvas.toBlob !== 'function'
    || !sourceCanvas.width || !sourceCanvas.height) {
    throw new Error('ต้องส่ง canvas ที่มีภาพตัวละครทั้งตัว');
  }

  for (const maxDimension of [960, 800, 680, 560, 460]) {
    const scale = Math.min(1, maxDimension / Math.max(sourceCanvas.width, sourceCanvas.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
    canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('เตรียมภาพตัวละครไม่สำเร็จ');
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.84, 0.76, 0.68, 0.58]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!blob || blob.type !== 'image/webp') {
        throw new Error('เบราว์เซอร์ kiosk นี้ไม่รองรับ WebP');
      }
      if (blob.size <= 210 * 1024) {
        const dataUrl = await canvasToDataUrl(blob);
        if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS) return dataUrl;
      }
    }
  }
  throw new Error('ภาพตัวละครใหญ่เกินไป กรุณาลดขนาดหรือความละเอียดแล้วลองใหม่');
}

export async function createHandoffUrl({ portalOrigin, portraitDataUrl, gender, totalKcal, groupsCount }) {
  let origin;
  try {
    origin = new URL(portalOrigin);
  } catch {
    throw new Error('กรุณาระบุ URL ของเว็บไซต์ใบประกาศ');
  }
  const isLocal = ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (origin.protocol !== 'https:' && !(isLocal && origin.protocol === 'http:')) {
    throw new Error('เว็บไซต์ใบประกาศต้องใช้ HTTPS');
  }
  if (typeof portraitDataUrl !== 'string'
    || portraitDataUrl.length > MAX_IMAGE_DATA_URL_CHARS
    || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(portraitDataUrl)) {
    throw new Error('ส่งภาพตัวละคร WebP ทั้งตัว ขนาดไม่เกิน 280 KiB');
  }
  if (!['boy', 'girl'].includes(gender)
    || !Number.isInteger(totalKcal) || totalKcal < 0 || totalKcal > 25_000
    || !Number.isInteger(groupsCount) || groupsCount < 0 || groupsCount > 5) {
    throw new Error('ข้อมูลผลกิจกรรมไม่ถูกต้อง');
  }

  const payload = { version: 1, portraitDataUrl, gender, totalKcal, groupsCount };
  const response = await fetch(new URL('/api/handoff', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== 'string') {
    throw new Error(data.error || 'เตรียม QR ใบประกาศไม่สำเร็จ');
  }
  return data.url;
}

if (typeof window !== 'undefined') {
  window.CerKioskZone3 = Object.freeze({ createPortraitDataUrl, createHandoffUrl });
}
