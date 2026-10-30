# CROWNFALL

**Every crown hides a traitor.** A mobile-first social deduction game for a group sharing a table, using a phone each.

## Current build

The first milestone is implemented: original responsive home, host/join forms, invitation links, camera QR scanning, QR invitations, player roster, host settings/removal, explicit leave and host transfer, tutorial, local preferences and narration preview. Supabase integration includes anonymous session restoration, member-only lobby snapshots, Realtime room invalidation and refetch on reconnect/focus.

**Gameplay is not implemented yet.** Start Game is visibly disabled. Secure role assignment, card reveal, readiness, ceremony, team/quest voting, assassination, scoreboard, rematches, automatic disconnected-host recovery and scheduled cleanup remain future work. The schema foundations for gameplay are included but deliberately inaccessible to clients until secure RPCs are implemented.

See [architecture, state machine and security model](docs/ARCHITECTURE.md) and [verification record](docs/VERIFICATION.md).

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm install
npm run dev
npm run build
npm run test
npm run test:db
```

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

Without credentials, the app explicitly runs a **local demo**. Rooms persist in this browser’s localStorage; identity is per tab session. The lobby offers an Add sample players button. These are sample seats, not real people. Demo invitation links will not connect different devices. No secret assignments or secure multiplayer are simulated.

## Connect Supabase

1. Create a Supabase project on the Free plan. In Authentication → Providers, enable anonymous sign-ins. Configure abuse protection/CAPTCHA before public release; CAPTCHA token integration remains a release task.
2. Run the SQL files in `supabase/migrations/` in filename order using the SQL editor, or `supabase link --project-ref YOUR_REF` then `supabase db push` with the Supabase CLI. Apply each migration once. Do not expose the `private` schema in Data API settings.
3. The lobby migration enables RLS and publishes **only `public.rooms`** to `supabase_realtime`. Confirm Realtime is enabled for that table. Do not add roles, votes or submissions to the publication.
4. Copy `.env.example` to `.env.local`. Set the project URL and the public **publishable** key:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

5. Restart Vite. The Local demo labels disappear only when both values are supplied. Configuration/authentication failures are displayed rather than silently falling back to fake multiplayer. Never use a service-role or secret key in a `VITE_` variable.
6. Create a room, open its invitation in another browser/profile and choose another nickname. Check joins, settings, duplicate names, capacity, removal, refresh and departure. Phone camera scanning and sharing need HTTPS (or localhost on the same device).

Anonymous identity survives refresh in the same browser profile. Clearing site data loses that identity. Keeping the invitation does not restore a cleared anonymous session.

## Tests

```sh
npm run test
npx playwright install chromium
npm run test:e2e
```

Vitest covers canonical rules, local demo lifecycle, configuration errors and core React flows. Playwright covers mobile/desktop layout, host/join flows, invitation generation, refresh, host transfer and saved settings in demo mode. `npm run test:db` applies the real migrations and executes SQL security assertions in embedded PostgreSQL with stubbed authentication. These do **not** certify real multiplayer security. Run `supabase/tests/lobby_security.sql` against an isolated migrated Supabase database; it rolls back its fixture data. Hosted integration and true concurrent multi-session tests require a configured backend and remain release gates. Never run fixture tests in a production project.

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. Create a Cloudflare Pages project connected to the repository. Select Vite, build command `npm run build`, output `dist`, Node 24.
3. Set both `VITE_SUPABASE_*` variables in Pages build environment settings. They are embedded public configuration; no backend secrets belong there.
4. Deploy. `public/_redirects` provides SPA fallback for direct invitation and room routes.
5. Test the HTTPS deployment on at least two different phones. Check anonymous authentication, QR scan permission and denial, joining, roster synchronization, nickname conflicts, host settings, refresh/reconnection and explicit host transfer. The active-game Start button remains disabled in this milestone.

No cloud project, repository remote, credentials or deployment was created by this local build. Supabase Free projects may pause after inactivity; service limits and browser speech/camera support must be evaluated before release.

Implementation references: [Supabase anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite).
