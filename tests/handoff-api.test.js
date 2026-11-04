import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHandoffPayload, MAX_IMAGE_DATA_URL_CHARS, MAX_REQUEST_BYTES } from '../src/handoff-schema.js';
import { HandoffStore } from '../src/handoff-store.js';
import worker from '../src/worker.js';

const validPayload = () => ({
  version: 1,
  portraitDataUrl: 'data:image/webp;base64,' + 'A'.repeat(80),
  gender: 'girl',
  totalKcal: 820,
  groupsCount: 4
});

function fakeState() {
  const rows = [];
  let tableExists = false;
  const state = { alarm: null, failAlarm: false };
  const storage = {
    sql: {
      exec(query, ...bindings) {
        const normalized = query.trim().toLowerCase();
        if (normalized.startsWith('create table')) { tableExists = true; return { toArray: () => [] }; }
        if (normalized.startsWith('delete from certificate_handoffs')) {
          rows.length = 0;
          return { toArray: () => [] };
        }
        if (normalized.startsWith('insert into certificate_handoffs')) {
          if (!tableExists) throw new Error('missing table');
          rows.push({ payload: bindings[0], expires_at: bindings[1] });
          return { toArray: () => [] };
        }
        if (normalized.startsWith('select payload, expires_at from certificate_handoffs')) {
          if (!tableExists) throw new Error('missing table');
          return { toArray: () => rows.map(row => ({ ...row })) };
        }
        throw new Error('Unexpected SQL: ' + query);
      }
    },
    transactionSync(callback) { return callback(); },
    async setAlarm(timestamp) { if (state.failAlarm) throw new Error('alarm failed'); state.alarm = timestamp; },
    async deleteAll() { rows.length = 0; state.alarm = null; tableExists = false; }
  };
  return { storage, rows, state };
}

function fakeEnvironment() {
  const stores = new Map();
  return {
    stores,
    ASSETS: { async fetch(request) { return new Response('asset:' + new URL(request.url).pathname); } },
    HANDOFFS: {
      idFromName(name) { return name; },
      get(id) {
        return {
          async fetch(request) {
            let store = stores.get(id);
            if (!store) {
              const fake = fakeState();
              store = { object: new HandoffStore(fake), fake };
              stores.set(id, store);
            }
            return store.object.fetch(request);
          }
        };
      }
    }
  };
}

test('validates a complete, anonymous full-character handoff', () => {
  const result = validateHandoffPayload(validPayload());
  assert.equal(result.ok, true);
  assert.equal(result.value.groupsCount, 4);
});

test('rejects invalid images and missing required fields', () => {
  const noImage = validPayload();
  delete noImage.portraitDataUrl;
  assert.equal(validateHandoffPayload(noImage).ok, false);
  assert.equal(validateHandoffPayload({ ...validPayload(), portraitDataUrl: 'data:image/png;base64,AAAA' }).ok, false);
});

test('rejects a visitor name and other unrecognized fields from the server payload', () => {
  assert.equal(validateHandoffPayload({ ...validPayload(), name: 'น้องเมย์' }).ok, false);
  assert.equal(validateHandoffPayload({ ...validPayload(), extra: 'value' }).ok, false);
});

test('rejects image data above the configured limit', () => {
  assert.equal(validateHandoffPayload({
    ...validPayload(),
    portraitDataUrl: 'data:image/webp;base64,' + 'A'.repeat(MAX_IMAGE_DATA_URL_CHARS)
  }).ok, false);
});

test('stores a handoff for 300 seconds and consumes it only once', async () => {
  const previousNow = Date.now;
  const start = 1_800_000_000_000;
  Date.now = () => start;
  try {
    const fake = fakeState();
    const store = new HandoffStore(fake);
    const storeResponse = await store.fetch(new Request('https://handoff/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: validPayload() })
    }));
    assert.equal(storeResponse.status, 201);
    assert.equal(fake.state.alarm, start + 300_000);
    const [first, second] = await Promise.all([
      store.fetch(new Request('https://handoff/consume', { method: 'POST' })),
      store.fetch(new Request('https://handoff/consume', { method: 'POST' }))
    ]);
    assert.equal(first.status + second.status, 200 + 404);
  } finally {
    Date.now = previousNow;
  }
});

test('expired and missing handoffs return 404 and clear stored data', async () => {
  const previousNow = Date.now;
  let now = 1_800_000_000_000;
  Date.now = () => now;
  try {
    const fake = fakeState();
    const store = new HandoffStore(fake);
    await store.fetch(new Request('https://handoff/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: validPayload() })
    }));
    now += 300_001;
    const expired = await store.fetch(new Request('https://handoff/consume', { method: 'POST' }));
    assert.equal(expired.status, 404);
    assert.equal(fake.rows.length, 0);
    assert.equal((await store.fetch(new Request('https://handoff/consume', { method: 'POST' }))).status, 404);
  } finally {
    Date.now = previousNow;
  }
});

test('Worker creates a random QR link, serves the handoff once, and marks responses no-store', async () => {
  const env = fakeEnvironment();
  const post = await worker.fetch(new Request('https://portal.example/api/handoff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload())
  }), env);
  assert.equal(post.status, 201);
  assert.match(post.headers.get('Cache-Control'), /no-store/);
  const created = await post.json();
  assert.match(created.id, /^[a-f0-9]{32}$/);
  assert.equal(new URL(created.url).searchParams.get('h'), created.id);
  assert.equal(created.expiresInSeconds, 300);

  const get = () => worker.fetch(new Request(
    'https://portal.example/api/handoff?h=' + created.id
  ), env);
  const first = await get();
  assert.equal(first.status, 200);
  assert.match(first.headers.get('Cache-Control'), /no-store/);
  assert.equal((await first.json()).portraitDataUrl, validPayload().portraitDataUrl);
  assert.equal((await get()).status, 404);
});

test('rejects oversized API bodies and handles CORS preflight', async () => {
  const env = fakeEnvironment();
  const oversized = await worker.fetch(new Request('https://portal.example/api/handoff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validPayload(), portraitDataUrl: 'data:image/webp;base64,' + 'A'.repeat(MAX_REQUEST_BYTES + 1) })
  }), env);
  assert.equal(oversized.status, 413);
  const preflight = await worker.fetch(new Request('https://portal.example/api/handoff', { method: 'OPTIONS' }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), '*');
});


test('recreates the empty table after a consumed handoff and cleans failed stores', async () => {
  const fake = fakeState();
  const store = new HandoffStore(fake);
  const storeRequest = () => new Request('https://handoff/store', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: validPayload() })
  });
  await store.fetch(storeRequest());
  assert.equal((await store.fetch(new Request('https://handoff/consume', { method: 'POST' }))).status, 200);
  assert.equal((await store.fetch(new Request('https://handoff/consume', { method: 'POST' }))).status, 404);

  fake.state.failAlarm = true;
  const failed = await store.fetch(storeRequest());
  assert.equal(failed.status, 503);
  assert.equal(fake.rows.length, 0);
});
