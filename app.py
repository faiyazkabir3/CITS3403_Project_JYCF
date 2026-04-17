import os
import random
import json
from datetime import datetime

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from sqlalchemy import inspect, text
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, SaveData, Friend, Message, FriendRequest

app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-fallback-key")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

os.makedirs(app.instance_path, exist_ok=True)

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
    db.create_all()
    ensure_save_data_schema()

def get_friends(user_id):
    friendships = Friend.query.filter_by(user_id=user_id, status="accepted").all()
    friend_ids = [f.friend_id for f in friendships]
    return User.query.filter(User.id.in_(friend_ids)).all()

def make_guest_name():
    num = random.randint(10000, 99999)
    return "Operator" + str(num)


def get_user_save(create=False):
    user_id = session.get("user_id")

    if user_id is None:
        return None

    save_data = SaveData.query.filter_by(user_id=user_id).first()

    if save_data is None and create:
        save_data = SaveData(user_id=user_id)
        db.session.add(save_data)

    return save_data


def update_save_data(save_data, data):
    save_data.difficulty = str(data.get("difficulty", save_data.difficulty or "EASY")).upper()
    save_data.character_id = str(data.get("character_id", save_data.character_id or "leon")).lower()

    save_data.health = int(data.get("health", save_data.health))
    save_data.medkits = int(data.get("medkits", save_data.medkits))
    save_data.grenades = int(data.get("grenades", save_data.grenades))

    save_data.ammo_in_gun = int(data.get("ammo_in_gun", save_data.ammo_in_gun))
    save_data.ammo_in_bag = int(data.get("ammo_in_bag", save_data.ammo_in_bag))
    save_data.mag_capacity = int(data.get("mag_capacity", save_data.mag_capacity))

    save_data.laser_upgrade = bool(data.get("laser_upgrade", save_data.laser_upgrade))
    save_data.shield_owned = bool(data.get("shield_owned", save_data.shield_owned))
    save_data.shield_on = bool(data.get("shield_on", save_data.shield_on))

    save_data.current_level_id = str(data.get("current_level_id", save_data.current_level_id))
    save_data.enemies_remaining = int(data.get("enemies_remaining", save_data.enemies_remaining))

    save_data.level_complete = bool(data.get("level_complete", save_data.level_complete))
    save_data.awaiting_choice = bool(data.get("awaiting_choice", save_data.awaiting_choice))
    save_data.game_won = bool(data.get("game_won", save_data.game_won))
    save_data.kills = int(data.get("kills", save_data.kills))
    save_data.damage_dealt = int(data.get("damage_dealt", save_data.damage_dealt))
    save_data.damage_taken = int(data.get("damage_taken", save_data.damage_taken))
    save_data.pistol_shots = int(data.get("pistol_shots", save_data.pistol_shots))
    save_data.grenades_used = int(data.get("grenades_used", save_data.grenades_used))
    save_data.medkits_used = int(data.get("medkits_used", save_data.medkits_used))
    save_data.reloads = int(data.get("reloads", save_data.reloads))
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

    session.pop("user_id", None)
    session["username"] = name
    session["is_guest"] = True

    return redirect(url_for("main_menu"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("show_login"))


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


@app.route("/play")
def show_play():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("play.html")


@app.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("show_login"))

    save_data = get_user_save()

    return render_template(
        "achievements.html",
        username=session.get("username", "Player"),
        achievements=[],
        stats={
            "kills": getattr(save_data, "kills", 0) if save_data else 0,
            "damage_dealt": getattr(save_data, "damage_dealt", 0) if save_data else 0,
            "damage_taken": getattr(save_data, "damage_taken", 0) if save_data else 0,
            "pistol_shots": getattr(save_data, "pistol_shots", 0) if save_data else 0,
            "grenades": getattr(save_data, "grenades_used", 0) if save_data else 0,
            "medkits": getattr(save_data, "medkits_used", 0) if save_data else 0,
            "reloads": getattr(save_data, "reloads", 0) if save_data else 0
        }
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

    save_data = get_user_save(create=True)
    update_save_data(save_data, data)
    db.session.commit()

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

    save_data = get_user_save()

    if save_data is None or not save_data.has_started_game:
        return jsonify({
            "ok": False,
            "message": "Start a new game first."
        })

    return jsonify({
        "ok": True,
        "message": "Save loaded.",
        "save_data": build_save_payload(save_data)
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

if __name__ == "__main__":
    app.run(debug=True)
