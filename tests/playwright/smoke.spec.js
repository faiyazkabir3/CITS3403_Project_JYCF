import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 768 } });

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

async function expectPanelCentered(page, selector) {
  await expect(page.locator(selector)).toBeVisible();

  const metrics = await page.evaluate((panelSelector) => {
    const panel = document.querySelector(panelSelector)?.getBoundingClientRect();

    return {
      panelCenterX: panel ? panel.left + panel.width / 2 : 0,
      panelCenterY: panel ? panel.top + panel.height / 2 : 0,
      viewportCenterX: window.innerWidth / 2,
      viewportCenterY: window.innerHeight / 2,
    };
  }, selector);

  expect(Math.abs(metrics.panelCenterX - metrics.viewportCenterX)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.panelCenterY - metrics.viewportCenterY)).toBeLessThanOrEqual(80);
}

async function expectCharacterPortraitSizing(page) {
  const sizing = await page.evaluate(() => {
    const leonImage = document.querySelector('.character-card[data-character="leon"] img');
    const quiteImage = document.querySelector('.character-card[data-character="quite"] img');
    const leonRect = leonImage?.getBoundingClientRect();
    const quiteRect = quiteImage?.getBoundingClientRect();

    return {
      leonHeight: leonRect?.height ?? 0,
      quiteHeight: quiteRect?.height ?? 0,
      leonObjectFit: leonImage ? window.getComputedStyle(leonImage).objectFit : "",
      quiteObjectFit: quiteImage ? window.getComputedStyle(quiteImage).objectFit : "",
    };
  });

  expect(Math.abs(sizing.leonHeight - sizing.quiteHeight)).toBeLessThanOrEqual(2);
  expect(sizing.leonObjectFit).toBe("contain");
  expect(sizing.quiteObjectFit).toBe("cover");
}

async function startNewGame(page, character = "leon") {
  await page.getByRole("button", { name: "PLAY GAME" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expectPanelCentered(page, "#start-screen");

  await page.getByRole("button", { name: "NEW GAME" }).click();
  await expect(page.locator("#character-screen")).toHaveClass(/active/);
  await expectPanelCentered(page, "#character-screen");
  await expectCharacterPortraitSizing(page);

  await page.locator(`.character-card[data-character="${character}"]`).click();
  await expect(page.locator("#difficulty-screen")).toHaveClass(/active/);
  await expectPanelCentered(page, "#difficulty-screen");

  await page.getByRole("button", { name: "EASY" }).click();
  await expect(page.locator("#game-screen")).toHaveClass(/active/);
  await expect(page.locator("#save-btn")).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator("#stats-btn")).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator("#battle-stage")).toBeVisible();
}

async function expectPlayerStats(page, characterLabel) {
  await page.getByRole("button", { name: "PLAYER STATS" }).click();
  await expect(page.locator("#stats-actions")).toBeVisible();
  await expect(page.locator("#player-stats-list")).toContainText(`CHARACTER: ${characterLabel}`);

  const statsMetrics = await page.evaluate(() => {
    const statsList = document.querySelector("#player-stats-list");
    const statsBackButton = document.querySelector("#stats-back-btn")?.getBoundingClientRect();
    const todoBox = document.querySelector(".todo-box")?.getBoundingClientRect();

    if (statsList) {
      statsList.scrollTop = statsList.scrollHeight;
    }

    return {
      backBottom: statsBackButton?.bottom ?? 0,
      listCanScroll: statsList ? statsList.scrollHeight > statsList.clientHeight : false,
      listOverflow: statsList ? window.getComputedStyle(statsList).overflowY : "",
      listScrollTop: statsList?.scrollTop ?? 0,
      todoBottom: todoBox?.bottom ?? 0,
    };
  });

  expect(statsMetrics.listOverflow).toBe("auto");
  expect(statsMetrics.listCanScroll).toBeTruthy();
  expect(statsMetrics.listScrollTop).toBeGreaterThan(0);
  expect(statsMetrics.backBottom).toBeLessThanOrEqual(statsMetrics.todoBottom + 2);

  await page.locator("#stats-back-btn").click();
  await expect(page.locator("#main-actions")).toBeVisible();
}

