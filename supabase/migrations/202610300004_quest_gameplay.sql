-- Apply once after 003. Full quest loop, private ballots and assassination.
begin;
alter table public.games add column match_number bigint generated always as identity;
create table private.quest_rules (
  player_count int primary key check(player_count between 5 and 10),
  team_sizes int[] not null check(cardinality(team_sizes)=5)
);
insert into private.quest_rules values
  (5,'{2,3,2,3,3}'),(6,'{2,3,4,3,4}'),(7,'{2,3,3,4,4}'),
  (8,'{3,4,4,5,5}'),(9,'{3,4,4,5,5}'),(10,'{3,4,4,5,5}');
alter table private.quest_rules enable row level security;
revoke all on private.quest_rules from public,anon,authenticated;
-- Prevent even internal callers from inserting a voter from a different match.
alter table private.team_votes add column game_id uuid;
update private.team_votes v set game_id=p.game_id from public.team_proposals p where p.id=v.proposal_id;
alter table private.team_votes alter column game_id set not null;
alter table public.team_proposals add unique(id,game_id);
alter table private.team_votes add foreign key(proposal_id,game_id) references public.team_proposals(id,game_id);
alter table private.team_votes add foreign key(game_id,player_id) references private.game_players(game_id,player_id);

create function public.play_action(p_game_id uuid,p_action text,p_payload jsonb,p_version int) returns void
language plpgsql security definer set search_path='' as $$
declare g public.games; r public.rooms; rid uuid; me private.game_players;
  proposal public.team_proposals; team uuid[]; target uuid; selected_count int; n int; required int;
  yes_count int; submitted int; fails int; threshold int; successes int; failures int; next_leader uuid;
  v_vote boolean; v_submission text; v_winner text; v_reason text;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select room_id into rid from public.games where id=p_game_id;
  select * into r from public.rooms where id=rid for update;
  if not found or not private.is_member(r.id) then raise exception 'You are not in this match.'; end if;
  select * into g from public.games where id=p_game_id for update;
  if exists(select 1 from public.games where room_id=r.id and match_number>g.match_number and phase<>'ABANDONED') then raise exception 'This is no longer the current match.'; end if;
  select * into me from private.game_players where game_id=g.id and user_id=auth.uid();
  if not found or r.status<>'PLAYING' or g.phase='ABANDONED' then raise exception 'This match is no longer available.'; end if;
  if p_version is null or p_version<>g.version then raise exception using errcode='40001',message='The match changed. Please try again.'; end if;
  if g.phase='GAME_OVER' then
    if p_action is distinct from 'return_lobby' or r.host_user_id<>auth.uid() then raise exception 'The game is over. Only the host can return the council to the lobby.'; end if;
    update public.rooms set status='LOBBY',version=version+1 where id=r.id;
    return;
  end if;
  if g.completed_at is not null then raise exception 'This match is complete.'; end if;
  select count(*) into n from private.game_players where game_id=g.id;
  select team_sizes[g.quest_number] into required from private.quest_rules where player_count=n;
  threshold:=case when n>=7 and g.quest_number=4 then 2 else 1 end;
  select player_id into next_leader from private.game_players where game_id=g.id
    order by case when seat_order>(select seat_order from private.game_players where game_id=g.id and player_id=g.leader_player_id) then 0 else 1 end,seat_order limit 1;
  select * into proposal from public.team_proposals where game_id=g.id order by quest_number desc,attempt_number desc limit 1;

  if p_action='propose_team' then
    if g.phase<>'TEAM_PROPOSAL' or me.player_id<>g.leader_player_id then raise exception 'Only the current leader can propose a team.'; end if;
    if jsonb_typeof(p_payload->'players') is distinct from 'array' then raise exception 'Choose a quest team.'; end if;
    if jsonb_array_length(p_payload->'players')<>required then raise exception 'Choose exactly % different players.',required; end if;
    select array_agg(value::uuid),count(*) into team,selected_count from jsonb_array_elements_text(p_payload->'players');
    if selected_count<>required or (select count(distinct p) from unnest(team) p)<>required then raise exception 'Choose exactly % different players.',required; end if;
    if exists(select 1 from unnest(team) p where not exists(select 1 from private.game_players where game_id=g.id and player_id=p)) then raise exception 'Every selected player must belong to this match.'; end if;
    insert into public.team_proposals(game_id,quest_number,attempt_number,leader_player_id,selected_players)
      values(g.id,g.quest_number,g.proposal_attempt,me.player_id,team);
    update public.games set phase='TEAM_VOTING' where id=g.id;
    insert into public.game_events(game_id,event_type,public_payload) values(g.id,'TEAM_PROPOSED',jsonb_build_object('quest',g.quest_number,'attempt',g.proposal_attempt,'team',team));

  elsif p_action='team_vote' then
    if g.phase<>'TEAM_VOTING' or proposal.id is null or proposal.status<>'PENDING' then raise exception 'Team voting is closed.'; end if;
    if jsonb_typeof(p_payload->'approve') is distinct from 'boolean' then raise exception 'Choose Approve or Reject.'; end if;
    if exists(select 1 from private.team_votes where proposal_id=proposal.id and player_id=me.player_id) then raise exception 'You already voted on this team.'; end if;
    v_vote:=(p_payload->>'approve')::boolean;
    insert into private.team_votes(proposal_id,game_id,player_id,vote) values(proposal.id,g.id,me.player_id,v_vote);
    select count(*),count(*) filter(where vote) into submitted,yes_count from private.team_votes where proposal_id=proposal.id;
    if submitted=n then
      if yes_count>n/2 then
        update public.team_proposals set status='APPROVED' where id=proposal.id;
        update public.games set phase='QUEST_VOTING',proposal_attempt=1 where id=g.id;
      else
        update public.team_proposals set status='REJECTED' where id=proposal.id;
        if g.proposal_attempt=5 then
          v_winner:='EVIL';v_reason:='Five consecutive fellowships were rejected.';
        else
          update public.games set phase='TEAM_PROPOSAL',proposal_attempt=proposal_attempt+1,leader_player_id=next_leader where id=g.id;
        end if;
      end if;
      insert into public.game_events(game_id,event_type,public_payload) values(g.id,'TEAM_DECIDED',jsonb_build_object('quest',g.quest_number,'attempt',g.proposal_attempt,'approvals',yes_count,'approved',yes_count>n/2));
    end if;

  elsif p_action='quest_submit' then
    if g.phase<>'QUEST_VOTING' or proposal.id is null or proposal.status<>'APPROVED' or not (me.player_id=any(proposal.selected_players)) then raise exception 'Only approved quest members can submit.'; end if;
    v_submission:=p_payload->>'submission';
    if v_submission is null or v_submission not in ('SUCCESS','FAIL') then raise exception 'Choose Success or Fail.'; end if;
    if v_submission='FAIL' and not exists(select 1 from private.game_roles where game_id=g.id and player_id=me.player_id and faction='EVIL') then raise exception 'Loyal players must submit Success.'; end if;
    if exists(select 1 from private.quest_submissions where game_id=g.id and quest_number=g.quest_number and player_id=me.player_id) then raise exception 'Your quest choice is already sealed.'; end if;
    insert into private.quest_submissions(game_id,quest_number,player_id,submission) values(g.id,g.quest_number,me.player_id,v_submission);
    select count(*),count(*) filter(where submission='FAIL') into submitted,fails from private.quest_submissions where game_id=g.id and quest_number=g.quest_number;
    if submitted=required then
      insert into public.quest_results(game_id,quest_number,result,fail_count) values(g.id,g.quest_number,case when fails>=threshold then 'FAIL' else 'SUCCESS' end,fails);
      select count(*) filter(where result='SUCCESS'),count(*) filter(where result='FAIL') into successes,failures from public.quest_results where game_id=g.id;
      if failures>=3 then v_winner:='EVIL';v_reason:='Three quests fell to betrayal.';
      elsif successes>=3 then update public.games set phase='ASSASSINATION' where id=g.id;
      else update public.games set phase='QUEST_RESULT' where id=g.id;
      end if;
      insert into public.game_events(game_id,event_type,public_payload) values(g.id,'QUEST_RESOLVED',jsonb_build_object('quest',g.quest_number,'fails',fails,'result',case when fails>=threshold then 'FAIL' else 'SUCCESS' end));
    end if;

  elsif p_action='continue_quest' then
    if g.phase<>'QUEST_RESULT' or r.host_user_id<>auth.uid() then raise exception 'Only the host can open the next quest after its result.'; end if;
    if g.quest_number>=5 then raise exception 'No further quest is available.'; end if;
    update public.games set phase='TEAM_PROPOSAL',quest_number=quest_number+1,proposal_attempt=1,leader_player_id=next_leader where id=g.id;

  elsif p_action='assassinate' then
    if g.phase<>'ASSASSINATION' or not exists(select 1 from private.game_roles where game_id=g.id and player_id=me.player_id and role='Assassin') then raise exception 'Only the Assassin can choose the final target.'; end if;
    target:=(p_payload->>'player_id')::uuid;
    if target is null or target=me.player_id or not exists(select 1 from private.game_players where game_id=g.id and player_id=target) then raise exception 'Choose another player in this match.'; end if;
    if exists(select 1 from private.game_roles where game_id=g.id and player_id=target and role='Merlin') then
      v_winner:='EVIL';v_reason:='The Assassin discovered Merlin.';
    else v_winner:='GOOD';v_reason:='Three quests succeeded and Merlin survived.';
    end if;
    insert into public.game_events(game_id,event_type,public_payload) values(g.id,'FINAL_STRIKE',jsonb_build_object('target',target));
  else raise exception 'Unknown gameplay action.';
  end if;
  if v_winner is not null then
    update public.games set phase='GAME_OVER',winner=v_winner,victory_reason=v_reason,completed_at=now() where id=g.id;
  end if;
  update public.games set version=version+1 where id=g.id;
  update public.rooms set version=version+1 where id=r.id;
