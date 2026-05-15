import click
from werkzeug.security import generate_password_hash

from .models import SaveData, User, db, utc_now


def register_cli_commands(app):
    @app.cli.command("seed-demo")
    def seed_demo_command():
        """Create deterministic demo users and saves for local development."""
        demo_password = "RouteZero123!"
        now = utc_now()
        demo_specs = [
            {
                "username": "leon_demo",
                "display_name": "Leon Demo",
                "favorite_character": "leon",
                "profile_image": "images/players/leon_idle.png",
                "save": {
                    "difficulty": "HARD",
                    "character_id": "leon",
                    "health": 82,
                    "medkits": 1,
                    "grenades": 1,
                    "kills": 8,
                    "damage_dealt": 760,
                    "damage_taken": 46,
                    "pistol_shots": 22,
                    "grenades_used": 2,
                    "medkits_used": 1,
                    "reloads": 3,
                    "knife_uses": 4,
                    "ammo_in_gun": 5,
                    "ammo_in_bag": 12,
                    "mag_capacity": 8,
                    "laser_upgrade": True,
                    "shield_owned": True,
                    "shield_on": True,
                    "current_level_id": "5D",
                    "enemies_remaining": 2,
                },
            },
            {
                "username": "quite_demo",
                "display_name": "Quite Demo",
                "favorite_character": "quite",
                "profile_image": "images/players/quite_idle.png",
                "save": {
                    "difficulty": "EASY",
                    "character_id": "quite",
                    "health": 91,
                    "medkits": 2,
                    "grenades": 0,
                    "kills": 11,
                    "damage_dealt": 940,
                    "damage_taken": 28,
                    "pistol_shots": 27,
                    "grenades_used": 1,
                    "medkits_used": 1,
                    "reloads": 4,
                    "knife_uses": 7,
                    "ammo_in_gun": 6,
                    "ammo_in_bag": 10,
                    "mag_capacity": 8,
                    "laser_upgrade": True,
                    "shield_owned": False,
                    "shield_on": False,
                    "current_level_id": "5A",
                    "enemies_remaining": 1,
                },
            },
        ]

        created_users = 0
        created_saves = 0

        for spec in demo_specs:
            user = User.query.filter_by(username=spec["username"]).first()
            if user is None:
                user = User(
                    username=spec["username"],
                    display_name=spec["display_name"],
                    password_hash=generate_password_hash(
                        demo_password,
                        method="pbkdf2:sha256"
                    ),
                )
                db.session.add(user)
                db.session.flush()
                created_users += 1

            user.display_name = spec["display_name"]
            user.profile_image = spec["profile_image"]
            user.favorite_character = spec["favorite_character"]
            user.hide_from_leaderboard = False
            user.show_stats_to_friends = True
            user.allow_friend_messages = True

            save_values = spec["save"]
            save_data = SaveData.query.filter_by(
                user_id=user.id,
                character_id=save_values["character_id"],
            ).first()
            if save_data is None:
                save_data = SaveData(
                    user_id=user.id,
                    character_id=save_values["character_id"],
                )
                db.session.add(save_data)
                created_saves += 1

            for field, value in save_values.items():
                setattr(save_data, field, value)

            save_data.level_complete = False
            save_data.awaiting_choice = False
            save_data.game_won = False
            save_data.has_started_game = True
            save_data.run_state_json = None
            save_data.updated_at = now

        db.session.commit()
        click.echo(
            "Demo seed complete. "
            f"Users created: {created_users}. Saves created: {created_saves}. "
            f"Demo password: {demo_password}"
        )
