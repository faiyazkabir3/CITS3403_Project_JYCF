import os

from flask import Flask, render_template

from models import db

app = Flask(__name__, instance_relative_config=True)

app.config["SECRET_KEY"] = "dev-key-change-later"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

os.makedirs(app.instance_path, exist_ok=True)

db.init_app(app)

with app.app_context():
    db.create_all()


@app.route("/")
@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register")
def register_page():
    return render_template("register.html")


@app.route("/main-menu")
def main_menu_page():
    return render_template("main_menu.html")


@app.route("/play")
def play_page():
    return render_template("play.html")


@app.route("/achievements")
def achievements_page():
    return render_template("achievements.html")


if __name__ == "__main__":
    app.run(debug=True)
