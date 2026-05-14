from datetime import timedelta


BIO_MAX_LENGTH = 500
PROFILE_COMMENT_MAX_LENGTH = 240
PROFILE_IMAGE_DEFAULT = "images/Shadows.gif"
PROFILE_IMAGE_UPLOAD_PREFIX = "uploads/profile_pics/"
PROFILE_IMAGE_ALLOWED_EXTENSIONS = {".jpg", ".jpeg"}
PROFILE_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
ONLINE_WINDOW = timedelta(minutes=2)
PRESENCE_REFRESH_INTERVAL = timedelta(seconds=30)

PROFILE_IMAGE_OPTIONS = [
    {"label": "Shadows", "filename": PROFILE_IMAGE_DEFAULT},
    {"label": "Leon", "filename": "images/players/leon_idle.png"},
    {"label": "Quite", "filename": "images/players/quite_idle.png"},
    {"label": "Duo", "filename": "images/quite_dual_good.png"},
    {"label": "Leon Classic", "filename": "images/profile_presets/leon_classic.jpeg"},
    {"label": "Leon Noir", "filename": "images/profile_presets/leon_profile_2.jpg"},
    {"label": "Leon Agent", "filename": "images/profile_presets/leon_profile_3.jpg"},
    {"label": "Quite Focus", "filename": "images/profile_presets/quite_pfp_1.jpg"},
    {"label": "Quite Tactical", "filename": "images/profile_presets/quite_pfp_2.jpg"},
    {"label": "Quite Chibi", "filename": "images/profile_presets/quite_pfp_3.jpg"},
]
PROFILE_IMAGE_FILENAMES = {
    option["filename"]
    for option in PROFILE_IMAGE_OPTIONS
}

FAVORITE_CHARACTER_OPTIONS = [
    {"label": "No Favorite", "value": ""},
    {"label": "Leon", "value": "leon"},
    {"label": "Quite", "value": "quite"},
]
FAVORITE_CHARACTER_LABELS = {
    option["value"]: option["label"]
    for option in FAVORITE_CHARACTER_OPTIONS
}

PROFILE_BACKGROUND_OPTIONS = [
    {"label": "Default", "value": "default"},
    {"label": "Neon Grid", "value": "neon"},
    {"label": "Gold Signal", "value": "gold"},
    {"label": "Red Alert", "value": "red"},
]
PROFILE_BACKGROUND_LABELS = {
    option["value"]: option["label"]
    for option in PROFILE_BACKGROUND_OPTIONS
}

PROFILE_REACTION_OPTIONS = [
    {"label": "Heart", "value": "heart", "symbol": "❤️"},
    {"label": "Hype", "value": "hype", "symbol": "🔥"},
    {"label": "Sad", "value": "sad", "symbol": "😢"},
    {"label": "Angry", "value": "angry", "symbol": "😡"},
]
PROFILE_REACTION_VALUES = {
    option["value"]
    for option in PROFILE_REACTION_OPTIONS
}

AGENT_LICENSE_NUMBER = "RZ-74291863"
AGENT_BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")

ACHIEVEMENT_TIER_ORDER = ("bronze", "silver", "gold")
ACHIEVEMENT_TIER_LABELS = {
    "bronze": "BRONZE",
    "silver": "SILVER",
    "gold": "GOLD",
}
ACHIEVEMENT_TIER_RANKS = {
    tier_name: index + 1
    for index, tier_name in enumerate(ACHIEVEMENT_TIER_ORDER)
}
