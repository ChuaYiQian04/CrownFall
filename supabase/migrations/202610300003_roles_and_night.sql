-- Milestone 3. Apply after 001 and 002; do not rerun older migrations.
begin;
alter table public.games add column config_roles text[] not null default '{}';
alter table public.games add column night_paused boolean not null default false;
alter table public.games drop constraint games_phase_check;
alter table public.games add constraint games_phase_check check (phase in (
  'ROLE_REVEAL','NIGHT_PHASE','TEAM_PROPOSAL','TEAM_VOTING','QUEST_VOTING',
  'QUEST_RESULT','ASSASSINATION','GAME_OVER','ABANDONED'
));
-- Replace the original end-state check with explicit terminal-state semantics.
alter table public.games drop constraint games_check;
alter table public.games add constraint games_completion_check check (
  (phase='GAME_OVER' and winner is not null and completed_at is not null)
  or (phase='ABANDONED' and winner is null and completed_at is not null)
  or (phase not in ('GAME_OVER','ABANDONED') and winner is null and completed_at is null)
);

-- Rejection sampling avoids modulo bias for Fisher-Yates and the initial leader.
create function private.secure_index(p_size int) returns int
language plpgsql volatile set search_path='' as $$
declare v_byte int; v_limit int;
begin
  if p_size is null or p_size not between 1 and 256 then raise exception 'Invalid random bound'; end if;
  v_limit:=256-(256%p_size);
  loop
    v_byte:=get_byte(extensions.gen_random_bytes(1),0);
    if v_byte<v_limit then return (v_byte%p_size)+1; end if;
  end loop;
end;
$$;
revoke all on function private.secure_index(int) from public,anon,authenticated;

-- Every instruction is public and contains no player-specific secret data.
create function private.night_script(p_roles text[]) returns jsonb
language plpgsql immutable set search_path='' as $$
declare v_steps jsonb;
begin
  v_steps:=jsonb_build_array(
    jsonb_build_object('title','The realm grows quiet','text','Everyone, hide your character card and close your eyes. Keep your phone face down. Let the council fall silent.'),
    jsonb_build_object('title','The hidden pact','text',case when 'Oberon'=any(p_roles)
      then 'Traitors, except Oberon, open your eyes and recognize one another. Oberon, keep your eyes closed. Take a moment to remember your allies.'
      else 'Traitors, open your eyes and recognize one another. Take a moment to remember your allies.' end),
    jsonb_build_object('title','The pact fades','text','Traitors, close your eyes. Everyone, remain silent.'),
    jsonb_build_object('title','The seer watches','text',
      case when 'Mordred'=any(p_roles) then 'All traitors except Mordred, keep your eyes closed and raise one thumb. ' else 'All traitors, keep your eyes closed and raise one thumb. ' end
      || case when 'Oberon'=any(p_roles) then 'Oberon, raise your thumb too. ' else '' end
      || 'Merlin, open your eyes and learn those who threaten the crown.'),
    jsonb_build_object('title','The vision ends','text','Merlin, close your eyes. Traitors, lower your thumbs. Everyone, keep your eyes closed.')
  );
  if 'Percival'=any(p_roles) then
    v_steps:=v_steps || jsonb_build_array(
      jsonb_build_object('title','Two faces of wisdom','text',case when 'Morgana'=any(p_roles)
        then 'Merlin and Morgana, keep your eyes closed and raise one thumb. Percival, open your eyes. One of these figures guards the realm; the other may deceive you. Remember both faces.'
        else 'Merlin, keep your eyes closed and raise one thumb. Percival, open your eyes and recognize the keeper of the vision.' end),
      jsonb_build_object('title','The guardian rests','text','Percival, close your eyes. All raised thumbs, lower. Everyone, remain still.')
    );
  end if;
  return v_steps || jsonb_build_array(jsonb_build_object('title','Dawn at the council','text','Everyone, open your eyes. Keep your character a secret. The fellowship will soon choose its first quest.'));
end;
$$;
revoke all on function private.night_script(text[]) from public,anon,authenticated;

