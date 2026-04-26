# Database Guide

## What this database is for

Our database supports the backend side of the zombie game web app.

At the moment, it mainly supports five areas:

1. registered user accounts
2. saved game progress
3. profile information
4. social features such as friends and friend requests
5. direct messages between users

So in simple terms, the database remembers who the users are, what profile they use, what game progress they have made, and how they interact with other users.

---

## Tech stack used

The database side of the project uses:

- SQLite as the database management system
- Flask-SQLAlchemy as the ORM layer
- Flask as the backend web framework

This matches the stack taught in the unit: Flask for the server logic, SQLite for storage, and SQLAlchemy to map Python objects to database tables.

For local development, the app uses a SQLite database file.

---

## MVC view of this project

Based on the course structure, the database belongs to the **model** side of the app.

In this project:

- **model** = the SQLAlchemy models in `models.py`
- **view** = the HTML pages built from Jinja templates
- **controller** = the Flask request handlers that read and update the models

This separation is useful because it keeps storage, page rendering, and request handling as different concerns.

---

## Current database tables

The current database has 5 main tables:

1. `user`
2. `save_data`
3. `friend`
4. `friend_request`
5. `message`

The `user` table is the central table because the other four all connect back to users in some way.

---

## Table 1: `user`

### What it stores

This table stores registered user accounts and their profile details.

### Columns

- `id` — primary key
- `username` — unique username used for login
- `display_name` — optional public-facing display name
- `profile_image` — selected or uploaded profile image path
- `bio` — optional profile biography
- `password_hash` — hashed password

### Key points

- `id` is the primary key
- `username` is unique, so no two users can register the same username
- passwords are stored as hashes, not plain text
- profile-related information is stored directly on the user row

### What it is used for

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

### Columns

- `id` — primary key
- `sender_id` — foreign key to `user.id`
- `receiver_id` — foreign key to `user.id`
- `message`
- `timestamp`

### Key points

- both sender and receiver link back to `user`
- each row is one message
- timestamps allow message history to be shown in order

### What it is used for

- direct user chat
- chat history
- socket/chat page persistence

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

### 6. The two users chat
Rows are created in `message`.

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

The design follows the course stack of Flask + SQLite + SQLAlchemy, with the models acting as the database-backed model layer of the application.
