# Sanity Checks Guide

Sanity checks are quick automated checks that help the team answer:

```text
Did the important parts of the project still basically work after my change?
```

Use this guide from the project root folder, meaning the folder that contains files like:

- `app.py`
- `package.json`
- `requirements.txt`
- `pytest.ini`

Do not copy someone else's full computer path. Each person should `cd` into wherever they cloned the project.

## What The Checks Cover

| Layer | Command | What it checks |
| --- | --- | --- |
| Python unit tests | `python -m pytest tests/unit` | Validation helpers, save payload logic, encrypted chat payload validation, achievement logic |
| Selenium browser tests | `python -m pytest tests/selenium` | Real Flask pages in a real browser: login, register, guest settings, achievements, profile saving |
| JavaScript sanity | `npm run sanity:js` | ESLint plus missing JS import and static asset checks |
| Playwright smoke tests | `npm run sanity:browser` | Real browser flows: login, menu, new game, layout, save/load, shop state |

`python -m pytest` runs the Python unit tests and Selenium tests.

`npm run sanity:all` runs JavaScript sanity and Playwright browser smoke tests.

## First-Time Setup

Everyone needs:

- Python 3
- Node.js LTS
- Google Chrome
- project Python packages from `requirements.txt`
- project npm packages from `package.json`

### Windows PowerShell

From the project root:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm install
```

Check that the tools work:

```powershell
python --version
node --version
npm --version
```

If `node` or `npm` is missing, install Node.js LTS from the Node website or with:

```powershell
winget install OpenJS.NodeJS.LTS
```

Open a new terminal after installing Node.

### macOS / Linux Terminal

From the project root:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
npm install
```

Check that the tools work:

```bash
python --version
node --version
npm --version
```

On macOS, install Node.js LTS from the Node website or with Homebrew:

```bash
brew install node
```

## Recommended Commands

### One-Command Runner

The easiest option is the Python runner:

```bash
python sanity_check.py
```

It runs the main sanity layers one after another:

1. Python unit tests
2. Selenium browser tests
3. JavaScript sanity
4. Playwright browser smoke tests

It also sets the Playwright `PYTHON` environment value automatically, so Windows and macOS/Linux users do not need to remember that command manually.

Useful options:

```bash
python sanity_check.py --quick
python sanity_check.py --keep-going
python sanity_check.py --list
python sanity_check.py --skip-selenium
```

`--quick` runs only the faster checks: Python unit tests and JavaScript sanity.

`--keep-going` continues to later checks even if an earlier check fails.

### Quick Check While Coding

Use this when you want fast feedback:

```bash
python -m pytest tests/unit
npm run sanity:js
```

These are the fastest useful checks because they do not run the full browser suites.

### Full Check Before Submitting

Use this before pushing, submitting, or handing work to the group.

Windows PowerShell:

```powershell
python -m pytest
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run sanity:all
```

macOS / Linux:

```bash
python -m pytest
PYTHON="./venv/bin/python" npm run sanity:all
```

The `PYTHON` setting tells Playwright's Flask test server which Python interpreter to use. This matters because the browser tests need the Python packages installed in the virtual environment.

## Python Unit Tests

Run:

```bash
python -m pytest tests/unit
```

These tests do not open a browser. They directly test Python functions in `app.py` and `routes.py`.

They check things like:

- username validation
- password validation
- chat message validation
- save payload sanitization
- save encryption key parsing
- latest-save selection
- encrypted chat payload validation
- achievement unlock logic

How they work:

- `pytest` imports the project code.
- `tests/conftest.py` sets test-only environment variables.
- Flask migrations run against a temporary test database.
- Each test calls a function and checks the result.

Run one specific unit test:

```bash
python -m pytest tests/unit/test_helpers.py::test_password_validation_enforces_required_length -vv
```

## Selenium Browser Tests

Run:

```bash
python -m pytest tests/selenium
```

These tests open a real browser through Selenium.

They check things like:

- unauthenticated users are redirected from `/play` to login
- a user can register and log in
- guest login reaches the main menu
- the settings modal works
- a registered user can open achievements
- profile background saving works

How they work:

- `tests/selenium/conftest.py` starts `scripts/run_selenium_server.py`.
- The Flask app runs on `http://127.0.0.1:5001`.
- Selenium starts headless Chrome by default.
- The tests click through real pages.
- The server uses a separate temporary database, not a normal development database.

