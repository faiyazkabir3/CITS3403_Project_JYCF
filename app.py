import os
import random
import json
import re
import base64
import hashlib
import sys
import click
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote
from uuid import uuid4

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*_args, **_kwargs):
        return False

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from flask_migrate import Migrate
from flask_socketio import SocketIO, join_room, leave_room
from flask_wtf.csrf import CSRFProtect
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from models import (
    db, User, SaveData, Friend, Message, FriendRequest, WorldMessage, UserAchievement,
    ProfileReaction, ProfileComment, utc_now
)

try:
    import sqlcipher3
    import sqlcipher3.dbapi2 as sqlcipher_dbapi
except ModuleNotFoundError:
    sqlcipher3 = None
else:
    sys.modules.setdefault("pysqlcipher3", sqlcipher3)
    sys.modules.setdefault("pysqlcipher3.dbapi2", sqlcipher_dbapi)

load_dotenv()

app = Flask(__name__, instance_relative_config=True)

os.makedirs(app.instance_path, exist_ok=True)
SAVE_FALLBACK_DIR = Path(app.instance_path) / "save_fallbacks"
SAVE_FALLBACK_DIR.mkdir(exist_ok=True)
PROFILE_IMAGE_UPLOAD_DIR = Path(app.static_folder) / "uploads" / "profile_pics"
PROFILE_IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

BIO_MAX_LENGTH = 500
PROFILE_COMMENT_MAX_LENGTH = 240
PROFILE_IMAGE_DEFAULT = "images/Shadows.gif"
PROFILE_IMAGE_UPLOAD_PREFIX = "uploads/profile_pics/"
PROFILE_IMAGE_ALLOWED_EXTENSIONS = {".jpg", ".jpeg"}
PROFILE_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
ONLINE_WINDOW = timedelta(minutes=2)
PRESENCE_REFRESH_INTERVAL = timedelta(seconds=30)
PROFILE_IMAGE_OPTIONS = [
    {"label": "Shadows", "filename": PROFILE_IMAGE_DEFAULT},
    {"label": "Leon", "filename": "images/players/leon_idle.png"},
    {"label": "Quite", "filename": "images/players/quite_idle.png"},
    {"label": "Duo", "filename": "images/quite_dual_good.png"},
    {"label": "Leon Classic", "filename": "images/profile_presets/leon_classic.jpeg"},
    {"label": "Leon Noir", "filename": "images/profile_presets/leon_profile_2.jpg"},
    {"label": "Leon Agent", "filename": "images/profile_presets/leon_profile_3.jpg"},
    {"label": "Quite Focus", "filename": "images/profile_presets/quite_pfp_1.jpg"},
    {"label": "Quite Tactical", "filename": "images/profile_presets/quite_pfp_2.jpg"},
    {"label": "Quite Chibi", "filename": "images/profile_presets/quite_pfp_3.jpg"},
]
FAVORITE_CHARACTER_OPTIONS = [
    {"label": "No Favorite", "value": ""},
    {"label": "Leon", "value": "leon"},
    {"label": "Quite", "value": "quite"},
]
FAVORITE_CHARACTER_LABELS = {
    option["value"]: option["label"]
    for option in FAVORITE_CHARACTER_OPTIONS
}
PROFILE_BACKGROUND_OPTIONS = [
    {"label": "Default", "value": "default"},
    {"label": "Neon Grid", "value": "neon"},
    {"label": "Gold Signal", "value": "gold"},
    {"label": "Red Alert", "value": "red"},
]
PROFILE_BACKGROUND_LABELS = {
    option["value"]: option["label"]
    for option in PROFILE_BACKGROUND_OPTIONS
}
PROFILE_REACTION_OPTIONS = [
    {"label": "Heart", "value": "heart", "symbol": "❤️"},
    {"label": "Hype", "value": "hype", "symbol": "🔥"},
    {"label": "Sad", "value": "sad", "symbol": "😢"},
    {"label": "Angry", "value": "angry", "symbol": "😡"},
]
PROFILE_REACTION_VALUES = {
    option["value"]
    for option in PROFILE_REACTION_OPTIONS
}
PROFILE_IMAGE_FILENAMES = {
    option["filename"]
    for option in PROFILE_IMAGE_OPTIONS
}

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


@dataclass
class ChatMessagePayload:
    id: int
    sender_id: int
    receiver_id: int
    message: str
    timestamp: Optional[str]


@dataclass
class PlayerStats:
    kills: int = 0
    damage_dealt: int = 0
    damage_taken: int = 0
    pistol_shots: int = 0
    grenades: int = 0
    medkits: int = 0
    reloads: int = 0
    knife_uses: int = 0


@dataclass
class LeaderboardStats:
    kills: int = 0
    damage_dealt: int = 0
    damage_taken: int = 0
    pistol_shots: int = 0
    grenades_used: int = 0
    medkits_used: int = 0
    reloads: int = 0
    knife_uses: int = 0


@dataclass
class LeaderboardEntry:
    user_id: int
    display_name: str
    login_username: str
    score: int
    rank: int = 0
    is_current_user: bool = False


@dataclass
class FriendAction:
    state: str
    label: str
    disabled: bool
    action: Optional[str] = None


@dataclass
class AchievementDefinition:
    id: str
    name: str
    description: str
    target: int
    metric: str
    icon: str
    tier_thresholds: tuple = ()
    badge_family: str = ""

    def __post_init__(self):
        if not self.tier_thresholds:
            self.tier_thresholds = (self.target, self.target, self.target)

        if not self.badge_family:
            self.badge_family = self.id


AGENT_LICENSE_NUMBER = "RZ-74291863"
AGENT_BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
ACHIEVEMENT_TIER_ORDER = ("bronze", "silver", "gold")
ACHIEVEMENT_TIER_LABELS = {
    "bronze": "BRONZE",
    "silver": "SILVER",
    "gold": "GOLD",
}
ACHIEVEMENT_TIER_RANKS = {
    tier_name: index + 1
    for index, tier_name in enumerate(ACHIEVEMENT_TIER_ORDER)
}


