import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PORTRAIT_AREA, fitPortraitToArea } from '../public/certificate.js';
import { normalizeRecipientName, validatePortalHandoff } from '../public/app.js';
import { createHandoffUrl } from '../public/kiosk-bridge.js';

const valid = () => ({
  version: 1,
  portraitDataUrl: 'data:image/webp;base64,' + 'A'.repeat(80),
  gender: 'girl',
  totalKcal: 820,
  groupsCount: 4
});

test('normalizes Thai names and limits by Unicode characters', () => {
  assert.equal(normalizeRecipientName('  น้อง   มีนา\n  '), 'น้อง มีนา');
  assert.equal(Array.from(normalizeRecipientName('ก'.repeat(61))).length, 60);
});

test('accepts only a valid anonymous handoff payload', () => {
  assert.equal(validatePortalHandoff(valid()).ok, true);
  assert.equal(validatePortalHandoff({ ...valid(), name: 'น้องมีนา' }).ok, false);
  assert.equal(validatePortalHandoff({ ...valid(), groupsCount: 7 }).ok, false);
});

test('mobile page provides a real name field and avoids auto-opening the keyboard', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /name="recipientName"/);
  assert.match(html, /autocomplete="name"/);
  assert.match(html, /enterkeyhint="done"/);
  assert.doesNotMatch(html, /autofocus/i);
  assert.match(html, /name="viewport"/);
});

test('mobile styles keep primary actions large and use a narrow-screen layout', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:\s*56px/);
  assert.match(css, /max-width:\s*600px/);
  assert.match(css, /@media\s+print/);
});

test('visitor name is never sent to a server or browser storage', async () => {
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(script, /fetch\([^)]*recipientName/s);
});

test('kiosk bridge posts only the portrait and activity summary and returns a QR URL', async () => {
  const previousFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://cert.example/api/handoff');
    assert.equal(options.cache, 'no-store');
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      id: '0123456789abcdef0123456789abcdef',
      url: 'https://cert.example/?h=0123456789abcdef0123456789abcdef',
      expiresInSeconds: 300
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const url = await createHandoffUrl({
      portalOrigin: 'https://cert.example',
      ...valid()
    });
    assert.match(url, /\?h=0123456789abcdef0123456789abcdef$/);
    assert.equal('name' in requestBody, false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('certificate is finalized once without an edit-name action', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="editNameButton"/);
  assert.match(html, /id="confirmNameDialog"/);
  assert.match(html, /ยืนยันและออกเกียรติบัตร/);
  assert.match(script, /finalized = true/);
  assert.match(script, /elements\.name\.disabled = true/);
});

test('certificate uses both official logos and current Bangkok date', async () => {
  const script = await readFile(new URL('../public/certificate.js', import.meta.url), 'utf8');
  assert.match(script, /learning-encouragement\.webp/);
  assert.match(script, /science-education\.webp/);
  assert.match(script, /Asia\/Bangkok/);
  assert.doesNotMatch(script, /signature scribble/i);
});


test('certificate background is text-free and signature-free; center and date render dynamically', async () => {
  const source = await readFile(new URL('../public/certificate.js', import.meta.url), 'utf8');
  const bg = await readFile(new URL('../public/certificate-background.webp', import.meta.url));
  assert.ok(bg.length > 1000);
  assert.match(source, /certificate-background\.webp/);
  assert.match(source, /ศูนย์วิทยาศาสตร์เพื่อการศึกษาขอนแก่น/);
  assert.match(source, /'ให้ไว้ ณ วันที่ ' \+ date/);
  assert.doesNotMatch(source, /'ผู้จัดกิจกรรม'/);
  assert.doesNotMatch(source, /'ผู้อำนวยการ'/);
});

test('new A4 background uses AVIF and retains a WebP fallback', async () => {
  const script = await readFile(new URL('../public/certificate.js', import.meta.url), 'utf8');
  const image = await readFile(new URL('../public/certificate-background.avif', import.meta.url));
  assert.ok(image.length > 7000);
  assert.equal(image.toString('ascii', 4, 8), 'ftyp');
  assert.equal(image.toString('ascii', 8, 12), 'avif');
  assert.ok(script.includes("optionalImage('/certificate-background.avif')"));
  assert.ok(script.includes("optionalImage('/certificate-background.webp')"));
});


test('public-facing copy is clear of developer terminology and internal errors', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /kiosk|handoff|\bAPI\b|debug|\bdev\b|ไม่มีการสมัครสมาชิก/i);
  assert.doesNotMatch(script, /result\.error|kiosk/i);
  assert.match(html, /ศูนย์วิทยาศาสตร์เพื่อการศึกษาขอนแก่น/);
  assert.match(html, /id="confirmNameDialog"/);
  assert.match(script, /คิวอาร์โค้ดนี้หมดอายุหรือใช้งานแล้ว/);
});


test('larger certificate character stays within the lower-left safe zone', () => {
  assert.ok(PORTRAIT_AREA.x >= 90);
  assert.ok(PORTRAIT_AREA.y >= 1150);
  assert.ok(PORTRAIT_AREA.x + PORTRAIT_AREA.width < 700);
  assert.ok(PORTRAIT_AREA.y + PORTRAIT_AREA.height < 1690);
  // The last implementation was only 260 pixels tall.
  assert.ok(PORTRAIT_AREA.height >= 480);
  for (const [width, height] of [[400, 800], [800, 800], [600, 900]]) {
    const placement = fitPortraitToArea(width, height);
    assert.ok(placement.x >= PORTRAIT_AREA.x - 0.001);
    assert.ok(placement.y >= PORTRAIT_AREA.y - 0.001);
    assert.ok(placement.x + placement.width <= PORTRAIT_AREA.x + PORTRAIT_AREA.width + 0.001);
    assert.ok(placement.y + placement.height <= PORTRAIT_AREA.y + PORTRAIT_AREA.height + 0.001);
  }
  assert.equal(fitPortraitToArea(0, 800), null);
});

test('certificate uses the larger portrait renderer instead of old small corner placement', async () => {
  const script = await readFile(new URL('../public/certificate.js', import.meta.url), 'utf8');
  assert.match(script, /drawLargePortrait\(ctx, portrait\)/);
  assert.doesNotMatch(script, /x:\s*1865,\s*y:\s*1260/);
  assert.match(script, /visiblePortraitBounds/);
});
