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

async function expectImagesLoaded(page, selector) {
  const imageState = await page.evaluate(async (imageSelector) => {
    const images = Array.from(document.querySelectorAll(imageSelector));
    await Promise.all(images.map((image) => image.decode?.().catch(() => undefined)));
    return images.map((image) => ({
      complete: image.complete,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }));
  }, selector);

  expect(imageState.length).toBeGreaterThan(0);
  for (const image of imageState) {
    expect(image.complete).toBe(true);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  }
}

function parseAgentHeight(heightText) {
  const match = heightText.match(/^(\d)'(\d+)"$/);
  expect(match).not.toBeNull();

  return Number(match[1]) * 12 + Number(match[2]);
}

async function getAgentDossierValue(page, key) {
  return page.locator(`[data-agent-field="${key}"] dd`).innerText();
}

async function expectDossierVitalsInRange(page) {
  const age = Number(await getAgentDossierValue(page, "age"));
  const height = parseAgentHeight(await getAgentDossierValue(page, "height"));
  const bloodGroup = await getAgentDossierValue(page, "blood-group");

  expect(age).toBeGreaterThanOrEqual(21);
  expect(age).toBeLessThanOrEqual(29);
  expect(height).toBeGreaterThanOrEqual(65);
  expect(height).toBeLessThanOrEqual(75);
  expect(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).toContain(bloodGroup);

  return { age, height, bloodGroup };
}

async function sendFriendRequest(page, friendUsername) {
  await page.goto("/friends");
  await page.locator("[data-friend-username]").fill(friendUsername);
  await page.getByRole("button", { name: "Send Request" }).click();
  await expect(page).toHaveURL(/\/friends$/);
}

async function openWorldChat(page) {
  await page.locator("[data-world-chat-toggle]").click();
  await expect(page.locator("[data-world-chat-panel]")).toBeVisible();
}

async function sendWorldChatMessage(page, message) {
  await openWorldChat(page);
  await page.locator("[data-world-chat-input]").fill(message);
  await page.locator("[data-world-chat-form]").getByRole("button", { name: "Send" }).click();
  await expect(page.locator("[data-world-chat-messages]")).toContainText(message);
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
    kills: 10,
    damage_dealt: 500,
    medkits_used: 15,
    pistol_shots: 10,
    current_level_id: "3",
  });

  expect(saveResult.achievements_unlocked).toContain("First Blood");
  expect(saveResult.achievements_unlocked).toContain("No Mercy");
  expect(saveResult.achievements_unlocked).toContain("Medic");

  await page.goto("/achievements");
  await expect(page.locator(".achievement-badge", { hasText: "First Blood" })).toContainText("Unlocked");
  await expect(page.locator(".achievement-badge", { hasText: "First Blood" })).toContainText("SILVER");
  await expect(page.locator(".achievement-badge", { hasText: "No Mercy" })).toContainText("BRONZE");
  await expect(page.locator(".achievement-badge", { hasText: "Medic" })).toContainText("GOLD");
  await expectImagesLoaded(page, "[data-achievement-badge-image]");
});

test("main menu dossier and top badge strip use earned tiers", async ({ page }) => {
  const user = uniqueCredentials("dossier");

  await registerAndLogin(page, user);
  const userId = await page.locator("body").getAttribute("data-user-id");

  await expect(page.locator('[data-agent-field="agent-id"]')).toContainText(`#${String(userId).padStart(5, "0")}`);
  const initialVitals = await expectDossierVitalsInRange(page);
  await page.reload();
  await expect(page.locator('[data-agent-field="age"] dd')).toHaveText(String(initialVitals.age));
  await expect(page.locator('[data-agent-field="height"] dd')).toHaveText(
    `${Math.floor(initialVitals.height / 12)}'${initialVitals.height % 12}"`
  );
  await expect(page.locator('[data-agent-field="blood-group"] dd')).toHaveText(initialVitals.bloodGroup);
  await expect(page.locator('[data-agent-field="licence"]')).toContainText("RZ-74291863");

  await saveProgress(page, {
    kills: 30,
    damage_dealt: 1500,
    medkits_used: 15,
    pistol_shots: 10,
    current_level_id: "7",
  });

  await page.goto("/main_menu");
  await expect(page.locator("[data-agent-showcase-badge]")).toHaveCount(3);
  await expect(page.locator("[data-agent-showcase-badge]").first()).toContainText("GOLD");
  await expectImagesLoaded(page, ".agent-showcase-badge img");

  const layout = await page.evaluate(() => {
    const clipboard = document.querySelector(".agent-clipboard")?.getBoundingClientRect();
    const shell = document.querySelector(".menu-shell")?.getBoundingClientRect();
    const brand = document.querySelector(".menu-brand-row")?.getBoundingClientRect();
    const availableLeft = clipboard?.right ?? 0;
    const availableCenter = availableLeft + (window.innerWidth - availableLeft) / 2;
    return {
      clipboardRight: clipboard?.right ?? 0,
      shellLeft: shell?.left ?? 0,
      shellCenter: shell ? shell.left + shell.width / 2 : 0,
      brandCenter: brand ? brand.left + brand.width / 2 : 0,
      availableCenter,
    };
  });

  expect(layout.clipboardRight).toBeLessThan(layout.shellLeft);
  expect(Math.abs(layout.shellCenter - layout.availableCenter)).toBeLessThanOrEqual(90);
  expect(Math.abs(layout.brandCenter - layout.shellCenter)).toBeLessThanOrEqual(2);
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
    await expect(page.locator(".profile-reaction-btn.is-selected", { hasText: "❤️" })).toContainText("1");

    await page.locator('textarea[name="comment"]').fill(profileComment);
    await page.getByRole("button", { name: "POST COMMENT" }).click();
    await expect(page.locator(".profile-comment")).toContainText(profileComment);
  } finally {
    await secondContext.close();
  }
});
test("world chat usernames link to public profiles", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("worldprofileone");
  const secondUser = uniqueCredentials("worldprofiletwo");
  const worldChatMessage = `profile-link-${Date.now()}`;

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    const secondUserId = await secondPage.locator("body").getAttribute("data-user-id");

    await sendWorldChatMessage(secondPage, worldChatMessage);

    await page.goto("/main_menu");
    await openWorldChat(page);
    await expect(page.locator("[data-world-chat-messages]")).toContainText(worldChatMessage);

    const profileLink = page
      .locator("[data-world-chat-messages]")
      .getByRole("link", { name: secondUser.username })
      .first();

    await expect(profileLink).toHaveAttribute("href", `/profile/${secondUserId}`);
    await profileLink.click();

    await expect(page).toHaveURL(new RegExp(`/profile/${secondUserId}$`));
    await expect(page.locator(".public-profile-heading")).toContainText(secondUser.username);
  } finally {
    await secondContext.close();
  }
});

