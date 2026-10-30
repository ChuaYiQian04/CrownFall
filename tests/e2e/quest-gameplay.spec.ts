import { test, expect } from "@playwright/test";

// UI transport fixture. Authoritative outcomes are tested by the SQL suite.
test("play through proposals, ballots, quest results, assassination and victory", async ({
  page,
}, testInfo) => {
  await page.route("**/src/services/game.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    import {identity} from '/src/services/rooms.ts';
    let state;
    export async function getGame(){
      if(!state){const user=await identity();state={id:'quest-fixture',room_code:'TESTQR',phase:'TEAM_PROPOSAL',version:0,host_user_id:user,leader_player_id:'p0',night_step:0,night_paused:false,roles:[],night_script:[],quest_number:1,proposal_attempt:1,required_team_size:2,fail_threshold:1,team_vote_count:0,my_team_vote:null,quest_submission_count:0,my_quest_submitted:false,quest_results:[],proposals:[],proposal:null,players:Array.from({length:5},(_,i)=>({id:'p'+i,user_id:i===0?user:'other-'+i,nickname:i===0?'Arden':'Knight '+i,ready:true}))};}
      return structuredClone(state);
    }
    export async function getMyRole(){return {role:'Assassin',faction:'EVIL',known_players:[]};}
    export async function gameAction(game,action,payload={}){
      if(action==='propose_team'){
        state.proposal={id:'proposal-'+state.quest_number,quest_number:state.quest_number,attempt_number:1,status:'PENDING',selected_players:payload.players};
        state.proposals.push({...state.proposal,leader_player_id:'p0',votes:null});state.phase='TEAM_VOTING';state.my_team_vote=null;state.team_vote_count=0;
      }
      if(action==='team_vote'){
        state.my_team_vote=payload.approve;state.team_vote_count=5;state.proposal.status='APPROVED';
        state.proposals.at(-1).status='APPROVED';state.proposals.at(-1).votes=state.players.map(p=>({player_id:p.id,approve:true}));state.phase='QUEST_VOTING';
      }
      if(action==='quest_submit'){
        state.my_quest_submitted=true;state.quest_submission_count=state.required_team_size;state.quest_results.push({quest_number:state.quest_number,result:'SUCCESS',fail_count:0});state.phase=state.quest_number===3?'ASSASSINATION':'QUEST_RESULT';
      }
      if(action==='continue_quest'){
        state.quest_number++;state.required_team_size=state.quest_number===2?3:2;state.phase='TEAM_PROPOSAL';state.my_quest_submitted=false;state.quest_submission_count=0;
      }
      if(action==='assassinate'){
        state.phase='GAME_OVER';state.winner='GOOD';state.victory_reason='Three quests succeeded and Merlin survived.';
        state.revealed_roles=state.players.map((p,i)=>({player_id:p.id,role:i===0?'Assassin':i===1?'Merlin':i===4?'Minion of Evil':'Loyal Servant',faction:i===0||i===4?'EVIL':'GOOD'}));
      }
      state.version++;
    }
    export async function startGame(){throw new Error('UI fixture only');}
  `,
    }),
  );
  await page.goto("/game/TESTQR");
  for (let quest = 1; quest <= 3; quest++) {
    await expect(
      page.getByRole("heading", { name: "Who will you trust?" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "Arden", exact: true }).check();
    await page.getByRole("checkbox", { name: "Knight 1", exact: true }).check();
    if (quest === 2)
      await page
        .getByRole("checkbox", { name: "Knight 2", exact: true })
        .check();
    if (quest === 1)
      await page.screenshot({
        path: testInfo.outputPath("team-selection.png"),
        fullPage: true,
      });
    await page.getByRole("button", { name: /Propose team/ }).click();
    await expect(
      page.getByRole("heading", { name: "Approve this fellowship?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "The quest is underway" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Fail", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Success", exact: true }).click();
    if (quest < 3) {
      await expect(
        page.getByRole("heading", { name: "The fellowship prevails" }),
      ).toBeVisible();
      if (quest === 1) {
        await expect
          .poll(() =>
            page
              .locator(".result-illustration img")
              .evaluate(
                (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
              ),
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath("quest-success.png"),
          fullPage: true,
        });
      }
      await page.getByRole("button", { name: "Open the next quest" }).click();
    }
  }
  await expect(
    page.getByRole("heading", { name: "Three quests. One last blade." }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Knight 2", exact: true }).check();
  await page.getByRole("button", { name: "Choose Knight 2" }).click();
  await page.getByRole("button", { name: "Confirm final strike" }).click();
  await expect(
    page.getByRole("heading", { name: "The Crown Endures" }),
  ).toBeVisible();
  await expect(page.getByText("Merlin", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play again/ })).toBeVisible();
  await page.getByText("Public council history", { exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("victory.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
