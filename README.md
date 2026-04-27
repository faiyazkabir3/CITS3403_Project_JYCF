# CITS3403_Project_JYCF
A collaborative full-stack web application built using Flask, SQLAlchemy, and Bootstrap. Developed using Agile methodologies to deliver a user-centric, data-persistent platform. Created by JYCF

## Local Setup

### Python

1. Create and activate a virtual environment.

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies inside the activated virtual environment:

```powershell
pip install -r requirements.txt
```

If you see an import error like `ModuleNotFoundError: No module named 'flask_socketio'`, you are either not inside the virtual environment or the dependencies were not installed in that environment.

### Environment Variables

Create a local `.env` file in the project root. This file is loaded by `app.py` when the server starts.

The app needs these values:

```text
SECRET_KEY=required for Flask login/session cookies
SQLCIPHER_DATABASE_KEY=required to unlock the encrypted SQLite database
SAVE_PAYLOAD_KEYS=required to encrypt fallback save JSON files
DATABASE_URL=the SQLite database location
```

Do not commit `.env`, and do not use placeholder values like `replace_me` or `your_generated_sqlcipher_key`.

Generate a strong `SECRET_KEY`:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Use the output like this:

```text
SECRET_KEY=paste_generated_secret_key_here
```

`SECRET_KEY` is only for Flask sessions. It signs browser cookies so users stay logged in securely.

Generate a separate SQLCipher database key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Use the output like this:

```text
SQLCIPHER_DATABASE_KEY=paste_generated_sqlcipher_key_here
```

`SQLCIPHER_DATABASE_KEY` encrypts and unlocks the SQLite database file. Keep this value stable for your local DB. If you change it later, the app will not be able to open the old encrypted database.

Generate the save-payload key ring:

```powershell
python -c "import base64, secrets; print('v1:' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

Use the full output, including `v1:`, like this:

```text
SAVE_PAYLOAD_KEYS=v1:paste_generated_save_payload_key_here
```

`SAVE_PAYLOAD_KEYS` encrypts fallback save files in `instance/save_fallbacks/`. The `v1:` prefix is a key ID. If you ever rotate keys, put the new key first and keep old keys after it so older fallback saves can still be read:

```text
SAVE_PAYLOAD_KEYS=v2:new_key_here,v1:old_key_here
```

Set the database location:

```text
DATABASE_URL=sqlite:///project.db
```

Your finished `.env` should look like this:

```text
SECRET_KEY=generated_flask_session_key
SQLCIPHER_DATABASE_KEY=generated_sqlcipher_database_key
SAVE_PAYLOAD_KEYS=v1:generated_save_payload_key
DATABASE_URL=sqlite:///project.db
```

You can also generate all three secret lines quickly:

```powershell
python -c "import base64, secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32)); print('SQLCIPHER_DATABASE_KEY=' + secrets.token_urlsafe(32)); print('SAVE_PAYLOAD_KEYS=v1:' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

3. Run the Flask app:

```powershell
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

If you already have an old plaintext `project.db`, SQLCipher may reject it because this branch expects a fresh encrypted database. For local development, rename the old file and let the app create a new encrypted one:

```powershell
mv project.db project.plaintext.backup.db
python app.py
```

If you see `RuntimeError: SQLCIPHER_DATABASE_KEY is missing`, your `.env` file is missing that line or the server was started from a terminal that cannot see the `.env` file.

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
- [Realtime Chat](REALTIME_CHAT.md)
- [Hybrid Security Upgrade](SECURITY_UPGRADE.md)
- [Sanity Checks Guide](SANITY_CHECKS.md)
