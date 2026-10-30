-- Crownfall milestone 1: anonymous, member-scoped, transaction-safe lobbies.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_user_id uuid not null references auth.users(id),
  status text not null default 'LOBBY' check (status in ('LOBBY','PLAYING','CLOSED')),
  settings jsonb not null default '{"roles":[]}',
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index rooms_host_created_idx on public.rooms(host_user_id,created_at);
create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  nickname text not null check (char_length(nickname) between 2 and 24 and nickname = btrim(nickname)),
  seat_order integer not null check (seat_order >= 0),
  joined_at timestamptz not null default now(),
  unique(room_id,user_id), unique(room_id,seat_order)
);
create unique index room_players_nickname_idx on public.room_players(room_id,lower(nickname));
create index room_players_user_idx on public.room_players(user_id);

create function private.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.room_players where room_id=p_room and user_id=auth.uid());
$$;
-- Used by RLS; the private schema is not exposed by PostgREST.
grant usage on schema private to authenticated;
revoke all on function private.is_member(uuid) from public,anon;
grant execute on function private.is_member(uuid) to authenticated;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
create policy member_read_room on public.rooms for select to authenticated using (private.is_member(id));
create policy member_read_players on public.room_players for select to authenticated using (private.is_member(room_id));
revoke all on public.rooms,public.room_players from anon,authenticated;
grant select on public.rooms,public.room_players to authenticated;

create function public.create_room(p_nickname text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_code text; v_room uuid; v_bytes bytea; v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_i int;
begin
  if v_user is null then raise exception 'Please reconnect before creating a room.'; end if;
  p_nickname := btrim(p_nickname);
  if p_nickname is null or char_length(p_nickname) not between 2 and 24 then raise exception 'Choose a name with 2–24 characters.'; end if;
  -- Serialize creation per identity to make the rate limit atomic.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if (select count(*) from public.rooms where host_user_id=v_user and created_at>now()-interval '1 hour')>=10 then
    raise exception 'Too many rooms created. Try again later.';
  end if;
  loop
    v_bytes := extensions.gen_random_bytes(6); v_code := '';
    for v_i in 0..5 loop v_code := v_code || substr(v_alphabet,1+(get_byte(v_bytes,v_i)%32),1); end loop;
    begin
      insert into public.rooms(code,host_user_id) values(v_code,v_user) returning id into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.room_players(room_id,user_id,nickname,seat_order) values(v_room,v_user,p_nickname,0);
  return v_code;
end;
$$;

create function public.join_room(p_code text,p_nickname text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_user uuid := auth.uid(); v_count int; v_seat int;
begin
  if v_user is null then raise exception 'Please reconnect before joining.'; end if;
  p_nickname := btrim(p_nickname);
  if p_nickname is null or char_length(p_nickname) not between 2 and 24 then raise exception 'Choose a name with 2–24 characters.'; end if;
  select * into v_room from public.rooms where code=upper(btrim(p_code)) for update;
  if not found or v_room.expires_at<=now() or v_room.status='CLOSED' then raise exception 'Room not found or expired.'; end if;
  if exists(select 1 from public.room_players where room_id=v_room.id and user_id=v_user) then return v_room.code; end if;
  if v_room.status<>'LOBBY' then raise exception 'This game has already started.'; end if;
  select count(*),coalesce(max(seat_order),-1)+1 into v_count,v_seat from public.room_players where room_id=v_room.id;
  if v_count>=10 then raise exception 'This room is full.'; end if;
  if exists(select 1 from public.room_players where room_id=v_room.id and lower(nickname)=lower(p_nickname)) then raise exception 'That name is already taken in this room.'; end if;
  insert into public.room_players(room_id,user_id,nickname,seat_order) values(v_room.id,v_user,p_nickname,v_seat);
  update public.rooms set version=version+1 where id=v_room.id;
  return v_room.code;
end;
$$;

create function public.get_room(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_room public.rooms;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select * into v_room from public.rooms where code=upper(btrim(p_code));
  if not found or not private.is_member(v_room.id) then raise exception 'Join this room first, or check your room code.'; end if;
  if v_room.expires_at<=now() or v_room.status='CLOSED' then raise exception 'This room has expired or closed.'; end if;
  return to_jsonb(v_room) || jsonb_build_object('players',coalesce((select jsonb_agg(to_jsonb(p) order by p.seat_order) from public.room_players p where p.room_id=v_room.id),'[]'::jsonb));
end;
$$;

create function public.lobby_action(p_code text,p_action text,p_payload jsonb,p_version int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_room public.rooms; v_user uuid := auth.uid(); v_target uuid; v_roles jsonb; v_count int; v_evil int;
begin
  if v_user is null then raise exception 'Please reconnect.'; end if;
  select * into v_room from public.rooms where code=p_code for update;
  if not found or not private.is_member(v_room.id) then raise exception 'You are not a member of this room.'; end if;
  if v_room.status<>'LOBBY' or v_room.expires_at<=now() then raise exception 'This lobby is closed.'; end if;
  if p_version is null or p_version<>v_room.version then raise exception 'The council changed. Refresh and try again.'; end if;
  if p_action='leave' then
    delete from public.room_players where room_id=v_room.id and user_id=v_user;
    if v_room.host_user_id=v_user then
      select user_id into v_target from public.room_players where room_id=v_room.id order by seat_order limit 1;
      if v_target is null then
        update public.rooms set status='CLOSED' where id=v_room.id;
      else update public.rooms set host_user_id=v_target where id=v_room.id;
      end if;
    end if;
  else
    if v_room.host_user_id<>v_user then raise exception 'Only the host can do that.'; end if;
    if p_action='remove' then
      v_target := (p_payload #>> '{}')::uuid;
      if not exists(select 1 from public.room_players where room_id=v_room.id and id=v_target and user_id<>v_user) then raise exception 'Choose another seated player.'; end if;
      delete from public.room_players where room_id=v_room.id and id=v_target;
    elsif p_action='settings' then
      v_roles := p_payload->'roles';
      if jsonb_typeof(v_roles) is distinct from 'array' then raise exception 'Invalid role settings.'; end if;
      if jsonb_array_length(v_roles)>4 or exists(select 1 from jsonb_array_elements_text(v_roles) r where r not in ('Percival','Morgana','Mordred','Oberon'))
        or (select count(*) from jsonb_array_elements_text(v_roles))<>(select count(distinct r) from jsonb_array_elements_text(v_roles) r)
        then raise exception 'Invalid or duplicate role.'; end if;
      if v_roles ? 'Morgana' and not v_roles ? 'Percival' then raise exception 'Morgana requires Percival.'; end if;
      select count(*) into v_count from public.room_players where room_id=v_room.id;
      v_evil := case when v_count<=6 then 2 when v_count<=9 then 3 else 4 end;
      if 1+(select count(*) from jsonb_array_elements_text(v_roles) r where r<>'Percival')>v_evil then raise exception 'Too many evil roles for this fellowship.'; end if;
      update public.rooms set settings=jsonb_build_object('roles',v_roles) where id=v_room.id;
    else raise exception 'Unknown lobby action.';
    end if;
  end if;
  update public.rooms set version=version+1 where id=v_room.id;
end;
$$;

revoke all on function public.create_room(text), public.join_room(text,text), public.get_room(text), public.lobby_action(text,text,jsonb,int) from public,anon;
grant execute on function public.create_room(text), public.join_room(text,text), public.get_room(text), public.lobby_action(text,text,jsonb,int) to authenticated;
-- Only sanitized room rows enter Realtime. Every membership change bumps rooms.version.
alter publication supabase_realtime add table public.rooms;
