import os
import sys
from urllib.parse import quote

from flask import current_app, has_app_context
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from ..constants import DEFAULT_LANGUAGE, PROFILE_IMAGE_DEFAULT
from ..models import db

try:
    import sqlcipher3
    import sqlcipher3.dbapi2 as sqlcipher_dbapi
except ModuleNotFoundError:
    sqlcipher3 = None
else:
    sys.modules.setdefault("pysqlcipher3", sqlcipher3)
    sys.modules.setdefault("pysqlcipher3.dbapi2", sqlcipher_dbapi)


SECRET_KEY_PLACEHOLDERS = {
    "change-me",
    "changeme",
    "dev",
    "flask-secret-key",
    "password",
    "replace-me",
    "replace_me",
    "secret",
    "super-secret-key",
    "your-secret-key",
}

MIGRATION_REQUIRED_TABLES = {
    "alembic_version",
    "user",
    "save_data",
    "friend",
    "friend_request",
    "message",
    "world_message",
    "user_achievement",
    "profile_reaction",
    "profile_comment",
}

MIGRATION_REQUIRED_COLUMNS = {
    "user": {
        "id",
        "username",
        "display_name",
        "profile_image",
        "profile_background",
        "bio",
        "favorite_character",
        "show_stats_to_friends",
        "allow_friend_messages",
        "hide_from_leaderboard",
        "preferred_language",
        "last_seen",
        "created_at",
        "password_hash",
        "chat_public_key",
        "chat_key_id",
        "chat_key_created_at",
    },
    "save_data": {
        "id",
        "user_id",
        "difficulty",
        "character_id",
        "health",
        "medkits",
        "grenades",
        "kills",
        "damage_dealt",
        "damage_taken",
        "pistol_shots",
        "grenades_used",
        "medkits_used",
        "reloads",
        "knife_uses",
        "ammo_in_gun",
        "ammo_in_bag",
        "mag_capacity",
        "laser_upgrade",
        "shield_owned",
        "shield_on",
        "current_level_id",
        "enemies_remaining",
        "level_complete",
        "awaiting_choice",
        "game_won",
        "has_started_game",
        "run_state_json",
        "updated_at",
    },
    "friend": {"id", "user_id", "friend_id", "status"},
    "friend_request": {"id", "from_user_id", "to_user_id", "status"},
    "message": {
        "id",
        "sender_id",
        "receiver_id",
        "message",
        "ciphertext",
        "nonce",
        "sender_key_id",
        "sender_public_key",
        "recipient_key_id",
        "recipient_public_key",
        "encryption_version",
        "timestamp",
        "read_at",
    },
    "world_message": {"id", "user_id", "message", "created_at"},
    "user_achievement": {"id", "user_id", "achievement_id", "unlocked_at"},
    "profile_reaction": {
        "id",
        "profile_user_id",
        "reactor_user_id",
        "reaction_type",
        "created_at",
        "updated_at",
    },
    "profile_comment": {"id", "profile_user_id", "author_user_id", "comment", "created_at"},
}


def load_required_secret_key():
    secret_key = os.environ.get("SECRET_KEY", "").strip()
    normalized_secret_key = secret_key.lower()

    if not secret_key:
        raise RuntimeError("SECRET_KEY is missing. Add it to your .env file.")

    if normalized_secret_key in SECRET_KEY_PLACEHOLDERS:
        raise RuntimeError(
            "SECRET_KEY is still set to a placeholder. Generate a strong random value and store it in your .env file."
        )

    if len(secret_key) < 32:
        raise RuntimeError("SECRET_KEY is too short. Use at least 32 random characters in your .env file.")

    return secret_key


def load_required_env_secret(name, minimum_length=32):
    value = os.environ.get(name, "").strip()

    if not value:
        raise RuntimeError(f"{name} is missing. Add it to your .env file.")

    if len(value) < minimum_length:
        raise RuntimeError(f"{name} is too short. Use at least {minimum_length} random characters.")

    return value


