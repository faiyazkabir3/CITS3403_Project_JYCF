from dataclasses import asdict
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from app_constants import (
    ACHIEVEMENT_TIER_LABELS,
    ACHIEVEMENT_TIER_ORDER,
    ACHIEVEMENT_TIER_RANKS,
)
from db_helpers import rollback_database_session
from domain_types import AchievementDefinition
from models import UserAchievement, db, utc_now
from save_helpers import (
    coerce_bool,
    coerce_int,
    get_latest_save_payload,
    get_user_stats,
    list_db_save_payloads,
    list_fallback_save_payloads,
    parse_level_number,
)


STATIC_ASSET_ROOT = Path(__file__).resolve().parent / "static"


def get_achievement_definitions():
    return [
        AchievementDefinition(
            id="first_blood",
            name="First Blood",
            description="Defeat your first infected.",
            target=1,
            metric="kills",
            icon="I",
            tier_thresholds=(1, 10, 20),
            badge_family="first_blood",
        ),
        AchievementDefinition(
            id="survivor",
            name="Survivor",
            description="Reach level 3 or beyond.",
            target=3,
            metric="levels",
            icon="III",
            tier_thresholds=(3, 5, 7),
            badge_family="survivor",
        ),
        AchievementDefinition(
            id="sharpshooter",
            name="Sharpshooter",
            description="Deal 500 damage with 10 or fewer pistol shots.",
            target=500,
            metric="damage_dealt",
            icon="S",
            tier_thresholds=(500, 1000, 1500),
            badge_family="sharpshooter",
        ),
        AchievementDefinition(
            id="medic",
            name="Medic",
            description="Use 5 medkits.",
            target=5,
            metric="medkits",
            icon="+",
            tier_thresholds=(5, 10, 15),
            badge_family="medic",
        ),
        AchievementDefinition(
            id="no_mercy",
            name="No Mercy",
            description="Defeat 10 infected.",
            target=10,
            metric="kills",
            icon="10",
            tier_thresholds=(10, 20, 30),
            badge_family="no_mercy",
        ),
        AchievementDefinition(
            id="untouchable",
            name="Untouchable",
            description="Save a run after taking no damage.",
            target=1,
            metric="untouchable_runs",
            icon="0",
            tier_thresholds=(1, 2, 3),
            badge_family="untouchable",
        ),
        AchievementDefinition(
            id="nemesis_hunter",
            name="Nemesis Hunter",
            description="Defeat Nemesis-T Type once.",
            target=1,
            metric="nemesis_kills",
            icon="NT",
            tier_thresholds=(1, 1, 1),
            badge_family="nemesis_hunter",
            badge_image="images/badges/nemesis_hunter.jpeg",
        ),
    ]


def get_achievement_progress(user_id, stats=None):
    stats = stats or get_user_stats(user_id)
    latest_payload = get_latest_save_payload(user_id)
    latest_level = parse_level_number((latest_payload or {}).get("current_level_id"))

    return {
        "kills": coerce_int(stats.get("kills"), 0),
        "nemesis_kills": coerce_int(stats.get("nemesis_kills"), 0),
        "levels": latest_level,
        "damage_dealt": coerce_int(stats.get("damage_dealt"), 0),
        "medkits": coerce_int(stats.get("medkits"), 0),
        "untouchable_runs": count_untouchable_runs(user_id),
        "pistol_shots": coerce_int(stats.get("pistol_shots"), 0),
    }


def count_untouchable_runs(user_id):
    try:
        payloads = list_db_save_payloads(user_id)
    except SQLAlchemyError:
        rollback_database_session("Untouchable run query")
        payloads = []

    payloads.extend(list_fallback_save_payloads(user_id))

    seen_runs = set()
    untouchable_count = 0
    for payload in payloads:
        run_key = (
            str(payload.get("character_id", "")),
            str(payload.get("updated_at", "")),
        )
        if run_key in seen_runs:
            continue

        seen_runs.add(run_key)
        if (
            coerce_bool(payload.get("has_started_game"), False)
            and coerce_int(payload.get("damage_taken"), 0) == 0
        ):
            untouchable_count += 1

    return untouchable_count


