# Database Guide

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
- **Flask** as the backend web framework

For local development, the app uses an encrypted SQLite database file.

By default, the app points to:

`sqlite:///project.db`

At startup, `app.py` converts that SQLite URL into a SQLCipher-backed SQLAlchemy URL using `SQLCIPHER_DATABASE_KEY` from `.env`. Do not open or migrate the database without the SQLCipher key.

In practice, the project also has an `instance/project.db` file during development.

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

### Key points

- `id` is the **primary key (PK)**, which means it uniquely identifies each user
- `username` is also unique, so two users cannot register the same username
- passwords are **not** stored as plain text
- `password_hash` stores the hashing method, random salt, and derived password hash together
- Werkzeug creates the salt automatically, so there is no separate `salt` column

### Example

| id | username | password_hash |
|---|---|---|
| 1 | leonplayer | pbkdf2:sha256:...$random_salt$... |

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

### Main columns

- `id` — primary key
- `sender_id` — foreign key to `user.id`
- `receiver_id` — foreign key to `user.id`
- `message`
- `timestamp`

### Key points

- `id` is the **primary key**
- `sender_id` and `receiver_id` are **foreign keys**
- both point back to the `user` table

### Example

| id | sender_id | receiver_id | message | timestamp |
|---|---|---|---|---|
| 1 | 2 | 1 | Ready for level 3? | 2026-04-17 13:20:45 |

### What this table is used for

- simple chat between users
- showing message history

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
Rows are created in `message`.

This is basically the life cycle of the current database.

---