def friend_action_to_dict(friend_action):
    return {
        key: value
        for key, value in asdict(friend_action).items()
        if value is not None
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


def parse_save_payload_key_ring(raw_key_ring):
    if not raw_key_ring.strip():
        raise RuntimeError("SAVE_PAYLOAD_KEYS is missing. Add at least one key like v1:<base64-32-byte-key>.")

    key_ring = {}
    active_key_id = None

    for entry in raw_key_ring.split(","):
        key_id, separator, encoded_key = entry.strip().partition(":")
        if not separator or not key_id or not encoded_key:
            raise RuntimeError("SAVE_PAYLOAD_KEYS entries must use key_id:base64_key format.")

        try:
            key = base64.urlsafe_b64decode(encoded_key + "=" * (-len(encoded_key) % 4))
        except ValueError as error:
            raise RuntimeError(f"SAVE_PAYLOAD_KEYS entry {key_id} is not valid base64.") from error

        if len(key) != 32:
            raise RuntimeError(f"SAVE_PAYLOAD_KEYS entry {key_id} must decode to 32 bytes.")

        key_ring[key_id] = key
        active_key_id = active_key_id or key_id

    return active_key_id, key_ring


secret_key = load_required_secret_key()
sqlcipher_database_key = load_required_env_secret("SQLCIPHER_DATABASE_KEY")
SAVE_PAYLOAD_ACTIVE_KEY_ID, SAVE_PAYLOAD_KEY_RING = parse_save_payload_key_ring(
    os.environ.get("SAVE_PAYLOAD_KEYS", "")
)
ALLOW_PLAINTEXT_SAVE_FALLBACKS = os.environ.get("ALLOW_PLAINTEXT_SAVE_FALLBACKS", "").lower() in {"1", "true", "yes"}

app.config["SECRET_KEY"] = secret_key
app.config["SQLALCHEMY_DATABASE_URI"] = configure_sqlcipher_database_uri(
    os.environ.get("DATABASE_URL", "sqlite:///project.db"),
    sqlcipher_database_key
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "connect_args": {
        "timeout": 30,
    },
}
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("SESSION_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
)
app.config["WTF_CSRF_CHECK_DEFAULT"] = False

db.init_app(app)
migrate = Migrate(app, db)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = "main.show_login"
socketio = SocketIO(app, async_mode="threading")


@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


@login_manager.unauthorized_handler
def handle_unauthorized_user():
    if request.path.startswith(("/save-game", "/load-game", "/chat/keys")):
        return jsonify({"ok": False, "message": "Please log in."}), 401

    if session.get("is_guest"):
        return redirect(url_for("main.main_menu"))

    return redirect(url_for("main.show_login"))


@app.before_request
def protect_csrf_requests():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    if request.path.startswith("/socket.io"):
        return None

    csrf.protect()
    return None


def verify_sqlcipher_database():
    if allow_plaintext_test_database(app.config.get("SQLALCHEMY_DATABASE_URI")):
        return

    cipher_version = db.session.execute(text("PRAGMA cipher_version")).scalar()
    if not cipher_version:
        raise RuntimeError("SQLCipher is not active for the configured SQLite database.")

    db.session.execute(text("SELECT count(*) FROM sqlite_master")).scalar()


def rollback_database_session(context):
    try:
        db.session.rollback()
        return True
    except SQLAlchemyError as rollback_error:
        app.logger.warning(
            "%s rollback failed. %s",
            context,
            getattr(rollback_error, "orig", rollback_error)
        )
    except Exception as rollback_error:
        app.logger.warning("%s rollback failed. %s", context, rollback_error)

    try:
        db.session.remove()
    except Exception as remove_error:
        app.logger.warning("%s session reset failed. %s", context, remove_error)

    return False


def parse_iso_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


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


def is_flask_db_command():
    # Alembic imports the app before applying or comparing migrations, so
    # strict startup checks must not run during Flask-Migrate commands.
    return "db" in sys.argv[1:]


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


def get_database_table_names():
    rows = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type = 'table'")
    ).all()
    return {row[0] for row in rows}


def require_migrated_database():
    with app.app_context():
        try:
            verify_sqlcipher_database()
            table_names = get_database_table_names()
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


@app.cli.command("seed-demo")
def seed_demo_command():
    """Create deterministic demo users and saves for local development."""
    demo_password = "RouteZero123!"
    now = utc_now()
    demo_specs = [
        {
            "username": "leon_demo",
            "display_name": "Leon Demo",
            "favorite_character": "leon",
            "profile_image": "images/players/leon_idle.png",
            "save": {
                "difficulty": "HARD",
                "character_id": "leon",
                "health": 82,
                "medkits": 1,
                "grenades": 1,
                "kills": 8,
                "damage_dealt": 760,
                "damage_taken": 46,
                "pistol_shots": 22,
                "grenades_used": 2,
                "medkits_used": 1,
                "reloads": 3,
                "knife_uses": 4,
                "ammo_in_gun": 5,
                "ammo_in_bag": 12,
                "mag_capacity": 8,
                "laser_upgrade": True,
                "shield_owned": True,
                "shield_on": True,
                "current_level_id": "5D",
                "enemies_remaining": 2,
            },
        },
        {
            "username": "quite_demo",
            "display_name": "Quite Demo",
            "favorite_character": "quite",
            "profile_image": "images/players/quite_idle.png",
            "save": {
                "difficulty": "EASY",
                "character_id": "quite",
                "health": 91,
                "medkits": 2,
                "grenades": 0,
                "kills": 11,
                "damage_dealt": 940,
                "damage_taken": 28,
                "pistol_shots": 27,
                "grenades_used": 1,
                "medkits_used": 1,
                "reloads": 4,
                "knife_uses": 7,
                "ammo_in_gun": 6,
                "ammo_in_bag": 10,
                "mag_capacity": 8,
                "laser_upgrade": True,
                "shield_owned": False,
                "shield_on": False,
                "current_level_id": "5A",
                "enemies_remaining": 1,
            },
        },
    ]

    created_users = 0
    created_saves = 0

    for spec in demo_specs:
        user = User.query.filter_by(username=spec["username"]).first()
        if user is None:
            user = User(
                username=spec["username"],
                display_name=spec["display_name"],
                password_hash=generate_password_hash(
                    demo_password,
                    method="pbkdf2:sha256"
                ),
            )
            db.session.add(user)
            db.session.flush()
            created_users += 1

        user.display_name = spec["display_name"]
        user.profile_image = spec["profile_image"]
        user.favorite_character = spec["favorite_character"]
        user.hide_from_leaderboard = False
        user.show_stats_to_friends = True
        user.allow_friend_messages = True

        save_values = spec["save"]
        save_data = SaveData.query.filter_by(
            user_id=user.id,
            character_id=save_values["character_id"],
        ).first()
        if save_data is None:
            save_data = SaveData(
                user_id=user.id,
                character_id=save_values["character_id"],
            )
            db.session.add(save_data)
            created_saves += 1

        for field, value in save_values.items():
            setattr(save_data, field, value)

        save_data.level_complete = False
        save_data.awaiting_choice = False
        save_data.game_won = False
        save_data.has_started_game = True
        save_data.run_state_json = None
        save_data.updated_at = now

    db.session.commit()
    click.echo(
        "Demo seed complete. "
        f"Users created: {created_users}. Saves created: {created_saves}. "
        f"Demo password: {demo_password}"
    )


if not is_flask_db_command():
    require_migrated_database()

