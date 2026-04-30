import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 768 } });

function uniqueCredentials(label) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `${label}_${suffix}`.toLowerCase(),
    password: "SmokeTest123!",
  };
}

async function registerUser(page, credentials) {
  await page.goto("/register");
  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await page.locator("#confirm-password").fill(credentials.password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function loginUser(page, credentials) {
  await page.goto("/login");
  await page.locator("#username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/main[-_]menu$/);
}

async function registerAndLogin(page, credentials) {
  await registerUser(page, credentials);
  await loginUser(page, credentials);
}

async function saveProgress(page, overrides = {}) {
  const response = await page.request.post("/save-game", {
    data: {
      difficulty: "EASY",
      character_id: "leon",
      health: 100,
      medkits: 0,
      grenades: 0,
      ammo_in_gun: 8,
      ammo_in_bag: 24,
      mag_capacity: 8,
      laser_upgrade: false,
      shield_owned: false,
      shield_on: false,
      current_level_id: "1",
      enemies_remaining: 0,
      level_complete: true,
      awaiting_choice: false,
      game_won: false,
      kills: 0,
      damage_dealt: 0,
      damage_taken: 0,
      pistol_shots: 0,
      grenades_used: 0,
      medkits_used: 0,
      reloads: 0,
      knife_uses: 0,
      run_state: {},
      ...overrides,
    },
  });

  expect(response.ok()).toBe(true);
  return response.json();
}

async function sendFriendRequest(page, friendUsername) {
  await page.goto("/friends");
  await page.locator("[data-friend-username]").fill(friendUsername);
  await page.getByRole("button", { name: "Send Request" }).click();
  await expect(page).toHaveURL(/\/friends$/);
}

async function acceptFriendRequest(page, username) {
  await page.goto("/friends");
  const requestItem = page.locator("li", { hasText: username }).first();
  await expect(requestItem).toBeVisible();
  await requestItem.getByRole("link", { name: "Accept" }).click();
  await expect(page).toHaveURL(/\/friends$/);
}

test("saving progress unlocks achievement badges", async ({ page }) => {
  const user = uniqueCredentials("achiever");

  await registerAndLogin(page, user);
  const saveResult = await saveProgress(page, {
    kills: 1,
    damage_dealt: 120,
    current_level_id: "1",
  });

  expect(saveResult.achievements_unlocked).toContain("First Blood");

  await page.goto("/achievements");
  await expect(page.locator(".achievement-badge", { hasText: "First Blood" })).toContainText("Unlocked");
});

test("main menu keeps only the global leaderboard", async ({ browser, page }) => {
  const friendContext = await browser.newContext();
  const strangerContext = await browser.newContext();
  const friendPage = await friendContext.newPage();
  const strangerPage = await strangerContext.newPage();
  const currentUser = uniqueCredentials("rankme");
  const friendUser = uniqueCredentials("rankfriend");
  const strangerUser = uniqueCredentials("rankstranger");

  try {
    await registerAndLogin(page, currentUser);
    await saveProgress(page, { kills: 5, damage_dealt: 500 });

    await registerAndLogin(friendPage, friendUser);
    await saveProgress(friendPage, { kills: 8, damage_dealt: 800 });

    await registerAndLogin(strangerPage, strangerUser);
    await saveProgress(strangerPage, { kills: 20, damage_dealt: 2000 });

    await sendFriendRequest(page, friendUser.username);
    await acceptFriendRequest(friendPage, currentUser.username);

    await page.goto("/main_menu");
    const globalLeaderboard = page.locator(".leaderboard", { hasText: "GLOBAL LEADERBOARD" });
    await expect(globalLeaderboard).toBeVisible();
    await expect(page.locator(".leaderboard", { hasText: "FRIENDS LEADERBOARD" })).toHaveCount(0);
    await expect(page.locator(".leaderboard", { hasText: "RECENT CHATS" })).toHaveCount(0);
  } finally {
    await friendContext.close();
    await strangerContext.close();
  }
});

test("profile privacy hides stats and blocks friend messages", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("privacyone");
  const secondUser = uniqueCredentials("privacytwo");

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);
    await saveProgress(secondPage, { kills: 12, damage_dealt: 900 });

    await secondPage.goto("/profile");
    await secondPage.getByText("Allow friends to view my stats").click();
    await secondPage.getByText("Allow friends to message me").click();
    await secondPage.getByRole("button", { name: "SAVE PROFILE" }).click();
    await expect(secondPage.locator(".profile-success")).toContainText("Profile updated.");

    await sendFriendRequest(page, secondUser.username);
    await acceptFriendRequest(secondPage, firstUser.username);

    await page.goto("/friends");
    const friendItem = page.locator("li", { hasText: secondUser.username }).first();
    await friendItem.getByRole("link", { name: "View Stats" }).click();
    await expect(page.locator(".achievement-box")).toContainText("Stats Private");

    await page.goto("/friends");
    await page.locator("li", { hasText: secondUser.username }).first().getByRole("link", { name: "Chat" }).click();
    await expect(page).toHaveURL(/\/friends$/);
    await expect(page.locator("[data-flash-message]")).toContainText("This friend is not accepting messages right now.");
  } finally {
    await secondContext.close();
  }
});

