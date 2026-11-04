import { HANDOFF_TTL_SECONDS, MAX_REQUEST_BYTES, validateHandoffPayload } from './handoff-schema.js';

const API_PATH = '/api/handoff';
const PRIVATE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '300'
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: PRIVATE_HEADERS });
}

function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function getStub(env, token) {
  const id = env.HANDOFFS.idFromName(token);
  return env.HANDOFFS.get(id);
}

async function handlePost(request, env) {
  if (!env.HANDOFFS) return json({ error: 'Handoff service is not configured' }, 503);
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: 'Character image is too large' }, 413);

  let raw;
  let body;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: 'Character image is too large' }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid handoff payload' }, 400);
  }

  const validation = validateHandoffPayload(body);
  if (!validation.ok) return json({ error: validation.error }, 400);

  const token = makeToken();
  const stub = await getStub(env, token);
  const stored = await stub.fetch(new Request('https://handoff/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: validation.value })
  }));
  if (!stored.ok) return json({ error: 'Could not prepare this certificate' }, 503);

  const link = new URL('/', request.url);
  link.searchParams.set('h', token);
  return json({ id: token, url: link.toString(), expiresInSeconds: HANDOFF_TTL_SECONDS }, 201);
}

async function handleGet(request, env) {
  if (!env.HANDOFFS) return json({ error: 'Handoff service is not configured' }, 503);
  const token = new URL(request.url).searchParams.get('h') || '';
  if (!/^[a-f0-9]{32}$/.test(token)) return json({ error: 'Invalid handoff link' }, 400);

  const stub = await getStub(env, token);
  const consumed = await stub.fetch(new Request('https://handoff/consume', { method: 'POST' }));
  return new Response(consumed.body, { status: consumed.status, headers: PRIVATE_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== API_PATH) return env.ASSETS.fetch(request);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
    if (request.method === 'POST') return handlePost(request, env);
    if (request.method === 'GET') return handleGet(request, env);
    return json({ error: 'Method not allowed' }, 405);
  }
};

export { handleGet, handlePost, makeToken };

export { HandoffStore } from './handoff-store.js';
