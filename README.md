# CITS3403_Project_JYCF
A collaborative full-stack web application built using Flask, SQLAlchemy, and Bootstrap. Developed using Agile methodologies to deliver a user-centric, data-persistent platform. Created by JYCF

## Group Members

| UWA ID   | Name          | GitHub username  |
| 24773532 | Faiyaz Kabir  | faiyazkabir3     |
| 24112617 | Looi Yong Lun | looiyonglun-cmyk |
| 24220597 | Joshua Evans  | Joshua-Evans05 & 24220597   |

## Documentation

- [Achievement System And Agent Clipboard](ACHIEVEMENT_SYSTEM.md)
- [End-To-End Encrypted Chat](END_TO_END_ENCRYPTED_CHAT.md)
- [Realtime Chat](REALTIME_CHAT.md)
- [Security Upgrade](SECURITY_UPGRADE.md)

## Security Lecture Compliance

The app follows the CITS3403/CITS5505 security requirements for the group project:

- Registered-user authentication is handled with Flask-Login and signed Flask sessions.
- Passwords are stored with Werkzeug password hashes, which include a random per-password salt.
- POST forms and JSON fetches are protected with Flask-WTF CSRF tokens.
- Mutating account and friend actions use POST requests instead of GET links.
- User-input database access uses SQLAlchemy query APIs; raw SQL is limited to static SQLCipher/schema checks.
- HTTPS certificates and token/JWT authentication are deployment concerns and are not required for the local project setup.

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

This installs Flask-Login, Flask-WTF, Flask-Migrate, SQLAlchemy, SQLCipher support, and the other Flask runtime dependencies used by the app.

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

3. Create or update your local encrypted database from migrations:

macOS/Linux:

```bash
export FLASK_APP=app.py
flask db upgrade
```

Windows PowerShell:

```powershell
$env:FLASK_APP = "app.py"
flask db upgrade
```

Optional: add shared demo users and sample save data:

```powershell
flask seed-demo
```

The demo accounts are `leon_demo` and `quite_demo`; both use the password `RouteZero123!`.

4. Run the Flask app:

```powershell
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

If you already have an old plaintext `project.db`, SQLCipher may reject it because this branch expects a fresh encrypted database. For local development, rename the old file and let migrations create a new encrypted one:

```powershell
mv project.db project.plaintext.backup.db
flask db upgrade
```

If you see `RuntimeError: SQLCIPHER_DATABASE_KEY is missing`, your `.env` file is missing that line or the server was started from a terminal that cannot see the `.env` file.

### Database Migrations

This project uses Flask-Migrate/Alembic for database migrations. Run migration commands from the project root so `app.py` can load `.env` before connecting to SQLCipher.

Set the Flask app module first:

```bash
export FLASK_APP=app.py
```

On Windows PowerShell, use:

```powershell
$env:FLASK_APP = "app.py"
```

The repo already includes the `migrations/` folder. Do not run `flask db init` during normal setup.

Create a new migration script after changing models:

```bash
flask db migrate -m "describe schema change"
```

Review the generated migration file before committing or applying it. Alembic autogenerate is helpful, but it can miss or misread schema details.

Apply the migration to the configured encrypted database:

```bash
flask db upgrade
```

Roll back one migration if needed:

```bash
flask db downgrade
```

Check the current migration version:

```bash
flask db current
```

For a fresh encrypted database, the usual setup flow is:

```bash
export FLASK_APP=app.py
flask db upgrade
flask seed-demo
```

`flask seed-demo` is optional and safe to re-run. It creates only the shared demo users/saves if they are missing.

For an intentional fresh local wipe, delete only ignored local state before running `flask db upgrade`:

```bash
rm -f project.db instance/*.db instance/save_fallbacks/*.json
```

The migration commands still require `SECRET_KEY`, `SQLCIPHER_DATABASE_KEY`, and `SAVE_PAYLOAD_KEYS`. If any of those values are missing, the app should fail instead of creating a plaintext database by accident.

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

## Python Unit And Selenium Tests

The repo includes pytest unit tests and a Selenium browser suite for the rubric testing requirement.

- `python -m pytest tests/unit`: run the Python unit tests
- `python -m pytest tests/selenium`: run the Selenium browser tests with Chrome by default
- `python -m pytest`: run all Python unit and Selenium tests
- `python -m pytest --collect-only`: confirm pytest discovers at least 5 unit tests and 5 Selenium tests

The Selenium suite starts a dedicated Flask test server on `http://127.0.0.1:5001` and uses an isolated temporary test database. Chrome is the default browser. To run the same Selenium tests in Edge instead:

```powershell
$env:SELENIUM_BROWSER = "edge"
python -m pytest tests/selenium
```

## Playwright Smoke Tests

The repo includes Playwright smoke tests for real browser-level checks.

- `npm run test:e2e`: run the Playwright suite headlessly
- `npm run test:e2e:headed`: run the suite with a visible browser
- `npm run sanity:browser`: run the smoke test file only

The Playwright config uses Chromium by default, or the browser channel in `PLAYWRIGHT_CHANNEL` when one is set, and starts a dedicated Flask test server with an isolated SQLite database at `instance/playwright_smoke.db`. This keeps smoke-test accounts and save data out of your main local run.

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