test("friend profile action opens friend stats", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("profileone");
  const secondUser = uniqueCredentials("profiletwo");

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    await sendFriendRequest(page, secondUser.username);
    await acceptFriendRequest(secondPage, firstUser.username);

    await page.goto("/friends");
    const friendItem = page.locator("li", { hasText: secondUser.username }).first();
    await friendItem.getByRole("link", { name: secondUser.username }).click();
    await expect(page.locator(".public-profile-action-link", { hasText: "VIEW STATS" })).toBeVisible();

    await page.locator(".public-profile-action-link", { hasText: "VIEW STATS" }).click();
    await expect(page).toHaveURL(/\/friend-stats\/\d+$/);
    await expect(page.locator("h1")).toContainText("Stats");
  } finally {
    await secondContext.close();
  }
});

test("unfriend removes access to chat and stats", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("unfriendone");
  const secondUser = uniqueCredentials("unfriendtwo");

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    const secondUserId = await secondPage.locator("body").getAttribute("data-user-id");

    await sendFriendRequest(page, secondUser.username);
    await acceptFriendRequest(secondPage, firstUser.username);

    await page.goto("/friends");
    const friendItem = page.locator("li", { hasText: secondUser.username }).first();
    await expect(friendItem).toBeVisible();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Remove");
      await dialog.accept();
    });
    await friendItem.getByRole("button", { name: "Unfriend" }).click();
    await expect(page).toHaveURL(/\/friends$/);
    await expect(page.locator("[data-flash-message]")).toContainText("Removed");
    await expect(page.locator("li", { hasText: secondUser.username })).toHaveCount(0);

    await page.goto(`/chat/${secondUserId}`);
    await expect(page).toHaveURL(/\/friends$/);
    await expect(page.locator("[data-flash-message]")).toContainText("You can only chat with users in your friends list.");

    await page.goto(`/friend-stats/${secondUserId}`);
    await expect(page).toHaveURL(/\/friends$/);
    await expect(page.locator("[data-flash-message]")).toContainText("You can only view stats for users in your friends list.");
  } finally {
    await secondContext.close();
  }
});

test("profiles support reactions comments and custom backgrounds", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("reactone");
  const secondUser = uniqueCredentials("reacttwo");
  const profileComment = `Great run ${Date.now()}`;

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);
    await saveProgress(secondPage, { kills: 1, damage_dealt: 120 });

    await secondPage.goto("/profile");
    await secondPage.locator("#profile-background").selectOption("neon");
    await secondPage.getByRole("button", { name: "SAVE PROFILE" }).click();
    await expect(secondPage.locator(".profile-success")).toContainText("Profile updated.");

    await sendFriendRequest(page, secondUser.username);
    await acceptFriendRequest(secondPage, firstUser.username);

    await page.goto("/friends");
    await page.locator("li", { hasText: secondUser.username }).first().getByRole("link", { name: secondUser.username }).click();
    await expect(page.locator(".public-profile-hero")).toHaveClass(/profile-bg-neon/);
    await expect(page.locator(".profile-badge-grid")).toContainText("First Blood");
    await expect(page.locator(".profile-badge-grid")).toContainText("Custom Signal");

    await page.getByRole("button", { name: "Heart" }).click();
    await expect(page.locator(".profile-reaction-btn.is-selected", { hasText: "♥" })).toContainText("1");

    await page.locator('textarea[name="comment"]').fill(profileComment);
    await page.getByRole("button", { name: "POST COMMENT" }).click();
    await expect(page.locator(".profile-comment")).toContainText(profileComment);
  } finally {
    await secondContext.close();
  }
});
