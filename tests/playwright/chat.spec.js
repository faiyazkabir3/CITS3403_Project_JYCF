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
  await expect(page.locator(".operator-name")).toHaveText(credentials.username);
}

async function registerAndLogin(page, credentials) {
  await registerUser(page, credentials);
  await loginUser(page, credentials);
}

async function getCurrentUserId(page) {
  const userId = Number(await page.locator("body").getAttribute("data-user-id"));
  expect(userId).toBeGreaterThan(0);
  return userId;
}

async function goToFriendsPage(page) {
  await page.goto("/friends");
  await expect(page).toHaveURL(/\/friends$/);
}

async function sendFriendRequest(page, friendUsername) {
  await goToFriendsPage(page);
  await page.locator("[data-friend-username]").fill(friendUsername);
  await page.getByRole("button", { name: "Send Request" }).click();
  await expect(page).toHaveURL(/\/friends$/);
}

async function acceptFriendRequest(page, username) {
  await goToFriendsPage(page);
  const requestItem = page.locator("li", { hasText: username }).first();
  await expect(requestItem).toBeVisible();
  await requestItem.getByRole("link", { name: "Accept" }).click();
  await expect(page).toHaveURL(/\/friends$/);
}

async function openChatWithFriend(page, username) {
  await goToFriendsPage(page);
  const friendItem = page.locator("li", { hasText: username }).first();
  await expect(friendItem).toBeVisible();
  await friendItem.getByRole("link", { name: "Chat", exact: true }).click();
  await expect(page).toHaveURL(/\/chat\/\d+$/);
  await expect(page.locator("[data-chat-status]")).toHaveText(/Live chat connected\./);
}

async function attemptSocketConnection(page) {
  await page.addScriptTag({
    url: "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js",
  });

  return page.evaluate(() => {
    return new Promise((resolve) => {
      const socket = window.io({
        reconnection: false,
        timeout: 3000,
        transports: ["websocket", "polling"],
      });

      let settled = false;
      const finish = (result) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.disconnect();
        resolve(result);
      };

      socket.on("connect", () => {
        finish({ connected: true, message: "connected" });
      });

      socket.on("connect_error", (error) => {
        finish({
          connected: false,
          message: error?.message || "connect_error",
        });
      });

      window.setTimeout(() => {
        finish({ connected: false, message: "timeout" });
      }, 5000);
    });
  });
}

test("same browser context tabs share the same login session", async ({ page }) => {
  const secondPage = await page.context().newPage();
  const credentials = uniqueCredentials("sharedtab");

  try {
    await page.goto("/login");
    await secondPage.goto("/login");

    await registerUser(page, credentials);
    await loginUser(page, credentials);

    await secondPage.goto("/main_menu");
    await expect(secondPage).toHaveURL(/\/main[-_]menu$/);
    await expect(secondPage.locator(".operator-name")).toHaveText(credentials.username);
  } finally {
    await secondPage.close();
  }
});

test("separate browser contexts keep different logged-in accounts", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("contexta");
  const secondUser = uniqueCredentials("contextb");

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    await expect(page.locator(".operator-name")).toHaveText(firstUser.username);
    await expect(secondPage.locator(".operator-name")).toHaveText(secondUser.username);
    await expect(page.locator("body")).toHaveAttribute("data-user-id", /\d+/);
    await expect(secondPage.locator("body")).toHaveAttribute("data-user-id", /\d+/);
  } finally {
    await secondContext.close();
  }
});

test("accepted friends receive realtime chat messages without page refresh", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("chatone");
  const secondUser = uniqueCredentials("chattwo");
  const outboundMessage = `live-message-${Date.now()}`;

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    await sendFriendRequest(page, secondUser.username);
    await acceptFriendRequest(secondPage, firstUser.username);

    await openChatWithFriend(page, secondUser.username);
    await openChatWithFriend(secondPage, firstUser.username);

    await page.locator("[data-chat-input]").fill(outboundMessage);
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.locator(".chat-message.outgoing", { hasText: outboundMessage })).toBeVisible();
    await expect(secondPage.locator(".chat-message.incoming", { hasText: outboundMessage })).toBeVisible();
  } finally {
    await secondContext.close();
  }
});

test("chat access is denied for non-friends and socket auth rejects unauthenticated or guest sessions", async ({ browser, page }) => {
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const firstUser = uniqueCredentials("guardone");
  const secondUser = uniqueCredentials("guardtwo");

  try {
    await registerAndLogin(page, firstUser);
    await registerAndLogin(secondPage, secondUser);

    const secondUserId = await getCurrentUserId(secondPage);

    await page.goto(`/chat/${secondUserId}`);
    await expect(page).toHaveURL(/\/friends$/);
    await expect(page.locator("[data-flash-message]")).toContainText("You can only chat with users in your friends list.");

    const unauthenticatedPage = await secondContext.newPage();
    try {
      await unauthenticatedPage.goto("/logout");
      await expect(unauthenticatedPage).toHaveURL(/\/login$/);

      const unauthenticatedSocketAttempt = await attemptSocketConnection(unauthenticatedPage);
      expect(unauthenticatedSocketAttempt.connected).toBe(false);

      await unauthenticatedPage.goto("/login");
      await unauthenticatedPage.getByRole("button", { name: "Guest Login" }).click();
      await expect(unauthenticatedPage).toHaveURL(/\/main[-_]menu$/);

      const guestSocketAttempt = await attemptSocketConnection(unauthenticatedPage);
      expect(guestSocketAttempt.connected).toBe(false);
    } finally {
      await unauthenticatedPage.close();
    }
  } finally {
    await secondContext.close();
  }
});
