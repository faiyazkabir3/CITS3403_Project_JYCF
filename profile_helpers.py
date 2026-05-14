import hashlib
import random
from pathlib import Path
from uuid import uuid4

from flask import current_app
from sqlalchemy import func
from werkzeug.utils import secure_filename

from achievement_helpers import get_user_achievements
from app_constants import (
    AGENT_BLOOD_GROUPS,
    AGENT_LICENSE_NUMBER,
    PROFILE_BACKGROUND_LABELS,
    PROFILE_COMMENT_MAX_LENGTH,
    PROFILE_IMAGE_ALLOWED_EXTENSIONS,
    PROFILE_IMAGE_DEFAULT,
    PROFILE_IMAGE_FILENAMES,
    PROFILE_IMAGE_UPLOAD_PREFIX,
    PROFILE_REACTION_OPTIONS,
)
from models import Friend, ProfileComment, ProfileReaction, db
from save_helpers import coerce_int


def get_display_name(user):
    if user is None:
        return ""

    display_name = (user.display_name or "").strip()
    return display_name or user.username


def format_agent_id(user):
    user_id = getattr(user, "id", None)
    if user_id is None:
        return "GUEST"

    return f"#{coerce_int(user_id, 0):05d}"


def get_agent_dossier_rng(user=None, field="profile"):
    user_id = getattr(user, "id", None)
    seed_source = f"agent-dossier:{field}:{user_id if user_id is not None else 'guest'}"
    seed = int(hashlib.sha256(seed_source.encode("utf-8")).hexdigest(), 16)
    return random.Random(seed)


def get_agent_dossier_age(rng):
    return str(rng.randint(21, 29))


def format_agent_height(total_inches):
    feet = total_inches // 12
    inches = total_inches % 12
    return f"{feet}'{inches}\""


def get_agent_dossier_height(rng):
    return format_agent_height(rng.randint(65, 75))


def get_agent_dossier_blood_group(user=None):
    rng = get_agent_dossier_rng(user, "blood-group")
    return AGENT_BLOOD_GROUPS[rng.randrange(len(AGENT_BLOOD_GROUPS))]


def get_agent_dossier(user=None):
    vitals_rng = get_agent_dossier_rng(user, "vitals")

    return [
        {"label": "AGE", "value": get_agent_dossier_age(vitals_rng), "key": "age"},
        {"label": "HEIGHT", "value": get_agent_dossier_height(vitals_rng), "key": "height"},
        {"label": "AGENT ID", "value": format_agent_id(user), "key": "agent-id"},
        {"label": "LICENCE NO.", "value": AGENT_LICENSE_NUMBER, "key": "licence"},
        {"label": "BLOOD GROUP", "value": get_agent_dossier_blood_group(user), "key": "blood-group"},
    ]


def get_profile_badges(user, achievements=None, leaderboard_entry=None):
    if user is None:
        return []

    badges = []
    achievements = achievements or get_user_achievements(user.id)

    for achievement in achievements:
        if achievement.get("unlocked"):
            badges.append({
                "label": achievement["name"],
                "symbol": achievement["icon"],
                "description": achievement["description"],
                "kind": "achievement",
                "image": achievement.get("badge_image"),
                "tier_label": achievement.get("tier_label"),
            })

    if leaderboard_entry is not None:
        badges.append({
            "label": "Ranked",
            "symbol": f"#{leaderboard_entry['rank']}",
            "description": "Appears on the global leaderboard.",
            "kind": "exclusive",
        })

    friend_count = Friend.query.filter_by(user_id=user.id, status="accepted").count()
    if friend_count > 0:
        badges.append({
            "label": "Social Link",
            "symbol": "SL",
            "description": "Has connected with other players.",
            "kind": "exclusive",
        })

    if get_profile_background(user) != "default" or get_custom_profile_image(user) is not None:
        badges.append({
            "label": "Custom Signal",
            "symbol": "CS",
            "description": "Uses profile customisation.",
            "kind": "exclusive",
        })

    if user.hide_from_leaderboard:
        badges.append({
            "label": "Ghost Mode",
            "symbol": "GM",
            "description": "Keeps their leaderboard position private.",
            "kind": "exclusive",
        })

    return badges[:8]


def normalize_profile_image_path(profile_image):
    return (profile_image or "").strip().replace("\\", "/")


def get_profile_image_upload_dir():
    return Path(current_app.config["PROFILE_IMAGE_UPLOAD_DIR"])


def resolve_uploaded_profile_image(profile_image):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if not normalized_profile_image.startswith(PROFILE_IMAGE_UPLOAD_PREFIX):
        return None

    candidate_path = (Path(current_app.static_folder) / normalized_profile_image).resolve()
    upload_root = get_profile_image_upload_dir().resolve()

    try:
        candidate_path.relative_to(upload_root)
    except ValueError:
        return None

    return candidate_path


