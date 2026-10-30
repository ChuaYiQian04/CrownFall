-- Isolated database only. All fixture data is rolled back.
begin;
insert into auth.users(id) select ('30000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,11) i;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
do $$
declare c text; g uuid; s jsonb; i int;
begin
  c:=public.create_room('Host');perform set_config('test.role_room',c,true);
  begin
    perform public.start_game(c,0);raise exception 'Undersized match accepted';
  exception when raise_exception then if sqlerrm='Undersized match accepted' then raise;end if;end;
  for i in 2..10 loop
    perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-'||lpad(i::text,12,'0'),true);
    perform public.join_room(c,'Knight '||i);
  end loop;
  s:=public.get_room(c);
  begin
    perform public.start_game(c,(s->>'version')::int);raise exception 'Non-host start accepted';
  exception when raise_exception then if sqlerrm='Non-host start accepted' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
  perform public.lobby_action(c,'settings','{"roles":["Percival","Morgana","Mordred","Oberon"]}',(s->>'version')::int);
  s:=public.get_room(c);
  begin
    perform public.start_game(c,0);raise exception 'Stale start accepted';
  exception when raise_exception then if sqlerrm='Stale start accepted' then raise;end if;end;
  g:=public.start_game(c,(s->>'version')::int);perform set_config('test.role_game',g::text,true);
  s:=public.get_game(c);
  assert s->>'phase'='ROLE_REVEAL','Must start at role reveal';
  assert jsonb_array_length(s->'players')=10,'Ten immutable seats';
  assert not (s ? 'role') and not (s ? 'faction') and not (s ? 'known_players'),'Public snapshot must not contain private fields';
  assert jsonb_array_length(s->'night_script')=8,'Percival ceremony includes candidate steps';
  begin
    perform public.start_game(c,(public.get_room(c)->>'version')::int);raise exception 'Double start accepted';
  exception when raise_exception then if sqlerrm='Double start accepted' then raise;end if;end;
  begin
    perform public.game_action(g,'begin_night',0);raise exception 'Night started before readiness';
  exception when raise_exception then if sqlerrm='Night started before readiness' then raise;end if;end;
end;
$$;
reset role;
-- Trusted test-owner assertions inspect assignments; clients cannot run these queries.
do $$
declare g uuid:=current_setting('test.role_game')::uuid; r record; known jsonb; expected_ids uuid[]; actual_ids uuid[];
begin
  assert (select count(*) from private.game_roles where game_id=g)=10,'Exactly one role per player';
  assert (select count(*) from private.game_roles where game_id=g and faction='GOOD')=6,'Ten-player loyal count';
  assert (select count(*) from private.game_roles where game_id=g and faction='EVIL')=4,'Ten-player evil count';
  assert (select count(distinct role) from private.game_roles where game_id=g and role in ('Merlin','Assassin','Percival','Morgana','Mordred','Oberon'))=6,'All configured characters assigned';
  for r in select gr.*,gp.user_id from private.game_roles gr join private.game_players gp using(game_id,player_id) where game_id=g loop
    perform set_config('request.jwt.claim.sub',r.user_id::text,true);
    known:=public.get_my_role(g);
    assert known->>'role'=r.role,'Only caller character returned';
    assert jsonb_array_length(known->'known_players')=case
      when r.role='Merlin' then 3 when r.role='Percival' then 2
      when r.role in ('Oberon','Loyal Servant') then 0 else 2 end,
      'Configured-role visibility edge count';
    select array_agg(id order by id) into actual_ids from (select (p->>'id')::uuid id from jsonb_array_elements(known->'known_players') p) x;
    select array_agg(player_id order by player_id) into expected_ids from private.game_roles other where other.game_id=g and other.player_id<>r.player_id and (
      (r.role='Merlin' and other.faction='EVIL' and other.role<>'Mordred')
      or (r.role='Percival' and other.role in ('Merlin','Morgana'))
      or (r.faction='EVIL' and r.role<>'Oberon' and other.faction='EVIL' and other.role<>'Oberon')
    );
    assert actual_ids is not distinct from expected_ids,'Incorrect role-specific visibility';
    assert not exists(select 1 from jsonb_array_elements(known->'known_players') p where p ? 'role' or p ? 'faction'),'Known players must not carry role labels';
  end loop;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000011',true);
do $$
declare g uuid:=current_setting('test.role_game')::uuid;c text:=current_setting('test.role_room');s jsonb;i int;
begin
  begin
    perform public.get_my_role(g);raise exception 'Outsider role access accepted';
  exception when raise_exception then if sqlerrm='Outsider role access accepted' then raise;end if;end;
  begin
    perform public.game_action(g,'ready',0);raise exception 'Outsider ready accepted';
  exception when raise_exception then if sqlerrm='Outsider ready accepted' then raise;end if;end;
  begin
    perform public.join_room(c,'Late knight');raise exception 'Mid-game join accepted';
  exception when raise_exception then if sqlerrm='Mid-game join accepted' then raise;end if;end;
  for i in 1..10 loop
    perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-'||lpad(i::text,12,'0'),true);
    s:=public.get_game(c);
    perform public.game_action(g,'ready',(s->>'version')::int);
    begin
      perform public.game_action(g,'ready',(s->>'version')::int);raise exception 'Stale game version accepted';
    exception when raise_exception then if sqlerrm='Stale game version accepted' then raise;end if;end;
    begin
      perform public.game_action(g,'ready',(public.get_game(c)->>'version')::int);raise exception 'Duplicate ready accepted';
    exception when raise_exception then if sqlerrm='Duplicate ready accepted' then raise;end if;end;
  end loop;
  s:=public.get_game(c);
  begin
    perform public.game_action(g,'begin_night',(s->>'version')::int);raise exception 'Non-host ceremony accepted';
  exception when raise_exception then if sqlerrm='Non-host ceremony accepted' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
  perform public.game_action(g,'begin_night',(s->>'version')::int);
  assert public.get_game(c)->>'phase'='NIGHT_PHASE','Everyone ready starts night';
  perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
  begin
    perform public.game_action(g,'next_step',(public.get_game(c)->>'version')::int);raise exception 'Non-host progression accepted';
  exception when raise_exception then if sqlerrm='Non-host progression accepted' then raise;end if;end;
  begin
    perform public.game_action(g,'abandon',(public.get_game(c)->>'version')::int);raise exception 'Non-host abandon accepted';
  exception when raise_exception then if sqlerrm='Non-host abandon accepted' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
  s:=public.get_game(c);perform public.game_action(g,'pause_night',(s->>'version')::int);
  begin
    perform public.game_action(g,'next_step',(public.get_game(c)->>'version')::int);raise exception 'Paused progression accepted';
  exception when raise_exception then if sqlerrm='Paused progression accepted' then raise;end if;end;
  perform public.game_action(g,'resume_night',(public.get_game(c)->>'version')::int);
  for i in 1..8 loop
    perform public.game_action(g,'next_step',(public.get_game(c)->>'version')::int);
  end loop;
  assert public.get_game(c)->>'phase'='TEAM_PROPOSAL','Ceremony reaches gameplay boundary';
  begin
    perform public.game_action(g,'next_step',(public.get_game(c)->>'version')::int);raise exception 'Step outside night accepted';
  exception when raise_exception then if sqlerrm='Step outside night accepted' then raise;end if;end;
  perform public.game_action(g,'abandon',(public.get_game(c)->>'version')::int);
  assert public.get_game(c) is null,'Abandon retires current match';
  assert public.get_room(c)->>'status'='LOBBY','Abandon restores lobby';
  begin
    perform public.get_my_role(g);raise exception 'Retired roles accessible';
  exception when raise_exception then if sqlerrm='Retired roles accessible' then raise;end if;end;
end;
$$;
reset role;
do $$
declare g uuid:=current_setting('test.role_game')::uuid;
begin
  assert (select count(*) from private.game_roles where game_id=g)=10,'Abandon preserves historical assignments privately';
  assert not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename in ('games','game_roles','game_players','team_votes','quest_submissions')),'No private game publication';
