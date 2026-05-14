# Helper Functions Guide

This guide explains the helper modules created during the `app.py` refactor. The goal of the split is to make the backend easier to read:

- `app.py` starts and configures Flask.
- `models.py` defines database tables.
- `routes.py` owns page/API endpoints.
- `*_helpers.py` modules hold reusable logic for saves, profiles, friends, chat, achievements, leaderboards, and startup checks.

## Module Overview

| File | Responsibility |
| --- | --- |
| `app_constants.py` | Shared constants and option lists used by routes/templates/helpers. |
| `domain_types.py` | Small dataclasses used to structure helper return values. |
| `db_helpers.py` | Secret validation, SQLCipher setup, migration/startup checks, and database rollback handling. |
| `save_helpers.py` | Save payload normalization, encrypted fallback saves, DB save updates, and player stats. |
| `achievement_helpers.py` | Achievement definitions, progress calculation, badge image lookup, and unlock logic. |
| `profile_helpers.py` | Profile display data, profile images, dossier data, reactions, comments, and profile badges. |
| `friend_helpers.py` | Friend lookup, requests, presence, recent conversations, and privacy checks. |
| `chat_helpers.py` | Direct chat room IDs, public key IDs, encrypted message validation, and serialization. |
| `leaderboard_helpers.py` | Score calculation and global/friend leaderboard ranking. |
| `commands.py` | CLI command registration, currently `flask seed-demo`. |
| `extensions.py` | Shared extension instances, currently `socketio`, to avoid circular imports. |

## Shared Constants

`app_constants.py` keeps shared values in one place so they are not repeated across routes and helpers.

| Constant group | How it helps |
| --- | --- |
| Profile limits, defaults, and upload settings | Keeps profile validation consistent across upload, display, and form rendering code. |
| Profile image/background/favourite character options | Gives routes/templates one shared source of truth for profile customisation choices. |
| Profile reaction options | Keeps reaction validation and display counts aligned. |
| Presence timing constants | Controls when users count as online and how often presence refreshes. |
| Achievement tier labels/ranks | Keeps achievement badge display consistent. |
| Agent dossier constants | Keeps generated profile dossier values consistent. |

## Shared Data Types

`domain_types.py` contains dataclasses that make helper return values easier to understand.

| Type | How it helps |
| --- | --- |
| `ChatMessagePayload` | Documents the shape of a chat message payload. |
| `PlayerStats` | Stores aggregated player stats with safe default values. |
| `LeaderboardStats` | Stores the stat fields used to calculate leaderboard scores. |
| `LeaderboardEntry` | Stores ranked leaderboard row data before converting to dictionaries. |
| `FriendAction` | Structures profile friend button state, label, disabled state, and action. |
| `AchievementDefinition` | Defines achievement metadata, thresholds, badge family, and optional custom badge image. |

## Database And Startup Helpers

`db_helpers.py` keeps startup and database safety logic out of `app.py`.

| Function | How it helps |
| --- | --- |
| `load_required_secret_key()` | Ensures `SECRET_KEY` exists, is not a placeholder, and is long enough. |
| `load_required_env_secret(name, minimum_length=32)` | Reuses strict validation for required secret environment variables. |
| `allow_plaintext_test_database(database_url)` | Allows plaintext SQLite only for approved pytest/Selenium test databases. |
| `configure_sqlcipher_database_uri(database_url, sqlcipher_key)` | Converts normal SQLite URLs into SQLCipher URLs for encrypted local storage. |
| `rollback_database_session(context)` | Safely rolls back failed DB work and logs failures with context. |
| `verify_sqlcipher_database(database_uri)` | Confirms SQLCipher is active before the app starts. |
| `ensure_user_schema()` | Legacy helper for adding missing user columns to older local databases. |
| `ensure_save_data_schema()` | Legacy helper for adding missing save columns to older local databases. |
| `ensure_message_schema()` | Legacy helper for adding missing encrypted chat columns to older local databases. |
| `get_database_table_names()` | Reads current SQLite table names for startup validation. |
| `require_migrated_database(app)` | Blocks app startup if required migration tables are missing. |

