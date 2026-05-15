# Validation Rules

Updated: 8 May 2026

This document summarises the current input validation rules used by the Route Zero Flask app. The source of truth is the code in `app/routes.py`, the focused `*_helpers.py` modules, and the related `app/templates/` and JavaScript files.

## Authentication

### Username

Usernames are normalized by trimming whitespace and lowercasing before validation.

Rules:

- required
- 3 to 80 characters
- lowercase letters, numbers, and underscores only
- duplicate registered usernames are rejected

The same username format is reused for friend search.

### Password

Rules:

- required
- minimum 6 characters
- maximum 255 characters
- registration requires a confirmation password
- registration confirmation must match

There is no uppercase, symbol, or number complexity rule in the current app. Passwords are still stored safely with Werkzeug password hashes.

### Login

Login validates:

- username format
- password is present
- wrong username/password returns an invalid-credentials error

Both browser-side form constraints and server-side checks exist, but the server-side checks are the important enforcement.

## Profile

Profile update rules:

- display name is optional and must be 80 characters or fewer
- bio is optional and must be 500 characters or fewer
- favorite character must be one of the configured options
- profile background must be one of the configured options
- profile-image selection must be a built-in image or an uploaded image owned by the user
- custom uploads must be JPEG files (`.jpg` or `.jpeg`)
- custom uploads must be 5 MB or smaller
- uploaded image bytes must look like a JPEG
- password changes require current password, new password, and confirmation
- password changes require the current password to be correct
- new password and confirmation must match

Profile privacy settings are boolean form controls:

- show stats to friends
- allow friend messages
- hide from leaderboard

## Friends

Add-friend validation:

- friend username is required
- friend username uses the normal username rules
- users cannot add themselves
- missing or unknown users return visible feedback
- duplicate pending/accepted relationships are blocked by helper logic

Friend-request mutations are POST-only:

- `POST /add_friend/<user_id>`
- `POST /accept_friend/<request_id>`
- `POST /reject_friend/<request_id>`
- `POST /unfriend/<friend_id>`

## Direct Chat

Direct chat is restricted to logged-in registered users who are accepted friends.

Message content is encrypted in the browser before Flask receives it. The server validates the encrypted envelope, not the plaintext message.

Encrypted payload rules:

- payload must be a dictionary/object
- `ciphertext` is required
- `nonce` is required
- `sender_public_key` is required
- `sender_key_id` is required
- `sender_key_id` must match the SHA-256-derived ID for `sender_public_key`
- `recipient_key_id` must match `recipient_public_key` when a recipient public key is included
- `encryption_version` is converted to an integer and defaults to `1`

The same access rules are checked in:

- `GET /chat/<friend_id>`
- `POST /chat/<friend_id>`
- `GET/POST /chat/keys/<friend_id>`
- Socket.IO `chat:join`
- Socket.IO `chat:send`

## World Chat

World chat uses normal text validation because it is a public lobby-style feed, not end-to-end encrypted direct chat.

Rules:

- user must be logged in
- guests cannot post
- message is trimmed
- empty messages are rejected
- messages over 1000 characters are rejected

## Profile Comments And Reactions

Profile comments:

- comment is trimmed
- empty comments are rejected
- comments must be 240 characters or fewer

Profile reactions:

- reaction type must be one of the configured profile reaction values
- one reaction row is kept per reactor/profile pair
- changing a reaction updates the existing row

## Save Data

Save-game requests require a logged-in registered user.

Rules:

- empty or invalid save payloads are rejected
- `run_state`, when present, must be an object
- numeric values are coerced to integers and clamped to allowed ranges
- invalid difficulty defaults to `EASY`
- token-like values such as character ID and current level are normalized
- booleans are coerced through the shared helper

This reduces simple inspect/devtools abuse. It does not fully stop cheating within allowed ranges, which is acceptable for this project scope.

## Tests

Current automated validation coverage is in:

```text
tests/unit/test_helpers.py
tests/unit/test_world_chat_routes.py
tests/selenium/test_browser_flows.py
```

Run the required suite with:

```bash
.venv/bin/python -m pytest
```

The unit tests cover helper validation, save payload handling, encrypted direct-chat payload validation, achievement helper behavior, and world-chat route validation. The Selenium tests cover the important browser-visible flows such as login, register, guest mode, achievements, friends, settings, and profile saving.