end;
$$;

create or replace function public.get_game(p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.rooms; g public.games; me uuid; proposal public.team_proposals; n int; required int;
begin
  if auth.uid() is null then raise exception 'Please reconnect.'; end if;
  select * into r from public.rooms where code=upper(btrim(p_code));
  if not found or not private.is_member(r.id) then raise exception 'You are not seated in this room.'; end if;
  if r.status<>'PLAYING' then return null; end if;
  select * into g from public.games where room_id=r.id and phase<>'ABANDONED' order by match_number desc limit 1;
  if not found then return null; end if;
  select player_id into me from private.game_players where game_id=g.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this match.'; end if;
  select count(*) into n from private.game_players where game_id=g.id;
  select team_sizes[g.quest_number] into required from private.quest_rules where player_count=n;
  select * into proposal from public.team_proposals where game_id=g.id order by quest_number desc,attempt_number desc limit 1;
  return jsonb_build_object(
    'id',g.id,'phase',g.phase,'version',g.version,'host_user_id',r.host_user_id,'room_code',r.code,
    'leader_player_id',g.leader_player_id,'night_step',g.night_step,'night_paused',g.night_paused,
    'roles',g.config_roles,'night_script',private.night_script(g.config_roles),
    'quest_number',g.quest_number,'proposal_attempt',g.proposal_attempt,'required_team_size',required,
    'fail_threshold',case when n>=7 and g.quest_number=4 then 2 else 1 end,
    'winner',g.winner,'victory_reason',g.victory_reason,
    'players',(select jsonb_agg(jsonb_build_object('id',player_id,'user_id',user_id,'nickname',nickname,'ready',ready) order by seat_order) from private.game_players where game_id=g.id),
    'proposal',case when proposal.id is null then null else jsonb_build_object('id',proposal.id,'quest_number',proposal.quest_number,'attempt_number',proposal.attempt_number,'status',proposal.status,'selected_players',proposal.selected_players) end,
    'team_vote_count',(select count(*) from private.team_votes where proposal_id=proposal.id),
    'my_team_vote',(select vote from private.team_votes where proposal_id=proposal.id and player_id=me),
    'quest_submission_count',(select count(*) from private.quest_submissions where game_id=g.id and quest_number=g.quest_number),
    'my_quest_submitted',exists(select 1 from private.quest_submissions where game_id=g.id and quest_number=g.quest_number and player_id=me),
    'quest_results',coalesce((select jsonb_agg(jsonb_build_object('quest_number',quest_number,'result',result,'fail_count',fail_count) order by quest_number) from public.quest_results where game_id=g.id),'[]'),
    'proposals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'quest_number',p.quest_number,'attempt_number',p.attempt_number,'leader_player_id',p.leader_player_id,'selected_players',p.selected_players,'status',p.status,
      'votes',case when p.status='PENDING' then null else (select jsonb_agg(jsonb_build_object('player_id',v.player_id,'approve',v.vote) order by v.player_id) from private.team_votes v where v.proposal_id=p.id) end) order by p.quest_number,p.attempt_number) from public.team_proposals p where p.game_id=g.id),'[]'),
    'revealed_roles',case when g.phase='GAME_OVER' then (select jsonb_agg(jsonb_build_object('player_id',player_id,'role',role,'faction',faction)) from private.game_roles where game_id=g.id) else null end
  );
end;
$$;
revoke all on function public.play_action(uuid,text,jsonb,int) from public,anon;
grant execute on function public.play_action(uuid,text,jsonb,int) to authenticated;
commit;