def achievement_is_unlocked(definition, progress):
    if definition.id == "sharpshooter":
        return (
            coerce_int(progress.get("damage_dealt"), 0) >= definition.target
            and coerce_int(progress.get("pistol_shots"), 0) <= 10
        )

    return coerce_int(progress.get(definition.metric), 0) >= definition.target


def get_achievement_current_value(definition, progress):
    if definition.id == "sharpshooter":
        return coerce_int(progress.get("damage_dealt"), 0)

    return coerce_int(progress.get(definition.metric), 0)


def get_achievement_tier(definition, current, unlocked):
    if not unlocked:
        return None

    earned_tier = None
    for tier_name, threshold in zip(ACHIEVEMENT_TIER_ORDER, definition.tier_thresholds):
        if current >= threshold:
            earned_tier = tier_name

    return earned_tier


def get_next_achievement_tier(definition, current):
    for tier_name, threshold in zip(ACHIEVEMENT_TIER_ORDER, definition.tier_thresholds):
        if current < threshold:
            return tier_name, threshold

    return None, None


def get_achievement_badge_image(definition, tier_name=None):
    if definition.badge_image:
        return definition.badge_image

    badge_tier = tier_name or ACHIEVEMENT_TIER_ORDER[0]
    v2_badge = f"images/badges/{definition.badge_family}_{badge_tier}_v2.png"
    if (STATIC_ASSET_ROOT / v2_badge).is_file():
        return v2_badge

    return f"images/badges/{definition.badge_family}_{badge_tier}.png"


def get_user_achievements(user_id):
    unlocked_rows = UserAchievement.query.filter_by(user_id=user_id).all()
    unlocked_by_id = {
        row.achievement_id: row
        for row in unlocked_rows
    }
    stats = get_user_stats(user_id)
    progress = get_achievement_progress(user_id, stats=stats)
    achievements = []

    for definition in get_achievement_definitions():
        row = unlocked_by_id.get(definition.id)
        current = get_achievement_current_value(definition, progress)
        unlocked = row is not None
        tier_name = get_achievement_tier(definition, current, unlocked)
        next_tier_name, next_tier_target = get_next_achievement_tier(definition, current)
        display_tier_name = tier_name or next_tier_name or ACHIEVEMENT_TIER_ORDER[-1]

        achievements.append({
            **asdict(definition),
            "current": min(current, definition.target),
            "tier_current": min(current, definition.tier_thresholds[-1]),
            "tier_target": definition.tier_thresholds[-1],
            "tier_name": tier_name,
            "tier_label": ACHIEVEMENT_TIER_LABELS.get(tier_name, "LOCKED"),
            "tier_rank": ACHIEVEMENT_TIER_RANKS.get(tier_name, 0),
            "next_tier_name": next_tier_name,
            "next_tier_label": ACHIEVEMENT_TIER_LABELS.get(next_tier_name),
            "next_tier_target": next_tier_target,
            "badge_image": get_achievement_badge_image(definition, display_tier_name),
            "unlocked": unlocked,
            "unlocked_at": row.unlocked_at if row is not None else None,
        })

    return achievements


def get_agent_showcase_badges(achievements=None):
    earned_badges = []

    for achievement in achievements or []:
        if not achievement.get("tier_name"):
            continue

        earned_badges.append({
            "label": achievement["name"],
            "description": achievement["description"],
            "tier_name": achievement["tier_name"],
            "tier_label": achievement["tier_label"],
            "tier_rank": achievement["tier_rank"],
            "image": achievement["badge_image"],
            "current": achievement["tier_current"],
        })

    return sorted(
        earned_badges,
        key=lambda badge: (badge["tier_rank"], badge["current"], badge["label"]),
        reverse=True
    )[:3]


def unlock_achievements_for_user(user_id):
    existing_ids = {
        row.achievement_id
        for row in UserAchievement.query.filter_by(user_id=user_id).all()
    }
    stats = get_user_stats(user_id)
    progress = get_achievement_progress(user_id, stats=stats)
    unlocked = []

    for definition in get_achievement_definitions():
        if definition.id in existing_ids:
            continue

        if achievement_is_unlocked(definition, progress):
            row = UserAchievement(
                user_id=user_id,
                achievement_id=definition.id,
                unlocked_at=utc_now()
            )
            db.session.add(row)
            unlocked.append(definition.name)

    return unlocked
