-- Run in an isolated migrated database only. Helpers and fixtures roll back.
begin;
create function pg_temp.play(gid uuid,actor uuid,action text,payload jsonb default '{}') returns void language plpgsql as $$
declare ver int;
begin
  perform set_config('request.jwt.claim.sub',actor::text,true);
  select version into ver from public.games where id=gid;
  perform public.play_action(gid,action,payload,ver);
end;
$$;
create function pg_temp.new_match(n int) returns uuid language plpgsql as $$
declare host_id uuid:=gen_random_uuid();u uuid;c text;g uuid;i int;v int;
begin
  insert into auth.users(id) values(host_id);perform set_config('request.jwt.claim.sub',host_id::text,true);
  c:=public.create_room('Host');
  for i in 2..n loop
    u:=gen_random_uuid();insert into auth.users(id) values(u);perform set_config('request.jwt.claim.sub',u::text,true);perform public.join_room(c,'Knight '||i);
  end loop;
  perform set_config('request.jwt.claim.sub',host_id::text,true);
  g:=public.start_game(c,(public.get_room(c)->>'version')::int);
  for u in select user_id from private.game_players where game_id=g order by seat_order loop
    perform set_config('request.jwt.claim.sub',u::text,true);select version into v from public.games where id=g;
    perform public.game_action(g,'ready',v);
  end loop;
  perform set_config('request.jwt.claim.sub',host_id::text,true);select version into v from public.games where id=g;perform public.game_action(g,'begin_night',v);
  while (select phase from public.games where id=g)='NIGHT_PHASE' loop
    select version into v from public.games where id=g;perform public.game_action(g,'next_step',v);
  end loop;
  return g;
end;
$$;
create function pg_temp.run_quest(gid uuid,wanted_fails int) returns void language plpgsql as $$
declare g public.games;team uuid[];required int;n int;q int;u uuid;p uuid;i int;choice text;c text;s jsonb;proposal_id uuid;
begin
  select * into g from public.games where id=gid;q:=g.quest_number;
  select code into c from public.rooms where id=g.room_id;
  select count(*) into n from private.game_players where game_id=gid;
  select team_sizes[q] into required from private.quest_rules where player_count=n;
  select coalesce(array_agg(player_id),'{}') into team from (select player_id from private.game_roles where game_id=gid and faction='EVIL' order by player_id limit wanted_fails) x;
  select team||array_agg(player_id) into team from (select player_id from private.game_players where game_id=gid and not(player_id=any(team)) order by seat_order limit required-cardinality(team)) x;
  select user_id into u from private.game_players where game_id=gid and player_id=g.leader_player_id;
  perform pg_temp.play(gid,u,'propose_team',jsonb_build_object('players',team));
  select id into proposal_id from public.team_proposals where game_id=gid order by quest_number desc,attempt_number desc limit 1;
  i:=0;
  for u in select user_id from private.game_players where game_id=gid order by seat_order loop
    perform pg_temp.play(gid,u,'team_vote','{"approve":true}');i:=i+1;
    if i<n then
      s:=public.get_game(c);assert s->>'phase'='TEAM_VOTING','Partial team vote advanced';
      assert s->'proposals'->-1->'votes'='null'::jsonb,'Individual approval votes leaked early';
      assert s->'revealed_roles'='null'::jsonb,'Roles leaked before end';
    end if;
  end loop;
  assert (select phase from public.games where id=gid)='QUEST_VOTING','Majority must approve';
  assert (select proposal_attempt from public.games where id=gid)=1,'Approval resets rejection counter';
  assert jsonb_array_length(public.get_game(c)->'proposals'->-1->'votes')=n,'Completed approvals must be revealed';
  i:=0;
  for p in select unnest(team) loop
    select user_id into u from private.game_players where game_id=gid and player_id=p;
    choice:=case when i<wanted_fails then 'FAIL' else 'SUCCESS' end;
    perform pg_temp.play(gid,u,'quest_submit',jsonb_build_object('submission',choice));i:=i+1;
    if i<required then
      s:=public.get_game(c);assert s->>'phase'='QUEST_VOTING','Partial quest advanced';
      assert not exists(select 1 from public.quest_results where game_id=gid and quest_number=q),'Partial Fail count exposed';
      assert not(s ? 'quest_submissions') and not(s ? 'fail_count'),'Raw submissions exposed';
    end if;
  end loop;
  assert (select fail_count from public.quest_results where game_id=gid and quest_number=q)=wanted_fails,'Aggregate count mismatch';
  assert (select count(*) from public.quest_results where game_id=gid and quest_number=q)=1,'Quest resolved more than once';
end;
$$;

