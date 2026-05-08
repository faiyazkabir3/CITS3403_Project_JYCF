# Security Upgrade Guide

Updated: 8 May 2026

This document is the security reference for the current Route Zero project. It explains what the project protects, how each security layer works, which files are involved, how to verify the behavior, and what risks still remain.

The project is still a Flask game application, but the security model now has several separate layers:

- Flask-Login for registered-user session authentication.
- Flask-WTF CSRF tokens for mutating HTTP requests.
- Werkzeug password hashing with a per-password salt.
- Required `.env` secrets instead of hardcoded keys.
- SQLCipher-backed SQLite database encryption at rest.
- AES-GCM encryption for fallback save files.
- Browser-side Web Crypto end-to-end encryption for direct chat.
- SQLAlchemy query APIs for user-input database access.
- Jinja/browser escaping patterns for user-controlled text.
- File-upload validation for profile pictures.
- Flask-Migrate/Alembic support for safer schema changes.

The important design rule is that different security jobs use different secrets. Flask session signing, SQLCipher database encryption, fallback save encryption, and browser chat encryption are intentionally separate.

## Security Goals

The current app is designed to protect against these realistic project threats:

- Someone copies the local SQLite database file and tries to read user, save, or chat data.
- Someone copies fallback save files from `instance/save_fallbacks/`.
- A malicious website tries to trigger a logged-in user's POST action through CSRF.
- A logged-out user or guest tries to access registered-only features.
- A user submits SQL-like text into usernames, profile fields, friend search, or chat-related routes.
- A user uploads an unsafe profile image path or non-JPEG file.
- The app is started without required secrets and accidentally creates weak or plaintext local state.
- Direct chat text is stored on the Flask server in plaintext.

This project does not claim to solve every security problem. HTTPS certificates, production server hardening, key backup UI, multi-device chat key sync, rate limiting, and formal cryptographic verification are outside the current project scope.

## Lecture Compliance Summary

| Requirement | Status | Implementation |
| --- | --- | --- |
| Salted password hashing | Yes | Werkzeug `generate_password_hash()` stores the method, salt, and derived hash in `User.password_hash`. |
| Secret keys outside source | Yes | `SECRET_KEY`, `SQLCIPHER_DATABASE_KEY`, and `SAVE_PAYLOAD_KEYS` are loaded from `.env`. |
| Session authentication | Yes | Flask-Login handles registered-user sessions with `login_user()`, `logout_user()`, `current_user`, and `@login_required`. |
| Guest separation | Yes | Guest mode uses `session["is_guest"]` and does not create an authenticated `User` row. |
| CSRF protection | Yes | Flask-WTF `CSRFProtect` checks mutating HTTP requests. Forms include `csrf_token`; JS fetches send `X-CSRFToken`. |
| Mutating GET routes avoided | Yes | Logout and friend-request mutations are POST-only. |
| SQLAlchemy-safe user queries | Yes | User-controlled database lookups use SQLAlchemy query APIs. Raw SQL is static schema/SQLCipher setup. |
| Jinja escaping | Yes | User-controlled template values use normal Jinja expressions with autoescaping. |
| HTTPS/SSL | Deployment responsibility | Local course setup does not require certificates, but production must use HTTPS. |
| Token/JWT auth | Not required | The app uses session authentication, matching the lecture expectation. |

## Key Files

| Area | Files |
| --- | --- |
| Flask app security wiring | `app.py`, `routes.py` |
| SQLAlchemy models | `models.py` |
| Python dependencies | `requirements.txt` |
| Login/register/profile/friend/chat forms | `templates/*.html` |
| Chat E2EE client | `static/js/chat.js` |
| Save-game CSRF fetch | `static/js/gameUI.js` |
| Browser tests | `tests/selenium/test_browser_flows.py` |
| Test Flask server secrets | `scripts/run_selenium_server.py` |
| Setup instructions | `README.md` |
| Database overview | `DATABASE_GUIDE.md` |
| Chat encryption details | `END_TO_END_ENCRYPTED_CHAT.md` |

