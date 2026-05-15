import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*_args, **_kwargs):
        return False

from flask import Flask, jsonify, redirect, request, session, url_for
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect

from .commands import register_cli_commands
from .constants import PROFILE_IMAGE_UPLOAD_PREFIX
from .extensions import socketio
from .helpers.db_helpers import (
    configure_sqlcipher_database_uri,
    load_required_env_secret,
    load_required_secret_key,
    require_migrated_database,
)
from .helpers.friend_helpers import register_presence_hooks
from .helpers.save_helpers import parse_save_payload_key_ring
from .models import User, db


PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / ".env")

app = Flask(
    __name__,
    instance_relative_config=True,
    instance_path=str(PROJECT_ROOT / "instance"),
)

os.makedirs(app.instance_path, exist_ok=True)
save_fallback_dir = Path(app.instance_path) / "save_fallbacks"
save_fallback_dir.mkdir(exist_ok=True)
profile_image_upload_dir = Path(app.static_folder) / PROFILE_IMAGE_UPLOAD_PREFIX
profile_image_upload_dir.mkdir(parents=True, exist_ok=True)

secret_key = load_required_secret_key()
sqlcipher_database_key = load_required_env_secret("SQLCIPHER_DATABASE_KEY")
save_payload_active_key_id, save_payload_key_ring = parse_save_payload_key_ring(
    os.environ.get("SAVE_PAYLOAD_KEYS", "")
)

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
app.config["SAVE_FALLBACK_DIR"] = save_fallback_dir
app.config["SAVE_PAYLOAD_ACTIVE_KEY_ID"] = save_payload_active_key_id
app.config["SAVE_PAYLOAD_KEY_RING"] = save_payload_key_ring
app.config["ALLOW_PLAINTEXT_SAVE_FALLBACKS"] = (
    os.environ.get("ALLOW_PLAINTEXT_SAVE_FALLBACKS", "").lower() in {"1", "true", "yes"}
)
app.config["PROFILE_IMAGE_UPLOAD_DIR"] = profile_image_upload_dir

db.init_app(app)
migrate = Migrate(app, db)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = "main.show_login"
socketio.init_app(app)


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


def is_flask_db_command():
    # Alembic imports the app before applying or comparing migrations, so
    # strict startup checks must not run during Flask-Migrate commands.
    return "db" in sys.argv[1:]


register_cli_commands(app)
register_presence_hooks(app)

if not is_flask_db_command():
    require_migrated_database(app)

from .routes import main_bp

app.register_blueprint(main_bp)