## Save Helpers

`save_helpers.py` owns all save/load persistence logic outside the route handlers.

| Function | How it helps |
| --- | --- |
| `parse_save_payload_key_ring(raw_key_ring)` | Parses and validates encryption keys for fallback save files. |
| `get_user_stats(user_id)` | Aggregates all saved runs into player stat totals. |
| `get_empty_stats()` | Returns zeroed stats for guests/private views. |
| `parse_level_number(value)` | Extracts numeric level progress from level IDs like `level-3`. |
| `get_latest_save_payload(user_id)` | Chooses the newest save across DB and fallback files. |
| `get_latest_run_summary(user_id)` | Produces a compact latest-run summary for profile pages. |
| `get_user_save(character_id=None, create=False)` | Finds or creates the current user's save row for a character. |
| `coerce_int(value, default=0)` | Safely converts request/save values to integers. |
| `coerce_bool(value, default=False)` | Safely converts request/save values to booleans. |
| `build_save_payload_from_request(data, updated_at=None)` | Converts sanitized request data into the save payload shape. |
| `get_fallback_save_path(user_id, character_id)` | Builds a safe encrypted fallback save path. |
| `encrypt_save_payload(payload)` | Encrypts fallback save JSON with AES-GCM. |
| `decode_envelope_value(value)` | Decodes base64 fields from encrypted fallback envelopes. |
| `decrypt_save_payload(envelope)` | Decrypts encrypted fallback save data and rejects invalid envelopes. |
| `write_fallback_save(user_id, character_id, payload)` | Writes an encrypted backup save to disk. |
| `read_fallback_save(user_id, character_id)` | Reads and normalizes one fallback save. |
| `list_fallback_save_payloads(user_id)` | Reads all fallback saves for a user. |
| `parse_updated_at(value)` | Converts save timestamps for latest-save comparison. |
| `normalize_save_payload(payload)` | Normalizes legacy flat saves and newer `run_state` saves into one shape. |
| `list_db_save_payloads(user_id, character_id=None)` | Reads started game saves from the database. |
| `choose_latest_save_payload(*payloads)` | Picks the newest valid payload from DB/fallback candidates. |
| `update_save_data(save_data, data)` | Applies sanitized save data onto a `SaveData` model row. |
| `build_save_payload(save_data)` | Converts a `SaveData` model row back into JSON-ready data. |

## Achievement Helpers

`achievement_helpers.py` keeps achievement rules separate from routes.

| Function | How it helps |
| --- | --- |
| `get_achievement_definitions()` | Central source of achievement names, descriptions, metrics, tiers, and badges. |
| `get_achievement_progress(user_id, stats=None)` | Builds the metric values used to evaluate achievements. |
| `count_untouchable_runs(user_id)` | Counts valid no-damage started runs across DB/fallback saves. |
| `achievement_is_unlocked(definition, progress)` | Applies unlock rules, including the special sharpshooter rule. |
| `get_achievement_current_value(definition, progress)` | Chooses the value to display for each achievement. |
| `get_achievement_tier(definition, current, unlocked)` | Calculates the earned bronze/silver/gold tier. |
| `get_next_achievement_tier(definition, current)` | Finds the next target tier for progress display. |
| `get_achievement_badge_image(definition, tier_name=None)` | Resolves tiered badge images or custom badge images. |
| `get_user_achievements(user_id)` | Builds the full achievement list shown on profile/achievement pages. |
| `get_agent_showcase_badges(achievements=None)` | Chooses the top earned badges for the main menu profile panel. |
| `unlock_achievements_for_user(user_id)` | Creates newly unlocked achievement rows after saving a run. |

## Profile Helpers

`profile_helpers.py` owns reusable profile presentation and profile customisation logic.

