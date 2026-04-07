from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class SaveData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)

    has_started_game = db.Column(db.Boolean, nullable=False, default=False)

    difficulty = db.Column(db.String(20), nullable=False, default="EASY")

    health = db.Column(db.Integer, nullable=False, default=100)
    medkits = db.Column(db.Integer, nullable=False, default=2)
    grenades = db.Column(db.Integer, nullable=False, default=2)

    ammo_in_gun = db.Column(db.Integer, nullable=False, default=8)
    ammo_in_bag = db.Column(db.Integer, nullable=False, default=20)
    mag_capacity = db.Column(db.Integer, nullable=False, default=8)

    has_laser = db.Column(db.Boolean, nullable=False, default=False)

    has_shield = db.Column(db.Boolean, nullable=False, default=True)
    shield_on = db.Column(db.Boolean, nullable=False, default=True)

    current_level_id = db.Column(db.String(20), nullable=False, default="1")
    enemies_remaining = db.Column(db.Integer, nullable=False, default=0)
    level_complete = db.Column(db.Boolean, nullable=False, default=False)
    awaiting_choice = db.Column(db.Boolean, nullable=False, default=False)
    game_won = db.Column(db.Boolean, nullable=False, default=False)

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
