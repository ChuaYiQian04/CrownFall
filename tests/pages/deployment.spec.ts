import { expect, test } from "@playwright/test";
import { CHARACTER_ART } from "../../src/game/characters";
import { WORLD_ART } from "../../src/game/world-art";
import { QUEST_DESTINATIONS } from "../../src/game/quest-art";
test("built GitHub Pages site loads under the project path and preserves invite routes on refresh", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/CrownFall/");
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  expect(html).toContain("/CrownFall/assets/");
  expect(html).not.toContain("/src/main.tsx");
  await Promise.all(
    Object.values(CHARACTER_ART).map(async (art) => {
      const asset = await page.request.get(
        `/CrownFall/assets/characters/${art.file}`,
      );
      expect(asset.status()).toBe(200);
      expect(asset.headers()["content-type"]).toContain("image/webp");
    }),
  );
  await expect(page.getByRole("link", { name: "Host a game" })).toBeVisible();
  await Promise.all(
    [
      ...QUEST_DESTINATIONS.map((q) => q.file),
      "quest-map.webp",
      "quest-map-mobile.webp",
    ].map(async (file) => {
      const asset = await page.request.get(`/CrownFall/assets/quests/${file}`);
      expect(asset.status()).toBe(200);
      expect(asset.headers()["content-type"]).toContain("image/webp");
    }),
  );
  await Promise.all(
    [
      ...Object.values(WORLD_ART).map((art) => art.file),
      "realm-background-mobile.webp",
      "council-background-mobile.webp",
    ].map(async (file) => {
      const asset = await page.request.get(`/CrownFall/assets/world/${file}`);
      expect(asset.status()).toBe(200);
      expect(asset.headers()["content-type"]).toContain("image/webp");
    }),
  );
  await page.getByRole("link", { name: "Host a game" }).click();
  await expect(page).toHaveURL(/\/CrownFall\/#\/host$/);
  await page.getByLabel("Your name").fill("Arden");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(
    page.getByRole("heading", { name: "Your council chamber" }),
  ).toBeVisible();
  const invitation = await page.getByLabel("Invitation URL").inputValue();
  expect(invitation).toMatch(
    /^http:\/\/127\.0\.0\.1:5175\/CrownFall\/#\/join\/[A-Z2-9]{6}$/,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your council chamber" }),
  ).toBeVisible();
  const guest = await context.newPage();
  await guest.goto(invitation);
  await guest.reload();
  await expect(
    guest.getByRole("heading", { name: "Enter the council" }),
  ).toBeVisible();
  await guest.getByLabel("Your name").fill("Rowan");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(
    guest.getByRole("heading", { name: "Your council chamber" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
