# CITS3403_Project_JYCF
A collaborative full-stack web application built using Flask, SQLAlchemy, and Bootstrap. Developed using Agile methodologies to deliver a user-centric, data-persistent platform. Created by JYCF

## Local Setup

### Python

1. Create and activate a virtual environment.
2. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

3. Make sure your `.env` file contains a valid `SECRET_KEY`.
4. Run the Flask app:

```powershell
python app.py
```

### JavaScript Tooling

This project uses plain browser ES modules served directly by Flask. There is no bundler or frontend build step.

Install Node.js LTS on Windows:

```powershell
winget install OpenJS.NodeJS.LTS
```

Open a new terminal, then verify the install:

```powershell
node -v
npm -v
```

Install the repo's JS tooling:

```powershell
npm install
```

Run the JavaScript lint check:

```powershell
npm run lint:js
```

Run the full JavaScript sanity check:

```powershell
npm run sanity:js
```

Run browser-level smoke checks with Playwright:

```powershell
npm run sanity:browser
```

Run the full local sanity suite:

```powershell
npm run sanity:all
```

Auto-fix lint issues where possible:

```powershell
npm run lint:js:fix
```

## Playwright Smoke Tests

The repo includes Playwright smoke tests for real browser-level checks.

- `npm run test:e2e`: run the Playwright suite headlessly
- `npm run test:e2e:headed`: run the suite with a visible browser
- `npm run sanity:browser`: run the smoke test file only

The Playwright config uses the locally installed Microsoft Edge browser and starts a dedicated Flask test server with an isolated SQLite database at `instance/playwright_smoke.db`. This keeps smoke-test accounts and save data out of your main local run.

## VS Code Debugging

This repo includes VS Code tasks and launch configs in `.vscode/`.

- `Run Flask app`: starts the Python app in the integrated terminal.
- `Lint JS`: runs ESLint against `static/js`.
- `Python: app.py`: launches the Flask app under the Python debugger.
- `Edge: /play`: opens `http://127.0.0.1:5000/play` with browser debugging.
- `Flask + Edge /play`: starts both so you can hit breakpoints in browser JS files like `static/js/play.js`, `static/js/gameUI.js`, and `static/js/combat-engine.js`.

For frontend debugging, set breakpoints in the browser-loaded JS modules. Node is used here for tooling and linting, not to run the game itself.

## Documentation

- [Level Design](LEVEL_DESIGN.md)
- [Combat Engine](COMBAT_ENGINE.md)