@app.before_request
def refresh_current_user_presence():
    if request.endpoint == "static" or request.path.startswith("/socket.io"):
        return

    user_id = session.get("user_id")

    if user_id is None or session.get("is_guest"):
        return

    now = utc_now()
    last_presence_refresh = parse_iso_datetime(session.get("last_presence_refresh_at"))

    if (
        last_presence_refresh is not None
        and now - last_presence_refresh < PRESENCE_REFRESH_INTERVAL
    ):
        return

    try:
        User.query.filter_by(id=user_id).update(
            {"last_seen": now},
            synchronize_session=False
        )
        db.session.commit()
        session["last_presence_refresh_at"] = now.isoformat()
    except SQLAlchemyError as error:
        rollback_database_session("Presence update")
        app.logger.warning(
            "Presence update failed for user %s. %s",
            user_id,
            getattr(error, "orig", error)
        )

def get_friends(user_id):
    friendships = Friend.query.filter_by(user_id=user_id, status="accepted").all()
    friend_ids = [f.friend_id for f in friendships]
    friends = User.query.filter(User.id.in_(friend_ids)).all()
    return sorted(friends, key=lambda user: get_display_name(user).lower())


def is_user_online(user):
    if user is None or user.last_seen is None:
        return False

    return utc_now() - user.last_seen <= ONLINE_WINDOW


def get_friend_presence(user):
    online = is_user_online(user)
    return {
        "is_online": online,
        "label": "Online" if online else "Offline",
        "class_name": "online" if online else "offline",
    }


@app.context_processor
def inject_presence_helpers():
    return {
        "get_friend_presence": get_friend_presence,
    }