async function expectPlayLayout(page) {
  await expect(page.locator("#battle-stage")).toBeVisible();
  await expect(page.locator(".todo-box")).toBeVisible();
  await expect(page.locator(".combat-log-box")).toBeVisible();

  const panelHeights = await page.evaluate(() => {
    const actions = document.querySelector(".todo-box")?.getBoundingClientRect();
    const combatLog = document.querySelector(".combat-log-box")?.getBoundingClientRect();
    const logList = document.querySelector("#combat-log-list");
    const gameBack = document.querySelector("#game-back-btn")?.getBoundingClientRect();
    const topbar = document.querySelector(".game-topbar")?.getBoundingClientRect();
    const missionFeed = document.querySelector(".battle-caption")?.getBoundingClientRect();
    const graphics = document.querySelector(".graphics-area")?.getBoundingClientRect();
    const gamePanel = document.querySelector("#game-screen")?.getBoundingClientRect();
    const gameBottom = document.querySelector(".game-bottom")?.getBoundingClientRect();

    return {
      actionsHeight: actions?.height ?? 0,
      combatLogHeight: combatLog?.height ?? 0,
      combatLogOverflow: logList ? window.getComputedStyle(logList).overflowY : "",
      backTop: gameBack?.top ?? 0,
      backBottom: gameBack?.bottom ?? 0,
      topbarTop: topbar?.top ?? 0,
      topbarBottom: topbar?.bottom ?? 0,
      missionFeedBottom: missionFeed?.bottom ?? 0,
      graphicsBottom: graphics?.bottom ?? 0,
      gamePanelBottom: gamePanel?.bottom ?? 0,
      gameBottomTop: gameBottom?.top ?? 0,
      gameBottomBottom: gameBottom?.bottom ?? 0,
      viewportHeight: window.innerHeight,
    };
  });

  expect(Math.abs(panelHeights.actionsHeight - panelHeights.combatLogHeight)).toBeLessThanOrEqual(2);
  expect(panelHeights.combatLogOverflow).toBe("auto");
  expect(panelHeights.backTop).toBeGreaterThanOrEqual(panelHeights.topbarTop - 2);
  expect(panelHeights.backBottom).toBeLessThanOrEqual(panelHeights.topbarBottom + 2);
  expect(panelHeights.missionFeedBottom).toBeLessThanOrEqual(panelHeights.graphicsBottom + 2);
  expect(panelHeights.graphicsBottom).toBeLessThanOrEqual(panelHeights.gameBottomTop - 4);
  expect(panelHeights.gameBottomBottom).toBeLessThanOrEqual(panelHeights.gamePanelBottom + 2);
  expect(panelHeights.gamePanelBottom).toBeLessThanOrEqual(panelHeights.viewportHeight + 2);
}

async function expectActionSubmenus(page) {
  await page.getByRole("button", { name: "ATTACK" }).click();
  await expect(page.locator("#attack-actions")).toBeVisible();
  await page.locator("#attack-back-btn").click();
  await expect(page.locator("#main-actions")).toBeVisible();

  await page.getByRole("button", { name: "INVENTORY" }).click();
  await expect(page.locator("#inventory-actions")).toBeVisible();
  await page.locator("#inventory-back-btn").click();
  await expect(page.locator("#main-actions")).toBeVisible();
}