Run one Selenium test:

```bash
python -m pytest tests/selenium -k guest_login -vv
```

Use Edge instead of Chrome on Windows:

```powershell
$env:SELENIUM_BROWSER = "edge"
python -m pytest tests/selenium
```

Use Edge instead of Chrome on macOS / Linux if Edge is installed:

```bash
SELENIUM_BROWSER=edge python -m pytest tests/selenium
```

## All Python Tests

Run:

```bash
python -m pytest
```

This uses `pytest.ini`, which currently includes:

- `tests/unit`
- `tests/selenium`

It does not run Playwright because Playwright tests are JavaScript files and are run with npm.

To see what pytest will run without running the tests:

```bash
python -m pytest --collect-only -q
```

## JavaScript Sanity

Run:

```bash
npm run sanity:js
```

This runs:

```bash
npm run lint:js
npm run check:js
```

`npm run lint:js` runs ESLint on files in `static/js`.

`npm run check:js` runs `scripts/check-js-sanity.mjs`.

The custom checker looks for:

- JavaScript syntax errors in non-module scripts
- missing relative imports in `static/js`
- missing `/static/...` assets referenced from JavaScript
- missing static files referenced from templates with `url_for(..., filename=...)`

Run only ESLint:

```bash
npm run lint:js
```

Try automatic ESLint fixes:

```bash
npm run lint:js:fix
```

## Playwright Browser Smoke Tests

Run the smoke suite only.

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run sanity:browser
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run sanity:browser
```

This runs:

```text
tests/playwright/smoke.spec.js
```

It checks real browser flows such as:

- redirecting unauthenticated users back to login
- guest login
- settings modal interaction
- new game flow
- play screen layout
- registered user achievements
- save and load flow
- encrypted save storage checks
- shop state loading

How it works:

- `playwright.config.js` starts `scripts/run_playwright_server.py`.
- The Flask app runs on `http://127.0.0.1:5000`.
- The server uses `instance/playwright_smoke.db`.
- Playwright launches headless Chrome.
- Failed tests keep traces, screenshots, and videos.

Run all Playwright tests:

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run test:e2e
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run test:e2e
```

Run with a visible browser:

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run test:e2e:headed
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run test:e2e:headed
```

Run one Playwright test by name:

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npx playwright test tests/playwright/smoke.spec.js -g "registered user can view achievements"
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npx playwright test tests/playwright/smoke.spec.js -g "registered user can view achievements"
```

## How To Read Failures

Start with the first failure. Later failures can be caused by the first one.

Python failures usually look like:

```text
FAILED tests/unit/test_helpers.py::test_name
AssertionError
file.py:line_number
```

Playwright failures usually look like:

```text
tests/playwright/smoke.spec.js:455:1 test name
Expected ...
Received ...
```

Debugging steps:

1. Find the first failed test.
2. Read the assertion or error message.
3. Open the file and line number shown in the output.
4. Decide whether the app behavior is wrong or the test expectation is wrong.
5. Fix the smallest relevant thing.
6. Re-run only the failing test.
7. Re-run the full layer after the specific test passes.

## Common Errors And Fixes

### `python` or `pytest` is not recognized

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
python -m pytest tests/unit
```

macOS / Linux:

```bash
source venv/bin/activate
python -m pytest tests/unit
```

Or use the venv Python directly.

Windows PowerShell:

```powershell
.\venv\Scripts\python.exe -m pytest tests/unit
```

macOS / Linux:

```bash
./venv/bin/python -m pytest tests/unit
```

### PowerShell Blocks Venv Activation

If Windows says script execution is disabled, either use the venv Python directly:

```powershell
.\venv\Scripts\python.exe -m pytest tests/unit
```

or allow scripts for the current user:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then open a new PowerShell terminal and activate the venv again.

### `No module named ...`

Install Python dependencies inside the virtual environment:

```bash
python -m pip install -r requirements.txt
```

Then re-run the failing command.

### Flask Migration Or Database Setup Fails

The tests create isolated test databases, but they still run Flask migrations.

Try:

```bash
python -m flask --app app.py db upgrade
python -m pytest tests/unit -vv
```