def get_accepted_friend(current_user_id, friend_id):
    friendship = Friend.query.filter_by(
        user_id=current_user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

    if friendship is None:
        return None

    return User.query.get(friend_id)


def build_chat_room_key(user_a_id, user_b_id):
    first_id, second_id = sorted((int(user_a_id), int(user_b_id)))
    return f"chat:{first_id}:{second_id}"


def parse_friend_id(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def serialize_chat_message(message):
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "ciphertext": message.ciphertext,
        "nonce": message.nonce,
        "sender_key_id": message.sender_key_id,
        "sender_public_key": message.sender_public_key,
        "recipient_key_id": message.recipient_key_id,
        "recipient_public_key": message.recipient_public_key,
        "encryption_version": message.encryption_version,
        "timestamp": message.timestamp.isoformat() if message.timestamp else None,
    }


def build_chat_key_id(public_key):
    return hashlib.sha256(public_key.encode("utf-8")).hexdigest()[:32]


def serialize_chat_public_key(user):
    if user is None or not user.chat_public_key or not user.chat_key_id:
        return None

    return {
        "user_id": user.id,
        "public_key": user.chat_public_key,
        "key_id": user.chat_key_id,
        "created_at": user.chat_key_created_at.isoformat() if user.chat_key_created_at else None,
    }


def validate_encrypted_chat_payload(payload):
    if not isinstance(payload, dict):
        return None

    ciphertext = str(payload.get("ciphertext", "")).strip()
    nonce = str(payload.get("nonce", "")).strip()
    sender_public_key = str(payload.get("sender_public_key", "")).strip()
    sender_key_id = str(payload.get("sender_key_id", "")).strip()
    recipient_public_key = str(payload.get("recipient_public_key", "")).strip()
    recipient_key_id = str(payload.get("recipient_key_id", "")).strip()

    if not ciphertext or not nonce or not sender_public_key or not sender_key_id:
        return None

    if sender_key_id != build_chat_key_id(sender_public_key):
        return None

    if recipient_public_key and recipient_key_id != build_chat_key_id(recipient_public_key):
        return None

    return {
        "ciphertext": ciphertext,
        "nonce": nonce,
        "sender_public_key": sender_public_key,
        "sender_key_id": sender_key_id,
        "recipient_public_key": recipient_public_key or None,
        "recipient_key_id": recipient_key_id or None,
        "encryption_version": coerce_int(payload.get("encryption_version"), 1),
    }


def get_user_stats(user_id):
    all_saves = SaveData.query.filter_by(user_id=user_id).all()
    payloads = [
        normalize_save_payload(build_save_payload(save))
        for save in all_saves
    ]

    def total(field):
        return sum((payload.get(field) or 0) for payload in payloads if payload)

    return asdict(PlayerStats(
        kills=total("kills"),
        damage_dealt=total("damage_dealt"),
        damage_taken=total("damage_taken"),
        pistol_shots=total("pistol_shots"),
        grenades=total("grenades_used"),
        medkits=total("medkits_used"),
        reloads=total("reloads"),
        knife_uses=total("knife_uses"),
    ))

def get_empty_stats():
    return asdict(PlayerStats())

def parse_level_number(value):
    match = re.search(r"\d+", str(value or ""))
    if match is None:
        return 0

    return coerce_int(match.group(0), 0)

def get_latest_save_payload(user_id):
    try:
        payloads = list_db_save_payloads(user_id)
    except SQLAlchemyError:
        rollback_database_session("Latest save query")
        payloads = []

    payloads.extend(list_fallback_save_payloads(user_id))
    return choose_latest_save_payload(*payloads)

def get_latest_run_summary(user_id):
    payload = get_latest_save_payload(user_id)

    if payload is None:
        return None

    return {
        "difficulty": payload.get("difficulty", "EASY"),
        "character": FAVORITE_CHARACTER_LABELS.get(
            str(payload.get("character_id", "")).lower(),
            str(payload.get("character_id", "Unknown")).title()
        ),
        "current_level": payload.get("current_level_id", "1"),
        "kills": coerce_int(payload.get("kills"), 0),
        "game_won": coerce_bool(payload.get("game_won"), False),
        "updated_at": payload.get("updated_at"),
    }

def get_achievement_definitions():
    return [
        AchievementDefinition(
            id="first_blood",
            name="First Blood",
            description="Defeat your first infected.",
            target=1,
            metric="kills",
            icon="I",
            tier_thresholds=(1, 10, 20),
            badge_family="first_blood",
        ),
        AchievementDefinition(
            id="survivor",
            name="Survivor",
            description="Reach level 3 or beyond.",
            target=3,
            metric="levels",
            icon="III",
            tier_thresholds=(3, 5, 7),
            badge_family="survivor",
        ),
        AchievementDefinition(
            id="sharpshooter",
            name="Sharpshooter",
            description="Deal 500 damage with 10 or fewer pistol shots.",
            target=500,
            metric="damage_dealt",
            icon="S",
            tier_thresholds=(500, 1000, 1500),
            badge_family="sharpshooter",
        ),
        AchievementDefinition(
            id="medic",
            name="Medic",
            description="Use 5 medkits.",
            target=5,
            metric="medkits",
            icon="+",
            tier_thresholds=(5, 10, 15),
            badge_family="medic",
        ),
        AchievementDefinition(
            id="no_mercy",
            name="No Mercy",
            description="Defeat 10 infected.",
            target=10,
            metric="kills",
            icon="10",
            tier_thresholds=(10, 20, 30),
            badge_family="no_mercy",
        ),
        AchievementDefinition(
            id="untouchable",
            name="Untouchable",
            description="Save a run after taking no damage.",
            target=1,
            metric="untouchable_runs",
            icon="0",
            tier_thresholds=(1, 2, 3),
            badge_family="untouchable",
        ),
    ]

def get_achievement_progress(user_id, stats=None):
    stats = stats or get_user_stats(user_id)
    latest_payload = get_latest_save_payload(user_id)
    latest_level = parse_level_number((latest_payload or {}).get("current_level_id"))

    return {
        "kills": coerce_int(stats.get("kills"), 0),
        "levels": latest_level,
        "damage_dealt": coerce_int(stats.get("damage_dealt"), 0),
        "medkits": coerce_int(stats.get("medkits"), 0),
        "untouchable_runs": count_untouchable_runs(user_id),
        "pistol_shots": coerce_int(stats.get("pistol_shots"), 0),
    }


def count_untouchable_runs(user_id):
    try:
        payloads = list_db_save_payloads(user_id)
    except SQLAlchemyError:
        rollback_database_session("Untouchable run query")
        payloads = []

    payloads.extend(list_fallback_save_payloads(user_id))

    seen_runs = set()
    untouchable_count = 0
    for payload in payloads:
        run_key = (
            str(payload.get("character_id", "")),
            str(payload.get("updated_at", "")),
        )
        if run_key in seen_runs:
            continue

        seen_runs.add(run_key)
        if (
            coerce_bool(payload.get("has_started_game"), False)
            and coerce_int(payload.get("damage_taken"), 0) == 0
        ):
            untouchable_count += 1

    return untouchable_count

def achievement_is_unlocked(definition, progress):
    if definition.id == "sharpshooter":
        return (
            coerce_int(progress.get("damage_dealt"), 0) >= definition.target
            and coerce_int(progress.get("pistol_shots"), 0) <= 10
        )

    return coerce_int(progress.get(definition.metric), 0) >= definition.target


def get_achievement_current_value(definition, progress):
    if definition.id == "sharpshooter":
        return coerce_int(progress.get("damage_dealt"), 0)

    return coerce_int(progress.get(definition.metric), 0)


def get_achievement_tier(definition, current, unlocked):
    if not unlocked:
        return None

    earned_tier = None
    for tier_name, threshold in zip(ACHIEVEMENT_TIER_ORDER, definition.tier_thresholds):
        if current >= threshold:
            earned_tier = tier_name

    return earned_tier


def get_next_achievement_tier(definition, current):
    for tier_name, threshold in zip(ACHIEVEMENT_TIER_ORDER, definition.tier_thresholds):
        if current < threshold:
            return tier_name, threshold

    return None, None


def get_achievement_badge_image(definition, tier_name=None):
    badge_tier = tier_name or ACHIEVEMENT_TIER_ORDER[0]
    return f"images/badges/{definition.badge_family}_{badge_tier}.png"


def get_user_achievements(user_id):
    unlocked_rows = UserAchievement.query.filter_by(user_id=user_id).all()
    unlocked_by_id = {
        row.achievement_id: row
        for row in unlocked_rows
    }
    stats = get_user_stats(user_id)
    progress = get_achievement_progress(user_id, stats=stats)
    achievements = []

    for definition in get_achievement_definitions():
        row = unlocked_by_id.get(definition.id)
        current = get_achievement_current_value(definition, progress)
        unlocked = row is not None
        tier_name = get_achievement_tier(definition, current, unlocked)
        next_tier_name, next_tier_target = get_next_achievement_tier(definition, current)
        display_tier_name = tier_name or next_tier_name or ACHIEVEMENT_TIER_ORDER[-1]

        achievements.append({
            **asdict(definition),
            "current": min(current, definition.target),
            "tier_current": min(current, definition.tier_thresholds[-1]),
            "tier_target": definition.tier_thresholds[-1],
            "tier_name": tier_name,
            "tier_label": ACHIEVEMENT_TIER_LABELS.get(tier_name, "LOCKED"),
            "tier_rank": ACHIEVEMENT_TIER_RANKS.get(tier_name, 0),
            "next_tier_name": next_tier_name,
            "next_tier_label": ACHIEVEMENT_TIER_LABELS.get(next_tier_name),
            "next_tier_target": next_tier_target,
            "badge_image": get_achievement_badge_image(definition, display_tier_name),
            "unlocked": unlocked,
            "unlocked_at": row.unlocked_at if row is not None else None,
        })

    return achievements


def get_agent_showcase_badges(achievements=None):
    earned_badges = []

    for achievement in achievements or []:
        if not achievement.get("tier_name"):
            continue

        earned_badges.append({
            "label": achievement["name"],
            "description": achievement["description"],
            "tier_name": achievement["tier_name"],
            "tier_label": achievement["tier_label"],
            "tier_rank": achievement["tier_rank"],
            "image": achievement["badge_image"],
            "current": achievement["tier_current"],
        })

    return sorted(
        earned_badges,
        key=lambda badge: (badge["tier_rank"], badge["current"], badge["label"]),
        reverse=True
    )[:3]


def format_agent_id(user):
    user_id = getattr(user, "id", None)
    if user_id is None:
        return "GUEST"

    return f"#{coerce_int(user_id, 0):05d}"


def get_agent_dossier_rng(user=None, field="profile"):
    user_id = getattr(user, "id", None)
    seed_source = f"agent-dossier:{field}:{user_id if user_id is not None else 'guest'}"
    seed = int(hashlib.sha256(seed_source.encode("utf-8")).hexdigest(), 16)
    return random.Random(seed)


def get_agent_dossier_age(rng):
    return str(rng.randint(21, 29))


def format_agent_height(total_inches):
    feet = total_inches // 12
    inches = total_inches % 12
    return f"{feet}'{inches}\""


def get_agent_dossier_height(rng):
    return format_agent_height(rng.randint(65, 75))


def get_agent_dossier_blood_group(user=None):
    rng = get_agent_dossier_rng(user, "blood-group")
    return AGENT_BLOOD_GROUPS[rng.randrange(len(AGENT_BLOOD_GROUPS))]


def get_agent_dossier(user=None):
    vitals_rng = get_agent_dossier_rng(user, "vitals")

    return [
        {"label": "AGE", "value": get_agent_dossier_age(vitals_rng), "key": "age"},
        {"label": "HEIGHT", "value": get_agent_dossier_height(vitals_rng), "key": "height"},
        {"label": "AGENT ID", "value": format_agent_id(user), "key": "agent-id"},
        {"label": "LICENCE NO.", "value": AGENT_LICENSE_NUMBER, "key": "licence"},
        {"label": "BLOOD GROUP", "value": get_agent_dossier_blood_group(user), "key": "blood-group"},
    ]

def unlock_achievements_for_user(user_id):
    existing_ids = {
        row.achievement_id
        for row in UserAchievement.query.filter_by(user_id=user_id).all()
    }
    stats = get_user_stats(user_id)
    progress = get_achievement_progress(user_id, stats=stats)
    unlocked = []

    for definition in get_achievement_definitions():
        if definition.id in existing_ids:
            continue

        if achievement_is_unlocked(definition, progress):
            row = UserAchievement(
                user_id=user_id,
                achievement_id=definition.id,
                unlocked_at=utc_now()
            )
            db.session.add(row)
            unlocked.append(definition.name)

    return unlocked

def get_profile_badges(user, achievements=None, leaderboard_entry=None):
    if user is None:
        return []

    badges = []
    achievements = achievements or get_user_achievements(user.id)

    for achievement in achievements:
        if achievement.get("unlocked"):
            badges.append({
                "label": achievement["name"],
                "symbol": achievement["icon"],
                "description": achievement["description"],
                "kind": "achievement",
                "image": achievement.get("badge_image"),
                "tier_label": achievement.get("tier_label"),
            })

    if leaderboard_entry is not None:
        badges.append({
            "label": "Ranked",
            "symbol": f"#{leaderboard_entry['rank']}",
            "description": "Appears on the global leaderboard.",
            "kind": "exclusive",
        })

    friend_count = Friend.query.filter_by(user_id=user.id, status="accepted").count()
    if friend_count > 0:
        badges.append({
            "label": "Social Link",
            "symbol": "SL",
            "description": "Has connected with other players.",
            "kind": "exclusive",
        })

    if get_profile_background(user) != "default" or get_custom_profile_image(user) is not None:
        badges.append({
            "label": "Custom Signal",
            "symbol": "CS",
            "description": "Uses profile customisation.",
            "kind": "exclusive",
        })

    if user.hide_from_leaderboard:
        badges.append({
            "label": "Ghost Mode",
            "symbol": "GM",
            "description": "Keeps their leaderboard position private.",
            "kind": "exclusive",
        })

    return badges[:8]

def get_display_name(user):
    if user is None:
        return ""

    display_name = (user.display_name or "").strip()
    return display_name or user.username

def normalize_profile_image_path(profile_image):
    return (profile_image or "").strip().replace("\\", "/")

def resolve_uploaded_profile_image(profile_image):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if not normalized_profile_image.startswith(PROFILE_IMAGE_UPLOAD_PREFIX):
        return None

    candidate_path = (Path(app.static_folder) / normalized_profile_image).resolve()
    upload_root = PROFILE_IMAGE_UPLOAD_DIR.resolve()

    try:
        candidate_path.relative_to(upload_root)
    except ValueError:
        return None

    return candidate_path

def is_uploaded_profile_image(profile_image):
    return resolve_uploaded_profile_image(profile_image) is not None

def is_valid_profile_image(profile_image):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if normalized_profile_image in PROFILE_IMAGE_FILENAMES:
        return True

    uploaded_path = resolve_uploaded_profile_image(normalized_profile_image)
    return uploaded_path is not None and uploaded_path.is_file()

def is_selectable_profile_image_for_user(profile_image, user_id):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if normalized_profile_image in PROFILE_IMAGE_FILENAMES:
        return True

    uploaded_path = resolve_uploaded_profile_image(normalized_profile_image)
    if uploaded_path is None or not uploaded_path.is_file():
        return False

    return uploaded_path.name.startswith(f"user_{user_id}_")

def get_custom_profile_image(user):
    if user is None:
        return None

    profile_image = normalize_profile_image_path(user.profile_image)
    if is_uploaded_profile_image(profile_image) and is_valid_profile_image(profile_image):
        return profile_image

    return None

def validate_uploaded_profile_image(file_storage):
    filename = secure_filename(file_storage.filename or "")
    extension = Path(filename).suffix.lower()

    if extension not in PROFILE_IMAGE_ALLOWED_EXTENSIONS:
        return "Upload a JPEG image (.jpg or .jpeg)."

    file_storage.stream.seek(0)
    header = file_storage.stream.read(3)
    file_storage.stream.seek(0)

    if header != b"\xff\xd8\xff":
        return "Upload a valid JPEG image."

    return None

def save_uploaded_profile_image(file_storage, user_id):
    stored_filename = f"user_{user_id}_{uuid4().hex}.jpg"
    relative_path = f"{PROFILE_IMAGE_UPLOAD_PREFIX}{stored_filename}"
    absolute_path = PROFILE_IMAGE_UPLOAD_DIR / stored_filename

    try:
        file_storage.save(absolute_path)
    except OSError as error:
        app.logger.warning(
            "Profile image upload failed for user %s. %s",
            user_id,
            error
        )
        return None, "Profile image upload failed."

    return relative_path, None

def delete_uploaded_profile_image(profile_image):
    uploaded_path = resolve_uploaded_profile_image(profile_image)

    if uploaded_path is None or not uploaded_path.exists():
        return

    try:
        uploaded_path.unlink()
    except OSError as error:
        app.logger.warning(
            "Profile image cleanup failed for %s. %s",
            profile_image,
            error
        )

def get_profile_image(user):
    if user is None:
        return PROFILE_IMAGE_DEFAULT

    profile_image = normalize_profile_image_path(user.profile_image)
    if is_valid_profile_image(profile_image):
        return profile_image

    return PROFILE_IMAGE_DEFAULT

def get_profile_bio(user):
    if user is None:
        return ""

    return (user.bio or "").strip()

def get_profile_background(user):
    background = str(getattr(user, "profile_background", "default") or "default").strip().lower()

    if background in PROFILE_BACKGROUND_LABELS:
        return background

    return "default"

def normalize_profile_comment(comment):
    return str(comment or "").strip()

def validate_profile_comment(comment):
    if comment == "":
        return "Comment cannot be empty."

    if len(comment) > PROFILE_COMMENT_MAX_LENGTH:
        return f"Comment must be {PROFILE_COMMENT_MAX_LENGTH} characters or fewer."

    return None

def get_profile_reaction_counts(profile_user_id, current_user_id=None):
    counts = {
        option["value"]: {
            **option,
            "count": 0,
            "is_current_user": False,
        }
        for option in PROFILE_REACTION_OPTIONS
    }

    rows = (
        db.session.query(
            ProfileReaction.reaction_type,
            func.count(ProfileReaction.id)
        )
        .filter(ProfileReaction.profile_user_id == profile_user_id)
        .group_by(ProfileReaction.reaction_type)
        .all()
    )

    for reaction_type, count in rows:
        if reaction_type in counts:
            counts[reaction_type]["count"] = count

    if current_user_id is not None:
        current_reaction = ProfileReaction.query.filter_by(
            profile_user_id=profile_user_id,
            reactor_user_id=current_user_id
        ).first()

        if current_reaction is not None and current_reaction.reaction_type in counts:
            counts[current_reaction.reaction_type]["is_current_user"] = True

    return list(counts.values())

def get_profile_comments(profile_user_id, limit=10):
    return (
        ProfileComment.query
        .filter_by(profile_user_id=profile_user_id)
        .order_by(ProfileComment.created_at.desc())
        .limit(limit)
        .all()
    )

def calculate_leaderboard_score(stats):
    if isinstance(stats, LeaderboardStats):
        stats = asdict(stats)

    return (
        coerce_int(stats.get("kills"), 0)
        + coerce_int(stats.get("pistol_shots"), 0)
        + coerce_int(stats.get("grenades_used"), 0)
        + coerce_int(stats.get("medkits_used"), 0)
        + coerce_int(stats.get("reloads"), 0)
        + coerce_int(stats.get("knife_uses"), 0)
        + (coerce_int(stats.get("damage_dealt"), 0) // 100)
        + (coerce_int(stats.get("damage_taken"), 0) // 2)
    )

def get_leaderboard_entries(current_user_id=None, limit=None, user_ids=None):
    try:
        query = (
            db.session.query(
                User.id.label("user_id"),
                User.username.label("username"),
                User.display_name.label("display_name"),
                func.coalesce(func.sum(SaveData.kills), 0).label("kills"),
                func.coalesce(func.sum(SaveData.damage_dealt), 0).label("damage_dealt"),
                func.coalesce(func.sum(SaveData.damage_taken), 0).label("damage_taken"),
                func.coalesce(func.sum(SaveData.pistol_shots), 0).label("pistol_shots"),
                func.coalesce(func.sum(SaveData.grenades_used), 0).label("grenades_used"),
                func.coalesce(func.sum(SaveData.medkits_used), 0).label("medkits_used"),
                func.coalesce(func.sum(SaveData.reloads), 0).label("reloads"),
                func.coalesce(func.sum(SaveData.knife_uses), 0).label("knife_uses"),
            )
            .join(SaveData, SaveData.user_id == User.id)
            .filter(SaveData.has_started_game.is_(True))
            .filter(User.hide_from_leaderboard.is_(False))
        )

        if user_ids is not None:
            query = query.filter(User.id.in_(user_ids))

        rows = (
            query
            .group_by(User.id, User.username, User.display_name)
            .all()
        )
    except SQLAlchemyError as error:
        rollback_database_session("Leaderboard query")
        app.logger.warning(
            "Leaderboard query failed. %s",
            getattr(error, "orig", error)
        )
        return []

    entries = []

    for row in rows:
        display_name = (row.display_name or "").strip() or row.username
        stats = LeaderboardStats(
            kills=row.kills,
            damage_dealt=row.damage_dealt,
            damage_taken=row.damage_taken,
            pistol_shots=row.pistol_shots,
            grenades_used=row.grenades_used,
            medkits_used=row.medkits_used,
            reloads=row.reloads,
            knife_uses=row.knife_uses,
        )
        entries.append(LeaderboardEntry(
            user_id=row.user_id,
            display_name=display_name,
            login_username=row.username,
            score=calculate_leaderboard_score(stats),
        ))

    ranked_entries = sorted(
        entries,
        key=lambda entry: (-entry.score, entry.display_name.lower(), entry.login_username)
    )

    for index, entry in enumerate(ranked_entries, start=1):
        entry.rank = index
        entry.is_current_user = entry.user_id == current_user_id

    if limit is not None:
        ranked_entries = ranked_entries[:limit]

    return [asdict(entry) for entry in ranked_entries]

def get_leaderboard(limit=5, current_user_id=None):
    return get_leaderboard_entries(
        current_user_id=current_user_id,
        limit=limit
    )

def get_leaderboard_entry_for_user(user_id, current_user_id=None):
    for entry in get_leaderboard_entries(current_user_id=current_user_id):
        if entry["user_id"] == user_id:
            return entry

    return None

def get_friends_leaderboard(current_user_id):
    friend_ids = [
        friendship.friend_id
        for friendship in Friend.query.filter_by(
            user_id=current_user_id,
            status="accepted"
        ).all()
    ]
    visible_user_ids = [current_user_id, *friend_ids]
    return get_leaderboard_entries(
        current_user_id=current_user_id,
        user_ids=visible_user_ids
    )

def get_friend_rank(current_user_id):
    for entry in get_friends_leaderboard(current_user_id):
        if entry["user_id"] == current_user_id:
            return entry

    return None

def can_view_friend_stats(viewer_id, profile_user):
    if profile_user is None:
        return False

    if viewer_id == profile_user.id:
        return True

    if not profile_user.show_stats_to_friends:
        return False

    return get_accepted_friendship(viewer_id, profile_user.id) is not None

def can_message_friend(sender_id, receiver_user):
    if receiver_user is None:
        return False

    if not receiver_user.allow_friend_messages:
        return False

    return get_accepted_friendship(sender_id, receiver_user.id) is not None

def format_message_timestamp(timestamp):
    if timestamp is None:
        return ""

    return timestamp.strftime("%d %b %H:%M")

def get_unread_message_count(user_id, friend_id=None):
    query = Message.query.filter(
        Message.receiver_id == user_id,
        Message.read_at.is_(None)
    )

    if friend_id is not None:
        query = query.filter(Message.sender_id == friend_id)

    return query.count()

def get_recent_conversations(user_id):
    conversations = []

    for friend in get_friends(user_id):
        latest_message = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == friend.id)) |
            ((Message.sender_id == friend.id) & (Message.receiver_id == user_id))
        ).order_by(Message.timestamp.desc()).first()
        latest_preview = "No messages yet"

        if latest_message is not None:
            latest_preview = latest_message.message or "Encrypted message"

        conversations.append({
            "friend": friend,
            "display_name": get_display_name(friend),
            "latest_message": latest_preview,
            "timestamp": format_message_timestamp(latest_message.timestamp) if latest_message else "",
            "unread_count": get_unread_message_count(user_id, friend.id),
        })

    return sorted(
        conversations,
        key=lambda item: item["timestamp"] or "",
        reverse=True
    )

