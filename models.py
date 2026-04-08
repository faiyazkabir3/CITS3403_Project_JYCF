from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    save_data = db.relationship("SaveData", backref="user", uselist=False)


class SaveData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)

    difficulty = db.Column(db.String(20), nullable=False, default="EASY")
    character_id = db.Column(db.String(20), nullable=False, default="leon")

    health = db.Column(db.Integer, nullable=False, default=100)
    medkits = db.Column(db.Integer, nullable=False, default=0)
    grenades = db.Column(db.Integer, nullable=False, default=0)

    ammo_in_gun = db.Column(db.Integer, nullable=False, default=0)
    ammo_in_bag = db.Column(db.Integer, nullable=False, default=0)
    mag_capacity = db.Column(db.Integer, nullable=False, default=0)

    laser_upgrade = db.Column(db.Boolean, nullable=False, default=False)
    shield_owned = db.Column(db.Boolean, nullable=False, default=False)
    shield_on = db.Column(db.Boolean, nullable=False, default=False)

    current_level_id = db.Column(db.String(20), nullable=False, default="1")
    enemies_remaining = db.Column(db.Integer, nullable=False, default=0)

    level_complete = db.Column(db.Boolean, nullable=False, default=False)
    awaiting_choice = db.Column(db.Boolean, nullable=False, default=False)
    game_won = db.Column(db.Boolean, nullable=False, default=False)

    has_started_game = db.Column(db.Boolean, nullable=False, default=False)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

class Friend(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)