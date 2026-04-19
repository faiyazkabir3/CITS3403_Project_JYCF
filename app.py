import os
import random
import json
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    def load_dotenv(*_args, **_kwargs):
        return False

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, SaveData, Friend, Message, FriendRequest

load_dotenv()

app = Flask(__name__, instance_relative_config=True)

os.makedirs(app.instance_path, exist_ok=True)
SAVE_FALLBACK_DIR = Path(app.instance_path) / "save_fallbacks"
SAVE_FALLBACK_DIR.mkdir(exist_ok=True)

secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    raise RuntimeError("SECRET_KEY is missing. Add it to your .env file.")

app.config["SECRET_KEY"] = secret_key
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///project.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

def ensure_save_data_schema():
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())

    if "save_data" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("save_data")}
    required_columns = {
        "run_state_json": "ALTER TABLE save_data ADD COLUMN run_state_json TEXT",
        "grenades_used": "ALTER TABLE save_data ADD COLUMN grenades_used INTEGER NOT NULL DEFAULT 0",
        "medkits_used": "ALTER TABLE save_data ADD COLUMN medkits_used INTEGER NOT NULL DEFAULT 0"
    }

    for column_name, statement in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(text(statement))

    db.session.commit()


with app.app_context():
    try:
        db.create_all()
        ensure_save_data_schema()
    except SQLAlchemyError as error:
        db.session.rollback()
        app.logger.warning(
            "Database initialization skipped because SQLite is unavailable. %s",
            getattr(error, "orig", error)
        )

def get_friends(user_id):
    friendships = Friend.query.filter_by(user_id=user_id, status="accepted").all()
    friend_ids = [f.friend_id for f in friendships]
    return User.query.filter(User.id.in_(friend_ids)).all()

def get_user_stats(user_id):
    all_saves = SaveData.query.filter_by(user_id=user_id).all()

    return {
        "kills": sum((save.kills or 0) for save in all_saves),
        "damage_dealt": sum((save.damage_dealt or 0) for save in all_saves),
        "damage_taken": sum((save.damage_taken or 0) for save in all_saves),
        "pistol_shots": sum((save.pistol_shots or 0) for save in all_saves),
        "grenades": sum((save.grenades_used or 0) for save in all_saves),
        "medkits": sum((save.medkits_used or 0) for save in all_saves),
        "reloads": sum((save.reloads or 0) for save in all_saves),
        "knife_uses": sum((save.knife_uses or 0) for save in all_saves),
    }

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


def build_save_payload_from_request(data, updated_at=None):
    timestamp = updated_at or datetime.utcnow()

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


def write_fallback_save(user_id, character_id, payload):
    path = get_fallback_save_path(user_id, character_id)
    path.write_text(json.dumps(payload), encoding="utf-8")


def read_fallback_save(user_id, character_id):
    path = get_fallback_save_path(user_id, character_id)

    if not path.exists():
        return None

    try:
        return normalize_save_payload(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return None


def list_fallback_save_payloads(user_id):
    pattern = f"user_{user_id}_*.json"
    payloads = []

    for path in SAVE_FALLBACK_DIR.glob(pattern):
        try:
            payload = normalize_save_payload(json.loads(path.read_text(encoding="utf-8")))
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

    normalized["difficulty"] = str(normalized.get("difficulty", "EASY")).upper()
    normalized["character_id"] = str(normalized.get("character_id", "leon")).lower()
    normalized["current_level_id"] = str(normalized.get("current_level_id", "1"))
    normalized["health"] = coerce_int(normalized.get("health"), 100)
    normalized["enemies_remaining"] = coerce_int(normalized.get("enemies_remaining"), 0)
    normalized["level_complete"] = coerce_bool(normalized.get("level_complete"), False)
    normalized["awaiting_choice"] = coerce_bool(normalized.get("awaiting_choice"), False)
    normalized["game_won"] = coerce_bool(normalized.get("game_won"), False)
    normalized["has_started_game"] = coerce_bool(normalized.get("has_started_game"), True)

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
    save_data.updated_at = datetime.utcnow()


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


@app.route("/")
@app.route("/login", methods=["GET", "POST"])
def show_login():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")

        if username == "":
            return render_template("login.html", error="Please enter your username.")

        if password == "":
            return render_template("login.html", error="Please enter your password.")

        user = User.query.filter_by(username=username).first()

        if user is None:
            return render_template("login.html", error="Invalid username or password.")

        if not check_password_hash(user.password_hash, password):
            return render_template("login.html", error="Invalid username or password.")

        session.clear()
        session["user_id"] = user.id
        session["username"] = user.username
        session["is_guest"] = False

        return redirect(url_for("main_menu"))

    return render_template("login.html", error=None)


@app.route("/register", methods=["GET", "POST"])
def show_register():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm-password", "")

        if username == "":
            return render_template("register.html", error="Please enter a username.")

        if password == "":
            return render_template("register.html", error="Please enter a password.")

        if password != confirm:
            return render_template("register.html", error="Passwords do not match.")

        user = User.query.filter_by(username=username).first()
        if user is not None:
            return render_template("register.html", error="Username already exists.")

        new_user = User(
            username=username,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256')
        )

        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("show_login"))

    return render_template("register.html", error=None)