do $$
declare g uuid;host_id uuid;assassin uuid;merlin uuid;target uuid;c text;s jsonb;q int;n int;previous uuid;old_version int;leader_user uuid;u uuid;team uuid[];i int;outside_id uuid:=gen_random_uuid();
begin
  -- Good quest wins enter assassination; both final-strike outcomes are tested.
  for i in 1..2 loop
    g:=pg_temp.new_match(5);
    select r.host_user_id,r.code into host_id,c from public.rooms r join public.games x on x.room_id=r.id where x.id=g;
    for q in 1..3 loop
      perform pg_temp.run_quest(g,0);
      if q<3 then perform pg_temp.play(g,host_id,'continue_quest');end if;
    end loop;
    assert (select phase from public.games where id=g)='ASSASSINATION','Three successes require assassination';
    s:=public.get_game(c);assert s->'revealed_roles'='null'::jsonb,'Merlin revealed before strike';
    select p.user_id into assassin from private.game_roles r join private.game_players p using(game_id,player_id) where r.game_id=g and r.role='Assassin';
    select player_id into merlin from private.game_roles where game_id=g and role='Merlin';
    select p.user_id into u from private.game_roles r join private.game_players p using(game_id,player_id) where r.game_id=g and r.role='Loyal Servant' limit 1;
    begin
      perform pg_temp.play(g,u,'assassinate',jsonb_build_object('player_id',merlin));raise exception 'Non-Assassin strike accepted';
    exception when raise_exception then if sqlerrm='Non-Assassin strike accepted' then raise;end if;end;
    if i=1 then target:=merlin;else select player_id into target from private.game_roles where game_id=g and role='Loyal Servant' limit 1;end if;
    perform pg_temp.play(g,assassin,'assassinate',jsonb_build_object('player_id',target));
    assert (select winner from public.games where id=g)=case when i=1 then 'EVIL' else 'GOOD' end,'Wrong assassination winner';
    s:=public.get_game(c);assert s->>'phase'='GAME_OVER','Finished match must remain visible';
    assert jsonb_array_length(s->'revealed_roles')=5,'All roles must be revealed only at game over';
    begin
      perform pg_temp.play(g,assassin,'team_vote','{"approve":true}');raise exception 'Post-game vote accepted';
    exception when raise_exception then if sqlerrm='Post-game vote accepted' then raise;end if;end;
    perform pg_temp.play(g,host_id,'return_lobby');assert public.get_game(c) is null,'Return must clear the current game';
    assert jsonb_array_length(public.get_room(c)->'players')=5,'Rematch must retain seats';
    previous:=g;g:=public.start_game(c,(public.get_room(c)->>'version')::int);
    assert g<>previous and (public.get_game(c)->>'id')::uuid=g,'Rematch must select the new match';
    begin
      perform pg_temp.play(previous,host_id,'return_lobby');raise exception 'Retired match altered new match';
    exception when raise_exception then if sqlerrm='Retired match altered new match' then raise;end if;end;
    assert (select count(*) from private.game_roles where game_id=previous)=5,'Old roles must remain intact';
  end loop;

  -- Three failed quests end immediately without assassination.
  g:=pg_temp.new_match(5);select r.host_user_id into host_id from public.rooms r join public.games x on x.room_id=r.id where x.id=g;
  for q in 1..3 loop perform pg_temp.run_quest(g,1);if q<3 then perform pg_temp.play(g,host_id,'continue_quest');end if;end loop;
  assert (select winner from public.games where id=g)='EVIL','Three failures must win for Evil';
  assert (select count(*) from public.quest_results where game_id=g)=3,'Exactly three failed quests';

  -- All supported team sizes and the fourth-quest special threshold.
  for n in 5..10 loop
    g:=pg_temp.new_match(n);select r.host_user_id into host_id from public.rooms r join public.games x on x.room_id=r.id where x.id=g;
    for q in 1..3 loop perform pg_temp.run_quest(g,case when q=1 then 0 else 1 end);perform pg_temp.play(g,host_id,'continue_quest');end loop;
    perform pg_temp.run_quest(g,1);
    assert (select result from public.quest_results where game_id=g and quest_number=4)=case when n>=7 then 'SUCCESS' else 'FAIL' end,'Fourth-quest threshold mismatch';
    if n>=7 then
      perform pg_temp.play(g,host_id,'continue_quest');perform pg_temp.run_quest(g,0);
      assert (select phase from public.games where id=g)='ASSASSINATION','Fifth quest must resolve third success';
    end if;
  end loop;
  g:=pg_temp.new_match(7);select r.host_user_id into host_id from public.rooms r join public.games x on x.room_id=r.id where x.id=g;
  for q in 1..3 loop perform pg_temp.run_quest(g,case when q=1 then 1 else 0 end);perform pg_temp.play(g,host_id,'continue_quest');end loop;
  perform pg_temp.run_quest(g,2);assert (select result from public.quest_results where game_id=g and quest_number=4)='FAIL','Two Fail submissions must fail fourth quest';

  -- Ties reject, rotate leaders, and the fifth rejection wins for Evil.
  g:=pg_temp.new_match(6);
  for q in 1..5 loop
    select user_id into leader_user from private.game_players p join public.games x on x.id=p.game_id and x.leader_player_id=p.player_id where x.id=g;
    select leader_player_id into previous from public.games where id=g;
    select array_agg(player_id) into team from (select player_id from private.game_players where game_id=g order by seat_order limit 2) x;
    perform pg_temp.play(g,leader_user,'propose_team',jsonb_build_object('players',team));i:=0;
    for u in select user_id from private.game_players where game_id=g order by seat_order loop
      perform pg_temp.play(g,u,'team_vote',jsonb_build_object('approve',i<3));i:=i+1;
    end loop;
    if q<5 then assert (select leader_player_id from public.games where id=g)<>previous,'Rejected leader must rotate';
      assert (select proposal_attempt from public.games where id=g)=q+1,'Rejections must count consecutively';
    end if;
  end loop;
  assert (select winner from public.games where id=g)='EVIL','Five ties/rejections must lose the kingdom';

  -- Invalid inputs, duplicate ballots, stale versions and faction permissions.
  g:=pg_temp.new_match(5);
  select p.user_id into leader_user from private.game_players p join public.games x on x.id=p.game_id and x.leader_player_id=p.player_id where x.id=g;
  select array_agg(player_id) into team from (select player_id from private.game_players where game_id=g order by seat_order limit 2) x;
  begin
    perform pg_temp.play(g,leader_user,'propose_team',jsonb_build_object('players',array[team[1],team[1]]));raise exception 'Duplicate team accepted';
  exception when raise_exception then if sqlerrm='Duplicate team accepted' then raise;end if;end;
  begin
    perform pg_temp.play(g,leader_user,'propose_team',jsonb_build_object('players',array[team[1],gen_random_uuid()]));raise exception 'Foreign player accepted';
  exception when raise_exception then if sqlerrm='Foreign player accepted' then raise;end if;end;
  select user_id into u from private.game_players where game_id=g and user_id<>leader_user limit 1;
  begin
    perform pg_temp.play(g,u,'propose_team',jsonb_build_object('players',team));raise exception 'Non-leader proposal accepted';
  exception when raise_exception then if sqlerrm='Non-leader proposal accepted' then raise;end if;end;
  -- Use a loyal-only team to verify server-side Success enforcement.
  select array_agg(player_id) into team from (select player_id from private.game_roles where game_id=g and faction='GOOD' limit 2) x;
  perform pg_temp.play(g,leader_user,'propose_team',jsonb_build_object('players',team));
  select version into old_version from public.games where id=g;
  perform pg_temp.play(g,leader_user,'team_vote','{"approve":true}');
  begin
    perform public.play_action(g,'team_vote','{"approve":false}',old_version);raise exception 'Stale ballot accepted';
  exception when serialization_failure then null;end;
  begin
    perform pg_temp.play(g,leader_user,'team_vote','{"approve":false}');raise exception 'Duplicate ballot accepted';
  exception when raise_exception then if sqlerrm='Duplicate ballot accepted' then raise;end if;end;
  for u in select user_id from private.game_players where game_id=g and user_id<>leader_user loop perform pg_temp.play(g,u,'team_vote','{"approve":true}');end loop;
  select user_id into u from private.game_players where game_id=g and player_id=team[1];
  begin
    perform pg_temp.play(g,u,'quest_submit','{"submission":"FAIL"}');raise exception 'Loyal Fail accepted';
  exception when raise_exception then if sqlerrm='Loyal Fail accepted' then raise;end if;end;
  perform pg_temp.play(g,u,'quest_submit','{"submission":"SUCCESS"}');
  begin
    perform pg_temp.play(g,u,'quest_submit','{"submission":"SUCCESS"}');raise exception 'Duplicate submission accepted';
  exception when raise_exception then if sqlerrm='Duplicate submission accepted' then raise;end if;end;
  select user_id into u from private.game_players where game_id=g and not(player_id=any(team)) limit 1;
  begin
    perform pg_temp.play(g,u,'quest_submit',jsonb_build_object('submission','SUCCESS','player_id',team[2]));raise exception 'Observer submission accepted';
  exception when raise_exception then if sqlerrm='Observer submission accepted' then raise;end if;end;
  perform set_config('test.quest_game',g::text,true);
  perform set_config('test.quest_member',u::text,true);
  select code into c from public.rooms where id=(select room_id from public.games where id=g);
  perform set_config('test.quest_code',c,true);
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.quest_member'),true);
do $$
begin
  assert not has_table_privilege(current_user,'private.team_votes','SELECT'),'No raw ballot reads';
  assert not has_table_privilege(current_user,'private.quest_submissions','SELECT'),'No raw quest reads';
  assert not has_table_privilege(current_user,'public.games','UPDATE'),'No direct game mutations';
  begin
    perform public.play_action(current_setting('test.quest_game')::uuid,'force_win','{}',(public.get_game(current_setting('test.quest_code'))->>'version')::int);raise exception 'Arbitrary win accepted';
  exception when raise_exception then if sqlerrm='Arbitrary win accepted' then raise;end if;end;
end;
$$;
select set_config('request.jwt.claim.sub','99999999-0000-0000-0000-000000000001',true);
do $$
begin
  begin
    perform public.play_action(current_setting('test.quest_game')::uuid,'team_vote','{"approve":true}',0);raise exception 'Outsider vote accepted';
  exception when raise_exception then if sqlerrm='Outsider vote accepted' then raise;end if;end;
end;
$$;
rollback;
