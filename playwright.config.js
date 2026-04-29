import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const pythonCommand = process.env.PYTHON || (existsSync("./venv/bin/python") ? "./venv/bin/python" : "python3");
const browserChannel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5000",
    browserName: "chromium",
    channel: browserChannel,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `${pythonCommand} -B scripts/run_playwright_server.py`,
    url: "http://127.0.0.1:5000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
