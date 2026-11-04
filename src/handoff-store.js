import { HANDOFF_TTL_SECONDS, validateHandoffPayload } from './handoff-schema.js';

const TABLE = 'certificate_handoffs';
const NO_STORE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: NO_STORE_HEADERS });
}

export class HandoffStore {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
    this.sql = state.storage.sql;
    this.ensureTable();
  }

  ensureTable() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ${TABLE} (
      payload TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`);
  }

  async fetch(request) {
    // deleteAll() in the alarm and after a consume also removes the table.
    this.ensureTable();
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    if (path === '/store') return this.store(request);
    if (path === '/consume') return this.consume();
    return json({ error: 'Not found' }, 404);
  }

  async store(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid handoff payload' }, 400);
    }

    const validation = validateHandoffPayload(body?.payload);
    if (!validation.ok) return json({ error: validation.error }, 400);

    const expiresAt = Date.now() + HANDOFF_TTL_SECONDS * 1000;
    try {
      this.storage.transactionSync(() => {
        this.sql.exec(`DELETE FROM ${TABLE}`);
        this.sql.exec(
          `INSERT INTO ${TABLE} (payload, expires_at) VALUES (?, ?)`,
          JSON.stringify(validation.value),
          expiresAt
        );
      });
      await this.storage.setAlarm(expiresAt);
    } catch {
      await this.storage.deleteAll().catch(() => {});
      return json({ error: 'Cannot prepare temporary handoff' }, 503);
    }
    return json({ stored: true, expiresAt }, 201);
  }

  async consume() {
    const payload = this.storage.transactionSync(() => {
      const row = this.sql.exec(`SELECT payload, expires_at FROM ${TABLE} LIMIT 1`).toArray()[0];
      this.sql.exec(`DELETE FROM ${TABLE}`);
      if (!row || row.expires_at <= Date.now()) return null;
      try {
        return JSON.parse(row.payload);
      } catch {
        return null;
      }
    });

    // Each token has its own Durable Object. Remove the payload and alarm after
    // a successful read (or an expired read); the URL can never be replayed.
    await this.storage.deleteAll();
    if (!payload) return json({ error: 'Handoff expired or already used' }, 404);
    return json(payload);
  }

  async alarm() {
    await this.storage.deleteAll();
  }
}
