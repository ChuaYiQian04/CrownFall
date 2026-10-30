# Verification — 30 October 2026

## Core gameplay milestone

The final GitHub Pages production check (`npm run test:pages`) also passed after this milestone, including TypeScript/build and project-path invitation refresh. The mobile team-row layout correction was verified in a fresh browser screenshot.

| Check              | Result          | Scope                                                                                                                                             |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test`     | 56 tests passed | Rules, services, bounded stale-ballot retries, private cards, narration, phase screens, quest permissions, assassination confirmation and endgame |
| `npm run test:e2e` | 10 tests passed | Chromium at 390×844 and 1440×1000; demo lobby and intercepted role/night/gameplay UI flows through victory                                        |
| `npm run test:db`  | Passed          | All four actual migrations applied; lobby, roles/night and complete-match SQL/security suites                                                     |
| `npm run build`    | Passed          | TypeScript and Vite production output                                                                                                             |

The quest SQL suite plays complete matches through three successes and both assassination outcomes, three failures, five tied/rejected proposals, every player count, all team sizes, the fourth-quest threshold (one and two Fail submissions), fifth-quest resolution, fresh match IDs and retained history. It tests invalid/duplicate/foreign teams, unauthorized leaders/Assassins/observers, loyal Fail denial, stale/duplicate votes and submissions, early vote/result/role secrecy, game-over locking and retired-match isolation. Earlier suites cover role distributions, all 16 optional-role subsets and permitted role knowledge. All secret tables retain denied direct access and stay out of Realtime.

The browser gameplay fixture exercises selection, approval, quest choices, results, assassination confirmation, victory, role reveal and public history. It is an intercepted transport used only by tests; it does not supply production game logic. Screenshot review identified and corrected a CSS selector conflict in team rows. Screenshots and browser viewport assertions check layout but do not certify physical mobile behavior.

Database tests use PGlite (PostgreSQL compiled to WASM), pgcrypto and stubbed `auth.uid()`. The real migrations run unchanged, but the harness does not provide Supabase Auth/PostgREST/Realtime, hosted defaults or parallel sessions. The agent has not applied migration `004` to the cloud project, committed/pushed these changes or deployed this milestone. No environment values were read, printed or changed.

Still unverified: live cross-device gameplay, actual parallel ballot races, network interruptions on real phones, native camera/sharing and speech behavior, iOS/Android lifecycle behavior, hosting workflow execution and the deployed gameplay build. Automatic disconnected-host recovery and cleanup scheduling remain unimplemented.

## Earlier hosting verification

GitHub Pages initially returned source HTML pointing to `/src/main.tsx`. The deployment correction added an Actions build of `dist/`, repository-relative asset paths and hash routes. `npm run test:pages` previously passed against a production build at `/CrownFall/`, including room and invitation refresh/join. It uses a local demo with cloud variables disabled. The workflow requires public Supabase repository variables. Production dependencies are unchanged since the foundation audit, which reported no known production vulnerabilities at that time.

Build/browser commands use approved execution outside Windows filesystem restrictions. This is an execution environment limitation, not an application runtime requirement.
