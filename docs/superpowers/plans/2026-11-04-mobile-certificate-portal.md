# Mobile Certificate Portal Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build an independent Cloudflare Worker website for phone-based name entry and certificate download from a one-time kiosk QR.

**Architecture:** A static mobile-first client is served by one Worker. A Durable Object accepts a complete character portrait and metrics, expires it after five minutes, and returns it exactly once. The client draws the certificate locally and never sends or stores the name.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Cloudflare Workers Static Assets, SQLite-backed Durable Objects, Node built-in test runner, Wrangler.

**Spec:** docs/superpowers/specs/2026-11-04-mobile-certificate-portal-design.md

## Global Constraints
- Handoff expiry is exactly 300 seconds.
- Portrait format is WebP data URL, at most 280 KiB encoded.
- Recipient name is never submitted to the Worker, placed in a URL, or persisted in browser storage.
- Certificate page has no analytics, cookies, or service worker.
- Do not change the existing kiosk repository or deploy the Worker.

## Review Focus
- Invalid or oversized portrait payload returns 400/413 without creating a handoff — API tests.
- Missing, expired, or already-consumed handoff returns a clear 404 — Durable Object tests.
- Concurrent consumers cannot both retrieve the same payload — atomic consume test.
- Visitor name is rendered locally and absent from network/API contracts — client and markup tests.
- A QR without a token or an expired token gets a usable rescan path on small screens — UI markup and behavior test.

---

### Task 1: Temporary QR handoff API

**Files:**
- Create: src/handoff-schema.js
- Create: src/handoff-store.js
- Create: src/worker.js
- Create: wrangler.jsonc
- Create: tests/handoff-api.test.js

**Interfaces:**
- validateHandoffPayload(value) returns { ok: true, value } or { ok: false, error }.
- HandoffStore.fetch(request) accepts POST /store and POST /consume.
- Worker fetch(request, env) handles POST /api/handoff, GET /api/handoff?h=<32 hex>, OPTIONS /api/handoff, and delegates other paths to env.ASSETS.fetch(request).

- [x] Write tests for valid payload, missing/invalid image, forbidden name property, oversized body, 300-second alarm, one-time consumption, expired/missing token, and API Cache-Control no-store.
- [x] Run node --test tests/handoff-api.test.js; confirm the expected missing-module failures.
- [x] Implement schema validation, Worker routes, and an atomic Durable Object consume; set/delete alarms and return cache-disabled JSON responses.
- [x] Run node --test tests/handoff-api.test.js; all cases pass.

### Task 2: Mobile certificate flow and kiosk handoff helper

**Files:**
- Create: public/index.html
- Create: public/styles.css
- Create: public/app.js
- Create: public/kiosk-bridge.js
- Create: tests/mobile-flow.test.js

**Interfaces:**
- window.CerKioskZone3.createHandoffUrl({ portalOrigin, portraitDataUrl, gender, totalKcal, groupsCount }) posts the anonymous handoff and returns the QR URL.
- Client normalizeRecipientName(value) returns trimmed name limited to 60 Unicode code points.
- Browser fetches a QR handoff once; name entry, certificate rendering, PNG, PDF printing, and sharing stay in the browser.

- [x] Write tests for Thai/Unicode name normalization, 60-character limit, non-persistence contract, and mobile document essentials.
- [x] Run node --test tests/mobile-flow.test.js; confirm the missing-module or failing-contract output.
- [x] Implement responsive name and preview states, large controls, explicit loading/expired/error states, browser-side A4 certificate rendering, and the kiosk bridge helper.
- [x] Run node --test tests/mobile-flow.test.js and node --check public/app.js; all pass.

### Task 3: CI, Cloudflare configuration, documentation, and final checks

**Files:**
- Create: .github/workflows/ci.yml
- Create: package.json
- Create: .gitignore
- Create: README.md

- [x] Configure CI on pushes and pull requests to run Node 22 install, syntax checks, unit tests, and a Wrangler dry-run build.
- [x] Document the 5-minute handoff contract, kiosk integration helper, and Cloudflare deployment steps.
- [x] Run `npm ci`, `npm run check`, `npm test`, `npm run build`, a local Worker handoff smoke test, and staged whitespace review.