@app.route("/guest-login", methods=["POST"])
def guest_login():
    name = make_guest_name()

    session.clear()
    session["username"] = name
    session["is_guest"] = True

    return redirect(url_for("main_menu"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("show_login"))


@app.route("/main-menu")
@app.route("/main_menu")
def main_menu():
    username = session.get("username")
    is_guest = bool(session.get("is_guest"))
    user_id = session.get("user_id")

    if not username:
        return redirect(url_for("show_login"))

    friends = []

    if not is_guest:
        if user_id is None:
            session.clear()
            return redirect(url_for("show_login"))

        user = User.query.get(user_id)

        if user is None:
            session.clear()
            return redirect(url_for("show_login"))

        username = user.username
        friends = get_friends(user_id)

    return render_template(
        "main_menu_view.html",
        username=username,
        friends=friends,
        is_guest=is_guest
    )


@app.route("/favicon.ico")
def favicon():
    return app.send_static_file("images/icons/settings.svg")


@app.route("/play")
def show_play():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("play.html")


@app.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("show_login"))

    user_id = session.get("user_id")

    if user_id is None:
        return redirect(url_for("show_login"))

    stats = get_user_stats(session["user_id"])

    return render_template(
        "achievements.html",
        username=session.get("username", "Player"),
        achievements=[],
        stats=stats
    )


@app.route("/save-game", methods=["POST"])
def save_game():
    if session.get("user_id") is None or session.get("is_guest"):
        return jsonify({
            "ok": False,
            "message": "Please log in to save your game."
        }), 401

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "ok": False,
            "message": "No save data received."
        }), 400

    character_id = str(data.get("character_id", "leon")).lower()
    session["selected_character"] = character_id

    fallback_payload = build_save_payload_from_request(data)

    try:
        save_data = get_user_save(character_id=character_id, create=True)
        update_save_data(save_data, data)
        db.session.commit()
    except SQLAlchemyError as error:
        db.session.rollback()

        try:
            write_fallback_save(session["user_id"], character_id, fallback_payload)
        except OSError:
            app.logger.exception("Save failed for user %s.", session.get("user_id"))
            return jsonify({
                "ok": False,
                "message": "Save failed."
            }), 500

        app.logger.warning(
            "SQLite save failed for user %s; wrote fallback save instead. %s",
            session.get("user_id"),
            getattr(error, "orig", error)
        )
        return jsonify({
            "ok": True,
            "message": "Game saved locally."
        })

    try:
        write_fallback_save(session["user_id"], character_id, build_save_payload(save_data))
    except OSError as error:
        app.logger.warning(
            "Backup save write failed for user %s after database save succeeded. %s",
            session.get("user_id"),
            error
        )

    return jsonify({
        "ok": True,
        "message": "Game saved."
    })


@app.route("/load-game")
def load_game():
    if session.get("user_id") is None or session.get("is_guest"):
        return jsonify({
            "ok": False,
            "message": "Please log in to load your game."
        }), 401

    requested_character_id = request.args.get("character_id")
    character_id = str(requested_character_id).lower() if requested_character_id else None

    db_payloads = []
    fallback_payloads = []

    try:
        db_payloads = list_db_save_payloads(session["user_id"], character_id=character_id)
    except SQLAlchemyError as error:
        db.session.rollback()
        app.logger.warning(
            "Database load failed for user %s; falling back to JSON save. %s",
            session.get("user_id"),
            getattr(error, "orig", error)
        )

    if character_id is not None:
        fallback_payload = read_fallback_save(session["user_id"], character_id)
        if fallback_payload is not None:
            fallback_payloads.append(fallback_payload)
    else:
        fallback_payloads = list_fallback_save_payloads(session["user_id"])

    save_payload = choose_latest_save_payload(*db_payloads, *fallback_payloads)

    if save_payload is None:
        return jsonify({
            "ok": False,
            "message": "Start a new game first."
        })

    session["selected_character"] = str(save_payload.get("character_id", "leon")).lower()

    return jsonify({
        "ok": True,
        "message": "Save loaded.",
        "save_data": save_payload
    })