create function public.start_game(p_code text,p_version int) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_room public.rooms; v_count int; v_good int; v_evil int;
  v_roles text[]:=array['Merlin','Assassin']; v_config text[];
  v_players uuid[]; v_leader uuid; v_game uuid:=gen_random_uuid();
  v_i int; v_j int; v_temp text;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select * into v_room from public.rooms where code=upper(btrim(p_code)) for update;
  if not found or not private.is_member(v_room.id) then raise exception 'You are not seated in this room.'; end if;
  if v_room.host_user_id<>auth.uid() then raise exception 'Only the host can start the game.'; end if;
  if v_room.status<>'LOBBY' or v_room.expires_at<=now() then raise exception 'This lobby is closed.'; end if;
  if p_version is null or p_version<>v_room.version then raise exception 'The council changed. Refresh and try again.'; end if;
  select array_agg(id order by seat_order),count(*) into v_players,v_count from public.room_players where room_id=v_room.id;
  if v_count not between 5 and 10 then raise exception 'Gather 5–10 players to begin.'; end if;
  if jsonb_typeof(v_room.settings->'roles') is distinct from 'array' then raise exception 'Invalid role configuration.'; end if;
  select coalesce(array_agg(r),'{}') into v_config from jsonb_array_elements_text(v_room.settings->'roles') r;
  if cardinality(v_config)>4 or exists(select 1 from unnest(v_config) r where r not in ('Percival','Morgana','Mordred','Oberon'))
    or cardinality(v_config)<>(select count(distinct r) from unnest(v_config) r) then raise exception 'Invalid or duplicate role.'; end if;
  if 'Morgana'=any(v_config) and not ('Percival'=any(v_config)) then raise exception 'Morgana requires Percival.'; end if;
  v_evil:=case when v_count<=6 then 2 when v_count<=9 then 3 else 4 end;
  v_good:=v_count-v_evil;
  if 1+(select count(*) from unnest(v_config) r where r<>'Percival')>v_evil then raise exception 'Too many evil characters.'; end if;
  v_roles:=v_roles||v_config;
  for v_i in 1..(v_good-1-case when 'Percival'=any(v_config) then 1 else 0 end) loop
    v_roles:=array_append(v_roles,'Loyal Servant');
  end loop;
  for v_i in 1..(v_evil-1-(select count(*) from unnest(v_config) r where r<>'Percival')) loop
    v_roles:=array_append(v_roles,'Minion of Evil');
  end loop;
  for v_i in reverse v_count..2 loop
    v_j:=private.secure_index(v_i); v_temp:=v_roles[v_i]; v_roles[v_i]:=v_roles[v_j]; v_roles[v_j]:=v_temp;
  end loop;
  v_leader:=v_players[private.secure_index(v_count)];
  insert into public.games(id,room_id,phase,leader_player_id,config_roles)
    values(v_game,v_room.id,'ROLE_REVEAL',v_leader,v_config);
  insert into private.game_players(game_id,player_id,user_id,nickname,seat_order)
    select v_game,id,user_id,nickname,seat_order from public.room_players where room_id=v_room.id;
  for v_i in 1..v_count loop
    insert into private.game_roles(game_id,player_id,role,faction)
      values(v_game,v_players[v_i],v_roles[v_i],case when v_roles[v_i] in ('Merlin','Percival','Loyal Servant') then 'GOOD' else 'EVIL' end);
  end loop;
  update public.rooms set status='PLAYING',version=version+1 where id=v_room.id;
  return v_game;
end;
$$;

-- Public snapshot only. Roles must be fetched separately by the card's owner.
create function public.get_game(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_room public.rooms; v_game public.games;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select * into v_room from public.rooms where code=upper(btrim(p_code));
  if not found or not private.is_member(v_room.id) then raise exception 'You are not seated in this room.'; end if;
  select * into v_game from public.games where room_id=v_room.id and completed_at is null;
  if not found then return null; end if;
  if not exists(select 1 from private.game_players where game_id=v_game.id and user_id=auth.uid()) then raise exception 'You are not in this match.'; end if;
  return jsonb_build_object(
    'id',v_game.id,'phase',v_game.phase,'version',v_game.version,
    'host_user_id',v_room.host_user_id,'leader_player_id',v_game.leader_player_id,
    'night_step',v_game.night_step,'night_paused',v_game.night_paused,
    'roles',v_game.config_roles,'night_script',private.night_script(v_game.config_roles),
    'players',(select jsonb_agg(jsonb_build_object('id',player_id,'user_id',user_id,'nickname',nickname,'ready',ready) order by seat_order)
      from private.game_players where game_id=v_game.id)
  );
end;
$$;

create function public.get_my_role(p_game_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_player uuid; v_role private.game_roles; v_known jsonb;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select p.player_id into v_player from private.game_players p join public.games g on g.id=p.game_id
    where p.game_id=p_game_id and p.user_id=auth.uid() and g.completed_at is null
    and private.is_member(g.room_id);
  if not found then raise exception 'No private character is available for this identity.'; end if;
  select * into v_role from private.game_roles where game_id=p_game_id and player_id=v_player;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.player_id,'nickname',p.nickname) order by p.seat_order),'[]') into v_known
    from private.game_roles r join private.game_players p using(game_id,player_id)
    where r.game_id=p_game_id and r.player_id<>v_player and (
      (v_role.role='Merlin' and r.faction='EVIL' and r.role<>'Mordred')
      or (v_role.role='Percival' and r.role in ('Merlin','Morgana'))
      or (v_role.faction='EVIL' and v_role.role<>'Oberon' and r.faction='EVIL' and r.role<>'Oberon')
    );
  return jsonb_build_object('role',v_role.role,'faction',v_role.faction,'known_players',v_known);
