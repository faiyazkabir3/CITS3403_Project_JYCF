from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    display_name = db.Column(db.String(80), nullable=True)
    profile_image = db.Column(db.String(255), nullable=False, default="images/Shadows.gif")
    profile_background = db.Column(db.String(20), nullable=False, default="default")
    bio = db.Column(db.Text, nullable=True)
    favorite_character = db.Column(db.String(20), nullable=False, default="")
    show_stats_to_friends = db.Column(db.Boolean, nullable=False, default=True)
    allow_friend_messages = db.Column(db.Boolean, nullable=False, default=True)
    hide_from_leaderboard = db.Column(db.Boolean, nullable=False, default=False)
    last_seen = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    password_hash = db.Column(db.String(255), nullable=False)
    chat_public_key = db.Column(db.Text, nullable=True)
    chat_key_id = db.Column(db.String(64), nullable=True)
    chat_key_created_at = db.Column(db.DateTime, nullable=True)
    save_data = db.relationship("SaveData", backref="user", lazy=True)


class SaveData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    difficulty = db.Column(db.String(20), nullable=False, default="EASY")
    character_id = db.Column(db.String(20), nullable=False, default="leon")

    health = db.Column(db.Integer, nullable=False, default=100)
    medkits = db.Column(db.Integer, nullable=False, default=0)
    grenades = db.Column(db.Integer, nullable=False, default=0)

    kills = db.Column(db.Integer, nullable=False, default=0)
    damage_dealt = db.Column(db.Integer, nullable=False, default=0)
    damage_taken = db.Column(db.Integer, nullable=False, default=0)
    pistol_shots = db.Column(db.Integer, nullable=False, default=0)
    grenades_used = db.Column(db.Integer, nullable=False, default=0)
    medkits_used = db.Column(db.Integer, nullable=False, default=0)
    reloads = db.Column(db.Integer, nullable=False, default=0)
    knife_uses = db.Column(db.Integer, nullable=False, default=0)

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
    run_state_json = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

class Friend(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")

class FriendRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected

    from_user = db.relationship('User', foreign_keys=[from_user_id])
    to_user = db.relationship('User', foreign_keys=[to_user_id])

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    message = db.Column(db.Text, nullable=True)
    ciphertext = db.Column(db.Text, nullable=True)
    nonce = db.Column(db.String(64), nullable=True)
    sender_key_id = db.Column(db.String(64), nullable=True)
    sender_public_key = db.Column(db.Text, nullable=True)
    recipient_key_id = db.Column(db.String(64), nullable=True)
    recipient_public_key = db.Column(db.Text, nullable=True)
    encryption_version = db.Column(db.Integer, nullable=False, default=1)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

class UserAchievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    achievement_id = db.Column(db.String(80), nullable=False)
    unlocked_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

class ProfileReaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    profile_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    reactor_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    reaction_type = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("profile_user_id", "reactor_user_id", name="uq_profile_reaction"),
    )

class ProfileComment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    profile_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    author_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_user_id])