def allow_plaintext_test_database(database_url):
    if os.environ.get("ALLOW_PLAINTEXT_TEST_DATABASES", "").lower() not in {"1", "true", "yes"}:
        return False

    normalized_url = str(database_url or "").replace("\\", "/")
    database_name = normalized_url.rsplit("/", 1)[-1]
    return database_name.startswith(("pytest_", "selenium_"))


def configure_sqlcipher_database_uri(database_url, sqlcipher_key):
    if allow_plaintext_test_database(database_url):
        return database_url

    if sqlcipher3 is None:
        raise RuntimeError("sqlcipher3 is required for encrypted SQLite databases.")

    if database_url.startswith("sqlite+pysqlcipher://"):
        return database_url

    if not database_url.startswith("sqlite:///"):
        raise RuntimeError("Only SQLite database URLs are supported for SQLCipher encryption.")

    database_path = database_url.removeprefix("sqlite:///")
    quoted_key = quote(sqlcipher_key, safe="")
    return f"sqlite+pysqlcipher://:{quoted_key}@/{database_path}"


def rollback_database_session(context):
    try:
        db.session.rollback()
        return True
    except SQLAlchemyError as rollback_error:
        if has_app_context():
            current_app.logger.warning(
                "%s rollback failed. %s",
                context,
                getattr(rollback_error, "orig", rollback_error)
            )
    except Exception as rollback_error:
        if has_app_context():
            current_app.logger.warning("%s rollback failed. %s", context, rollback_error)

    try:
        db.session.remove()
    except Exception as remove_error:
        if has_app_context():
            current_app.logger.warning("%s session reset failed. %s", context, remove_error)

    return False


def verify_sqlcipher_database(database_uri):
    if allow_plaintext_test_database(database_uri):
        return

    cipher_version = db.session.execute(text("PRAGMA cipher_version")).scalar()
    if not cipher_version:
        raise RuntimeError("SQLCipher is not active for the configured SQLite database.")

    db.session.execute(text("SELECT count(*) FROM sqlite_master")).scalar()


def ensure_user_schema():
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if "user" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("user")}
    required_columns = {
        "display_name": 'ALTER TABLE "user" ADD COLUMN display_name VARCHAR(80)',
        "profile_image": (
            'ALTER TABLE "user" ADD COLUMN profile_image VARCHAR(255) '
            f"NOT NULL DEFAULT '{PROFILE_IMAGE_DEFAULT}'"
        ),
        "profile_background": 'ALTER TABLE "user" ADD COLUMN profile_background VARCHAR(20) NOT NULL DEFAULT "default"',
        "bio": 'ALTER TABLE "user" ADD COLUMN bio TEXT',
        "favorite_character": 'ALTER TABLE "user" ADD COLUMN favorite_character VARCHAR(20) NOT NULL DEFAULT ""',
        "show_stats_to_friends": 'ALTER TABLE "user" ADD COLUMN show_stats_to_friends BOOLEAN NOT NULL DEFAULT 1',
        "allow_friend_messages": 'ALTER TABLE "user" ADD COLUMN allow_friend_messages BOOLEAN NOT NULL DEFAULT 1',
        "hide_from_leaderboard": 'ALTER TABLE "user" ADD COLUMN hide_from_leaderboard BOOLEAN NOT NULL DEFAULT 0',
        "preferred_language": (
            'ALTER TABLE "user" ADD COLUMN preferred_language VARCHAR(10) '
            f"NOT NULL DEFAULT '{DEFAULT_LANGUAGE}'"
        ),
        "last_seen": 'ALTER TABLE "user" ADD COLUMN last_seen DATETIME',
        "created_at": 'ALTER TABLE "user" ADD COLUMN created_at DATETIME',
        "chat_public_key": 'ALTER TABLE "user" ADD COLUMN chat_public_key TEXT',
        "chat_key_id": 'ALTER TABLE "user" ADD COLUMN chat_key_id VARCHAR(64)',
        "chat_key_created_at": 'ALTER TABLE "user" ADD COLUMN chat_key_created_at DATETIME',
    }

    for column_name, statement in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(text(statement))

    db.session.execute(
        text('UPDATE "user" SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL')
    )
    db.session.commit()


