# Hybrid Security Upgrade

This project now uses a hybrid security model for stored data and direct chats:

- SQLCipher encrypts the SQLite database at rest.
- AES-GCM encrypts fallback save files before they are written to disk.
- Browser-side Web Crypto encrypts direct chat messages before the Flask server receives them.

The goal is to stop raw database files, JSON fallback files, and stored chat rows from exposing readable game saves or private messages.

## Key Separation

The app uses three separate secrets:

```text
SECRET_KEY=used only for Flask sessions
SQLCIPHER_DATABASE_KEY=used only to unlock the SQLite database
SAVE_PAYLOAD_KEYS=used only for encrypted fallback save files
```

`SECRET_KEY` should never be reused for database encryption or save payload encryption. If one secret needs to rotate later, the other systems should not have to change.

`SAVE_PAYLOAD_KEYS` is a small key ring:

```text
SAVE_PAYLOAD_KEYS=v1:base64url_encoded_32_byte_key
```

The first key in the list is used for new fallback saves. Older key IDs can stay in the list so older encrypted fallback files can still be read.

## Encrypted SQLite Database

SQLite is opened through SQLCipher using the configured `SQLCIPHER_DATABASE_KEY`.

At startup, the app:

1. Requires `SQLCIPHER_DATABASE_KEY`.
2. Converts `sqlite:///...` URLs into the SQLCipher SQLAlchemy URL.
3. Runs a SQLCipher check with `PRAGMA cipher_version`.
4. Creates or updates tables only after the encrypted database connection works.

This branch assumes fresh encrypted databases. Existing plaintext SQLite files are not migrated automatically. A plaintext SQLite client should fail to open the encrypted DB with `file is not a database`.

## Encrypted Save Fallbacks

Fallback save files still live in:

```text
instance/save_fallbacks/
```

They are no longer written as plaintext game-state JSON. Before writing, Flask serializes the save payload and encrypts it with AES-GCM using the active `SAVE_PAYLOAD_KEYS` entry.

Fallback files are stored as envelope JSON:

```json
{
  "encrypted": true,
  "version": 1,
  "key_id": "v1",
  "nonce": "...",
  "ciphertext": "..."
}
```

The raw file should not contain fields such as `run_state`, `difficulty`, `health`, or character names. Plaintext fallback reads are disabled by default and only allowed when `ALLOW_PLAINTEXT_SAVE_FALLBACKS=true` is explicitly set for development.

## Direct Chat E2EE

Direct chats are encrypted in the browser before messages are sent to Flask.

The browser:

1. Creates an ECDH P-256 chat identity key pair with Web Crypto.
2. Stores the private key locally in `localStorage`.
3. Publishes only the public key to Flask.
4. Derives a shared AES-GCM message key from the local private key and the friend public key.
5. Sends only ciphertext, nonce, public-key metadata, and version fields to the server.

The Flask server still checks login state, friendship, and Socket.IO room access, but it does not receive plaintext chat messages. Message rows store encrypted envelopes instead of readable chat text.

If a user opens chat in a new browser without their local private key, old messages show as locked encrypted messages. This is expected: true E2EE means the server cannot recover plaintext for the user.

## Validation Checklist

Use these checks when testing the branch:

- Create a fresh DB and confirm raw DB bytes do not contain the normal `SQLite format 3` header.
- Confirm plain `sqlite3` cannot open the SQLCipher DB without the key.
- Register, save a game, and confirm raw DB bytes do not contain usernames or save table names.
- Inspect `instance/save_fallbacks/*.json` and confirm save details are not plaintext.
- Send a direct chat message and confirm the raw DB does not contain the chat text.
- Open chat from a fresh browser profile and confirm old messages render as locked, not plaintext.
- Run `npm run sanity:js`.
- Run Playwright once Microsoft Edge is installed for the configured browser channel.
