# Realtime Chat Documentation

Updated: 8 May 2026

This document describes the current direct-chat implementation in Route Zero. The chat feature is now a Flask Blueprint route plus Socket.IO realtime layer, with browser-side end-to-end encryption for message content.

If this document and the code ever disagree, the code is the source of truth.

## Current Behavior

Direct chat is available only to registered users who are accepted friends.

The current flow is:

1. A logged-in user opens `/chat/<friend_id>`.
2. Flask confirms the target user is an accepted friend.
3. The server renders the chat page with existing encrypted message metadata.
4. `app/static/js/chat.js` loads or creates the browser's chat key pair.
5. The browser registers its public key with Flask and fetches the friend's public key.
6. The browser opens a Socket.IO connection and joins the private conversation room.
7. New outgoing messages are encrypted in the browser before they are sent.
8. Flask validates and stores the encrypted payload, then broadcasts it to the room.
9. Each browser decrypts the message locally and renders the plaintext with `textContent`.

The server stores ciphertext, nonces, public key metadata, timestamps, sender IDs, and receiver IDs. New direct-chat messages do not store plaintext message bodies.

## Main Files

### Backend

- `app/__init__.py`: creates the Flask app, configures SQLCipher, CSRF, Flask-Login, Flask-SocketIO, and registers the `main` Blueprint.
- `app/routes.py`: defines the `main` Blueprint routes for chat pages, chat-key exchange, and Socket.IO chat events.
- `app/models.py`: defines `User` chat key metadata and encrypted `Message` fields.
- `requirements.txt`: includes Flask-SocketIO and the Python runtime dependencies.

### Frontend

- `app/templates/chat.html`: renders the direct-chat page, initial encrypted message data, CSRF token, Socket.IO client script, and fallback form fields.
- `app/static/js/chat.js`: handles browser key storage, message encryption/decryption, Socket.IO room joining, realtime sends, and fallback form submission.
- `app/static/css/global.css`: styles the chat page and message states.

### Tests

- `tests/unit/test_helpers.py`: covers chat message validation, room-key building, friend ID parsing, and encrypted payload validation.
- `tests/selenium/test_browser_flows.py`: covers the browser-visible login, friend, profile, and navigation flows around the social/chat area.

## Realtime Room Model

Each one-to-one conversation uses a deterministic room key:

```text
chat:<smaller_user_id>:<larger_user_id>
```

For users `4` and `9`, both directions join:

```text
chat:4:9
```

This keeps both users in the same Socket.IO room no matter who opened the chat page first.

## Socket.IO Events

The direct-chat implementation uses these events:

| Event | Direction | Purpose |
| --- | --- | --- |
| `connect` | browser to server | Rejects logged-out users and guests before chat begins. |
| `chat:join` | browser to server | Validates the friend ID and accepted friendship, then joins the private room. |
| `chat:leave` | browser to server | Leaves the private room when the page unloads. |
| `chat:send` | browser to server | Sends an encrypted message envelope to Flask for validation, storage, and broadcast. |
| `chat:new` | server to room | Broadcasts the saved encrypted message metadata to both chat participants. |
| `chat:error` | server to browser | Reports login, friendship, validation, or encryption-envelope errors. |

## Encryption Layer

Realtime delivery and end-to-end encryption are separate concerns:

- Socket.IO provides live delivery.
- Web Crypto in `app/static/js/chat.js` encrypts and decrypts message content in the browser.
- Flask stores and forwards encrypted payloads without decrypting the message body.

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

The `Message.message` column remains nullable for compatibility with older rows, but current encrypted direct-chat sends store `message=None` and use the encrypted fields.

For the detailed cryptography notes, see `END_TO_END_ENCRYPTED_CHAT.md`.

## HTTP Fallback

The chat form still has a non-realtime fallback. If the Socket.IO connection is not available, the browser copies the encrypted payload into hidden form fields and submits:

```text
POST /chat/<friend_id>
```

The fallback route applies the same login, guest, friendship, and encrypted-payload validation before storing the message. This means the fallback keeps the same end-to-end encryption property as the realtime path.

## Validation And Access Control

The same access rules are repeated across the page route, key route, fallback form route, and Socket.IO events:

- logged-out users cannot use direct chat
- guests cannot use direct chat
- users can only chat with accepted friends
- users can only fetch chat keys for accepted friends
- users can only join rooms for accepted friends
- encrypted payloads must include valid key IDs matching their public keys
- friends can disable incoming direct messages with their profile setting

Encryption does not replace authorization. Flask still controls who can access the chat page, exchange public keys, join rooms, and create message rows.

## Server Startup

Run the app with:

```bash
python app.py
```

or, on this Mac if plain `python` is unavailable:

```bash
.venv/bin/python app.py
```

The app starts through:

```python
socketio.run(app, debug=True)
```

This is already configured in `app/__init__.py`.

## Testing

The required marking-focused suite is pytest unit tests plus Selenium browser tests:

```bash
.venv/bin/python -m pytest
```

Useful targeted commands:

```bash
.venv/bin/python -m pytest tests/unit -q
.venv/bin/python -m pytest tests/selenium -q
```

The JavaScript sanity check is optional developer tooling, not the teacher-required evidence:

```bash
npm run sanity:js
```

## Current Limitations

- Browser private chat keys are stored in `localStorage`.
- Clearing browser data removes the ability to decrypt old messages for that browser.
- There is no chat key export/import UI.
- There is no multi-device chat key sync.
- There is no user-facing public-key verification screen.
- Flask still sees metadata such as sender, receiver, timestamp, public keys, and ciphertext.

These limitations are acceptable for the current project scope and are documented so future work can improve them deliberately.
