-- Future gameplay storage. No gameplay RPC is exposed in this milestone.
-- Roles, votes and quest submissions remain in an unexposed schema with no client access.
create table public.games (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id),
  phase text not null check (phase in ('ROLE_REVEAL','NIGHT_PHASE','TEAM_PROPOSAL','TEAM_VOTING','QUEST_VOTING','QUEST_RESULT','ASSASSINATION','GAME_OVER')),
  quest_number int not null default 1 check (quest_number between 1 and 5),
  leader_player_id uuid not null references public.room_players(id),
  proposal_attempt int not null default 1 check (proposal_attempt between 1 and 5),
  version int not null default 0 check(version>=0), night_step int not null default 0,
  winner text check(winner in ('GOOD','EVIL')), victory_reason text,
  created_at timestamptz not null default now(), completed_at timestamptz,
  check((phase='GAME_OVER')=(winner is not null and completed_at is not null))
);
create index games_room_idx on public.games(room_id,created_at);
create unique index one_active_game_per_room on public.games(room_id) where completed_at is null;
-- Snapshot player seats for each match, preserving old matches when lobby players leave.
create table private.game_players (
  game_id uuid not null references public.games(id), player_id uuid not null,
  user_id uuid not null references auth.users(id), nickname text not null, seat_order int not null,
  ready boolean not null default false,
  primary key(game_id,player_id),unique(game_id,user_id),unique(game_id,seat_order)
);
-- Lobby leader FK must not prevent leaving after a completed game. Match seats own identity.
alter table public.games drop constraint games_leader_player_id_fkey;
alter table public.games add foreign key(id,leader_player_id) references private.game_players(game_id,player_id) deferrable initially deferred;
create table private.game_roles (
  id uuid primary key default gen_random_uuid(),game_id uuid not null,player_id uuid not null,
  role text not null check(role in ('Merlin','Percival','Loyal Servant','Assassin','Morgana','Mordred','Oberon','Minion of Evil')),
  faction text not null check(faction in ('GOOD','EVIL')),
  unique(game_id,player_id),foreign key(game_id,player_id) references private.game_players(game_id,player_id),
  check((faction='GOOD')=(role in ('Merlin','Percival','Loyal Servant')))
);
create table public.team_proposals (
  id uuid primary key default gen_random_uuid(),game_id uuid not null references public.games(id),
  quest_number int not null check(quest_number between 1 and 5),attempt_number int not null check(attempt_number between 1 and 5),
  leader_player_id uuid not null,selected_players uuid[] not null,
  status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),unique(game_id,quest_number,attempt_number),
  foreign key(game_id,leader_player_id) references private.game_players(game_id,player_id)
);
create table private.team_votes (
  id uuid primary key default gen_random_uuid(),proposal_id uuid not null references public.team_proposals(id),
  player_id uuid not null,vote boolean not null,unique(proposal_id,player_id)
);
create table private.quest_submissions (
  id uuid primary key default gen_random_uuid(),game_id uuid not null,quest_number int not null check(quest_number between 1 and 5),
  player_id uuid not null,submission text not null check(submission in ('SUCCESS','FAIL')),
  unique(game_id,quest_number,player_id),foreign key(game_id,player_id) references private.game_players(game_id,player_id)
);
create table public.quest_results (
  id uuid primary key default gen_random_uuid(),game_id uuid not null references public.games(id),
  quest_number int not null check(quest_number between 1 and 5), result text not null check(result in ('SUCCESS','FAIL')),
  fail_count int not null check(fail_count between 0 and 5),unique(game_id,quest_number)
);
create table public.game_events (
  id uuid primary key default gen_random_uuid(),game_id uuid not null references public.games(id),
  event_type text not null,public_payload jsonb not null default '{}',created_at timestamptz not null default now()
);
create index game_events_game_idx on public.game_events(game_id,created_at);
-- Deliberately deny all access until phase-specific RPCs and snapshot policies are implemented.
alter table public.games enable row level security;
alter table public.team_proposals enable row level security;
alter table public.quest_results enable row level security;
alter table public.game_events enable row level security;
alter table private.game_players enable row level security;
alter table private.game_roles enable row level security;
alter table private.team_votes enable row level security;
alter table private.quest_submissions enable row level security;
revoke all on public.games,public.team_proposals,public.quest_results,public.game_events from public,anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
