from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class SaveData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    health = db.Column(db.Integer, nullable=False, default=100)
    ammo = db.Column(db.Integer, nullable=False, default=28)
    grenades = db.Column(db.Integer, nullable=False, default=2)
    medkits = db.Column(db.Integer, nullable=False, default=2)
    shield_on = db.Column(db.Boolean, nullable=False, default=True)
    level_name = db.Column(db.String(100), nullable=False, default="start")
