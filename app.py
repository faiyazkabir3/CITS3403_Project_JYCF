import os
import random

from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User, SaveData

app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-fallback-key")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

os.makedirs(app.instance_path, exist_ok=True)

db.init_app(app)

with app.app_context():
    db.create_all()


def make_guest_name():
    num = random.randint(10000, 99999)
    return "Operator" + str(num)


def get_user_save(user_id):
    return SaveData.query.filter_by(user_id=user_id).first()


def create_default_save(user_id):
    save_data = SaveData(user_id=user_id)
    db.session.add(save_data)
    db.session.commit()
    return save_data


def get_or_create_save(user_id):
    save_data = get_user_save(user_id)

    if save_data is None:
        save_data = create_default_save(user_id)

    return save_data


def save_to_dict(save_data):
    return {
        "health": save_data.health,
        "ammo": save_data.ammo,
        "grenades": save_data.grenades,
        "medkits": save_data.medkits,
        "shield_on": save_data.shield_on,
        "level_name": save_data.level_name
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

        get_or_create_save(user.id)

        session["user_id"] = user.id
        session["username"] = user.username
        session["is_guest"] = False

        return redirect(url_for("show_main_menu"))

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
            password_hash=generate_password_hash(password)
        )

        db.session.add(new_user)
        db.session.commit()

        create_default_save(new_user.id)

        return redirect(url_for("show_login"))

    return render_template("register.html", error=None)


@app.route("/guest-login", methods=["POST"])
def guest_login():
    name = make_guest_name()

    session.pop("user_id", None)
    session["username"] = name
    session["is_guest"] = True

    return redirect(url_for("show_main_menu"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("show_login"))


@app.route("/main-menu")
def show_main_menu():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("main_menu.html", username=session.get("username", "Player"))


@app.route("/play")
def show_play():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("play.html")


@app.route("/save-game", methods=["POST"])
def save_game():
    if "user_id" not in session or session.get("is_guest"):
        return redirect(url_for("show_login"))

    save_data = get_or_create_save(session["user_id"])

    health = request.form.get("health")
    ammo = request.form.get("ammo")
    grenades = request.form.get("grenades")
    medkits = request.form.get("medkits")
    shield_on = request.form.get("shield_on")
    level_name = request.form.get("level_name", "").strip()

    if health not in (None, ""):
        save_data.health = int(health)

    if ammo not in (None, ""):
        save_data.ammo = int(ammo)

    if grenades not in (None, ""):
        save_data.grenades = int(grenades)

    if medkits not in (None, ""):
        save_data.medkits = int(medkits)

    if shield_on not in (None, ""):
        save_data.shield_on = shield_on.lower() == "true"

    if level_name != "":
        save_data.level_name = level_name

    db.session.commit()

    return redirect(url_for("show_play"))


@app.route("/load-game")
def load_game():
    if "user_id" not in session or session.get("is_guest"):
        return redirect(url_for("show_login"))

    save_data = get_or_create_save(session["user_id"])
    return save_to_dict(save_data)


@app.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("achievements.html")


if __name__ == "__main__":
    app.run(debug=True)
