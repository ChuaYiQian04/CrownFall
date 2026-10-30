import { test, expect } from "@playwright/test";

// Browser UI fixture only. No real players or backend security are simulated.
// Database authority and role visibility are exercised separately by test:db.
test("private reveal, readiness and host ceremony across responsive layouts", async ({
  page,
}, testInfo) => {
  await page.route("**/src/services/game.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    import {identity} from '/src/services/rooms.ts';
    let state;
    export async function getGame(){
      if(!state){const user=await identity();state={id:'fixture-match',phase:'ROLE_REVEAL',version:0,host_user_id:user,leader_player_id:'p0',night_step:0,night_paused:false,roles:[],night_script:[{title:'The realm grows quiet',text:'Everyone, hide your character card and close your eyes.'},{title:'Dawn at the council',text:'Everyone, open your eyes.'}],players:Array.from({length:5},(_,i)=>({id:'p'+i,user_id:i===0?user:'fixture-user-'+i,nickname:i===0?'Arden':'Knight '+i,ready:i!==0}))};}
      return structuredClone({...state,quest_number:1,proposal_attempt:1,required_team_size:2,fail_threshold:1,quest_results:[],proposals:[]});
    }
    export async function getMyRole(){return {role:'Merlin',faction:'GOOD',known_players:[{id:'p2',nickname:'Knight 2'},{id:'p4',nickname:'Knight 4'}]};}
    export async function gameAction(game,action){
      if(action==='ready')state.players[0].ready=true;
      if(action==='begin_night')state.phase='NIGHT_PHASE';
      if(action==='pause_night')state.night_paused=true;
      if(action==='resume_night')state.night_paused=false;
      if(action==='next_step'){if(state.night_step===1)state.phase='TEAM_PROPOSAL';else state.night_step++;}
      state.version++;
    }
    export async function startGame(){throw new Error('UI fixture only');}
  `,
    }),
  );
  await page.goto("/game/TESTQR");
  await expect(
    page.getByRole("heading", { name: "Your oath awaits" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /I know my role/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Merlin", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Reveal my character" }).click();
  await expect(
    page.getByRole("heading", { name: "Merlin", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".card-front")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: testInfo.outputPath("character.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Hide character" }).click();
  await expect(
    page.getByRole("heading", { name: "Merlin", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: /I know my role/ }).click();
  await expect(page.getByText("5 / 5 ready")).toBeVisible();
  await page.getByRole("button", { name: "Start ceremony" }).click();
  await expect(
    page.getByRole("heading", { name: "The realm grows quiet" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("night.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pause ceremony" }).click();
  await expect(
    page.getByRole("button", { name: "Next instruction" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume ceremony" }).click();
  await page.getByRole("button", { name: "Next instruction" }).click();
  await expect(
    page.getByRole("heading", { name: "Dawn at the council" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete ceremony" }).click();
  await expect(
    page.getByRole("heading", { name: "Who will you trust?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
