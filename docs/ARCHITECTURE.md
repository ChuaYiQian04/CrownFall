# Crownfall architecture and implementation plan

## Milestone boundaries

1. Foundation: React/TypeScript/Vite, Tailwind theme, reusable controls, original SVG crown, locally bundled fonts, home, host/join, tutorial and preferences.
2. Lobby: anonymous identity, transactional create/join/leave/remove/settings RPCs, member-only reads, invitation links, QR generation/scanning, room-row Realtime invalidation and reconnection refetch. Live verification needs a configured Supabase project. Automatic host recovery and cleanup scheduling remain pending.
3. Roles/night: implemented cryptographic backend assignment, authorized private information, ready confirmations, synchronized steps and host narration controls. Hosted verification remains pending.
4. Gameplay: implement transactional proposals, private votes, private quest submissions, aggregate resolution, assassination and role reveal.
5. Reliability: abandonment and fresh IDs after returning to lobby are implemented. Full rematches, host lease/recovery, cleanup and physical mobile lifecycle testing remain pending.
6. Release: run database security/concurrency tests and multi-browser real multiplayer E2E; deploy to Cloudflare Pages and test multiple phones.

This revision implements the foundation, lobby and roles/night milestones. It stops at `TEAM_PROPOSAL`; proposal/voting/quest/endgame RPCs are pending. Automatic host recovery and cleanup also remain pending.

## Roles and night implementation

`start_game` locks the room, validates authenticated host, expected version, roster and role configuration, then snapshots participants, assigns shuffled roles and picks an initial leader in one transaction. Rejection-sampled pgcrypto bytes power Fisher–Yates and leader selection without modulo bias. Every match has a new ID and immutable role configuration.

`get_game` returns an allowlisted public snapshot. `get_my_role` separately computes only the caller’s own character and allowed knowledge. It accepts a game ID, never a target player ID. Merlin sees Evil except Mordred (including Oberon); non-Oberon Evil sees non-Oberon teammates; Oberon sees nobody; Percival sees the Merlin/Morgana candidates. Completed/abandoned roles cannot be retrieved. No secret assignments are sent in public snapshots or Realtime.

`game_action` locks the room before the game row to maintain a consistent lock order, validates authenticated match membership, phase, host permissions, duplicate confirmations and expected version, then bumps game and room versions. `rooms.version` is the only Realtime invalidation signal. The game hook refetches on subscription/focus/visibility/network restoration and every ten seconds, rejecting older snapshots.

The private card fetches only after a tap. Hiding, blurring, unmounting and confirmation clear its in-memory character; late responses cannot reopen it. No secret is written to browser storage. The local demo still cannot assign roles, and partial cloud configuration fails explicitly.

The backend generates public ceremony captions from selected roles. Only the host can enable local speech. Enabled narration follows synchronized steps; replay/mute/voice settings remain local. Pause/resume and Next require backend authorization. Speech completion never advances a step. Returning from a hidden tab requires explicit audio activation again. Device speech restrictions may require replay; text and manual progression remain available.

Host abandonment changes the phase to `ABANDONED`, records completion without a winner, restores the room to `LOBBY`, and preserves private history. A subsequent start uses fresh roles and a new match ID. This provides a safe way to exit the milestone boundary; full victory/rematch gameplay is pending.

## Components and data flow

React Router owns routes; `src/services/rooms.ts` and `src/services/game.ts` form the Supabase boundary. Anonymous sessions are restored before RPCs. Actions derive the actor from `auth.uid()`, never a submitted user ID. Host permissions cover the lobby and ceremony without extra secret access.

For lobby changes, `rooms.version` increments in the same transaction as a membership or settings mutation. Clients subscribe only to this sanitized room row, then fetch an authorized snapshot. Focus, network restoration, subscription recovery and a 15-second fallback poll refetch state. Presence is not used for authority or eviction. The UI’s connection badge reports subscription state, not proof that every other device is online.

When both environment variables are absent, a clearly labeled local demo uses browser storage for room data. Partial configuration fails explicitly. Production anonymous sessions persist through the Supabase SDK. Production role assignments remain private in the database; a revealed own character lives only in memory. Sample participants cannot start a match.

## Authoritative game state machine

