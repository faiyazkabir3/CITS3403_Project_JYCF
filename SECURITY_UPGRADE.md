# Hybrid Security Upgrade

This document explains the security changes on the `db_security` branch: what they protect, how the keys work, how encrypted saves are stored, and how direct-chat E2EE works.

The upgrade has three layers:

- SQLCipher encrypts the SQLite database file at rest.
- AES-GCM encrypts fallback save files at the app layer.
- Browser-side Web Crypto encrypts direct-chat messages before Flask receives them.

The important idea is that different kinds of data use different keys. Flask sessions, the database file, fallback saves, and chat messages are not all protected by the same secret.

## What This Protects

Before this upgrade, someone who copied local storage files could inspect a normal SQLite DB or fallback JSON file with common tools and read user data, save data, and chat message text.

After this upgrade:

- A raw SQLite file should not be readable with normal `sqlite3`.
- Fallback save files should contain only an encrypted envelope.
- Direct chat rows should store ciphertext instead of plaintext message text.
- Flask can still check logins, friendships, rooms, and database records, but it should not need plaintext chat messages.

This does not replace normal app security. Password hashing, route authorization, CSRF-aware forms, safe file uploads, and browser security still matter.

## CITS3403/CITS5505 Lecture Compliance

| Lecture requirement | Status | Project method |
| --- | --- | --- |
| Salted password hashing | Yes | Werkzeug `generate_password_hash()` stores the method, salt, and derived hash in `user.password_hash`. |
| Secret keys outside source | Yes | `.env` provides `SECRET_KEY`, `SQLCIPHER_DATABASE_KEY`, and `SAVE_PAYLOAD_KEYS`; startup fails if they are missing. |
| Session authentication | Upgraded | Flask-Login manages registered-user login state with `login_user()`, `logout_user()`, `current_user`, and protected routes. |
| Guest access kept separate | Yes | Guest mode uses its own session flag and does not create an authenticated `User` row. |
| CSRF protection | Upgraded | Flask-WTF `CSRFProtect` checks POST/PUT/PATCH/DELETE requests; forms include `csrf_token`, and JS fetches send `X-CSRFToken`. |
| Mutating GET routes avoided | Upgraded | Logout, accepting/rejecting friend requests, and direct friend-request actions are POST-only. |
| SQLAlchemy-safe queries | Yes | User-input lookups use SQLAlchemy query APIs; raw SQL is static SQLCipher/schema maintenance code. |
| Jinja escaping | Yes | User-controlled template values are rendered through normal Jinja expressions so autoescaping applies. |
| HTTPS/SSL | Deployment responsibility | The lecture does not require local certificate setup, but production deployments should use HTTPS. |
| Token/JWT auth | Not required | The project uses session-based authentication, matching the lecture expectation. |

## Password Hashing

Registered user passwords are not stored as plaintext.

The app uses Werkzeug's `generate_password_hash()` in the registration and password-change flows. New password hashes use:

- PBKDF2-HMAC-SHA256
- a random per-password salt

Werkzeug stores the method, salt, and derived hash together in the `user.password_hash` field. That means there is no separate salt column in the database. Two users with the same password should still have different stored hashes because each hash gets its own random salt.

Login and password-change checks use Werkzeug's `check_password_hash()`, which reads the stored method and salt from the hash string. Existing valid password hashes remain compatible.

## Session Authentication And CSRF

Registered users are authenticated with Flask-Login. Successful login calls `login_user(user)`, logout calls `logout_user()`, and registered-only routes use `@login_required`.

Guest mode remains separate from registered authentication. A guest can use guest-supported menu and game flows, but registered-only features such as profiles, friends, saves, and chat require a real authenticated `User`.

CSRF protection is provided by Flask-WTF. Normal POST forms include a hidden `csrf_token` field, while JavaScript POST requests, such as `/save-game` and `/chat/keys/<friend_id>`, read the token from the page and send it in the `X-CSRFToken` header. Missing-token mutating requests should fail.

## Required Environment Variables

The app requires these values in `.env`:

```text
SECRET_KEY=...
SQLCIPHER_DATABASE_KEY=...
SAVE_PAYLOAD_KEYS=v1:...
DATABASE_URL=sqlite:///project.db
```

### `SECRET_KEY`

`SECRET_KEY` is used by Flask for sessions and signed cookies.

It should:

- be random
- be at least 32 characters
- stay private
- not be reused for database or save encryption

Generate it with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### `SQLCIPHER_DATABASE_KEY`

`SQLCIPHER_DATABASE_KEY` unlocks the encrypted SQLite database.

It should:

- be random
- be separate from `SECRET_KEY`
- stay stable for the life of a local encrypted DB

Generate it with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

If this value changes, the app will not be able to open the old encrypted database. For local development, that usually means renaming or deleting the old DB and letting the app create a fresh encrypted one.

### `SAVE_PAYLOAD_KEYS`

`SAVE_PAYLOAD_KEYS` is a key ring for fallback save files. Each entry has a key ID and a 32-byte base64url key:

```text
SAVE_PAYLOAD_KEYS=v1:base64url_32_byte_key
```

Generate it with:

```bash
python -c "import base64, secrets; print('v1:' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

The key ID, such as `v1`, is stored in each encrypted fallback file. That lets the app choose the right key when reading old save files.

For rotation, put the newest key first and keep older keys after it:

```text
SAVE_PAYLOAD_KEYS=v2:new_key_here,v1:old_key_here
```

New fallback saves use `v2`, but older `v1` files can still be opened.

## SQLCipher Database Encryption

The database is still SQLite from the app's point of view, but it is opened through SQLCipher.

The startup flow in `app.py` is:

1. Load `.env`.
2. Require `SECRET_KEY`, `SQLCIPHER_DATABASE_KEY`, and `SAVE_PAYLOAD_KEYS`.
3. Convert a normal SQLite URL such as `sqlite:///project.db` into a SQLCipher-compatible SQLAlchemy URL.
4. Initialize SQLAlchemy, Flask-Migrate/Alembic, Flask-Login, CSRF protection, and Socket.IO.
5. During normal app startup, run `PRAGMA cipher_version` to confirm SQLCipher is active.
6. During normal app startup, run `db.create_all()` and schema compatibility helpers.
7. During `flask db ...` migration commands, skip the legacy schema helpers so Alembic can compare the models against the real database state.

The key behavior is deliberate: the app should fail early if the SQLCipher key is missing or SQLCipher is not available.

### Fresh Encrypted DB Assumption

This branch does not automatically migrate old plaintext SQLite databases. If a plaintext `project.db` already exists, SQLCipher may fail to open it because it expects encrypted pages.

For local development, back up the old file and let the app create a new encrypted DB:

```bash
mv project.db project.plaintext.backup.db
python app.py
```

If your DB lives in `instance/`, use that path instead:

```bash
mv instance/project.db instance/project.plaintext.backup.db
python app.py
```

## Fallback Save Encryption

The game saves to the database first. If the DB save fails, or after a successful DB save as a backup, the app writes a fallback file under:

```text
instance/save_fallbacks/
```

Before this branch, those fallback files were normal JSON. Now they are encrypted with AES-GCM.

The write flow is:

1. Build the normal save payload in Python.
2. Serialize it to compact JSON bytes.
3. Generate a random 12-byte nonce.
4. Encrypt with AES-GCM using the active `SAVE_PAYLOAD_KEYS` key.
5. Write only the encrypted envelope to disk.

The envelope looks like:

```json
{
  "encrypted": true,
  "version": 1,
  "key_id": "v1",
  "nonce": "...",
  "ciphertext": "..."
}
```

The fallback file should not contain readable fields like:

```text
run_state
difficulty
health
character_id
```

AES-GCM provides confidentiality and tamper detection. If the ciphertext, nonce, or key ID is changed, decryption should fail and the app should ignore that fallback file.

### Plaintext Fallback Compatibility

Plaintext fallback reads are disabled by default. There is a development-only escape hatch:

```text
ALLOW_PLAINTEXT_SAVE_FALLBACKS=true
```

Only use that temporarily if you need to inspect or recover old local development saves. Do not use it as the normal setup.

## Direct Chat E2EE

Direct chat encryption happens in the browser, not on the Flask server.

The browser code in `static/js/chat.js` uses Web Crypto:

- ECDH P-256 for browser identity keys and shared-key derivation
- AES-GCM for message encryption
- SHA-256-derived key IDs for public-key identity checks

### Chat Key Setup

When a user opens a chat page:

1. The browser checks local storage for an existing chat key pair for that user.
2. If none exists, it generates a new ECDH P-256 key pair.
3. It stores the private key locally in the browser.
4. It sends only the public key to Flask through `/chat/keys/<friend_id>`.
5. Flask stores the public key and key ID on the `User` row.

The server never stores the browser private key.

### Sending A Message

When the user sends a chat message:

1. The browser fetches the friend's public key.
2. The browser derives a shared AES-GCM key using:
   - the current user's private key
   - the friend's public key
3. The browser encrypts the plaintext message.
4. The browser sends an encrypted payload through Socket.IO or the form fallback.
5. Flask validates friendship and stores the encrypted fields on `Message`.
6. Flask broadcasts the encrypted payload to the chat room.

The payload contains data such as:

```text
ciphertext
nonce
sender_public_key
sender_key_id
recipient_public_key
recipient_key_id
encryption_version
```

It does not contain the plaintext message.

### Receiving A Message

When the browser receives a message:

1. It selects the peer public key from the message metadata.
2. It derives the same shared AES-GCM key.
3. It tries to decrypt the ciphertext.
4. If decryption works, it displays the message.
5. If decryption fails, it displays `Locked encrypted message`.

Locked messages are expected when a user opens chat in a new browser without their original local private key. That is part of true E2EE: the server cannot decrypt and recover messages for the user.

## Database Schema Changes

The `User` model stores public chat key data:

```text
chat_public_key
chat_key_id
chat_key_created_at
```

The `Message` model keeps the old `message` column nullable for compatibility, but encrypted chat uses these fields:

```text
ciphertext
nonce
sender_key_id
sender_public_key
recipient_key_id
recipient_public_key
encryption_version
```

New direct-chat messages should use the encrypted fields. The server-side serializer returns encrypted metadata for browser decryption.

## Known Limitations

This implementation is a strong project-level E2EE upgrade, but it is intentionally simple.

- Browser private keys are stored in `localStorage`, so clearing browser data removes the ability to decrypt old messages.
- There is no key export/import UI yet.
- There is no multi-device key sync yet.
- There is no user-facing key verification screen yet.
- If a user's browser is compromised, browser-side decrypted messages can still be read by that compromised environment.
- Existing plaintext SQLite databases are not migrated automatically.

These tradeoffs keep the implementation understandable while still ensuring the server does not store plaintext chat content.

## Verification Checklist

Use this checklist after setup.

### Database At Rest

Create a fresh DB by running:

```bash
python app.py
```

Then confirm the raw DB file does not have the normal SQLite header:

```bash
python -c "from pathlib import Path; data=Path('project.db').read_bytes(); print(b'SQLite format 3' in data)"
```

Expected output:

```text
False
```

A normal SQLite client should fail without the SQLCipher key:

```bash
python -c "import sqlite3; sqlite3.connect('project.db').execute('select count(*) from sqlite_master').fetchone()"
```

Expected result:

```text
sqlite3.DatabaseError: file is not a database
```

### Fallback Saves

Save a game, then inspect fallback saves:

```bash
ls instance/save_fallbacks
cat instance/save_fallbacks/*.json
```

You should see envelope JSON with `encrypted`, `key_id`, `nonce`, and `ciphertext`. You should not see raw game fields like `run_state`, `health`, or `difficulty`.

### Direct Chats

Send a direct chat message with a unique phrase, then inspect the DB bytes:

```bash
python -c "from pathlib import Path; data=Path('project.db').read_bytes(); print(b'your unique phrase' in data)"
```

Expected output:

```text
False
```

Open the same chat from a fresh browser profile. Messages encrypted for the old browser key should display as locked instead of plaintext.

## Common Errors

### `SQLCIPHER_DATABASE_KEY is missing`

Add `SQLCIPHER_DATABASE_KEY=...` to `.env`, then restart the server.

### `SAVE_PAYLOAD_KEYS is missing`

Add a key-ring value like:

```text
SAVE_PAYLOAD_KEYS=v1:generated_32_byte_base64url_key
```

### `file is not a database`

This usually means one of two things:

- A normal SQLite tool is trying to open the encrypted SQLCipher DB. That failure is expected.
- The app is trying to open an old plaintext DB as SQLCipher. Rename the old DB and let the app create a fresh encrypted one.

### Old Chat Messages Show As Locked

This means the current browser does not have the private key that can decrypt those messages. Use the original browser profile, or start a new conversation from the new browser key.
