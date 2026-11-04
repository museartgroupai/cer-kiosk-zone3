# Mobile Certificate Portal Design

## Intent
Build a separate, mobile-first website in museartgroupai/cer-kiosk-zone3 for museum visitors who scan a kiosk QR. The site receives the exact full-character image and activity results, asks for the certificate name on the phone, previews a formal certificate, and lets the visitor download or share it.

## Privacy and data
- The visitor name is rendered only in the browser; it is never sent to the Worker or placed in a URL.
- The QR contains only a cryptographically random, one-time handoff ID.
- The Worker stores the character portrait and non-identifying activity result for at most 5 minutes; the first successful read consumes it. An alarm cleans expired handoffs.
- The site does not use a database, analytics, cookies, localStorage, or service-worker caching for visitor data.
- The kiosk must send a composed full-body portrait (not only the face crop) so the certificate uses the exact appearance selected on the kiosk.

## Visitor flow
1. Scan the QR; the mobile page receives the portrait and activity summary.
2. Enter a name with the phone keyboard and confirm.
3. Preview the A4 landscape certificate; save PNG, print/save PDF, or share.
4. Expired/used QR shows a plain explanation and asks the visitor to scan again.

## Architecture
One Cloudflare Worker serves static assets and API routes. A SQLite-backed Durable Object stores each random-token handoff, with a five-minute alarm and atomic one-time consumption. A small browser-only integration helper lets the kiosk POST a complete portrait and results, then use the returned URL with its existing QR renderer.

## Visual direction
A calm museum certificate aesthetic: warm ivory paper, forest-green type, restrained gold accent, one clear step at a time, large touch targets (minimum 48 CSS px), and responsive layouts designed for narrow phones. The certificate itself is formal and print-oriented while its controls remain thumb-friendly.

## Approaches considered
- Separate Worker with static mobile site and transient handoff store (chosen): independent deployment and CI; exact portrait is transferred as one optimized image; no dependency on the old website after the kiosk sends to this endpoint.
- Frontend only with all data in QR: avoids server storage but cannot reliably fit a full portrait image in a QR code.
- New frontend using the old project's certificate endpoint: smaller initial integration but keeps the new website coupled to the old deployment and its storage lifetime.

## Constraints and non-goals
- Do not modify the existing kiosk project in this task.
- No visitor account, database, name submission, analytics, or permanent archive.
- Do not deploy to Cloudflare; prepare the project and CI for the owner to deploy later.
- The kiosk sender must be switched to this portal's API before museum use.
