import os
import random

from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash

from models import db, User

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


@app.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("achievements.html", username=session.get("username", "Player"))


if __name__ == "__main__":
    app.run(debug=True)