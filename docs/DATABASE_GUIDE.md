# Database Guide

Updated: 8 May 2026

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

## Create the DB and run the app

After `.env` is ready, apply the committed migrations:

```bash
export FLASK_APP=app:app
flask db upgrade
```

On Windows PowerShell:

```powershell
$env:FLASK_APP = "app:app"
flask db upgrade
```

Optional: create shared demo users and sample save rows:

```bash
flask seed-demo
```

The demo accounts are:

```text
leon_demo / RouteZero123!
quite_demo / RouteZero123!
```

Then start the app:

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

For local development, `flask db upgrade` creates or updates the encrypted database. The default DB path is:

```text
project.db
```

That file is local to your machine and ignored by Git.

If you already have an old plaintext `project.db`, SQLCipher may fail to open it. Rename the old file and let migrations create a fresh encrypted one:

```bash
mv project.db project.plaintext.backup.db
flask db upgrade
```

If your DB is inside `instance/`, use that path instead.

Important: if you lose or change `SQLCIPHER_DATABASE_KEY`, your old encrypted local DB cannot be opened. Use a new DB or restore the original key.

---

## Migration setup

This project uses Flask-Migrate/Alembic for schema migrations.

Set the Flask app target first:

```bash
export FLASK_APP=app:app
```

On Windows PowerShell:

```powershell
$env:FLASK_APP = "app:app"
```

This repo already has a committed `migrations/` folder. Do not run `flask db init` again during normal setup.

Apply existing migrations to your local encrypted DB:

```bash
flask db upgrade
```

After changing `app/models.py`, generate a new migration:

```bash
flask db migrate -m "describe schema change"
```

Rules for migrations:

- run commands from the project root
- make sure `.env` exists before running `flask db ...`
- review generated migration files before committing
- commit migration files, not live database files
- run `flask db upgrade` before starting the app

For an intentional fresh local wipe, delete only ignored DB/save state:

```bash
rm -f project.db instance/*.db instance/save_fallbacks/*.json
flask db upgrade
flask seed-demo
```

---

## What this database is for

Our database supports the backend side of the zombie game web app.

At the moment, it mainly supports these areas:

1. registered user accounts
2. saved game progress
3. profile information
4. social features such as friends and friend requests
5. direct messages between users
6. world chat messages
7. achievements, profile reactions, and profile comments

So in simple terms, the database remembers who the users are, what profile they use, what game progress they have made, and how they interact with other users.

---

## Tech stack used

The database side of the project uses:

- **SQLite** as the actual database
- **SQLCipher** to encrypt the SQLite database file at rest
- **Flask-SQLAlchemy** to define and access the tables
- **Flask-Migrate/Alembic** to manage schema migrations
- **Flask** as the backend web framework

This still matches the stack taught in the unit: Flask for the server logic, SQLite-style storage, and SQLAlchemy to map Python objects to database tables. The project adds SQLCipher so the SQLite database file is encrypted at rest.

For local development, the app uses an encrypted SQLite database file.

By default, `.env` points the app to:

```text
DATABASE_URL=sqlite:///project.db
```

At startup, `app/__init__.py` converts that SQLite URL into a SQLCipher-backed SQLAlchemy URL using `SQLCIPHER_DATABASE_KEY` from `.env`.

This keeps the app code using SQLAlchemy normally while the database file is encrypted at rest. Do not open, migrate, or copy the database without understanding that it depends on the local SQLCipher key.

Some development setups may use `instance/project.db`, but this project currently documents `DATABASE_URL=sqlite:///project.db` as the simple local default.

If `SQLCIPHER_DATABASE_KEY` is lost or changed, the old encrypted database cannot be opened.

---

## MVC view of this project

Based on the course structure, the database belongs to the **model** side of the app.

In this project:

- **model** = the SQLAlchemy models in `app/models.py`
- **view** = the HTML pages built from Jinja templates
- **controller** = the Flask request handlers in the `main` Blueprint in `app/routes.py` that read and update the models

This separation is useful because it keeps storage, page rendering, and request handling as different concerns.

---

## Current database tables

The current database has 9 app tables, plus Alembic's migration-version table:

1. `user`
2. `save_data`
3. `friend`
4. `friend_request`
5. `message`
6. `world_message`
7. `user_achievement`
8. `profile_reaction`
9. `profile_comment`