Transitions through `TEAM_PROPOSAL` are implemented. Quest/endgame transitions below remain planned. Hosts may also abandon any current match, returning to the lobby without a winner or role reveal.

```mermaid
stateDiagram-v2
    [*] --> LOBBY
    LOBBY --> ROLE_REVEAL: host starts / validate roster, assign roles
    ROLE_REVEAL --> NIGHT_PHASE: all ready, host begins
    NIGHT_PHASE --> TEAM_PROPOSAL: host completes synchronized ceremony
    TEAM_PROPOSAL --> TEAM_VOTING: leader submits exact team
    TEAM_VOTING --> TEAM_PROPOSAL: rejected, fewer than five rejections / rotate leader
    TEAM_VOTING --> GAME_OVER: fifth consecutive rejection / Evil
    TEAM_VOTING --> QUEST_VOTING: strict majority / reset rejections
    QUEST_VOTING --> QUEST_RESULT: team submissions complete / aggregate
    QUEST_RESULT --> TEAM_PROPOSAL: neither faction has three / rotate, next quest
    QUEST_RESULT --> GAME_OVER: three failures / Evil
    QUEST_RESULT --> ASSASSINATION: three successes
    ASSASSINATION --> GAME_OVER: Assassin targets Merlin / Evil, otherwise Good
    GAME_OVER --> LOBBY: host returns to lobby / retain match history
```

Current game RPCs lock the room then game row (`FOR UPDATE`), compare expected version, validate actor, immutable match membership, phase and duplicates, and increment versions once per committed action. Future voting/quest RPCs must retain these guarantees. Rejected operations roll back completely. Parallel-session race tests remain required.

Merlin and Assassin are mandatory. Merlin knows Evil except Mordred (including Oberon). Evil teammates see one another except Oberon; Oberon sees no teammates. Percival sees Merlin/Morgana candidates without identifying which is which. `get_my_role` computes permitted knowledge on the server; it never returns assignments for client-side filtering.

## Database and security model

`public.rooms` and `public.room_players` are the only client-readable tables. RLS grants read access only to seated authenticated users. There are no client write grants. Room codes are generated with database cryptographic randomness over a 32-character alphabet, retried on unique collision. Anonymous sessions are the authenticated database role, distinct from the unauthenticated `anon` role.

`private.is_member` avoids recursive room-player RLS. It uses `auth.uid()`, a fixed empty search path and a boolean result. The private schema is not an exposed API schema. RPC functions use schema-qualified references, revoke default public execution and grant execution only to authenticated sessions.

`create_room` limits each identity to ten rooms per hour; Supabase anonymous-auth abuse controls/CAPTCHA are also required for an Internet release. Per-IP join throttling is not implemented. Codes are invitations rather than passwords. Avoid publishing codes for private groups.

`games`, `team_proposals`, `quest_results`, `game_events` have RLS enabled and no direct client grants. `private.game_players`, `game_roles`, `team_votes`, `quest_submissions` remain private, RLS enabled and directly inaccessible to clients. Authenticated RPCs return only authorized snapshots or own-character information. No secret tables enter Realtime. Match players snapshot identities and nicknames for durable history. Start transactions create game and snapshot rows together using the deferred leader foreign key.

Future public events must use an explicit payload allowlist. Quest submission progress must expose at most an aggregate count, never submitter identity/order or raw choices. Individual approval votes become public only after every player votes. Assassination must resolve before any role reveal.

## Recovery and lifecycle

Refresh restores the browser’s anonymous auth session, then authorized room state. Rejoining the same room under that identity is idempotent. Brief disconnects never evict participants. Explicit host departure transfers hosting to the earliest remaining seat under the room lock. A disconnected host retains ownership and can reconnect; automatic takeover is intentionally not implemented until a server-clock lease and recovery policy are tested. There is no account recovery if a user clears their browser authentication storage.

Rooms expire after 24 hours. Lobby RPCs refuse new actions/reads after expiry. Active-match RPCs remain available so players can complete the ceremony or abandon it safely; the direct `/game/:code` route continues to work. Physical cleanup is not installed. Future cleanup must retain game history and avoid foreign-key conflicts; do not simply delete rooms with matches.