def get_accepted_friendship(user_id, friend_id):
    return Friend.query.filter_by(
        user_id=user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

def get_pending_friend_request(from_user_id, to_user_id):
    return FriendRequest.query.filter_by(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        status="pending"
    ).first()

def ensure_accepted_friendship(user_id, friend_id):
    if get_accepted_friendship(user_id, friend_id) is None:
        db.session.add(Friend(
            user_id=user_id,
            friend_id=friend_id,
            status="accepted"
        ))

def accept_pending_friend_request(friend_request):
    friend_request.status = "accepted"
    ensure_accepted_friendship(friend_request.from_user_id, friend_request.to_user_id)
    ensure_accepted_friendship(friend_request.to_user_id, friend_request.from_user_id)

def create_friend_request(from_user_id, to_user_id):
    if from_user_id == to_user_id:
        return False, "You can't send a friend request to yourself."

    if get_accepted_friendship(from_user_id, to_user_id) is not None:
        return False, "You are already friends."

    if get_pending_friend_request(from_user_id, to_user_id) is not None:
        return False, "Friend request already sent."

    if get_pending_friend_request(to_user_id, from_user_id) is not None:
        return False, "This user already sent you a friend request."

    db.session.add(FriendRequest(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        status="pending"
    ))
    return True, "Friend request sent."

def get_friend_action(current_user_id, profile_user_id):
    if current_user_id == profile_user_id:
        return friend_action_to_dict(FriendAction(
            state="self",
            label="YOUR PROFILE",
            disabled=True,
        ))

    if get_accepted_friendship(current_user_id, profile_user_id) is not None:
        return friend_action_to_dict(FriendAction(
            state="friends",
            label="FRIENDS",
            disabled=True,
        ))

    if get_pending_friend_request(current_user_id, profile_user_id) is not None:
        return friend_action_to_dict(FriendAction(
            state="outgoing_pending",
            label="REQUEST SENT",
            disabled=True,
        ))

    incoming_request = get_pending_friend_request(profile_user_id, current_user_id)
    if incoming_request is not None:
        return friend_action_to_dict(FriendAction(
            state="incoming_pending",
            label="ACCEPT REQUEST",
            disabled=False,
            action="accept_friend_request",
        ))

    return friend_action_to_dict(FriendAction(
        state="add",
        label="ADD FRIEND",
        disabled=False,
        action="send_friend_request",
    ))

def make_guest_name():
    num = random.randint(10000, 99999)
    return "Operator" + str(num)


def get_user_save(character_id=None, create=False):
    user_id = session.get("user_id")

    if user_id is None:
        return None

    if character_id is None:
        character_id = session.get("selected_character", "leon")

    character_id = str(character_id).lower()

    save_data = SaveData.query.filter_by(
        user_id=user_id,
        character_id=character_id
    ).first()

    if save_data is None and create:
        save_data = SaveData(
            user_id=user_id,
            character_id=character_id
        )
        db.session.add(save_data)

    return save_data


def coerce_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def coerce_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}

    return bool(value)