The `user` table is the central table because the other app tables all connect back to users in some way.

---

## Table 1: `user`

### What it stores

This table stores registered user accounts and their profile details.

### Columns

- `id` — primary key
- `username` — the login name, must be unique
- `display_name` — optional public-facing display name
- `profile_image` — selected or uploaded profile image path
- `bio` — optional profile biography
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
- profile-related information is stored directly on the user row
- direct-chat private keys are **not** stored in the database; only public chat keys are stored

### Example

| id | username | display_name | password_hash | chat_key_id |
|---|---|---|---|---|
| 1 | leonplayer | Leon | pbkdf2:sha256:...$random_salt$... | 8f3a... |

### What this table is used for

- registration
- login
- session identity
- profile page data
- public profile display
- linking users to saves, friends, and messages

---

## Table 2: `save_data`

### What it stores

This table stores saved gameplay state.

It includes both basic progression values and combat/stat tracking values.

### Columns

#### Identity and setup
- `id` — primary key
- `user_id` — foreign key to `user.id`
- `difficulty`
- `character_id`

#### Inventory and resources
- `health`
- `medkits`
- `grenades`
- `ammo_in_gun`
- `ammo_in_bag`
- `mag_capacity`

#### Combat/stat tracking
- `kills`
- `damage_dealt`
- `damage_taken`
- `pistol_shots`
- `grenades_used`
- `medkits_used`
- `reloads`
- `knife_uses`

#### Upgrades / equipment state
- `laser_upgrade`
- `shield_owned`
- `shield_on`

#### Progression state
- `current_level_id`
- `enemies_remaining`
- `level_complete`
- `awaiting_choice`
- `game_won`
- `has_started_game`

#### Flexible stored state
- `run_state_json`
- `updated_at`

### Key points

- `id` is the primary key
- `user_id` is a foreign key to `user.id`
- `user_id` is **not marked unique** in the current model
- this means the current schema allows more than one save row per user
- the save system also uses `character_id` and `updated_at` when selecting the most relevant save

So the current schema should **not** be described as a strict “one user -> one save row” design.

### What it is used for

- loading saved progress
- storing player state between sessions
- tracking player stats for achievements/leaderboards/stats pages
- storing extra run data in JSON form when needed

### Note on achievement tiers

The bronze/silver/gold achievement tiers are not stored as separate database rows.

The app derives tier progress from `save_data` counters and stores only the base unlock in `user_achievement`. For example, kill totals from `save_data.kills` can unlock and tier the First Blood and No Mercy badge families, while `save_data.medkits_used` drives the Medic badge family.

### Note on `run_state_json`

Most core values are stored in normal columns.

`run_state_json` is used for extra structured game state that does not fit neatly into a small fixed set of columns.

---

## Table 3: `friend`

### What it stores

This table stores user-to-user friendship links.

### Columns

- `id` — primary key
- `user_id` — foreign key to `user.id`
- `friend_id` — foreign key to `user.id`
- `status`

### Key points

- both `user_id` and `friend_id` point back to the `user` table
- this table represents direct user-to-user relationships
- accepted friendships are stored here

### What it is used for

- listing a user’s friends
- checking whether two users are connected
- controlling access to friend-based pages and chat

---

## Table 4: `friend_request`

### What it stores

This table stores friend requests before they become accepted friendships.

### Columns

- `id` — primary key
- `from_user_id` — foreign key to `user.id`
- `to_user_id` — foreign key to `user.id`
- `status`

### Key points

- `from_user_id` is the sender
- `to_user_id` is the receiver
- both columns link back to the `user` table
- this separates pending requests from accepted friendships

### What it is used for

- sending friend requests
- receiving friend requests
- accepting or rejecting friend requests

---

## Table 5: `message`

### What it stores

This table stores direct chat messages between users.

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
- each row is one message envelope
- timestamps allow message history to be shown in order
- new direct messages should store ciphertext and key metadata, not plaintext chat text
- if a browser does not have the matching private key, old encrypted messages may show as locked

### Example

| id | sender_id | receiver_id | ciphertext | nonce | encryption_version |
|---|---|---|---|---|---|
| 1 | 2 | 1 | encrypted_base64url_payload | random_nonce | 1 |