end;
$$;
rollback;

-- Exhaust all role subsets and all supported counts, checking valid assignments.
begin;
insert into auth.users(id) select ('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,10) i;
do $$
declare n int; mask int; i int; c text; g uuid; s jsonb; roles jsonb; evil int; valid boolean;
begin
  for n in 5..10 loop
    for mask in 0..15 loop
      perform set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
      -- Fixtures inserted by trusted test owner, bypassing the create-room hourly limit.
      c:='T'||substr('FGHJKL',n-4,1)||substr('ABCDEFGHJKLMNPQR',mask+1,1)||'ZZZ';
      insert into public.rooms(code,host_user_id) values(c,auth.uid());
      for i in 1..n loop
        insert into public.room_players(room_id,user_id,nickname,seat_order) select id,('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'Player '||i,i-1 from public.rooms where code=c;
      end loop;
      roles:='[]';
      if (mask&1)>0 then roles:=roles||'"Percival"'::jsonb;end if;
      if (mask&2)>0 then roles:=roles||'"Morgana"'::jsonb;end if;
      if (mask&4)>0 then roles:=roles||'"Mordred"'::jsonb;end if;
      if (mask&8)>0 then roles:=roles||'"Oberon"'::jsonb;end if;
      update public.rooms set settings=jsonb_build_object('roles',roles) where code=c;
      evil:=case when n<=6 then 2 when n<=9 then 3 else 4 end;
      valid:=not ((mask&2)>0 and (mask&1)=0) and (1+(select count(*) from jsonb_array_elements_text(roles) r where r<>'Percival'))<=evil;
      if valid then
        g:=public.start_game(c,0);
        assert (select count(*) from private.game_roles where game_id=g)=n,'Role list must equal roster';
        assert (select count(*) from private.game_roles where game_id=g and faction='EVIL')=evil,'Faction distribution mismatch';
        assert (select count(*) from private.game_roles where game_id=g and role='Merlin')=1,'Exactly one Merlin';
        assert (select count(*) from private.game_roles where game_id=g and role='Assassin')=1,'Exactly one Assassin';
        assert jsonb_array_length(public.get_game(c)->'night_script')=case when (mask&1)>0 then 8 else 6 end,'Dynamic night script length';
        perform public.game_action(g,'abandon',0);
        assert public.start_game(c,(public.get_room(c)->>'version')::int)<>g,'New match uses fresh ID';
      else
        begin
          perform public.start_game(c,0);raise exception 'Invalid configuration started';
        exception when raise_exception then if sqlerrm='Invalid configuration started' then raise;end if;end;
      end if;
    end loop;
  end loop;
end;
$$;
rollback;