## Required Environment Variables

The app requires these values before it can start safely:

```text
SECRET_KEY=...
SQLCIPHER_DATABASE_KEY=...
SAVE_PAYLOAD_KEYS=v1:...
DATABASE_URL=sqlite:///project.db
```

### `SECRET_KEY`

`SECRET_KEY` signs Flask session cookies and CSRF tokens.

Requirements:

- Must exist.
- Must not be a placeholder like `change-me`, `replace-me`, or `your-secret-key`.
- Must be at least 32 characters.
- Must not be reused as the SQLCipher key or save-payload key.

Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### `SQLCIPHER_DATABASE_KEY`

`SQLCIPHER_DATABASE_KEY` unlocks the encrypted SQLite database through SQLCipher.

Requirements:

- Must exist.
- Must be at least 32 characters.
- Must stay stable for the life of a local encrypted database.
- Must be separate from `SECRET_KEY`.

If this key changes, the app will not be able to read the old encrypted database file. For local development, rename the old DB and create a fresh encrypted one.

### `SAVE_PAYLOAD_KEYS`

`SAVE_PAYLOAD_KEYS` is a key ring for encrypted fallback save files.

Format:

```text
SAVE_PAYLOAD_KEYS=v1:base64url_32_byte_key
```

Generate a valid entry with:

```bash
python -c "import base64, secrets; print('v1:' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

For key rotation, put the newest key first and keep old keys after it:

```text
SAVE_PAYLOAD_KEYS=v2:new_key_here,v1:old_key_here
```

New fallback saves use the first key. Old fallback saves can still be read if their key ID remains in the ring.

### Optional Development Flags

`ALLOW_PLAINTEXT_SAVE_FALLBACKS=true` allows old plaintext fallback save files to be read. It is disabled by default and should only be used temporarily for local recovery.

`SESSION_COOKIE_SECURE=true` marks Flask session cookies as HTTPS-only. Enable this in HTTPS deployments. Leave it off for plain local `http://127.0.0.1` development.

## Startup Safety

The startup flow in `app.py` is deliberately strict:

1. Load `.env`.
2. Validate `SECRET_KEY`.
3. Validate `SQLCIPHER_DATABASE_KEY`.
4. Parse and validate `SAVE_PAYLOAD_KEYS`.
5. Convert `sqlite:///...` into a `sqlite+pysqlcipher://...` SQLAlchemy URL.
6. Initialize SQLAlchemy.
7. Initialize Flask-Migrate.
8. Initialize CSRF protection.
9. Initialize Flask-Login.
10. Initialize Socket.IO.
11. For normal app startup, run `PRAGMA cipher_version` to confirm SQLCipher is active.
12. For normal app startup, require the Alembic migration table and app tables to exist.
13. For `flask db ...` migration commands, skip strict startup checks so Alembic can create or compare the schema.

This means the app should fail early instead of silently creating a plaintext database or running with weak session secrets.

## Password Hashing

Registered passwords are never stored as plaintext.

Registration and password-change flows use:

```python
generate_password_hash(password, method="pbkdf2:sha256")
```

Login and password-change verification use:

```python
check_password_hash(user.password_hash, password)
```

Werkzeug stores the hashing method, salt, and derived hash in one string. There is no separate `salt` column because the salt is embedded in `User.password_hash`.

Why this is better:

- A leaked database does not immediately reveal user passwords.
- The random salt means two users with the same password should still have different stored hashes.
- The app relies on Werkzeug instead of custom cryptographic code.

## Session Authentication

Registered users authenticate through Flask-Login.

Core pieces:

- `User` inherits `UserMixin`.
- `LoginManager(app)` is initialized in `app.py`.
- The custom unauthorized handler redirects unauthenticated users to the Blueprint login route.
- `@login_manager.user_loader` reloads a `User` by ID from the signed session.
- Successful login calls `login_user(user)`.
- Logout calls `logout_user()` and clears the session.
- Registered-only routes use `@login_required`.

Protected registered-user features include:

