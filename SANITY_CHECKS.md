# Sanity Checks Guide

This guide explains how to run the sanity checks that were added for the JavaScript tooling and Playwright smoke-test setup.

## What We Added

There are now two main sanity layers:

1. **JavaScript sanity**
   - ESLint for the browser JS files in `static/js`
   - a Node-based checker for missing imports and missing static asset references

2. **Browser smoke tests**
   - Playwright tests that launch the real Flask app in Microsoft Edge
   - guest and registered-user flows
   - settings, achievements, play flow, save, and load checks

## Prerequisites

### Python

Install the repo's Python dependencies:

```powershell
pip install -r requirements.txt
```

### Node.js

Install Node.js LTS on Windows:

```powershell
winget install OpenJS.NodeJS.LTS
```

After installing Node, open a **new terminal** and verify:

```powershell
node -v
npm -v
```

### npm packages

Install the repo's JS dependencies:

```powershell
npm install
```

## Main Commands

### 1. Lint only

Runs ESLint on the game and UI scripts:

```powershell
npm run lint:js
```

Use this when you only want fast feedback on JS syntax/style problems.

### 2. Full JS sanity

Runs ESLint and the Node-based repo checks together:

```powershell
npm run sanity:js
```

This checks:

- JS linting
- missing relative imports in `static/js`
- missing `/static/...` asset references in JS
- missing `url_for(..., filename=...)` assets in templates

### 3. Browser smoke tests

Runs the Playwright smoke suite:

```powershell
npm run sanity:browser
```

This covers:

- unauthenticated route protection
- guest login flow
- settings modal interaction
- new game boot
- registered-user register/login
- achievements page
- save and load flow

### 4. Everything

Runs both the JS sanity checks and the browser smoke suite:

```powershell
npm run sanity:all
```

This is the main "check everything" command.

## Extra Playwright Commands

Run the full Playwright suite:

```powershell
npm run test:e2e
```

Run Playwright with a visible browser window:

```powershell
npm run test:e2e:headed
```

Use the headed run when you want to watch the flow manually while debugging.

## How Playwright Is Configured

- Config file: `playwright.config.js`
- Test file: `tests/playwright/smoke.spec.js`
- Test server launcher: `scripts/run_playwright_server.py`

Important details:

- Playwright uses the locally installed **Microsoft Edge** browser
- it launches a dedicated Flask test server automatically
- it uses an isolated SQLite database:

```text
instance/playwright_smoke.db
```

That keeps smoke-test users and saves out of your normal local app data.

## Expected Results

### JS sanity

You should see output like:

```text
JS sanity check passed for 10 JS files and 10 templates.
```

### Browser smoke

You should see output like:

```text
3 passed
```

## Troubleshooting

### `node` or `npm` is not recognized

Open a new terminal or restart VS Code after installing Node.

### Playwright cannot start the app

Make sure Python dependencies are installed:

```powershell
pip install -r requirements.txt
```

### Browser tests fail because Edge cannot launch

Make sure Microsoft Edge is installed on the machine. The Playwright config is currently set to use the `msedge` channel.

### You want to inspect failures

Playwright stores artifacts in:

- `playwright-report/`
- `test-results/`

Those folders are ignored by git.

## Recommended Workflow

For normal development:

```powershell
npm run sanity:js
```

Before pushing or handing work off:

```powershell
npm run sanity:all
```
