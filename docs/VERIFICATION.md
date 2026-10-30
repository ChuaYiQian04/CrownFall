# Verification — 30 October 2026

| Check                       | Result                                                  | Scope                                                                                                                  |
| --------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run build`             | Passed                                                  | TypeScript, Vite production output and split game/Supabase/motion bundles                                              |
| `npm run test`              | 32 tests passed                                         | Rules, demo rooms, configuration, card privacy, late-response protection, readiness, errors, abandonment and narration |
| `npm run test:e2e`          | 8 tests passed                                          | Chromium at 390×844 and 1440×1000: demo lobby flows and role/night controls through an intercepted UI fixture          |
| `npm run test:db`           | Passed                                                  | All three actual migrations applied to embedded PostgreSQL; lobby and roles/night SQL suites passed                    |
| Production dependency audit | No reported vulnerabilities in the foundation milestone | Dependencies unchanged in this milestone                                                                               |
| Screenshot review           | Completed                                               | Mobile home, private card and night layouts; no overflow in tested browser flows                                       |

Role SQL assertions exercise 5–10 players and all 16 optional-role subsets, correct role/faction counts, required characters, Merlin/Mordred/Oberon/Percival knowledge rules, outsider denial, duplicate confirmations, host-only starts/ceremony actions, early-start rejection, pause/resume, explicit advancement, no private Realtime publication, abandonment, retired-role denial, preserved history and fresh match IDs.

The database harness uses PGlite (PostgreSQL compiled to WASM), pgcrypto, a minimal `auth.users` table and stubbed `auth.uid()`. Actual migrations run without rewriting. It does not provide Supabase Auth, PostgREST, Realtime, parallel sessions or hosted defaults. The agent has not applied the new migration to the user's cloud project.

The browser role/night test intercepts the service module with a UI fixture. It verifies rendered controls and responsive transitions, not production multiplayer or authority. No test fixtures are exposed as application routes. Tests disable cloud variables and use a separate port to avoid the user's Supabase data and development server.

The user reports that their existing Supabase auth/lobby setup works. Hosted role/night RPCs, cross-device Realtime, true concurrency, physical camera/sharing, spoken audio on physical phones, iOS/Android lifecycle behavior and deployment remain unverified by the agent. No environment values were read, printed or changed. Quest gameplay and endgame are not implemented.

Successful build/browser runs used approved execution outside Windows filesystem restrictions. This is an execution environment limitation, not a Crownfall runtime requirement.
