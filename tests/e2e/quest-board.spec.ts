import { test, expect } from "@playwright/test";
test("illustrated quest board displays public progress without overflowing", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.setViewportSize({ width: 360, height: 800 });
  await page.route("**/src/services/game.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    import {identity} from '/src/services/rooms.ts';
    export async function getGame(){const user=await identity();return {id:'board-fixture',phase:'TEAM_PROPOSAL',version:2,host_user_id:user,leader_player_id:'p1',night_step:0,night_paused:false,roles:[],night_script:[],quest_number:2,proposal_attempt:1,required_team_size:3,fail_threshold:1,players:Array.from({length:6},(_,i)=>({id:'p'+i,user_id:i===0?user:'other-'+i,nickname:i===0?'Arden':'Knight '+i,ready:true})),quest_results:[{quest_number:1,result:'FAIL',fail_count:1}],proposals:[]};}
    export async function getMyRole(){throw new Error('No private data needed for the board');}
    export async function gameAction(){}
    export async function startGame(){}
  `,
    }),
  );
  await page.goto("/game/TESTQR");
  const board = page.getByRole("region", { name: "Quest scoreboard" });
  await expect(board).toBeVisible();
  await expect(board.getByText("Failed", { exact: true })).toBeVisible();
  await expect(board.getByText("Current", { exact: true })).toBeVisible();
  await expect(board.locator('[aria-current="step"]')).toContainText("Quest 2");
  await expect(board.getByText("3 players", { exact: true })).toBeVisible();
  await expect(board.getByText("1 betrayal", { exact: true })).toBeVisible();
  await expect(board.locator(".quest-medallion img")).toHaveCount(5);
  await expect
    .poll(() =>
      board
        .locator(".quest-medallion img")
        .evaluateAll((images: HTMLImageElement[]) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await board.screenshot({ path: testInfo.outputPath("quest-board.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