end;
$$;

create function public.game_action(p_game_id uuid,p_action text,p_version int) returns void
language plpgsql security definer set search_path='' as $$
declare v_room public.rooms; v_game public.games; v_room_id uuid; v_player private.game_players; v_steps int;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select room_id into v_room_id from public.games where id=p_game_id;
  -- Always lock room before game, matching start_game and lobby mutations.
  select * into v_room from public.rooms where id=v_room_id for update;
  if not found or not private.is_member(v_room.id) then raise exception 'You are not in this match.'; end if;
  select * into v_game from public.games where id=p_game_id for update;
  select * into v_player from private.game_players where game_id=p_game_id and user_id=auth.uid();
  if not found or v_game.completed_at is not null then raise exception 'This match is no longer active.'; end if;
  if p_version is null or p_version<>v_game.version then raise exception 'The match changed. Please try again.'; end if;
  if p_action='ready' then
    if v_game.phase<>'ROLE_REVEAL' then raise exception 'Character confirmation is closed.'; end if;
    if v_player.ready then raise exception 'You already confirmed your character.'; end if;
    update private.game_players set ready=true where game_id=p_game_id and player_id=v_player.player_id;
  else
    if v_room.host_user_id<>auth.uid() then raise exception 'Only the host can control the ceremony.'; end if;
    if p_action='abandon' then
      update public.games set phase='ABANDONED',completed_at=now(),night_paused=false where id=p_game_id;
      update public.rooms set status='LOBBY' where id=v_room.id;
    elsif p_action='begin_night' then
      if v_game.phase<>'ROLE_REVEAL' then raise exception 'The ceremony cannot begin in this phase.'; end if;
      if exists(select 1 from private.game_players where game_id=p_game_id and not ready) then raise exception 'Wait until everyone confirms their character.'; end if;
      update public.games set phase='NIGHT_PHASE',night_step=0,night_paused=false where id=p_game_id;
    elsif p_action in ('next_step','pause_night','resume_night') then
      if v_game.phase<>'NIGHT_PHASE' then raise exception 'The night ceremony is not active.'; end if;
      if p_action='pause_night' then
        if v_game.night_paused then raise exception 'The ceremony is already paused.'; end if;
        update public.games set night_paused=true where id=p_game_id;
      elsif p_action='resume_night' then
        if not v_game.night_paused then raise exception 'The ceremony is not paused.'; end if;
        update public.games set night_paused=false where id=p_game_id;
      else
        if v_game.night_paused then raise exception 'Resume the ceremony before continuing.'; end if;
        v_steps:=jsonb_array_length(private.night_script(v_game.config_roles));
        if v_game.night_step+1>=v_steps then
          update public.games set phase='TEAM_PROPOSAL' where id=p_game_id;
        else
          update public.games set night_step=night_step+1 where id=p_game_id;
        end if;
      end if;
    else raise exception 'Unknown game action.';
    end if;
  end if;
  update public.games set version=version+1 where id=p_game_id;
  -- Realtime sees only this sanitized invalidation row, never private game tables.
  update public.rooms set version=version+1 where id=v_room.id;
end;
$$;

revoke all on function public.start_game(text,int),public.get_game(text),public.get_my_role(uuid),public.game_action(uuid,text,int) from public,anon;
grant execute on function public.start_game(text,int),public.get_game(text),public.get_my_role(uuid),public.game_action(uuid,text,int) to authenticated;
commit;
