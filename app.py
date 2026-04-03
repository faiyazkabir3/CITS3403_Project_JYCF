from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
@app.route("/login")
def show_login():
    return render_template("login.html")


@app.route("/register")
def show_register():
    return render_template("register.html")


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