COUNTER_ANALYTICS_FIELDS = {
    "kills": "enemiesKilled",
    "damage_dealt": "damageDealt",
    "damage_taken": "damageTaken",
    "pistol_shots": "pistolShotsFired",
    "grenades_used": "grenadesUsed",
    "medkits_used": "medKitsUsed",
    "reloads": "reloads",
    "knife_uses": "knivesUsed",
}


def build_save_payload_from_request(data, updated_at=None):
    timestamp = updated_at or utc_now()

    return {
        "difficulty": str(data.get("difficulty", "EASY")).upper(),
        "character_id": str(data.get("character_id", "leon")).lower(),
        "health": coerce_int(data.get("health"), 100),
        "medkits": coerce_int(data.get("medkits"), 0),
        "grenades": coerce_int(data.get("grenades"), 0),
        "ammo_in_gun": coerce_int(data.get("ammo_in_gun"), 0),
        "ammo_in_bag": coerce_int(data.get("ammo_in_bag"), 0),
        "mag_capacity": coerce_int(data.get("mag_capacity"), 8),
        "laser_upgrade": coerce_bool(data.get("laser_upgrade"), False),
        "shield_owned": coerce_bool(data.get("shield_owned"), False),
        "shield_on": coerce_bool(data.get("shield_on"), False),
        "current_level_id": str(data.get("current_level_id", "1")),
        "enemies_remaining": coerce_int(data.get("enemies_remaining"), 0),
        "level_complete": coerce_bool(data.get("level_complete"), False),
        "awaiting_choice": coerce_bool(data.get("awaiting_choice"), False),
        "game_won": coerce_bool(data.get("game_won"), False),
        "has_started_game": True,
        "kills": coerce_int(data.get("kills"), 0),
        "damage_dealt": coerce_int(data.get("damage_dealt"), 0),
        "damage_taken": coerce_int(data.get("damage_taken"), 0),
        "pistol_shots": coerce_int(data.get("pistol_shots"), 0),
        "grenades_used": coerce_int(data.get("grenades_used"), 0),
        "medkits_used": coerce_int(data.get("medkits_used"), 0),
        "reloads": coerce_int(data.get("reloads"), 0),
        "knife_uses": coerce_int(data.get("knife_uses"), 0),
        "run_state": data.get("run_state"),
        "updated_at": timestamp.isoformat()
    }


