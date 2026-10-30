import { test, expect } from "@playwright/test";
test("illustrated tutorial remains readable and navigable at phone and desktop sizes", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/how-to-play");
  await expect(
    page.getByRole("heading", { name: "A divided kingdom" }),
  ).toBeVisible();
  for (let step = 0; step < 6; step++) {
    await expect
      .poll(() =>
        page
          .locator(".tutorial-illustration img")
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (step === 0)
      await page.screenshot({
        path: testInfo.outputPath("tutorial.png"),
        fullPage: true,
      });
    if (step < 5)
      await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "One final shadow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Gather your friends" }),
  ).toBeVisible();
});
test("failed quest shows the failure artwork with the public aggregate", async ({
  page,
}, testInfo) => {
  await page.route("**/src/services/game.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    import {identity} from '/src/services/rooms.ts';
    export async function getGame(){const user=await identity();return {id:'failure-fixture',phase:'QUEST_RESULT',version:3,host_user_id:user,leader_player_id:'p0',night_step:0,night_paused:false,roles:[],night_script:[],quest_number:1,proposal_attempt:1,required_team_size:2,fail_threshold:1,players:Array.from({length:5},(_,i)=>({id:'p'+i,user_id:i===0?user:'other-'+i,nickname:i===0?'Arden':'Knight '+i,ready:true})),quest_results:[{quest_number:1,result:'FAIL',fail_count:1}],proposals:[]};}
    export async function getMyRole(){throw new Error('Not required for a public result');}
    export async function gameAction(){}
    export async function startGame(){}
  `,
    }),
  );
  await page.goto("/game/TESTQR");
  await expect(
    page.getByRole("heading", { name: "Betrayal on the road" }),
  ).toBeVisible();
  const art = page.locator(".result-illustration img");
  await expect(art).toHaveAttribute("src", /quest-failure.webp$/);
  await expect
    .poll(() =>
      art.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("1 Fail submission(s). 1 required to fail."),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("quest-failure.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
