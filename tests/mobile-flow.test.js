import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
