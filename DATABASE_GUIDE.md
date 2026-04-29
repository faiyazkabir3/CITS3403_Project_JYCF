# Database Guide

## Database files are local only

The database file is now ignored by Git. Developers should **not commit `project.db`**, even though the current database is encrypted with SQLCipher.

The ignored database paths/patterns are:

```text
instance/
project.db
*.db
*.sqlite
*.sqlite3
```

This means each developer creates their own local encrypted database after pulling the project. The repo should contain the application code, models, documentation, and migrations, not a live database file.

Why we do not commit the DB:

- an encrypted DB is useless to teammates without the matching `SQLCIPHER_DATABASE_KEY`
- sharing the key would defeat the point of encryption
- DB files may contain users, password hashes, saves, friend data, and encrypted chat rows
- binary database files change often and create noisy Git conflicts
- course/security best practice is to commit schema and setup steps, not live data

If `project.db` was already tracked by Git before it was added to `.gitignore`, `.gitignore` alone is not enough. Untrack it while keeping your local copy:

```bash
git rm --cached project.db
```

Do not run `rm project.db` unless you intentionally want to delete your own local database.

---

## Fresh pull setup

Use this flow after cloning or pulling the project on a new machine.

1. Pull the latest code:

```bash
git pull
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Generate local secret values:

```bash
python -c "import base64, secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32)); print('SQLCIPHER_DATABASE_KEY=' + secrets.token_urlsafe(32)); print('SAVE_PAYLOAD_KEYS=v1:' + base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))"
```

5. Create a `.env` file in the project root:

```text
SECRET_KEY=generated_flask_session_key
SQLCIPHER_DATABASE_KEY=generated_sqlcipher_database_key
SAVE_PAYLOAD_KEYS=v1:generated_save_payload_key
DATABASE_URL=sqlite:///project.db
```

Use the values generated in step 4. Do not commit `.env`.

`SECRET_KEY` signs Flask sessions and CSRF tokens. `SQLCIPHER_DATABASE_KEY` opens your local encrypted database. `SAVE_PAYLOAD_KEYS` encrypts fallback save files. These should be separate values.

---

## Run the app and create the DB

After `.env` is ready, start the app:

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

For local development, the app creates the encrypted database when it starts and the schema is initialized. The default DB path is:

```text
project.db
```

That file is local to your machine and ignored by Git.

If you already have an old plaintext `project.db`, SQLCipher may fail to open it. Rename the old file and let the app create a fresh encrypted one:

```bash
mv project.db project.plaintext.backup.db
python app.py
```

If your DB is inside `instance/`, use that path instead.

Important: if you lose or change `SQLCIPHER_DATABASE_KEY`, your old encrypted local DB cannot be opened. Use a new DB or restore the original key.

---

## Migration setup

This project uses Flask-Migrate/Alembic for schema migrations.

Set the Flask app target first:

```bash
export FLASK_APP=app.py
```

On Windows PowerShell:

```powershell
$env:FLASK_APP = "app.py"
```

If the repo does **not** have a `migrations/` folder yet, initialize migrations once:

```bash
flask db init
flask db migrate -m "initial migration"
flask db upgrade
```

If the repo already has a `migrations/` folder, do not run `flask db init` again. Just apply existing migrations to your local encrypted DB:

```bash
flask db upgrade
```

Rules for migrations:

- run commands from the project root
- make sure `.env` exists before running `flask db ...`
- review generated migration files before committing
- do not blindly apply an initial table-creating migration to an existing populated database
- for existing populated DBs, use a careful baseline/stamp workflow instead

---

## What this database is for

Our database supports the backend side of the zombie game.

It mainly does three jobs:

1. stores registered users
2. stores each user's current saved game
3. stores simple social features between users, like friends, friend requests, and messages

So if someone asks, “what is the database doing in this project?”, the short answer is:

**it remembers who the users are, what progress they have made, and how they interact with each other.**

---

## Tech stack used

The database side of the project uses:

- **SQLite** as the actual database
- **SQLCipher** to encrypt the SQLite database file at rest
- **Flask-SQLAlchemy** to define and access the tables
- **Flask-Migrate/Alembic** to manage schema migrations
- **Flask** as the backend web framework

For local development, the app uses an encrypted SQLite database file.

By default, `.env` points the app to:

```text
DATABASE_URL=sqlite:///project.db
```

At startup, `app.py` converts that SQLite URL into a SQLCipher-backed SQLAlchemy URL using `SQLCIPHER_DATABASE_KEY` from `.env`.

This keeps the app code using SQLAlchemy normally while the database file is encrypted at rest. Do not open, migrate, or copy the database without understanding that it depends on the local SQLCipher key.

Some development setups may use `instance/project.db`, but this project currently documents `DATABASE_URL=sqlite:///project.db` as the simple local default.

