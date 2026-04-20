import { expect, test } from "@playwright/test";

function uniqueCredentials() {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `pw_${suffix}`,
    password: "SmokeTest123!",
  };
}

function trackPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function registerAndLogin(page, credentials) {
  await page.goto("/register");

  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await page.locator("#confirm-password").fill(credentials.password);
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: "Log In" }).click();

  await expect(page).toHaveURL(/\/main[-_]menu$/);
}

async function startNewGame(page, character = "leon") {
  await page.getByRole("button", { name: "PLAY GAME" }).click();
  await expect(page).toHaveURL(/\/play$/);

  await page.getByRole("button", { name: "NEW GAME" }).click();
  await expect(page.locator("#character-screen")).toHaveClass(/active/);

  await page.locator(`.character-card[data-character="${character}"]`).click();
  await expect(page.locator("#difficulty-screen")).toHaveClass(/active/);

  await page.getByRole("button", { name: "EASY" }).click();
  await expect(page.locator("#game-screen")).toHaveClass(/active/);
  await expect(page.locator("#save-btn")).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator("#battle-stage")).toBeVisible();
}

async function expectPlayerStats(page, characterLabel) {
  await page.getByRole("button", { name: "PLAYER STATS" }).click();
  await expect(page.locator("#stats-actions")).toBeVisible();
  await expect(page.locator("#player-stats-list")).toContainText(`CHARACTER: ${characterLabel}`);
  await page.locator("#stats-back-btn").click();
  await expect(page.locator("#main-actions")).toBeVisible();
}

test("redirects unauthenticated play access back to login", async ({ page }) => {
  const pageErrors = trackPageErrors(page);

  await page.goto("/play");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome, Survivor" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("guest login can reach main menu, settings, and start a new game", async ({ page }) => {
  const pageErrors = trackPageErrors(page);

  await page.goto("/login");
  await page.getByRole("button", { name: "Guest Login" }).click();

  await expect(page).toHaveURL(/\/main[-_]menu$/);
  await expect(page.getByText("GUEST MODE")).toBeVisible();

  await page.locator("#open-settings-btn").click();
  await expect(page.locator("#settings-modal")).toBeVisible();

  await page.locator("#mute-audio").check();
  await expect(page.locator("#mute-status")).toHaveText("ON");

  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-modal")).toBeHidden();

  await startNewGame(page, "quite");
  await expectPlayerStats(page, "QUITE");
  await expect(page.locator("#battle-player-name")).toHaveText("QUITE");
  await expect(page.locator("#battle-tags")).toContainText("LEVEL 1");
  await expect(page.locator("#battle-player-image")).toHaveAttribute("src", /quite_idle\.png/);
  await expect(page.locator("#battle-impact-fx-image")).toBeHidden();

  await page.locator("#attack-btn").click();
  await page.locator("#pistol-btn").click();
  await page.waitForTimeout(900);
  await expect(page.locator("#battle-impact-fx-image")).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("registered user can view achievements, save, and load a run", async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  const credentials = uniqueCredentials();

  await registerAndLogin(page, credentials);

  await page.getByRole("button", { name: "ACHIEVEMENTS" }).click();
  await expect(page).toHaveURL(/\/achievements$/);
  await expect(page.locator("#kills")).toBeVisible();
  await expect(page.locator("#reloads")).toBeVisible();

  await page.locator(".back-arrow").click();
  await expect(page).toHaveURL(/\/main[-_]menu$/);

  await startNewGame(page, "leon");

  await page.locator("#save-btn").click();
  await expect(page.locator("#story-text")).toContainText("Game saved successfully.", { timeout: 15_000 });

  await page.locator("#game-back-btn").click();
  await expect(page).toHaveURL(/\/main[-_]menu$/, { timeout: 10_000 });

  await page.getByRole("button", { name: "PLAY GAME" }).click();
  await expect(page).toHaveURL(/\/play$/);

  await page.getByRole("button", { name: "LOAD GAME" }).click();
  await expect(page.locator("#load-screen")).toHaveClass(/active/);
  await expect(page.locator("#save-preview")).toContainText("CHARACTER: LEON", { timeout: 15_000 });

  await page.locator("#load-latest-save-btn").click();
  await expect(page.locator("#game-screen")).toHaveClass(/active/, { timeout: 20_000 });
  await expectPlayerStats(page, "LEON");
  await expect(page.locator("#battle-player-name")).toHaveText("LEON");
  await expect(page.locator("#battle-enemy-name")).not.toHaveText("NO CONTACT");
  expect(pageErrors).toEqual([]);
});
