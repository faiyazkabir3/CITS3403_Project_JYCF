from dataclasses import asdict

from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from ..domain.domain_types import LeaderboardEntry, LeaderboardStats
from ..models import Friend, SaveData, User, db
from .db_helpers import rollback_database_session
from .save_helpers import coerce_int


def calculate_leaderboard_score(stats):
    if isinstance(stats, LeaderboardStats):
        stats = asdict(stats)

    return (
        coerce_int(stats.get("kills"), 0)
        + coerce_int(stats.get("pistol_shots"), 0)
        + coerce_int(stats.get("grenades_used"), 0)
        + coerce_int(stats.get("medkits_used"), 0)
        + coerce_int(stats.get("reloads"), 0)
        + coerce_int(stats.get("knife_uses"), 0)
        + (coerce_int(stats.get("damage_dealt"), 0) // 100)
        + (coerce_int(stats.get("damage_taken"), 0) // 2)
    )


def get_leaderboard_entries(current_user_id=None, limit=None, user_ids=None):
    try:
        query = (
            db.session.query(
                User.id.label("user_id"),
                User.username.label("username"),
                User.display_name.label("display_name"),
                func.coalesce(func.sum(SaveData.kills), 0).label("kills"),
                func.coalesce(func.sum(SaveData.damage_dealt), 0).label("damage_dealt"),
                func.coalesce(func.sum(SaveData.damage_taken), 0).label("damage_taken"),
                func.coalesce(func.sum(SaveData.pistol_shots), 0).label("pistol_shots"),
                func.coalesce(func.sum(SaveData.grenades_used), 0).label("grenades_used"),
                func.coalesce(func.sum(SaveData.medkits_used), 0).label("medkits_used"),
                func.coalesce(func.sum(SaveData.reloads), 0).label("reloads"),
                func.coalesce(func.sum(SaveData.knife_uses), 0).label("knife_uses"),
            )
            .join(SaveData, SaveData.user_id == User.id)
            .filter(SaveData.has_started_game.is_(True))
            .filter(User.hide_from_leaderboard.is_(False))
        )

        if user_ids is not None:
            query = query.filter(User.id.in_(user_ids))

        rows = (
            query
            .group_by(User.id, User.username, User.display_name)
            .all()
        )
    except SQLAlchemyError as error:
        rollback_database_session("Leaderboard query")
        current_app.logger.warning(
            "Leaderboard query failed. %s",
            getattr(error, "orig", error)
        )
        return []

    entries = []

    for row in rows:
        display_name = (row.display_name or "").strip() or row.username
        stats = LeaderboardStats(
            kills=row.kills,
            damage_dealt=row.damage_dealt,
            damage_taken=row.damage_taken,
            pistol_shots=row.pistol_shots,
            grenades_used=row.grenades_used,
            medkits_used=row.medkits_used,
            reloads=row.reloads,
            knife_uses=row.knife_uses,
        )
        entries.append(LeaderboardEntry(
            user_id=row.user_id,
            display_name=display_name,
            login_username=row.username,
            score=calculate_leaderboard_score(stats),
        ))

    ranked_entries = sorted(
        entries,
        key=lambda entry: (-entry.score, entry.display_name.lower(), entry.login_username)
    )

    for index, entry in enumerate(ranked_entries, start=1):
        entry.rank = index
        entry.is_current_user = entry.user_id == current_user_id

    if limit is not None:
        ranked_entries = ranked_entries[:limit]

    return [asdict(entry) for entry in ranked_entries]


def get_leaderboard(limit=5, current_user_id=None):
    return get_leaderboard_entries(
        current_user_id=current_user_id,
        limit=limit
    )


def get_leaderboard_entry_for_user(user_id, current_user_id=None):
    for entry in get_leaderboard_entries(current_user_id=current_user_id):
        if entry["user_id"] == user_id:
            return entry

    return None


def get_friends_leaderboard(current_user_id):
    friend_ids = [
        friendship.friend_id
        for friendship in Friend.query.filter_by(
            user_id=current_user_id,
            status="accepted"
        ).all()
    ]
    visible_user_ids = [current_user_id, *friend_ids]
    return get_leaderboard_entries(
        current_user_id=current_user_id,
        user_ids=visible_user_ids
    )


def get_friend_rank(current_user_id):
    for entry in get_friends_leaderboard(current_user_id):
        if entry["user_id"] == current_user_id:
            return entry

    return None
