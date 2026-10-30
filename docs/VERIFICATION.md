# Verification — 30 October 2026

## World, result and tutorial artwork

The final GitHub Pages production test also passed, verifying all six new images and both mobile variants return WebP files under `/CrownFall/`.

Six new original illustrations were generated using built-in imagegen and saved under `public/assets/world/`, together with two smaller background variants. Exact prompts are recorded in `docs/world-art-prompts.json`. The kingdom/chamber backgrounds switch by public route, not a player's hidden role. Quest/result illustrations are selected from already-public outcomes; they do not reveal individual submissions or affiliations. Buttons use CSS metal finishes and retain real labels, focus and disabled states. Existing portrait artwork remains intact.

The production build and all 56 unit/component tests passed. All 14 mobile/desktop browser checks passed, including the six tutorial chapters, loaded success/failure illustrations, readable live totals and no horizontal overflow at tested widths. Screenshots of the home, tutorial and failed-quest card were visually reviewed. No backend or environment change was made, and the agent has not published this update.

## Character portrait update

Eight original portraits were generated with built-in imagegen, inspected, and saved as 720×1080 WebP assets in `public/assets/characters/`. Sizes are 88–167 KiB per file; the exact prompts are in `docs/character-art-prompts.json`. No third-party image URL or paid runtime service is used. Source generation files remain preserved at their original tool locations; the website uses only the bundled optimized assets.

The reveal layout retains selectable text, private knowledge, hide-on-blur behavior and a fallback emblem if a portrait cannot load. Portrait elements appear only after the user reveals their own character. The mobile screenshot was visually reviewed. Build, 56 unit/component tests, 10 browser tests and the GitHub Pages production test passed after the update. The Pages check confirms all eight image URLs return `image/webp` under `/CrownFall/`. No backend migration or database change was made for this update; it has not been deployed by the agent.

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