def ensure_save_data_schema():
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if "save_data" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("save_data")}
    required_columns = {
        "run_state_json": "ALTER TABLE save_data ADD COLUMN run_state_json TEXT",
        "kills": "ALTER TABLE save_data ADD COLUMN kills INTEGER NOT NULL DEFAULT 0",
        "damage_dealt": "ALTER TABLE save_data ADD COLUMN damage_dealt INTEGER NOT NULL DEFAULT 0",
        "damage_taken": "ALTER TABLE save_data ADD COLUMN damage_taken INTEGER NOT NULL DEFAULT 0",
        "pistol_shots": "ALTER TABLE save_data ADD COLUMN pistol_shots INTEGER NOT NULL DEFAULT 0",
        "grenades_used": "ALTER TABLE save_data ADD COLUMN grenades_used INTEGER NOT NULL DEFAULT 0",
        "medkits_used": "ALTER TABLE save_data ADD COLUMN medkits_used INTEGER NOT NULL DEFAULT 0",
        "reloads": "ALTER TABLE save_data ADD COLUMN reloads INTEGER NOT NULL DEFAULT 0",
        "knife_uses": "ALTER TABLE save_data ADD COLUMN knife_uses INTEGER NOT NULL DEFAULT 0"
    }

    for column_name, statement in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(text(statement))

    db.session.commit()


def ensure_message_schema():
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if "message" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("message")}
    required_columns = {
        "read_at": "ALTER TABLE message ADD COLUMN read_at DATETIME",
        "ciphertext": "ALTER TABLE message ADD COLUMN ciphertext TEXT",
        "nonce": "ALTER TABLE message ADD COLUMN nonce VARCHAR(64)",
        "sender_key_id": "ALTER TABLE message ADD COLUMN sender_key_id VARCHAR(64)",
        "sender_public_key": "ALTER TABLE message ADD COLUMN sender_public_key TEXT",
        "recipient_key_id": "ALTER TABLE message ADD COLUMN recipient_key_id VARCHAR(64)",
        "recipient_public_key": "ALTER TABLE message ADD COLUMN recipient_public_key TEXT",
        "encryption_version": "ALTER TABLE message ADD COLUMN encryption_version INTEGER NOT NULL DEFAULT 1",
    }

    for column_name, statement in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(text(statement))

    db.session.commit()


def get_database_table_names():
    rows = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type = 'table'")
    ).all()
    return {row[0] for row in rows}


def get_missing_migration_columns(table_names):
    inspector = inspect(db.engine)
    missing_columns = []

    for table_name, required_columns in MIGRATION_REQUIRED_COLUMNS.items():
        if table_name not in table_names:
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name in sorted(required_columns - existing_columns):
            missing_columns.append(f"{table_name}.{column_name}")

    return missing_columns


def require_migrated_database(app):
    with app.app_context():
        try:
            verify_sqlcipher_database(app.config.get("SQLALCHEMY_DATABASE_URI"))
            table_names = get_database_table_names()
            missing_columns = get_missing_migration_columns(table_names)
        except SQLAlchemyError as error:
            rollback_database_session("Database initialization")
            raise RuntimeError(
                "Database check failed. Confirm the encrypted SQLite database is "
                "available, then run `flask db upgrade` from the project root."
            ) from error

        missing_tables = sorted(MIGRATION_REQUIRED_TABLES - table_names)
        if missing_tables:
            raise RuntimeError(
                "Database is not migrated. Run `flask db upgrade` from the "
                "project root before starting the app. Missing tables: "
                + ", ".join(missing_tables)
            )

        if missing_columns:
            raise RuntimeError(
                "Database is not migrated. Run `flask db upgrade` from the "
                "project root before starting the app. Missing columns: "
                + ", ".join(missing_columns)
            )
