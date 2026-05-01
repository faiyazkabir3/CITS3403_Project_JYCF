# Sanity Checks Guide

This guide explains how to run the sanity checks for Python unit tests, Selenium browser tests, JavaScript tooling, and Playwright smoke tests.

## What We Added

There are now four main sanity layers:

1. **Python unit tests**
   - pytest tests for validation, save payload, chat payload, and achievement helpers

2. **Selenium browser tests**
   - Selenium WebDriver tests that launch the real Flask app in Chrome
   - 5 rubric-focused browser flows

3. **JavaScript sanity**
   - ESLint for the browser JS files in `static/js`
   - a Node-based checker for missing imports and missing static asset references

4. **Playwright browser smoke tests**
   - Playwright tests that launch the real Flask app
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

### 1. Python unit tests

Runs the pytest unit suite:

```powershell
python -m pytest tests/unit
```

### 2. Selenium browser tests

Runs the Selenium suite against Chrome by default:

```powershell
python -m pytest tests/selenium
```

Use Edge instead when needed:

```powershell
$env:SELENIUM_BROWSER = "edge"
python -m pytest tests/selenium
```

### 3. All Python tests

Runs both the unit tests and Selenium tests:

```powershell
python -m pytest
```

To confirm the rubric count, collect the tests without running them:

```powershell
python -m pytest --collect-only
```

The collection output should show at least 5 unit tests and 5 Selenium tests.

### 4. Lint only

Runs ESLint on the game and UI scripts:

```powershell
npm run lint:js
```

Use this when you only want fast feedback on JS syntax/style problems.

### 5. Full JS sanity

Runs ESLint and the Node-based repo checks together:

```powershell
npm run sanity:js
```

This checks:

- JS linting
- missing relative imports in `static/js`
- missing `/static/...` asset references in JS
- missing `url_for(..., filename=...)` assets in templates

### 6. Playwright browser smoke tests

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

### 7. JavaScript and Playwright checks

Runs both the JS sanity checks and the browser smoke suite:

```powershell
npm run sanity:all
```

This is the main "check everything" command.

For all Python and JavaScript checks, run:

```powershell
python -m pytest
npm run sanity:all
```

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

## How Selenium Is Configured

- Test files: `tests/selenium/*.py`
- Test server launcher: `scripts/run_selenium_server.py`
- Default browser: Chrome
- Alternate browser: set `SELENIUM_BROWSER=edge`
- Test server URL: `http://127.0.0.1:5001`

The Selenium server uses an isolated temporary database so browser tests do not touch normal local app data.

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

### Python tests

You should see at least:

```text
8 passed
5 passed
```

## Troubleshooting

### `node` or `npm` is not recognized

Open a new terminal or restart VS Code after installing Node.

### Playwright cannot start the app

Make sure Python dependencies are installed:

```powershell
pip install -r requirements.txt
```

### Selenium tests cannot find Chrome or a driver

Install Google Chrome, then rerun:

```powershell
python -m pytest tests/selenium
```

Selenium Manager downloads the matching driver automatically when network access is available.

### Playwright browser tests fail because Edge cannot launch

Make sure Microsoft Edge is installed on the machine. The Playwright config is currently set to use the `msedge` channel.

### You want to inspect failures

Playwright stores artifacts in:

- `playwright-report/`
- `test-results/`

Those folders are ignored by git.

## Recommended Workflow

For normal development:

```powershell
python -m pytest tests/unit
npm run sanity:js
```

Before pushing or handing work off:

```powershell
python -m pytest
npm run sanity:all
```