def is_uploaded_profile_image(profile_image):
    return resolve_uploaded_profile_image(profile_image) is not None


def is_valid_profile_image(profile_image):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if normalized_profile_image in PROFILE_IMAGE_FILENAMES:
        return True

    uploaded_path = resolve_uploaded_profile_image(normalized_profile_image)
    return uploaded_path is not None and uploaded_path.is_file()


def is_selectable_profile_image_for_user(profile_image, user_id):
    normalized_profile_image = normalize_profile_image_path(profile_image)

    if normalized_profile_image in PROFILE_IMAGE_FILENAMES:
        return True

    uploaded_path = resolve_uploaded_profile_image(normalized_profile_image)
    if uploaded_path is None or not uploaded_path.is_file():
        return False

    return uploaded_path.name.startswith(f"user_{user_id}_")


def get_custom_profile_image(user):
    if user is None:
        return None

    profile_image = normalize_profile_image_path(user.profile_image)
    if is_uploaded_profile_image(profile_image) and is_valid_profile_image(profile_image):
        return profile_image

    return None


def validate_uploaded_profile_image(file_storage):
    filename = secure_filename(file_storage.filename or "")
    extension = Path(filename).suffix.lower()

    if extension not in PROFILE_IMAGE_ALLOWED_EXTENSIONS:
        return "Upload a JPEG image (.jpg or .jpeg)."

    file_storage.stream.seek(0)
    header = file_storage.stream.read(3)
    file_storage.stream.seek(0)

    if header != b"\xff\xd8\xff":
        return "Upload a valid JPEG image."

    return None


def save_uploaded_profile_image(file_storage, user_id):
    stored_filename = f"user_{user_id}_{uuid4().hex}.jpg"
    relative_path = f"{PROFILE_IMAGE_UPLOAD_PREFIX}{stored_filename}"
    absolute_path = get_profile_image_upload_dir() / stored_filename

    try:
        file_storage.save(absolute_path)
    except OSError as error:
        current_app.logger.warning(
            "Profile image upload failed for user %s. %s",
            user_id,
            error
        )
        return None, "Profile image upload failed."

    return relative_path, None


def delete_uploaded_profile_image(profile_image):
    uploaded_path = resolve_uploaded_profile_image(profile_image)

    if uploaded_path is None or not uploaded_path.exists():
        return

    try:
        uploaded_path.unlink()
    except OSError as error:
        current_app.logger.warning(
            "Profile image cleanup failed for %s. %s",
            profile_image,
            error
        )


def get_profile_image(user):
    if user is None:
        return PROFILE_IMAGE_DEFAULT

    profile_image = normalize_profile_image_path(user.profile_image)
    if is_valid_profile_image(profile_image):
        return profile_image

    return PROFILE_IMAGE_DEFAULT


def get_profile_bio(user):
    if user is None:
        return ""

    return (user.bio or "").strip()


def get_profile_background(user):
    background = str(getattr(user, "profile_background", "default") or "default").strip().lower()

    if background in PROFILE_BACKGROUND_LABELS:
        return background

    return "default"


def normalize_profile_comment(comment):
    return str(comment or "").strip()


def validate_profile_comment(comment):
    if comment == "":
        return "Comment cannot be empty."

    if len(comment) > PROFILE_COMMENT_MAX_LENGTH:
        return f"Comment must be {PROFILE_COMMENT_MAX_LENGTH} characters or fewer."

    return None


def get_profile_reaction_counts(profile_user_id, current_user_id=None):
    counts = {
        option["value"]: {
            **option,
            "count": 0,
            "is_current_user": False,
        }
        for option in PROFILE_REACTION_OPTIONS
    }

    rows = (
        db.session.query(
            ProfileReaction.reaction_type,
            func.count(ProfileReaction.id)
        )
        .filter(ProfileReaction.profile_user_id == profile_user_id)
        .group_by(ProfileReaction.reaction_type)
        .all()
    )

    for reaction_type, count in rows:
        if reaction_type in counts:
            counts[reaction_type]["count"] = count

    if current_user_id is not None:
        current_reaction = ProfileReaction.query.filter_by(
            profile_user_id=profile_user_id,
            reactor_user_id=current_user_id
        ).first()

        if current_reaction is not None and current_reaction.reaction_type in counts:
            counts[current_reaction.reaction_type]["is_current_user"] = True

    return list(counts.values())


def get_profile_comments(profile_user_id, limit=10):
    return (
        ProfileComment.query
        .filter_by(profile_user_id=profile_user_id)
        .order_by(ProfileComment.created_at.desc())
        .limit(limit)
        .all()
    )