def get_fallback_save_path(user_id, character_id):
    safe_character = "".join(
        char for char in str(character_id).lower()
        if char.isalnum() or char in {"-", "_"}
    ) or "leon"
    return SAVE_FALLBACK_DIR / f"user_{user_id}_{safe_character}.json"


def encrypt_save_payload(payload):
    nonce = os.urandom(12)
    key = SAVE_PAYLOAD_KEY_RING[SAVE_PAYLOAD_ACTIVE_KEY_ID]
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)

    return {
        "encrypted": True,
        "version": 1,
        "key_id": SAVE_PAYLOAD_ACTIVE_KEY_ID,
        "nonce": base64.urlsafe_b64encode(nonce).decode("ascii").rstrip("="),
        "ciphertext": base64.urlsafe_b64encode(ciphertext).decode("ascii").rstrip("="),
    }


def decode_envelope_value(value):
    return base64.urlsafe_b64decode(str(value) + "=" * (-len(str(value)) % 4))


def decrypt_save_payload(envelope):
    if not isinstance(envelope, dict) or not envelope.get("encrypted"):
        if ALLOW_PLAINTEXT_SAVE_FALLBACKS:
            return envelope
        return None

    key_id = envelope.get("key_id")
    key = SAVE_PAYLOAD_KEY_RING.get(key_id)
    if key is None:
        return None

    try:
        nonce = decode_envelope_value(envelope.get("nonce", ""))
        ciphertext = decode_envelope_value(envelope.get("ciphertext", ""))
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode("utf-8"))
    except (InvalidTag, OSError, TypeError, ValueError, json.JSONDecodeError):
        return None


def write_fallback_save(user_id, character_id, payload):
    path = get_fallback_save_path(user_id, character_id)
    path.write_text(json.dumps(encrypt_save_payload(payload), separators=(",", ":")), encoding="utf-8")


def read_fallback_save(user_id, character_id):
    path = get_fallback_save_path(user_id, character_id)

    if not path.exists():
        return None

    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
        return normalize_save_payload(decrypt_save_payload(envelope))
    except (OSError, json.JSONDecodeError):
        return None


def list_fallback_save_payloads(user_id):
    pattern = f"user_{user_id}_*.json"
    payloads = []

    for path in SAVE_FALLBACK_DIR.glob(pattern):
        try:
            envelope = json.loads(path.read_text(encoding="utf-8"))
            payload = normalize_save_payload(decrypt_save_payload(envelope))
        except (OSError, json.JSONDecodeError):
            continue

        if payload is not None:
            payloads.append(payload)

    return payloads


def parse_updated_at(value):
    if not value:
        return datetime.min

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return datetime.min