If `SQLCIPHER_DATABASE_KEY` is lost or changed, the old encrypted database cannot be opened.

---

## Big picture structure

The current database has **5 main tables**:

1. `user`
2. `save_data`
3. `friend`
4. `friend_request`
5. `message`

A simple way to understand the structure is:

```text
User
 ├── has one SaveData
 ├── can send many FriendRequests
 ├── can receive many FriendRequests
 ├── can have many Friends
 ├── can send many Messages
 └── can receive many Messages
```

So the **user** table is the centre of the whole database.

---

## Table 1: `user`

### What it does

This table stores the registered accounts for the website.

Every real player who signs up gets one row in this table.

### Main columns

- `id` — primary key
- `username` — the login name, must be unique
- `password_hash` — the hashed password
- `chat_public_key` — public browser key for encrypted direct chat
- `chat_key_id` — short ID derived from the public chat key
- `chat_key_created_at` — when the public chat key was stored

### Key points

- `id` is the **primary key (PK)**, which means it uniquely identifies each user
- `username` is also unique, so two users cannot register the same username
- passwords are **not** stored as plain text
- `password_hash` stores the hashing method, random salt, and derived password hash together
- Werkzeug creates the salt automatically, so there is no separate `salt` column
- direct-chat private keys are **not** stored in the database; only public chat keys are stored

### Example

| id | username | password_hash | chat_key_id |
|---|---|---|---|
| 1 | leonplayer | pbkdf2:sha256:...$random_salt$... | 8f3a... |

### What this table is used for

- registration
- login
- session-based identity
- linking a user to saves and social features

---

## Table 2: `save_data`

### What it does

This table stores one user's current game progress.

This is the table that makes the game persistent between sessions.

### Main columns

- `id` — primary key
- `user_id` — foreign key to `user.id`
- `difficulty`
- `character_id`
- `health`
- `medkits`
- `grenades`
- `ammo_in_gun`
- `ammo_in_bag`
- `mag_capacity`
- `laser_upgrade`
- `shield_owned`
- `shield_on`
- `current_level_id`
- `enemies_remaining`
- `level_complete`
- `awaiting_choice`
- `game_won`
- `has_started_game`
- `run_state_json`
- `updated_at`

### Key points

- `id` is the **primary key**
- `user_id` is a **foreign key (FK)** pointing to `user.id`
- `user_id` is also **unique**, which means one user can only have **one save row**

So this is a:

**one user -> one save data row**

design.

That is an intentional MVP choice. It keeps the save system simple.

### Example

| id | user_id | difficulty | health | current_level_id | has_started_game |
|---|---|---|---|---|---|
| 1 | 1 | HARD | 72 | 2A | True |

### What this table is used for

- saving the player’s latest state
- loading the player’s latest state
- making sure progress is remembered after logout or closing the game

### Special note: `run_state_json`

Most save values are stored in normal columns.

But `run_state_json` stores more detailed game state as JSON text.

That gives the project a bit more flexibility without creating too many extra columns.

---

## Table 3: `friend`

### What it does