- Profile editing.
- Public profile actions.
- Saving and loading registered game progress.
- Friend management.
- Direct chat key exchange.
- Direct chat pages.
- Friend stats.

Guest mode remains separate. A guest receives a display name and `session["is_guest"] = True`, but Flask-Login does not treat the guest as an authenticated `User`.

## Session Cookie Settings

The app configures session cookie behavior:

```python
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = controlled by SESSION_COOKIE_SECURE env var
```

Effect:

- `HttpOnly` reduces exposure of session cookies to browser JavaScript.
- `SameSite=Lax` helps reduce cross-site cookie sending in common CSRF situations.
- `Secure` can be enabled for HTTPS deployments.

These settings support CSRF protection but do not replace CSRF tokens.

## CSRF Protection

CSRF protection is provided by Flask-WTF.

The app uses:

```python
csrf = CSRFProtect(app)
```

Because Socket.IO and some app behavior need explicit control, the app sets:

```python
WTF_CSRF_CHECK_DEFAULT = False
```

Then `app.py` manually calls `csrf.protect()` in `before_request` for mutating HTTP methods:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Socket.IO paths are skipped because Socket.IO handshakes are not normal Flask form posts.

### Form CSRF Tokens

Every POST form includes:

```html
<input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
```

This covers:

- Login.
- Register.
- Guest login.
- Logout.
- Profile update.
- Friend request send.
- Friend request accept/reject.
- Public profile friend action.
- Chat form fallback.

### JavaScript CSRF Tokens

Pages that need JS POST requests expose a meta token:

