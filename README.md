# Audrea Cove

A detailed fictional beach resort in Laiya, San Juan, Batangas, created as a DA Web & Media hospitality portfolio project.

## Experience

- Responsive resort presentation, AI-generated imagery, room details, activities, sample dining menu, gallery, location guide, FAQs, guest guide, privacy notice, and sample terms.
- Local WebGL 3D resort diorama with spring camera movement, procedural waves, palm sway, drag and keyboard controls, day/sunset lighting, reduced-motion support, and a fallback for unavailable WebGL.
- Availability checks, room capacity limits, weekday/weekend pricing, atomic inventory reservations, simulated deposits, pay-at-resort selection, and printable confirmations.
- Protected management workspace: overview, bookings, calendar, simulated payment ledger, check-in/out, housekeeping/maintenance, guest records, monthly reporting, CSV exports, notifications, profile, and booking activity.

## Runtime

No application packages are required. Node.js 24 or newer is used for local development, building, and verification. The hosted server is a Cloudflare-compatible Worker with a Sites-managed D1 database. Hosting injects authenticated identity; all data operations are scoped to that identity. The project must remain owner-private. This is a per-user resort demonstration, not an unrestricted public resort staff system.

`node scripts/serve.mjs` serves http://127.0.0.1:5173 using a local-only mock identity and SQLite database in .sites-runtime. Mock identity is never included in the deployed Worker.

`node scripts/verify.mjs` runs meaningful API and asset checks against an isolated in-memory database.

`node scripts/build.mjs` embeds local assets in dist/server/index.js and copies the hosting manifest. Source SQL migrations are packaged by the Sites helper.

## Boundaries

Every property detail, price, amenity, layout, and image is illustrative. No real resort, charge, refund, email, SMS, or accommodation reservation is arranged. Enter invented guest details. No payment credentials are requested. In-app notification preferences affect only the demonstration feed.

Before a commercial launch: create a verified staff membership model distinct from guests, connect a payment provider and transactional email, replace fictional information, validate accessibility and all policies, and complete operational browser/security testing. Unused framework scaffolding remains ignored locally; the published application uses only public/, src/data.js, worker/index.js, the SQL migration, and the four authored scripts.
