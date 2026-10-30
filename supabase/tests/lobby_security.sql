-- Run only against an isolated migrated Supabase database. Always rolled back.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$
declare c text; snapshot jsonb;
begin
  c:=public.create_room('Arden');
  perform set_config('test.room_code',c,true);
  snapshot:=public.get_room(c);
  assert jsonb_array_length(snapshot->'players')=1,'Host must be seated';
  perform public.join_room(c,'Arden');
  assert jsonb_array_length(public.get_room(c)->'players')=1,'Rejoin must be idempotent';
  assert not has_table_privilege(current_user,'public.rooms','UPDATE'),'No direct room writes';
  assert not has_table_privilege(current_user,'private.game_roles','SELECT'),'No secret role reads';
  assert not has_table_privilege(current_user,'private.quest_submissions','SELECT'),'No secret submission reads';
  begin
    perform public.lobby_action(c,'settings','{"roles":[]}',9999);
    raise exception 'Stale version accepted';
  exception when raise_exception then
    if sqlerrm='Stale version accepted' then raise; end if;
  end;
end;
$$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
do $$
declare c text:=current_setting('test.room_code'); snapshot jsonb;
begin
  assert (select count(*) from public.rooms)=0,'Outsider must not read room rows';
  begin
    perform public.get_room(c);raise exception 'Outsider read accepted';
  exception when raise_exception then if sqlerrm='Outsider read accepted' then raise;end if;end;
  begin
    perform public.join_room(c,'arden');raise exception 'Duplicate name accepted';
  exception when raise_exception then if sqlerrm='Duplicate name accepted' then raise;end if;end;
  perform public.join_room(c,'Rowan'); snapshot:=public.get_room(c);
  assert jsonb_array_length(snapshot->'players')=2,'Join must add one seat';
  begin
    perform public.lobby_action(c,'settings','{"roles":[]}',(snapshot->>'version')::int);raise exception 'Non-host action accepted';
  exception when raise_exception then if sqlerrm='Non-host action accepted' then raise;end if;end;
end;
$$;
rollback;

begin;
-- Independent fixture tests for settings, capacity, removal and host transfer.
insert into auth.users(id) values ('20000000-0000-0000-0000-000000000001');
insert into auth.users(id) select ('20000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(2,11) i;
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $$
declare c text; s jsonb; i int; target uuid;
begin
  c:=public.create_room('First');
  s:=public.get_room(c);
  begin
    perform public.lobby_action(c,'settings','{"roles":["Morgana"]}',0);
    raise exception 'Incompatible roles accepted';
  exception when raise_exception then if sqlerrm='Incompatible roles accepted' then raise;end if;end;
  begin
    perform public.lobby_action(c,'settings','{"roles":["Percival","Percival"]}',0);
    raise exception 'Duplicate roles accepted';
  exception when raise_exception then if sqlerrm='Duplicate roles accepted' then raise;end if;end;
  perform public.lobby_action(c,'settings','{"roles":["Percival","Morgana"]}',0);
  assert public.get_room(c)->'settings'->'roles'='["Percival","Morgana"]'::jsonb,'Settings must persist';
  for i in 2..10 loop
    perform set_config('request.jwt.claim.sub',('20000000-0000-0000-0000-'||lpad(i::text,12,'0')),true);
    perform public.join_room(c,'Player '||i);
  end loop;
  assert jsonb_array_length(public.get_room(c)->'players')=10,'Room must seat ten players';
  perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000011',true);
  begin
    perform public.join_room(c,'Eleventh');raise exception 'Capacity exceeded';
  exception when raise_exception then if sqlerrm='Capacity exceeded' then raise;end if;end;
  perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
  s:=public.get_room(c); target:=(s->'players'->9->>'id')::uuid;
  perform public.lobby_action(c,'remove',to_jsonb(target),(s->>'version')::int);
  assert jsonb_array_length(public.get_room(c)->'players')=9,'Host removal must remove one seat';
  s:=public.get_room(c);
  perform public.lobby_action(c,'leave','{}',(s->>'version')::int);
  perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
  s:=public.get_room(c);
  assert s->>'host_user_id'='20000000-0000-0000-0000-000000000002','Hosting must transfer to next seat';
  begin
    update public.rooms set host_user_id=auth.uid() where code=c;
    raise exception 'Direct mutation accepted';
  exception when insufficient_privilege then null;end;
end;
$$;
set local role anon;
do $$
begin
  assert not has_function_privilege(current_user,'public.create_room(text)','EXECUTE'),'Unauthenticated caller must not create rooms';
  assert not has_function_privilege(current_user,'public.get_room(text)','EXECUTE'),'Unauthenticated caller must not read rooms';
  assert not has_schema_privilege(current_user,'private','USAGE'),'No private schema access for unauthenticated users';
end;
$$;
rollback;
