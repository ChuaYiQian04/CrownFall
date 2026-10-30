# Verification — 30 October 2026

| Check | Result | Scope |
| --- | --- | --- |
| `npm run build` | Passed | TypeScript and Vite production output in `dist/` |
| `npm run test` | 18 tests passed | Canonical game rules, React host/tutorial flows, demo rooms and configuration errors |
| `npm run test:e2e` | 6 tests passed | Chromium at 390×844 and 1440×1000; host, invitation, sample seats, reload, second-tab joining, duplicate names, host transfer, settings dialog and saved reduced motion |
| `npm run test:db` | Passed | Both migrations applied to embedded PostgreSQL with pgcrypto; SQL security assertions passed |
| `npm audit --omit=dev --audit-level=moderate` | No reported vulnerabilities | Production dependency advisory check at implementation time |
| Screenshot review | Completed | Original mobile and desktop home layouts, no horizontal overflow in tested viewports |

Database assertions exercise member-only reads, idempotent rejoining, case-insensitive nickname uniqueness, stale-version rejection, role settings validation, capacity, host-only actions, removal, explicit host transfer, denied direct mutation, denied secret reads and revoked unauthenticated RPC access.

The database harness uses PGlite, real PostgreSQL compiled to WASM, with a minimal `auth.users` table and a stub `auth.uid()` function. It applies the actual migrations without rewriting them. It does not provide Supabase Auth, PostgREST, a Realtime server, parallel database sessions or hosted platform defaults. Passing these assertions does not certify a production Supabase deployment.

Not verified: hosted anonymous authentication, actual cross-device Realtime, concurrent requests, real QR camera scanning, native mobile sharing, spoken audio on physical phones, iOS Safari/Android Chrome lifecycle behavior, real 360–430px devices, Cloudflare deployment, or any future gameplay functionality. The browser tests exercise the explicitly labeled local demo. No cloud credentials were available or added.

Build tools initially encountered Windows sandbox ancestor-directory access restrictions; the successful build/test runs used approved execution outside that restriction. This is an environment constraint, not an application runtime requirement.