| Function | How it helps |
| --- | --- |
| `get_display_name(user)` | Uses display name when available, otherwise falls back to username. |
| `format_agent_id(user)` | Formats stable profile agent IDs like `#00012`. |
| `get_agent_dossier_rng(user=None, field="profile")` | Creates deterministic per-user random values for dossier fields. |
| `get_agent_dossier_age(rng)` | Generates profile dossier age. |
| `format_agent_height(total_inches)` | Formats inches into feet/inches display text. |
| `get_agent_dossier_height(rng)` | Generates profile dossier height. |
| `get_agent_dossier_blood_group(user=None)` | Generates deterministic blood group display. |
| `get_agent_dossier(user=None)` | Builds the full profile dossier list for templates. |
| `get_profile_badges(user, achievements=None, leaderboard_entry=None)` | Builds public profile badges from achievements, rank, friends, customisation, and privacy settings. |
| `normalize_profile_image_path(profile_image)` | Normalizes uploaded/static profile image paths. |
| `get_profile_image_upload_dir()` | Reads the configured profile upload directory. |
| `resolve_uploaded_profile_image(profile_image)` | Safely resolves uploaded image paths inside the upload folder only. |
| `is_uploaded_profile_image(profile_image)` | Checks if a profile image points to the upload folder. |
| `is_valid_profile_image(profile_image)` | Accepts preset images or existing uploaded images. |
| `is_selectable_profile_image_for_user(profile_image, user_id)` | Ensures users can only select presets or their own uploads. |
| `get_custom_profile_image(user)` | Returns the user's custom upload if it is valid. |
| `validate_uploaded_profile_image(file_storage)` | Allows only valid JPEG profile uploads. |
| `save_uploaded_profile_image(file_storage, user_id)` | Saves uploaded profile images with safe generated filenames. |
| `delete_uploaded_profile_image(profile_image)` | Removes old uploaded profile images after replacement. |
| `get_profile_image(user)` | Returns a valid profile image or the default fallback. |
| `get_profile_bio(user)` | Returns stripped profile bio text. |
| `get_profile_background(user)` | Validates and normalizes selected profile background. |
| `normalize_profile_comment(comment)` | Strips comment input before validation/storage. |
| `validate_profile_comment(comment)` | Rejects empty or overlong public profile comments. |
| `get_profile_reaction_counts(profile_user_id, current_user_id=None)` | Counts reactions and marks the current user's selected reaction. |
| `get_profile_comments(profile_user_id, limit=10)` | Loads recent public profile comments. |

## Friend Helpers

`friend_helpers.py` owns friend relationships, presence, conversation summaries, and friend-related permissions.

| Function | How it helps |
| --- | --- |
| `friend_action_to_dict(friend_action)` | Converts friend button state dataclasses to template dictionaries. |
| `parse_iso_datetime(value)` | Parses presence refresh timestamps stored in the session. |
| `register_presence_hooks(app)` | Registers before-request presence refresh and template presence helpers. |
| `get_friends(user_id)` | Loads accepted friends sorted by display name. |
| `is_user_online(user)` | Checks if a user has been seen within the online window. |
| `get_friend_presence(user)` | Builds online/offline label and CSS class for templates. |
| `get_accepted_friend(current_user_id, friend_id)` | Returns a friend only if friendship is accepted. |
| `can_view_friend_stats(viewer_id, profile_user)` | Enforces profile stats privacy settings. |
| `can_message_friend(sender_id, receiver_user)` | Enforces friend status and message privacy settings. |
| `format_message_timestamp(timestamp)` | Formats direct message timestamps for display. |
| `get_unread_message_count(user_id, friend_id=None)` | Counts unread direct messages. |
| `get_recent_conversations(user_id)` | Builds friend conversation previews for the friends page. |
| `get_accepted_friendship(user_id, friend_id)` | Finds one accepted friendship row. |
| `get_pending_friend_request(from_user_id, to_user_id)` | Finds pending friend requests between users. |
| `ensure_accepted_friendship(user_id, friend_id)` | Creates one accepted friendship row if missing. |
| `accept_pending_friend_request(friend_request)` | Accepts a request and creates both friendship directions. |
| `create_friend_request(from_user_id, to_user_id)` | Validates and creates new friend requests. |
| `get_friend_action(current_user_id, profile_user_id)` | Chooses the correct profile friend button state. |
| `make_guest_name()` | Generates temporary guest display names. |