def normalize_save_payload(payload):
    if not isinstance(payload, dict):
        return None

    normalized = dict(payload)
    run_state = normalized.get("run_state")

    if isinstance(run_state, dict):
        player = run_state.get("player") or {}
        inventory = run_state.get("inventory") or {}
        progression = run_state.get("progression") or {}

        if player.get("characterId") is not None:
            normalized["character_id"] = str(player.get("characterId")).lower()

        if inventory.get("health") is not None:
            normalized["health"] = coerce_int(inventory.get("health"), normalized.get("health", 100))

        if progression.get("currentLevelId") is not None:
            normalized["current_level_id"] = str(progression.get("currentLevelId"))

        if progression.get("enemiesRemaining") is not None:
            normalized["enemies_remaining"] = coerce_int(
                progression.get("enemiesRemaining"),
                normalized.get("enemies_remaining", 0)
            )

        if progression.get("levelComplete") is not None:
            normalized["level_complete"] = coerce_bool(
                progression.get("levelComplete"),
                normalized.get("level_complete", False)
            )

        if progression.get("awaitingChoice") is not None:
            normalized["awaiting_choice"] = coerce_bool(
                progression.get("awaitingChoice"),
                normalized.get("awaiting_choice", False)
            )

        if progression.get("gameWon") is not None:
            normalized["game_won"] = coerce_bool(
                progression.get("gameWon"),
                normalized.get("game_won", False)
            )

        analytics = run_state.get("analytics") or {}
        for payload_key, analytics_key in COUNTER_ANALYTICS_FIELDS.items():
            normalized[payload_key] = max(
                coerce_int(normalized.get(payload_key), 0),
                coerce_int(analytics.get(analytics_key), 0)
            )

    normalized["difficulty"] = str(normalized.get("difficulty", "EASY")).upper()
    normalized["character_id"] = str(normalized.get("character_id", "leon")).lower()
    normalized["current_level_id"] = str(normalized.get("current_level_id", "1"))
    normalized["health"] = coerce_int(normalized.get("health"), 100)
    normalized["enemies_remaining"] = coerce_int(normalized.get("enemies_remaining"), 0)
    normalized["level_complete"] = coerce_bool(normalized.get("level_complete"), False)
    normalized["awaiting_choice"] = coerce_bool(normalized.get("awaiting_choice"), False)
    normalized["game_won"] = coerce_bool(normalized.get("game_won"), False)
    normalized["has_started_game"] = coerce_bool(normalized.get("has_started_game"), True)
    for payload_key in COUNTER_ANALYTICS_FIELDS:
        normalized[payload_key] = coerce_int(normalized.get(payload_key), 0)

    return normalized


def list_db_save_payloads(user_id, character_id=None):
    query = SaveData.query.filter_by(user_id=user_id)

    if character_id is not None:
        query = query.filter_by(character_id=str(character_id).lower())

    return [
        normalize_save_payload(build_save_payload(save_data))
        for save_data in query.all()
        if save_data.has_started_game
    ]


def choose_latest_save_payload(*payloads):
    candidates = [payload for payload in payloads if payload]

    if not candidates:
        return None

    return max(candidates, key=lambda payload: parse_updated_at(payload.get("updated_at")))


def update_save_data(save_data, data):
    save_data.difficulty = str(data.get("difficulty", save_data.difficulty or "EASY")).upper()
    save_data.character_id = str(data.get("character_id", save_data.character_id or "leon")).lower()

    save_data.health = coerce_int(data.get("health"), save_data.health)
    save_data.medkits = coerce_int(data.get("medkits"), save_data.medkits)
    save_data.grenades = coerce_int(data.get("grenades"), save_data.grenades)

    save_data.ammo_in_gun = coerce_int(data.get("ammo_in_gun"), save_data.ammo_in_gun)
    save_data.ammo_in_bag = coerce_int(data.get("ammo_in_bag"), save_data.ammo_in_bag)
    save_data.mag_capacity = coerce_int(data.get("mag_capacity"), save_data.mag_capacity)

    save_data.laser_upgrade = coerce_bool(data.get("laser_upgrade"), save_data.laser_upgrade)
    save_data.shield_owned = coerce_bool(data.get("shield_owned"), save_data.shield_owned)
    save_data.shield_on = coerce_bool(data.get("shield_on"), save_data.shield_on)

    save_data.current_level_id = str(data.get("current_level_id", save_data.current_level_id))
    save_data.enemies_remaining = coerce_int(data.get("enemies_remaining"), save_data.enemies_remaining)

    save_data.level_complete = coerce_bool(data.get("level_complete"), save_data.level_complete)
    save_data.awaiting_choice = coerce_bool(data.get("awaiting_choice"), save_data.awaiting_choice)
    save_data.game_won = coerce_bool(data.get("game_won"), save_data.game_won)
    save_data.kills = coerce_int(data.get("kills"), save_data.kills)
    save_data.damage_dealt = coerce_int(data.get("damage_dealt"), save_data.damage_dealt)
    save_data.damage_taken = coerce_int(data.get("damage_taken"), save_data.damage_taken)
    save_data.pistol_shots = coerce_int(data.get("pistol_shots"), save_data.pistol_shots)
    save_data.grenades_used = coerce_int(data.get("grenades_used"), save_data.grenades_used)
    save_data.medkits_used = coerce_int(data.get("medkits_used"), save_data.medkits_used)
    save_data.reloads = coerce_int(data.get("reloads"), save_data.reloads)
    save_data.knife_uses = coerce_int(data.get("knife_uses"), save_data.knife_uses)
    save_data.run_state_json = json.dumps(data.get("run_state")) if data.get("run_state") is not None else save_data.run_state_json

    save_data.has_started_game = True
    save_data.updated_at = utc_now()


def build_save_payload(save_data):
    run_state = None

    if save_data.run_state_json:
        try:
            run_state = json.loads(save_data.run_state_json)
        except json.JSONDecodeError:
            run_state = None

    return {
        "difficulty": save_data.difficulty,
        "character_id": save_data.character_id,
        "health": save_data.health,
        "medkits": save_data.medkits,
        "grenades": save_data.grenades,
        "ammo_in_gun": save_data.ammo_in_gun,
        "ammo_in_bag": save_data.ammo_in_bag,
        "mag_capacity": save_data.mag_capacity,
        "laser_upgrade": save_data.laser_upgrade,
        "shield_owned": save_data.shield_owned,
        "shield_on": save_data.shield_on,
        "current_level_id": save_data.current_level_id,
        "enemies_remaining": save_data.enemies_remaining,
        "level_complete": save_data.level_complete,
        "awaiting_choice": save_data.awaiting_choice,
        "game_won": save_data.game_won,
        "has_started_game": save_data.has_started_game,
        "kills": save_data.kills,
        "damage_dealt": save_data.damage_dealt,
        "damage_taken": save_data.damage_taken,
        "pistol_shots": save_data.pistol_shots,
        "grenades_used": save_data.grenades_used,
        "medkits_used": save_data.medkits_used,
        "reloads": save_data.reloads,
        "knife_uses": save_data.knife_uses,
        "run_state": run_state,
        "updated_at": save_data.updated_at.isoformat() if save_data.updated_at else None
    }


sys.modules.setdefault("app", sys.modules[__name__])

from routes import main_bp

app.register_blueprint(main_bp)

if __name__ == "__main__":
    socketio.run(app, debug=True)
