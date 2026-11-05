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
    confirmDialog: document.querySelector('#confirmNameDialog'),
    confirmedName: document.querySelector('#confirmedName'),
    cancelName: document.querySelector('#cancelNameButton'),
    finalizeName: document.querySelector('#finalizeNameButton'),
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
  let finalized = false;
  let generating = false;
  let issuedName = '';

  const releaseCertificateUrl = () => {
    if (certificateUrl) URL.revokeObjectURL(certificateUrl);
    certificateUrl = '';
  };

  const start = async () => {
    const params = new URLSearchParams(window.location.search);
    const handoffId = params.get('h') || '';
    history.replaceState({}, '', window.location.pathname);
    if (!/^[a-f0-9]{32}$/.test(handoffId)) {
      showError(elements, 'เริ่มรับเกียรติบัตร', 'กรุณาสแกนคิวอาร์โค้ดจากหน้าจอกิจกรรม');
      return;
    }

    try {
      const response = await fetch('/api/handoff?h=' + encodeURIComponent(handoffId), {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !validatePortalHandoff(result).ok) {
        // Keep internal service errors off the visitor's screen.
        throw new Error(response.status === 404 || response.status === 410
          ? 'คิวอาร์โค้ดนี้หมดอายุหรือใช้งานแล้ว กรุณาสแกนใหม่'
          : 'ไม่สามารถเปิดเกียรติบัตรได้ กรุณาลองอีกครั้ง');
      }
      payload = result;
      elements.portrait.src = payload.portraitDataUrl;
      elements.energy.textContent = payload.totalKcal.toLocaleString('th-TH');
      elements.groups.textContent = payload.groupsCount + ' / 5 หมู่';
      elements.loading.hidden = true;
      elements.nameStep.hidden = false;
    } catch (error) {
      const knownMessages = new Set([
        'คิวอาร์โค้ดนี้หมดอายุหรือใช้งานแล้ว กรุณาสแกนใหม่',
        'ไม่สามารถเปิดเกียรติบัตรได้ กรุณาลองอีกครั้ง'
      ]);
      const message = knownMessages.has(error?.message)
        ? error.message
        : 'ไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง';
      showError(elements, 'เปิดเกียรติบัตรไม่สำเร็จ', message);
    }
  };

  elements.rescanButton.addEventListener('click', () => {
    history.replaceState({}, '', window.location.pathname);
    showError(elements, 'สแกนอีกครั้ง', 'เปิดกล้องแล้วสแกนคิวอาร์โค้ดที่หน้าจอกิจกรรม');
  });

  // The visitor may correct the spelling only before the final confirmation.
  elements.form.addEventListener('submit', event => {
    event.preventDefault();
    if (finalized || generating || !payload) return;
    const name = normalizeRecipientName(elements.name.value);
    if (!name) {
      elements.nameError.textContent = 'กรุณากรอกชื่อบนเกียรติบัตร';
      elements.nameError.hidden = false;
      elements.name.focus();
      return;
    }
    elements.nameError.hidden = true;
    elements.confirmedName.textContent = name;
    elements.confirmDialog.showModal();
  });

  elements.cancelName.addEventListener('click', () => {
    if (!generating) elements.confirmDialog.close();
  });

  elements.finalizeName.addEventListener('click', async () => {
    if (finalized || generating || !payload) return;
    const name = normalizeRecipientName(elements.name.value);
    if (!name) {
      elements.confirmDialog.close();
      elements.nameError.textContent = 'กรุณากรอกชื่อบนเกียรติบัตร';
      elements.nameError.hidden = false;
      return;
    }
    generating = true;
    elements.confirmDialog.close();
    setBusy(elements.confirm, true, 'กำลังออกเกียรติบัตร…', 'ตรวจสอบและยืนยันชื่อ');
    try {
      // Only transition to finalized after a PNG was rendered successfully.
      const blob = await createCertificateBlob(payload, name);
      certificateBlob = blob;
      releaseCertificateUrl();
      certificateUrl = URL.createObjectURL(certificateBlob);
      elements.certificate.src = certificateUrl;
      elements.printSheet.src = certificateUrl;
      issuedName = name;
      finalized = true;
      elements.name.value = name;
      elements.name.readOnly = true;
      elements.name.disabled = true;
      elements.confirm.disabled = true;
      elements.greeting.textContent = 'เกียรติบัตรสำหรับ ' + name + ' พร้อมบันทึกแล้ว';
      elements.nameStep.hidden = true;
      elements.previewStep.hidden = false;
      elements.status.textContent = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      elements.nameError.textContent = 'สร้างเกียรติบัตรไม่สำเร็จ กรุณาลองอีกครั้ง';
      elements.nameError.hidden = false;
    } finally {
      generating = false;
      if (!finalized) setBusy(elements.confirm, false, '', 'ตรวจสอบและยืนยันชื่อ');
    }
  });

  elements.download.addEventListener('click', () => {
    if (!certificateBlob) return;
    const link = document.createElement('a');
    link.href = certificateUrl;
    link.download = 'เกียรติบัตร_' + safeFilename(issuedName) + '.png';
    document.body.append(link);
    link.click();
    link.remove();
    elements.status.textContent = 'ดาวน์โหลดเกียรติบัตรแล้ว';
  });

  elements.pdf.addEventListener('click', () => {
    if (!certificateBlob) return;
    elements.status.textContent = 'เลือกบันทึกเป็น PDF เพื่อเก็บเกียรติบัตร';
    window.setTimeout(() => window.print(), 100);
  });

  elements.share.addEventListener('click', async () => {
    if (!certificateBlob) return;
    const filename = 'เกียรติบัตร_' + safeFilename(issuedName) + '.png';
    try {
      const file = new File([certificateBlob], filename, { type: 'image/png' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: 'เกียรติบัตรกิจกรรมอาหารและสุขภาพ' });
        elements.status.textContent = 'แชร์เกียรติบัตรแล้ว';
      } else {
        elements.download.click();
        elements.status.textContent = 'บันทึกเกียรติบัตรให้แล้ว สามารถแชร์จากรูปภาพได้';
      }
    } catch (error) {
      if (error.name !== 'AbortError') elements.status.textContent = 'แชร์ไม่สำเร็จ ลองดาวน์โหลดภาพแทนได้';
    }
  });

  // Back-forward cache keeps the immutable preview; never restore the name form.
  window.addEventListener('pageshow', () => {
    if (finalized) {
      elements.nameStep.hidden = true;
      elements.previewStep.hidden = false;
    }
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) releaseCertificateUrl();
  });
  start();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootCertificatePortal(), { once: true });
  } else {
    bootCertificatePortal();
  }
}