@app.route("/add_friend/<int:user_id>")
def add_friend(user_id):
    current_user = session.get("user_id")

    if not current_user or current_user == user_id:
        return redirect(url_for("main_menu"))

    existing = Friend.query.filter_by(user_id=current_user, friend_id=user_id).first()

    if not existing:
        db.session.add(Friend(user_id=current_user, friend_id=user_id))
        db.session.commit()

    return redirect(url_for("main_menu"))


@app.route('/friends', methods=['GET', 'POST'])
def show_friends():
    if session.get("is_guest"):
        return redirect(url_for("main_menu"))

    current_user = User.query.get(session.get('user_id'))
    if current_user is None:
        return redirect(url_for('show_login'))
    
    if request.method == 'POST':
        from_user_id = session.get('user_id')
        friend_username = request.form['friend_username'].strip().lower()
        
        # Look up the friend
        friend = User.query.filter_by(username=friend_username).first()
        if friend:
            # Prevent sending request to self
            if friend.id == from_user_id:
                flash("You can't send a friend request to yourself.")
            else:
                # Make sure no duplicate pending request
                existing = FriendRequest.query.filter_by(
                    from_user_id=from_user_id, 
                    to_user_id=friend.id, 
                    status='pending'
                ).first()
                
                if not existing:
                    new_request = FriendRequest(
                        from_user_id=from_user_id,
                        to_user_id=friend.id,
                        status='pending'
                    )
                    db.session.add(new_request)
                    db.session.commit()
                else:
                    flash("Friend request already sent.")
        else:
            flash('User not found.')
        
        return redirect(url_for('show_friends'))
    
    # Get pending requests for current user
    incoming_requests = FriendRequest.query.filter_by(
        to_user_id=current_user.id, status='pending'
    ).all()
    
    # Get friends (accepted requests)
    friends = get_friends(current_user.id)
    
    return render_template(
        'friends_view.html',
        username=current_user.username,
        current_user=current_user,
        incoming_requests=incoming_requests,
        friends=friends
    )


@app.route("/accept_friend/<int:request_id>")
def accept_friend(request_id):
    current_user = session.get('user_id')
    if not current_user:
        return redirect(url_for("show_login"))

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user:
        friend_request.status = "accepted"

        # Add mutual friendship entries
        db.session.add(Friend(
            user_id=friend_request.from_user_id,
            friend_id=friend_request.to_user_id,
            status="accepted"
        ))
        db.session.add(Friend(
            user_id=friend_request.to_user_id,
            friend_id=friend_request.from_user_id,
            status="accepted"
        ))

        db.session.commit()

    return redirect(url_for("show_friends"))

@app.route("/reject_friend/<int:request_id>")
def reject_friend(request_id):
    current_user = session.get('user_id')
    if not current_user:
        return redirect(url_for("show_login"))

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user:
        db.session.delete(friend_request)
        db.session.commit()

    return redirect(url_for("show_friends"))

@app.route("/chat/<int:friend_id>", methods=["GET", "POST"])
def chat(friend_id):
    current_user = session.get("user_id")

    if not current_user:
        return redirect(url_for("show_login"))

    if request.method == "POST":
        msg = request.form.get("message")

        if msg:
            db.session.add(Message(
                sender_id=session["user_id"],
                receiver_id=friend_id,
                message=msg,
                timestamp=datetime.utcnow()
            ))
            db.session.commit()
            return redirect(url_for("chat", friend_id=friend_id))

    messages = Message.query.filter(
        ((Message.sender_id == current_user) & (Message.receiver_id == friend_id)) |
        ((Message.sender_id == friend_id) & (Message.receiver_id == current_user))
    ).order_by(Message.timestamp).all()

    friend = User.query.get(friend_id)

    return render_template(
        "chat.html",
        messages=messages,
        friend=friend,
        current_user=session["user_id"]
    )

@app.route("/friend-stats/<int:friend_id>")
def friend_stats(friend_id):
    current_user_id = session.get("user_id")

    if current_user_id is None or session.get("is_guest"):
        return redirect(url_for("show_login"))

    friendship = Friend.query.filter_by(
        user_id=current_user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

    if friendship is None:
        flash("You can only view stats for users in your friends list.")
        return redirect(url_for("show_friends"))

    friend = User.query.get(friend_id)
    if friend is None:
        flash("Friend not found.")
        return redirect(url_for("show_friends"))

    stats = get_user_stats(friend_id)

    return render_template(
        "friend_stats.html",
        username=session.get("username", "Player"),
        friend=friend,
        stats=stats
    )

if __name__ == "__main__":
    app.run(debug=True)