This table stores friendship links between users.

If two users are friends, that relationship is represented here.

### Main columns

- `id` — primary key
- `user_id` — foreign key to `user.id`
- `friend_id` — foreign key to `user.id`
- `status`

### Key points

- `id` is the **primary key**
- `user_id` and `friend_id` are both **foreign keys**
- both point back to the `user` table

This means the table is saying:

- “this user is connected to that user”

### Example

| id | user_id | friend_id | status |
|---|---|---|---|
| 1 | 1 | 2 | accepted |
| 2 | 2 | 1 | accepted |

This example means:
- user 1 is friends with user 2
- user 2 is friends with user 1

### What this table is used for

- listing friends
- checking who is connected to whom
- supporting social navigation and chat

---

## Table 4: `friend_request`

### What it does

This table stores pending friend requests before they become full friendships.

A request is not the same thing as a confirmed friendship, so it is kept in its own table.

### Main columns

- `id` — primary key
- `from_user_id` — foreign key to `user.id`
- `to_user_id` — foreign key to `user.id`
- `status`

### Key points

- `id` is the **primary key**
- `from_user_id` is the sender
- `to_user_id` is the receiver
- both are **foreign keys** to `user.id`

### Example

| id | from_user_id | to_user_id | status |
|---|---|---|---|
| 1 | 1 | 3 | pending |

This means:
- user 1 sent a request to user 3
- user 3 has not accepted or rejected it yet

### What this table is used for

- sending requests
- accepting requests
- rejecting requests

---

## Table 5: `message`

### What it does

This table stores direct messages between users.

Direct chat is now designed for end-to-end encrypted payloads. Flask stores and forwards encrypted message data, but the browser performs encryption and decryption.

### Main columns

- `id` — primary key
- `sender_id` — foreign key to `user.id`
- `receiver_id` — foreign key to `user.id`
- `message` — old/plaintext compatibility column, now nullable
- `ciphertext` — encrypted message body
- `nonce` — AES-GCM nonce used by the browser
- `sender_key_id` — sender public key ID
- `sender_public_key` — sender public key used for this message
- `recipient_key_id` — recipient public key ID
- `recipient_public_key` — recipient public key used for this message
- `encryption_version` — encrypted message format version
- `timestamp`

### Key points

- `id` is the **primary key**
- `sender_id` and `receiver_id` are **foreign keys**
- both point back to the `user` table
- new direct messages should store ciphertext and key metadata, not plaintext chat text
- if a browser does not have the matching private key, old encrypted messages may show as locked

### Example

| id | sender_id | receiver_id | ciphertext | nonce | encryption_version |
|---|---|---|---|---|---|
| 1 | 2 | 1 | encrypted_base64url_payload | random_nonce | 1 |

### What this table is used for

- storing encrypted direct-chat payloads
- loading encrypted message history for browser-side decryption

---

## How the tables connect together

Here is the most important part to understand.

### `user` and `save_data`
A user has one save row.

This is enforced by:
- `save_data.user_id` pointing to `user.id`
- `save_data.user_id` being unique

So one account has one current saved game.

### `user` and `friend_request`
A user can send many friend requests and receive many friend requests.

That is why the table has:
- `from_user_id`
- `to_user_id`

### `user` and `friend`
A user can have many friends.

The friend table links one user to another user.

### `user` and `message`
A user can send and receive many messages.

So overall, the `user` table is the central table that everything else connects back to.

---

## Example flow through the database

### 1. A player registers
A row is created in `user`.

### 2. The player starts a game
A row is created in `save_data` for that user.

### 3. The player saves progress
The same `save_data` row is updated with new values like health, ammo, and current level.

### 4. The player adds a friend
A row is first created in `friend_request`.

### 5. The other player accepts
Rows are created in `friend`.

### 6. They chat
Rows are created in `message`. New chat rows store encrypted payload fields instead of plaintext message text.

This is basically the life cycle of the current database.

---