async function saveShopState(page) {
  await page.evaluate(async () => {
    if (!window.gameEngine?.state) {
      throw new Error("Game engine was not available for shop-state setup.");
    }

    const state = structuredClone(window.gameEngine.state);
    state.progression.currentLevelId = "2";
    state.progression.enemiesRemaining = 0;
    state.progression.encounterOrder = [];
    state.progression.currentEncounterIndex = 0;
    state.progression.levelComplete = true;
    state.progression.awaitingChoice = false;
    state.progression.shopOpen = true;
    state.progression.gameWon = false;
    state.progression.gameOver = false;
    state.progression.currentChoiceOptions = [];
    state.combat.inCombat = false;
    state.combat.enemy = null;
    state.inventory.health = Math.max(state.inventory.health, 80);
    state.inventory.coins = Math.max(state.inventory.coins, 20);

    const payload = {
      difficulty: state.difficulty,
      character_id: state.player.characterId,
      health: state.inventory.health,
      medkits: state.inventory.medKits,
      grenades: state.inventory.grenades,
      ammo_in_gun: state.pistol.ammoInGun,
      ammo_in_bag: state.pistol.ammoInBag,
      mag_capacity: state.pistol.magCapacity,
      laser_upgrade: state.pistol.hasLaser,
      shield_owned: state.shield.hasShield,
      shield_on: state.shield.equipped,
      current_level_id: state.progression.currentLevelId,
      enemies_remaining: state.progression.enemiesRemaining,
      level_complete: state.progression.levelComplete,
      awaiting_choice: state.progression.awaitingChoice,
      game_won: state.progression.gameWon,
      kills: state.analytics.enemiesKilled,
      damage_dealt: state.analytics.damageDealt,
      damage_taken: state.analytics.damageTaken,
      pistol_shots: state.analytics.pistolShotsFired,
      grenades_used: state.analytics.grenadesUsed,
      medkits_used: state.analytics.medKitsUsed,
      reloads: state.analytics.reloads,
      knife_uses: state.analytics.knivesUsed,
      run_state: state,
    };

    const response = await fetch("/save-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.message || "Failed to save forced shop state.");
    }
  });
}