If the error mentions `SECRET_KEY`, `SQLCIPHER_DATABASE_KEY`, or `SAVE_PAYLOAD_KEYS`, check:

- `tests/conftest.py`
- `scripts/run_selenium_server.py`
- `scripts/run_playwright_server.py`

Those files provide test-only environment values.

### Selenium Cannot Start Chrome

Install Google Chrome.

Then re-run:

```bash
python -m pytest tests/selenium -vv
```

Selenium Manager may need internet access the first time it downloads a matching browser driver.

### Selenium Server Does Not Start

Run the Selenium server directly so you can see the real Python error.

Windows PowerShell:

```powershell
python -B scripts/run_selenium_server.py
```

macOS / Linux:

```bash
python -B scripts/run_selenium_server.py
```

Then fix the app import, migration, environment variable, or database error shown in the terminal.

Stop the server with `Ctrl+C` when done.

### `node` or `npm` is not recognized

Install Node.js LTS.

Windows options:

- install from the Node.js website
- or run `winget install OpenJS.NodeJS.LTS`

macOS options:

- install from the Node.js website
- or run `brew install node`

After installing Node, open a new terminal and run:

```bash
node --version
npm --version
```

### npm Packages Are Missing

Run:

```bash
npm install
```

Then re-run:

```bash
npm run sanity:js
```

### ESLint Fails

ESLint usually prints the file, line, and rule that failed.

Common fixes:

- remove unused variables
- fix syntax errors
- add missing imports
- rename variables consistently
- avoid browser globals that ESLint does not know about

Try automatic fixes:

```bash
npm run lint:js:fix
```

Then manually fix whatever remains.

### `check:js` Reports A Missing Import

Example:

```text
Missing import target: static/js/game.js -> ./missingFile.js
```

Fix one of these:

- the import path is misspelled
- the file was moved
- the file was deleted
- the extension or folder name does not match the real file

### `check:js` Reports A Missing Static Asset

Example:

```text
Missing static asset in template: templates/play.html -> images/ui/icon_heart.svg
```

Fix one of these:

- restore the missing file under `static/`
- correct the filename in the template or JavaScript
- check capitalization, especially when moving between Windows and macOS/Linux

### Playwright Says `python3` Is Not Recognized

Set the Python interpreter explicitly.

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run sanity:browser
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run sanity:browser
```

### Playwright Cannot Launch Chrome

The current Playwright config uses the local Chrome browser channel.

Fix one of these:

- install Google Chrome
- check that Chrome can be opened normally
- ask the group before changing `playwright.config.js` to use a different browser channel

### Playwright Web Server Times Out

Run the Playwright server directly so you can see the real Python error.

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
.\venv\Scripts\python.exe -B scripts/run_playwright_server.py
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" ./venv/bin/python -B scripts/run_playwright_server.py
```

Then open:

```text
http://127.0.0.1:5000/login
```

If the app crashes, fix the Python error shown in the terminal.

Stop the server with `Ctrl+C` when done.

### A Playwright Locator Or Expectation Fails

This means the browser opened, but the page did not look or behave the way the test expected.

Use headed mode to watch the browser.

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run test:e2e:headed
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run test:e2e:headed
```

Also check:

- `playwright-report/`
- `test-results/`

These folders contain traces, screenshots, or videos for failed Playwright tests.

## Which Command Should I Run?

Changed Python helper logic, validation, save logic, chat helpers, or achievements:

```bash
python -m pytest tests/unit
```

Changed Flask routes, login/register/profile behavior, or server-side page behavior:

```bash
python -m pytest tests/selenium
```

Changed JavaScript, imports, templates, or static asset references:

```bash
npm run sanity:js
```

Changed gameplay UI, menu flow, browser layout, saving/loading, achievements pages, chat/profile/social features, or anything user-facing:

Windows PowerShell:

```powershell
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run sanity:browser
```

macOS / Linux:

```bash
PYTHON="./venv/bin/python" npm run sanity:browser
```

Before submitting or handing work to the group:

Windows PowerShell:

```powershell
python -m pytest
$env:PYTHON = ".\venv\Scripts\python.exe"
npm run sanity:all
```

macOS / Linux:

```bash
python -m pytest
PYTHON="./venv/bin/python" npm run sanity:all
```
