import { createCertificateBlob } from './certificate.js';

const MAX_IMAGE_DATA_URL_CHARS = 280 * 1024;
const allowedKeys = new Set(['version', 'portraitDataUrl', 'gender', 'totalKcal', 'groupsCount']);

export function normalizeRecipientName(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/gu, ' ').trim()).slice(0, 60).join('');
}

export function validatePortalHandoff(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  if (Object.keys(value).some(key => !allowedKeys.has(key))) return { ok: false };
  if (value.version !== 1 || !['boy', 'girl'].includes(value.gender)) return { ok: false };
  if (!Number.isInteger(value.totalKcal) || value.totalKcal < 0 || value.totalKcal > 25_000) return { ok: false };
  if (!Number.isInteger(value.groupsCount) || value.groupsCount < 0 || value.groupsCount > 5) return { ok: false };
  if (typeof value.portraitDataUrl !== 'string'
    || value.portraitDataUrl.length > MAX_IMAGE_DATA_URL_CHARS
    || !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.portraitDataUrl)) return { ok: false };
  return { ok: true };
}

function getElements() {
  return {
    loading: document.querySelector('#loading'),
    errorStep: document.querySelector('#errorStep'),
    errorTitle: document.querySelector('#errorTitle'),
    errorMessage: document.querySelector('#errorMessage'),
    rescanButton: document.querySelector('#rescanButton'),
    nameStep: document.querySelector('#nameStep'),
    previewStep: document.querySelector('#previewStep'),
    portrait: document.querySelector('#characterPreview'),
    energy: document.querySelector('#energyValue'),
    groups: document.querySelector('#groupsValue'),
    form: document.querySelector('#nameForm'),
    name: document.querySelector('#recipientName'),
    nameError: document.querySelector('#nameError'),
    confirm: document.querySelector('#confirmNameButton'),
    certificate: document.querySelector('#certificatePreview'),
    printSheet: document.querySelector('#printSheet'),
    greeting: document.querySelector('#previewGreeting'),
    download: document.querySelector('#downloadButton'),
    pdf: document.querySelector('#pdfButton'),
    share: document.querySelector('#shareButton'),
    edit: document.querySelector('#editNameButton'),
    status: document.querySelector('#actionStatus')
  };
}

function setBusy(button, busy, label, normalLabel) {
  button.disabled = busy;
  button.textContent = busy ? label : normalLabel;
}

function showError(elements, title, message) {
  elements.loading.hidden = true;
  elements.nameStep.hidden = true;
  elements.previewStep.hidden = true;
  elements.errorStep.hidden = false;
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
}

function safeFilename(name) {
  return normalizeRecipientName(name).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'ผู้เข้าร่วมกิจกรรม';
}

export function bootCertificatePortal(elements = getElements()) {
  let payload = null;
  let certificateBlob = null;
  let certificateUrl = '';

  const releaseCertificateUrl = () => {
    if (certificateUrl) URL.revokeObjectURL(certificateUrl);
    certificateUrl = '';
  };

  const start = async () => {
    const params = new URLSearchParams(window.location.search);
    const handoffId = params.get('h') || '';
    history.replaceState({}, '', window.location.pathname);
    if (!/^[a-f0-9]{32}$/.test(handoffId)) {
      showError(elements, 'สแกน QR จาก kiosk', 'เปิดลิงก์จาก QR บนหน้าจอ kiosk เพื่อรับตัวละครและทำใบประกาศ');
      return;
    }

    try {
      const response = await fetch('/api/handoff?h=' + encodeURIComponent(handoffId), {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !validatePortalHandoff(result).ok) {
        throw new Error(result.error || 'QR นี้หมดอายุหรือถูกใช้แล้ว กรุณาสแกน QR ใหม่จาก kiosk');
      }
      payload = result;
      elements.portrait.src = payload.portraitDataUrl;
      elements.energy.textContent = payload.totalKcal.toLocaleString('th-TH');
      elements.groups.textContent = payload.groupsCount + ' / 5 หมู่';
      elements.loading.hidden = true;
      elements.nameStep.hidden = false;
    } catch (error) {
      showError(elements, 'รับตัวละครไม่สำเร็จ', error.message || 'กรุณาสแกน QR ใหม่จาก kiosk');
    }
  };

  elements.rescanButton.addEventListener('click', () => {
    history.replaceState({}, '', window.location.pathname);
    showError(elements, 'พร้อมสแกนใหม่', 'เปิดกล้องมือถือแล้วสแกน QR ที่แสดงบน kiosk');
  });

  elements.form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = normalizeRecipientName(elements.name.value);
    if (!name) {
      elements.nameError.textContent = 'กรุณาพิมพ์ชื่อบนใบประกาศ';
      elements.nameError.hidden = false;
      elements.name.focus();
      return;
    }
    if (!payload) return;
    elements.nameError.hidden = true;
    setBusy(elements.confirm, true, 'กำลังจัดทำใบประกาศ…', 'ยืนยันชื่อและดูใบประกาศ');
    try {
      certificateBlob = await createCertificateBlob(payload, name);
      releaseCertificateUrl();
      certificateUrl = URL.createObjectURL(certificateBlob);
      elements.certificate.src = certificateUrl;
      elements.printSheet.src = certificateUrl;
      elements.greeting.textContent = 'ใบประกาศสำหรับ ' + name + ' พร้อมบันทึกแล้ว';
      elements.nameStep.hidden = true;
      elements.previewStep.hidden = false;
      elements.status.textContent = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      elements.nameError.textContent = error.message || 'สร้างใบประกาศไม่สำเร็จ กรุณาลองอีกครั้ง';
      elements.nameError.hidden = false;
    } finally {
      setBusy(elements.confirm, false, '', 'ยืนยันชื่อและดูใบประกาศ');
    }
  });

  elements.download.addEventListener('click', () => {
    if (!certificateBlob) return;
    const link = document.createElement('a');
    link.href = certificateUrl;
    link.download = 'ใบประกาศ_' + safeFilename(elements.name.value) + '.png';
    document.body.append(link);
    link.click();
    link.remove();
    elements.status.textContent = 'ดาวน์โหลดภาพใบประกาศแล้ว';
  });

  elements.pdf.addEventListener('click', () => {
    if (!certificateBlob) return;
    elements.status.textContent = 'เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์';
    window.setTimeout(() => window.print(), 100);
  });

  elements.share.addEventListener('click', async () => {
    if (!certificateBlob) return;
    const filename = 'ใบประกาศ_' + safeFilename(elements.name.value) + '.png';
    try {
      const file = new File([certificateBlob], filename, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: 'ใบประกาศกิจกรรมอาหารและสุขภาพ' });
        elements.status.textContent = 'แชร์ใบประกาศแล้ว';
      } else {
        elements.download.click();
        elements.status.textContent = 'เบราว์เซอร์นี้ไม่รองรับเมนูแชร์ จึงดาวน์โหลดภาพให้แทน';
      }
    } catch (error) {
      if (error.name !== 'AbortError') elements.status.textContent = 'แชร์ไม่สำเร็จ ลองดาวน์โหลดภาพแทนได้';
    }
  });

  elements.edit.addEventListener('click', () => {
    elements.previewStep.hidden = true;
    elements.nameStep.hidden = false;
    elements.name.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('pagehide', releaseCertificateUrl, { once: true });
  start();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootCertificatePortal(), { once: true });
  } else {
    bootCertificatePortal();
  }
}
