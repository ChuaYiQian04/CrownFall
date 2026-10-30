# CROWNFALL

**Every crown hides a traitor.** A mobile-first social deduction game for a group sharing a table, using a phone each.

## Current build

The foundation, lobby, and roles/night milestones are implemented. With 5–10 real players, the host can start a match with securely assigned characters, private reveal cards, role-specific knowledge, ready confirmations, and a synchronized night ceremony with host narration, pause/resume, replay, voice, volume and speed controls. Refresh restores the current phase while keeping the character face down. Existing host/join, QR, tutorial and preference features remain available.

**Quest gameplay is not implemented yet.** The ceremony ends at the first-team screen, which clearly marks this boundary. Team proposals/voting, quest submissions/results, assassination, victory screens, full rematches, automatic disconnected-host recovery and scheduled cleanup remain future work. The host can explicitly end an active match and return everyone to the lobby. A fresh start creates a new match and new assignments while preserving private history.

## Upgrade an existing Supabase project

If migrations `001` and `002` were already applied, open **SQL Editor → New query**, paste the entire contents of [`202610300003_roles_and_night.sql`](supabase/migrations/202610300003_roles_and_night.sql), and click **Run** once. Do not rerun the older files. Refresh Crownfall after the migration succeeds. No environment variable changes are needed.

To test, join a room from five separate browser profiles/devices and let the host click **Start game**. Each player privately reveals their character and presses **Ready**. Once all are ready, the host selects **Start ceremony**, then **Enable narration** on the host’s phone only. Use **Next instruction** after everyone follows each caption; audio completion never advances automatically. **Complete ceremony** reaches the milestone boundary. Use **End this match and return to lobby** to reset safely.

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
4. Create `.env` (or `.env.local`) in the root folder. Set the project URL and the public **publishable** key. Keep values in one file; `.env.local` overrides `.env`:

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

Vitest covers rules, demo rooms, configuration failures, card privacy, late responses, readiness, ceremony controls and speech behavior. Playwright covers lobby flows plus role/night screens using an intercepted UI fixture. It runs on port 5174 with cloud credentials disabled, without touching your project or dev server. `npm run test:db` applies all real migrations and executes SQL security assertions in embedded PostgreSQL with stubbed authentication; it exercises every player count and all 16 optional-role subsets. These do **not** certify hosted multiplayer security. Run SQL files in `supabase/tests/` only against an isolated migrated Supabase database; fixtures roll back. Real Supabase integration and concurrent multi-session testing remain release gates.

## Deploy to GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`. It builds Vite and publishes **`dist/`**, rather than serving source TypeScript. For the current project the public address is `https://chuayiqian04.github.io/CrownFall/`.

1. On GitHub, open the repository's **Settings → Pages**. Set **Source** to **GitHub Actions**, replacing Deploy from a branch.
2. Open **Settings → Secrets and variables → Actions → Variables**. Add two **repository variables**, using the same values as your local environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Commit and push the deployment changes to `master` or `main`. The workflow also supports manual **Actions → Deploy Crownfall to GitHub Pages → Run workflow**.
4. Wait for both build and deploy jobs to succeed, then open the URL printed by the deployment. Refresh with Ctrl+Shift+R if an old blank page is cached.

GitHub cannot read your ignored local `.env`. The workflow fails with setup instructions if either repository variable is absent, instead of publishing a demo accidentally. Supply the public publishable key, never a secret/service-role key. No migration or Supabase project changes are needed for hosting.

The workflow sets the asset base to the repository path and uses hash routes, e.g. `/CrownFall/#/join/ABCDEF`. This makes invitations and refreshes work on static GitHub Pages. QR parsing accepts both these and normal browser routes. Local development and Cloudflare retain normal routes by default. GitHub Free Pages requires a public repository.

Run `npm run test:pages` to build with GitHub-style paths and verify the production output in Chromium using an isolated local demo. The preview test overrides cloud variables and never touches your Supabase data. This test does not publish the site.

References: [Vite GitHub Pages setup](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [React Router hash routing](https://reactrouter.com/api/declarative-routers/HashRouter).

## Deploy to Cloudflare Pages

1. Push this repository to GitHub.
2. Create a Cloudflare Pages project connected to the repository. Select Vite, build command `npm run build`, output `dist`, Node 24.
3. Set both `VITE_SUPABASE_*` variables in Pages build environment settings. They are embedded public configuration; no backend secrets belong there.
4. Deploy. `public/_redirects` provides SPA fallback for direct invitation and room routes.
5. Test the HTTPS deployment on multiple phones. Check joining, role privacy, ready synchronization, refresh/reconnection, host-only audio, night controls and return to lobby. Start requires five real identities; local sample seats cannot start a production match.

No cloud project, repository remote, credentials or deployment was created by this local build. Supabase Free projects may pause after inactivity; service limits and browser speech/camera support must be evaluated before release.

Implementation references: [Supabase anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite).