### What this table is used for

- storing encrypted direct-chat payloads
- loading encrypted message history for browser-side decryption
- socket/chat page persistence

---

## Table 6: `world_message`

### What it stores

This table stores global world-chat messages shown on the main-menu world chat panel.

World chat is different from direct chat:

- world chat is a shared public feed for logged-in registered users
- world chat stores the message text so it can be displayed to everyone
- direct chat uses the `message` table and stores encrypted payloads instead of plaintext

### Columns

- `id` - primary key
- `user_id` - foreign key to `user.id`
- `message` - validated world-chat text
- `created_at` - when the message was posted

### Key points

- anonymous users and guests cannot post world-chat messages
- empty and overlong messages are rejected
- message output is serialized by the Flask route before being returned to the browser
- the unit tests cover listing history, rejecting invalid users/messages, and saving a valid post

### What it is used for

- loading recent world-chat history
- saving registered-user world-chat posts
- showing public lobby-style messages on the main menu

---

## Table 7: `user_achievement`

### What it stores

This table stores which base achievements a registered user has unlocked.

### Columns

- `id` - primary key
- `user_id` - foreign key to `user.id`
- `achievement_id` - stable achievement identifier such as `first_blood` or `medic`
- `unlocked_at` - when the achievement was first unlocked

### Key points

- the unique constraint on `user_id` and `achievement_id` prevents duplicate unlock rows
- tier names are not stored here
- bronze/silver/gold tiers are recalculated from gameplay stats when achievements are displayed

### What it is used for

- showing persistent achievement unlock state
- recording unlock dates
- feeding achievement badges on the achievements page, public profile, and main-menu clipboard

---

## Table 8: `profile_reaction`

### What it stores

This table stores one reaction from one user to another user's public profile.

### Columns

- `id` - primary key
- `profile_user_id` - profile receiving the reaction
- `reactor_user_id` - user who reacted
- `reaction_type`
- `created_at`
- `updated_at`

### Key points

- one user can have only one active reaction per target profile
- changing the reaction updates the existing row instead of creating duplicates

---

## Table 9: `profile_comment`

### What it stores

This table stores public comments left on user profiles.

### Columns

- `id` - primary key
- `profile_user_id` - profile receiving the comment
- `author_user_id` - user who wrote the comment
- `comment`
- `created_at`

### What it is used for

- rendering the public profile comment list
- linking each comment back to the author account

---

## How the tables connect

### `user` -> `save_data`
A user can have one or more save rows in the current schema.

This is because:
- `save_data.user_id` is a foreign key to `user.id`
- but it is not unique in the model

### `user` -> `friend_request`
A user can send many friend requests and receive many friend requests.

### `user` -> `friend`
A user can be connected to many other users through friendship rows.

### `user` -> `message`
A user can send many messages and receive many messages.

### `user` -> `world_message`
A user can post many world-chat messages.

### `user` -> `user_achievement`
A user can unlock many base achievements. Each base achievement can appear once per user.

So overall, `user` is the central table and the other tables describe progress and interaction around that user.

---

## Persistence outside the database

The project also has a fallback save mechanism outside the SQLite tables.

If database save/load fails, the app can also use JSON fallback save files.

This is part of the project’s persistence design, but it is **not** a database table and therefore sits outside the relational schema described above.

---

## Example flow through the data layer

### 1. A player registers
A row is created in `user`.

### 2. The player updates their profile
Their `display_name`, `bio`, or `profile_image` fields in `user` are updated.

### 3. The player starts and saves a run
A row is created or updated in `save_data`.

### 4. The player sends a friend request
A row is created in `friend_request`.

### 5. The request is accepted
Friendship rows are created in `friend`.

### 6. They chat
Rows are created in `message`. New chat rows store encrypted payload fields instead of plaintext message text.

### 7. They post in world chat
Rows are created in `world_message`. These are public lobby messages, not encrypted one-to-one messages.

This shows how the current schema supports both the game side and the social side of the web app.

---

## Summary

The current database is a small relational schema built around the `user` table.

Its job is to support:

- account identity
- profile information
- saved progress
- friend relationships
- direct messages
- world chat messages

The design follows the course stack of Flask + SQLite + SQLAlchemy, with the models acting as the database-backed model layer of the application.
