import os

from flask import Flask, render_template, request, redirect, url_for
from werkzeug.security import generate_password_hash

from models import db, User

app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-fallback-key")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

os.makedirs(app.instance_path, exist_ok=True)

db.init_app(app)

with app.app_context():
    db.create_all()


@app.route("/")
@app.route("/login")
def show_login():
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def show_register():
    if request.method == "POST":
        name = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm-password", "")

        if name == "":
            return render_template("register.html", error="Please enter a username.")

        if password == "":
            return render_template("register.html", error="Please enter a password.")

        if password != confirm:
            return render_template("register.html", error="Passwords do not match.")

        user = User.query.filter_by(username=name).first()
        if user is not None:
            return render_template("register.html", error="Username already exists.")

        user = User(
            username=name,
            password_hash=generate_password_hash(password)
        )

        db.session.add(user)
        db.session.commit()

        return redirect(url_for("show_login"))

    return render_template("register.html", error=None)


@app.route("/main-menu")
def show_main_menu():
    return render_template("main_menu.html")


@app.route("/play")
def show_play():
    return render_template("play.html")


@app.route("/achievements")
def show_achievements():
    return render_template("achievements.html")


if __name__ == "__main__":
    app.run(debug=True)