```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

JavaScript reads that token and sends:

```http
X-CSRFToken: <token>
```

This covers:

- `POST /save-game`
- `POST /chat/keys/<friend_id>`

### Mutating Routes Are POST-Only

These routes no longer mutate state through GET:

```text
POST /logout
POST /add_friend/<user_id>
POST /accept_friend/<request_id>
POST /reject_friend/<request_id>
```

This prevents simple links, image tags, or browser prefetches from changing account state.

## SQLCipher Database Encryption

The app still uses SQLite from SQLAlchemy's point of view, but the database file is opened through SQLCipher.

Normal local configuration:

```text
DATABASE_URL=sqlite:///project.db
```

At startup, `app.py` converts this into a SQLCipher URL using `SQLCIPHER_DATABASE_KEY`. The conversion keeps the project configuration simple while preventing accidental normal SQLite usage.

The app verifies SQLCipher with:

```sql
PRAGMA cipher_version
```

If SQLCipher is not active, startup fails.

What this protects:

- A copied raw DB file should not be readable with normal `sqlite3`.
- Table names and row contents should not appear as plaintext in the database bytes.

What this does not protect:

- Data while the Flask process is running and has the key.
- Data returned through authorized routes.
- A compromised host that can read environment variables and process memory.

## Flask-Migrate And Alembic

The project now initializes:

```python
migrate = Migrate(app, db)
```

Documented migration commands:

```bash
export FLASK_APP=app.py
flask db upgrade
flask db migrate -m "describe schema change"
flask db downgrade
```

Important migration rules:

- The repo already has a committed `migrations/` folder; do not run `flask db init` during normal setup.
- Always review generated migration files before committing.
- Migration commands must load `.env`, because they connect through SQLCipher.
- Commit migration files, not live database files.
- Run `flask db upgrade` before starting the app.

During `flask db ...`, strict startup checks are skipped. This lets Alembic create the database schema instead of relying on runtime `db.create_all()` or compatibility helpers.

## Fallback Save Encryption

The primary save path is the SQLCipher database. The app also writes fallback save files under:

```text
instance/save_fallbacks/
```

Fallback files are encrypted with AES-GCM using the active key from `SAVE_PAYLOAD_KEYS`.

Write flow:

1. Build the normal save payload.
2. Serialize the payload as compact JSON bytes.
3. Generate a random 12-byte nonce with `os.urandom(12)`.
4. Encrypt with `AESGCM(key).encrypt(nonce, plaintext, None)`.
5. Write an encrypted envelope instead of plaintext JSON.

Envelope shape:

```json
{
  "encrypted": true,
  "version": 1,
  "key_id": "v1",
  "nonce": "...",
  "ciphertext": "..."
}
```

Read flow:

1. Load the JSON envelope.
2. Confirm `encrypted` is true.
3. Read `key_id`.
4. Find the matching key in `SAVE_PAYLOAD_KEYS`.
5. Base64url-decode the nonce and ciphertext.
6. Decrypt with AES-GCM.
7. Normalize the save payload before returning it to the game.

Why AES-GCM:

- It encrypts the save data.
- It detects tampering. If the nonce, ciphertext, or key is wrong, decryption fails.

Plaintext fallback saves are rejected by default. The only exception is the local recovery flag `ALLOW_PLAINTEXT_SAVE_FALLBACKS=true`.

## Direct Chat End-To-End Encryption

Direct chat encryption happens in the browser. Flask stores and forwards encrypted payloads, but does not store browser private keys and should not receive plaintext chat content.

Browser cryptography in `static/js/chat.js`:

| Purpose | Algorithm |
| --- | --- |
| Chat key pair | ECDH P-256 |
| Shared key derivation | ECDH P-256 |
| Message encryption | AES-GCM 256-bit |
| Message nonce | 12 random bytes |
| Public key ID | SHA-256 of public key, shortened |

### Browser Key Storage

Each logged-in user gets a browser-local chat key record stored in `localStorage`:

```text
cits3403:e2ee:<user_id>
```

The record contains:

- public key
- private key
- public key ID

Only the public key is sent to Flask. The private key stays in the browser.

### Public Key Registration

When a user opens a direct chat page:

1. The browser loads or creates the ECDH key pair.
2. The browser sends the public key to `POST /chat/keys/<friend_id>`.
3. Flask checks that the users are accepted friends.
4. Flask stores the public key, key ID, and creation time on the `User` row.
5. Flask returns the friend's public key when available.

The `User` model stores:

```text
chat_public_key
chat_key_id
chat_key_created_at
```

### Sending A Chat Message

Send flow:

1. Browser reads the plaintext from the input.
2. Browser gets the friend's public key.
3. Browser derives a shared AES-GCM key using ECDH.
4. Browser generates a fresh nonce.
5. Browser encrypts the message.
6. Browser sends encrypted payload through Socket.IO if connected.
7. Browser falls back to a normal POST form if Socket.IO is unavailable.
8. Flask validates login, friendship, and encrypted payload shape.
9. Flask stores only encrypted message fields.
10. Flask broadcasts ciphertext to the chat room.

The encrypted payload contains:

```text
ciphertext
nonce
sender_public_key
sender_key_id
recipient_public_key
recipient_key_id
encryption_version
```

The `Message` model keeps `message` nullable for compatibility, but new encrypted chat messages use the encrypted fields.

### Receiving A Chat Message

Receive flow:

1. Browser receives encrypted message metadata.
2. Browser selects the peer public key.
3. Browser derives the same AES-GCM key.
4. Browser attempts decryption.
5. If decryption succeeds, the plaintext is inserted with `textContent`.
6. If decryption fails, the UI displays `Locked encrypted message`.

Locked messages are expected when a user opens chat in a new browser profile without the original private key. That is a feature of this simple E2EE model: Flask cannot recover the old plaintext.

## Authorization And Friendship Checks

Direct chat and friend-only pages are protected by both authentication and relationship checks.

Examples:

- `@login_required` blocks logged-out users.
- Guests are not authenticated `User` rows, so registered-only routes reject them.
- Chat routes call friendship helpers before returning keys, messages, or chat pages.
- Socket.IO chat events check the session user and accepted friendship before joining rooms or storing messages.
- Friend stats require an accepted friendship.

This matters because encryption does not replace authorization. The server still controls who can access records, rooms, and metadata.

## SQLAlchemy And Raw SQL Policy

User-controlled database actions use SQLAlchemy query APIs such as:

- `User.query.filter_by(...)`
- `FriendRequest.query.filter_by(...)`
- `Message.query.filter(...)`
- `db.session.query(...)`

This avoids manually concatenating user input into SQL strings.

Raw SQL remains in the project only for static operations:

- SQLCipher verification with `PRAGMA cipher_version`.
- Static schema compatibility `ALTER TABLE` statements.
- Static SQLite metadata checks.

Do not add raw SQL that interpolates request data. If raw SQL is ever needed, use SQLAlchemy parameters instead of string formatting.

## Template And Browser Escaping

Server-rendered user-controlled text is displayed with normal Jinja expressions, so Jinja autoescaping applies.

Browser-rendered chat plaintext is inserted with:

```js
messageElement.textContent = plaintext || "Locked encrypted message";
```

Using `textContent` prevents decrypted chat text from becoming executable HTML.

Some game UI code uses `innerHTML` for trusted local game labels and state generated by the app. Do not pass untrusted profile text, usernames, chat text, or request data into those `innerHTML` templates.

## Profile Image Upload Safety

Profile image uploads are restricted.

Current checks:

- Filenames are normalized with `secure_filename()`.
- Only `.jpg` and `.jpeg` extensions are accepted.
- The first bytes must match the JPEG header.
- Upload size is limited to 5 MB.
- Uploaded files are stored under `static/uploads/profile_pics/`.
- Stored filenames are generated with the user ID and a UUID.
- Path resolution checks keep selected uploaded images inside the profile upload directory.

This reduces path traversal and arbitrary file upload risk. It is still wise to serve user uploads carefully in production.

## Database Schema Security Changes

`User` gained public chat key metadata:

```text
chat_public_key
chat_key_id
chat_key_created_at
```

`Message` gained encrypted chat fields:

```text
ciphertext
nonce
sender_key_id
sender_public_key
recipient_key_id
recipient_public_key
encryption_version
```

`Message.message` is nullable so older rows or compatibility paths do not break.

No schema column is needed for Flask-Login. `UserMixin` adds Python behavior, not database columns.

## Test And Verification Commands

Install dependencies:

```bash
pip install -r requirements.txt
```

Compile Python:

```bash
python -m py_compile app.py routes.py models.py
```

Confirm Flask-Migrate CLI is available:

```bash
export FLASK_APP=app.py
flask db --help
```

Run JS checks:

```bash
npm run lint:js
npm run check:js
```

Run browser checks:

```bash
.venv/bin/python -m pytest tests/selenium
```

The Selenium suite uses Chrome by default and starts an isolated Flask test server.

## Manual Security Checks

### Confirm SQLCipher Is Active

```bash
python -c "from app import app, db; from sqlalchemy import text; app.app_context().push(); print(db.session.execute(text('PRAGMA cipher_version')).scalar())"
```

Expected: a SQLCipher version string.

### Confirm Raw DB Is Not Plain SQLite

For a DB at `project.db`:

```bash
python -c "from pathlib import Path; data=Path('project.db').read_bytes(); print(b'SQLite format 3' in data)"
```

Expected:

```text
False
```

If your DB lives in `instance/project.db`, use that path instead.

### Confirm Normal SQLite Cannot Read The DB

```bash
python -c "import sqlite3; sqlite3.connect('project.db').execute('select count(*) from sqlite_master').fetchone()"
```

Expected: an error like:

```text
sqlite3.DatabaseError: file is not a database
```

### Confirm Fallback Saves Are Encrypted

Save a game, then inspect fallback files:

```bash
ls instance/save_fallbacks
cat instance/save_fallbacks/*.json
```

Expected:

- JSON envelope contains `encrypted`, `key_id`, `nonce`, and `ciphertext`.
- File does not show raw fields like `run_state`, `health`, `difficulty`, or `character_id`.

### Confirm Direct Chat Plaintext Is Not Stored

Send a unique chat phrase, then inspect database bytes:

```bash
python -c "from pathlib import Path; data=Path('project.db').read_bytes(); print(b'your unique phrase' in data)"
```

Expected:

```text
False
```

Open the same chat in a fresh browser profile. Messages encrypted for the old browser key should display as locked.

### Confirm CSRF Fails Without A Token

After logging in, a direct POST to a protected mutating route without a CSRF token should fail with a 400 response.

Examples to test with a Flask test client or browser dev tools:

- `POST /logout`
- `POST /save-game`
- `POST /chat/keys/<friend_id>`

Normal forms and app JS should pass because they include CSRF tokens.

### Confirm Mutating GET Routes Are Disabled

These should not perform state changes through GET:

```text
GET /logout
GET /accept_friend/<request_id>
GET /reject_friend/<request_id>
GET /add_friend/<user_id>
```

Expected: method not allowed or no mutation.

## Common Errors

### `SECRET_KEY is missing`

Add a strong `SECRET_KEY` to `.env`.

### `SECRET_KEY is still set to a placeholder`

Replace placeholder values with a random value generated by `secrets.token_urlsafe(32)`.

### `SQLCIPHER_DATABASE_KEY is missing`

Add `SQLCIPHER_DATABASE_KEY=...` to `.env`.

### `SAVE_PAYLOAD_KEYS is missing`

Add a key ring entry:

```text
SAVE_PAYLOAD_KEYS=v1:generated_32_byte_base64url_key
```

### `sqlcipher3 is required for encrypted SQLite databases`

Install dependencies:

```bash
pip install -r requirements.txt
```

### `file is not a database`

This usually means one of two things:

- A normal SQLite tool is trying to open the encrypted SQLCipher DB. That failure is expected.
- The app is trying to open an old plaintext DB with SQLCipher. Rename the old DB and run `flask db upgrade` to create a fresh encrypted one.

### CSRF Token Missing Or Invalid

The request is mutating state without a valid CSRF token. Use the app's rendered form or include the `X-CSRFToken` header from the page meta token.

### Old Chat Messages Show As Locked

The current browser does not have the private key that can decrypt those messages. Use the original browser profile or start a new conversation from the new browser key.

## Deployment Notes

For production-like deployment:

- Use HTTPS and set `SESSION_COOKIE_SECURE=true`.
- Store `.env` secrets outside version control.
- Use long, random, separate keys for Flask sessions, SQLCipher, and fallback saves.
- Back up encryption keys securely. Losing keys means losing access to encrypted data.
- Do not commit `project.db`, `.env`, fallback saves, or profile uploads.
- Review generated Alembic migrations before applying them.
- Consider rate limiting login and registration routes.
- Consider adding account lockout or delay after repeated failed logins.
- Consider adding Content Security Policy headers.
- Consider adding security headers such as HSTS in HTTPS deployments.
- Consider a production WSGI/ASGI server instead of the Flask development server.

## Known Limitations

- Browser private chat keys are stored in `localStorage`.
- Clearing browser data removes the ability to decrypt old E2EE messages.
- There is no chat key export/import UI.
- There is no multi-device chat key sync.
- There is no user-facing public key verification screen.
- If a browser is compromised, decrypted messages can be read in that browser.
- SQLCipher protects the database file at rest, not data after Flask has decrypted it for legitimate use.
- HTTPS is not configured locally.
- There is no JWT/token-based API auth because the project uses session auth.
- There is no automatic migration from plaintext SQLite databases to SQLCipher databases.

These limitations are acceptable for the current project scope, but they should be documented honestly so future work can improve them.

## Security Upgrade Summary

Before the security upgrade, local storage files and chat rows could expose much more readable data. In the current app:

- Registered accounts use salted password hashes.
- Session auth is handled by Flask-Login.
- Mutating requests are CSRF protected.
- Mutating friend/logout routes are POST-only.
- Secrets are loaded from `.env` and validated at startup.
- SQLite is encrypted through SQLCipher.
- Fallback saves are encrypted with AES-GCM.
- Direct chat messages are encrypted in the browser before Flask receives them.
- Database access for user input uses SQLAlchemy query APIs.
- Security behavior is documented and covered by targeted tests/checks.

The result is a stronger, clearer security model that better matches the course security requirements while keeping the project understandable for development and assessment.