## Chat Helpers

`chat_helpers.py` owns reusable direct-chat logic.

| Function | How it helps |
| --- | --- |
| `build_chat_room_key(user_a_id, user_b_id)` | Creates stable Socket.IO room names for two users. |
| `parse_friend_id(value)` | Safely parses friend IDs from form/socket payloads. |
| `serialize_chat_message(message)` | Converts encrypted `Message` rows into JSON-safe payloads. |
| `build_chat_key_id(public_key)` | Creates a short stable key ID from a chat public key. |
| `serialize_chat_public_key(user)` | Returns a user's current chat public key metadata. |
| `validate_encrypted_chat_payload(payload)` | Validates encrypted message envelopes before storage or broadcast. |

## Leaderboard Helpers

`leaderboard_helpers.py` owns leaderboard ranking and scoring.

| Function | How it helps |
| --- | --- |
| `calculate_leaderboard_score(stats)` | Applies the scoring formula from gameplay stats. |
| `get_leaderboard_entries(current_user_id=None, limit=None, user_ids=None)` | Builds ranked leaderboard rows from save data. |
| `get_leaderboard(limit=5, current_user_id=None)` | Gets the main menu leaderboard preview. |
| `get_leaderboard_entry_for_user(user_id, current_user_id=None)` | Finds one user's global leaderboard row. |
| `get_friends_leaderboard(current_user_id)` | Builds a leaderboard limited to the current user and friends. |
| `get_friend_rank(current_user_id)` | Finds the current user's rank among friends. |

## CLI Helpers

`commands.py` keeps command registration away from app setup.

| Function | How it helps |
| --- | --- |
| `register_cli_commands(app)` | Registers Flask CLI commands. It currently adds `flask seed-demo`, which creates demo users and saves for local testing. |

## Extension Helpers

`extensions.py` stores shared extension instances.

| Name | How it helps |
| --- | --- |
| `socketio` | Lets `app.py` initialize Socket.IO and `routes.py` register socket handlers without creating a circular import. |

## Route-Local Validation Helpers

Some small helpers remain in `routes.py` because they are tightly tied to request validation for route handlers.

| Function | How it helps |
| --- | --- |
| `normalize_auth_username(username)` | Trims and lowercases auth usernames. |
| `validate_auth_username(username)` | Enforces username length and character rules. |
| `validate_auth_password(password, field_name="password")` | Enforces password length and required-field rules. |
| `validate_friend_username(username)` | Reuses username validation for friend search. |
| `normalize_chat_message(message)` | Strips world chat/direct chat text. |
| `validate_chat_message(message)` | Rejects empty or overlong chat messages. |
| `coerce_bounded_int(value, default=0, minimum=0, maximum=None)` | Converts and clamps numeric save request values. |
| `normalize_save_token(value, default, max_length=20, transform="preserve")` | Normalizes short route/save tokens like difficulty, character, and level IDs. |
| `sanitize_save_request_payload(data)` | Validates and clamps incoming `/save-game` payloads before persistence helpers use them. |
| `format_agent_joined_date(user)` | Formats joined dates for the main menu profile card. |
| `serialize_world_message(message)` | Converts world chat rows into JSON-safe response objects. |

## Why This Helps

The split makes the project easier to mark and maintain because each file now has one main job:

- App setup is visible in one short `app.py`.
- Route handlers in `routes.py` are easier to scan because domain logic lives in helpers.
- Security-sensitive logic is easier to find in `db_helpers.py`, `save_helpers.py`, and `chat_helpers.py`.
- Profile, friend, achievement, and leaderboard features can be changed independently.
- Tests can import helper functions directly from their real module instead of importing the whole Flask app.
