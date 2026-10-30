import { test, expect } from "@playwright/test";
test("host a demo room and share an invitation", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Host a game" })).toBeVisible();
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Host a game" }).click();
  await page.getByLabel("Your name").fill("Arden");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(
    page.getByRole("heading", { name: "Your council chamber" }),
  ).toBeVisible();
  await expect(page.getByLabel("Invitation URL")).toHaveValue(
    /\/join\/[A-Z2-9]{6}$/,
  );
  await page.getByRole("button", { name: "Add sample players" }).click();
  await expect(page.getByText("5 / 10")).toBeVisible();
  await page.reload();
  await expect(page.getByText("5 / 10")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start game/ })).toBeDisabled();
});

test("join from another demo tab, reject duplicate names, and transfer hosting", async ({
  page,
  context,
}) => {
  await page.goto("/host");
  await page.getByLabel("Your name").fill("Arden");
  await page.getByRole("button", { name: "Create room" }).click();
  const invitation = await page.getByLabel("Invitation URL").inputValue();
  const guest = await context.newPage();
  await guest.goto(invitation);
  await guest.getByLabel("Your name").fill("arden");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(guest.getByRole("alert")).toContainText("already taken");
  await guest.getByLabel("Your name").fill("Rowan");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(page.getByText("2 / 10")).toBeVisible();
  await expect(guest.getByText("2 / 10")).toBeVisible();
  await expect(guest.getByLabel("Percival")).toBeDisabled();
  await page.getByRole("button", { name: "Leave room" }).click();
  await expect(guest.getByText("1 / 10")).toBeVisible();
  await expect(guest.getByLabel("Percival")).toBeEnabled();
});

test("settings dialog is keyboard dismissible and motion preference survives refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Reduce animations").check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
});