async function expectShopLayout(page) {
  await expect(page.locator("#shop-box")).toBeVisible();
  await expect(page.locator(".game-main")).toHaveClass(/shop-open/);
  await expect(page.locator("#battle-stage")).toBeVisible();
  await expect(page.locator(".game-bottom")).toBeHidden();
  await expect(page.locator("#shop-story-text")).toBeVisible();
  await expect(page.locator("#shop-story-text")).toContainText("SHOP OPEN", { timeout: 15_000 });
  await expect(page.locator("#shop-continue-btn")).toBeVisible();
  await expect(page.locator("#stats-btn")).toBeDisabled();

  const shopMetrics = await page.evaluate(() => {
    const gamePanel = document.querySelector("#game-screen")?.getBoundingClientRect();
    const topbar = document.querySelector(".game-topbar")?.getBoundingClientRect();
    const battleStage = document.querySelector("#battle-stage")?.getBoundingClientRect();
    const battleBackdrop = document.querySelector("#battle-backdrop");
    const battleStageMode = document.querySelector("#battle-stage")?.dataset.mode ?? "";
    const shop = document.querySelector("#shop-box")?.getBoundingClientRect();
    const shopDialogue = document.querySelector(".shop-dialogue")?.getBoundingClientRect();
    const buyButtons = document.querySelector("#shop-buy-buttons");
    const sellButtons = document.querySelector("#shop-sell-buttons");
    const topGameRow = document.querySelector(".top-game-row");
    const bottom = document.querySelector(".game-bottom");
    const firstShopOption = document.querySelector("#shop-buy-buttons .choice-btn")?.getBoundingClientRect();

    return {
      gamePanelBottom: gamePanel?.bottom ?? 0,
      topbarBottom: topbar?.bottom ?? 0,
      battleBackdropImage: battleBackdrop ? window.getComputedStyle(battleBackdrop).backgroundImage : "",
      battleStageBottom: battleStage?.bottom ?? 0,
      battleStageHeight: battleStage?.height ?? 0,
      battleStageMode,
      shopTop: shop?.top ?? 0,
      shopBottom: shop?.bottom ?? 0,
      shopHeight: shop?.height ?? 0,
      shopDialogueHeight: shopDialogue?.height ?? 0,
      topGameRowDisplay: topGameRow ? window.getComputedStyle(topGameRow).display : "",
      bottomDisplay: bottom ? window.getComputedStyle(bottom).display : "",
      buyOverflow: buyButtons ? window.getComputedStyle(buyButtons).overflowY : "",
      sellOverflow: sellButtons ? window.getComputedStyle(sellButtons).overflowY : "",
      firstShopOptionHeight: firstShopOption?.height ?? 0,
      viewportHeight: window.innerHeight,
    };
  });

  expect(shopMetrics.topGameRowDisplay).not.toBe("none");
  expect(shopMetrics.bottomDisplay).toBe("none");
  expect(shopMetrics.buyOverflow).toBe("auto");
  expect(shopMetrics.sellOverflow).toBe("auto");
  expect(shopMetrics.battleStageMode).toBe("shop");
  expect(shopMetrics.battleBackdropImage).toContain("bg_shop_terminal");
  expect(shopMetrics.battleStageHeight).toBeGreaterThanOrEqual(180);
  expect(shopMetrics.shopTop).toBeGreaterThanOrEqual(shopMetrics.battleStageBottom - 2);
  expect(shopMetrics.shopBottom).toBeLessThanOrEqual(shopMetrics.gamePanelBottom + 2);
  expect(shopMetrics.shopHeight).toBeGreaterThanOrEqual(260);
  expect(shopMetrics.shopDialogueHeight).toBeGreaterThanOrEqual(70);
  expect(shopMetrics.firstShopOptionHeight).toBeGreaterThanOrEqual(70);
  expect(shopMetrics.gamePanelBottom).toBeLessThanOrEqual(shopMetrics.viewportHeight + 2);
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
  await expect(page.locator("#open-settings-btn")).toBeVisible();

  const menuMetrics = await page.evaluate(() => {
    const settingsButton = document.querySelector("#open-settings-btn")?.getBoundingClientRect();
    const menuContainer = document.querySelector(".menu-container")?.getBoundingClientRect();

    return {
      containerBottom: menuContainer?.bottom ?? 0,
      settingsBottom: settingsButton?.bottom ?? 0,
    };
  });

  expect(menuMetrics.settingsBottom).toBeLessThanOrEqual(menuMetrics.containerBottom + 2);

  await page.locator("#open-settings-btn").click();
  await expect(page.locator("#settings-modal")).toBeVisible();

  await page.locator("#mute-audio").check();
  await expect(page.locator("#mute-status")).toHaveText("ON");

  await page.keyboard.press("Escape");
  await expect(page.locator("#settings-modal")).toBeHidden();

  await startNewGame(page, "quite");
  await expectPlayLayout(page);
  await expectPlayerStats(page, "QUITE");
  await expectActionSubmenus(page);
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
  await expectPlayLayout(page);

  await page.locator("#save-btn").click();
  await expect(page.locator("#story-text")).toContainText("Game saved successfully.", { timeout: 15_000 });

  await page.locator("#game-back-btn").click();
  await expect(page).toHaveURL(/\/main[-_]menu$/, { timeout: 10_000 });

  await page.getByRole("button", { name: "PLAY GAME" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expectPanelCentered(page, "#start-screen");

  await page.getByRole("button", { name: "LOAD GAME" }).click();
  await expect(page.locator("#load-screen")).toHaveClass(/active/);
  await expectPanelCentered(page, "#load-screen");
  await expect(page.locator("#save-preview")).toContainText("CHARACTER: LEON", { timeout: 15_000 });

  await page.locator("#load-latest-save-btn").click();
  await expect(page.locator("#game-screen")).toHaveClass(/active/, { timeout: 20_000 });
  await expectPlayLayout(page);
  await expectPlayerStats(page, "LEON");
  await expect(page.locator("#battle-player-name")).toHaveText("LEON");
  await expect(page.locator("#battle-enemy-name")).not.toHaveText("NO CONTACT");
  expect(pageErrors).toEqual([]);
});

test("registered user sees expanded shop mode with locked stats", async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  const credentials = uniqueCredentials();

  await registerAndLogin(page, credentials);
  const checkpointSave = page.waitForResponse(
    (response) => response.url().includes("/save-game") && response.request().method() === "POST",
  );
  await startNewGame(page, "leon");
  await checkpointSave;
  await saveShopState(page);

  await page.goto("/play");
  await page.getByRole("button", { name: "LOAD GAME" }).click();
  await expect(page.locator("#load-screen")).toHaveClass(/active/);
  await expectPanelCentered(page, "#load-screen");
  await expect(page.locator("#save-preview")).toContainText("LEVEL: 2", { timeout: 15_000 });

  await page.locator("#load-latest-save-btn").click();
  await expect(page.locator("#game-screen")).toHaveClass(/active/, { timeout: 20_000 });
  await expectShopLayout(page);
  expect(pageErrors).toEqual([]);
});
