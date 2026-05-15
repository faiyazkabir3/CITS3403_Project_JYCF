import base64
import json
import os
import re
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app, session
from sqlalchemy.exc import SQLAlchemyError

from ..constants import FAVORITE_CHARACTER_LABELS
from ..domain.domain_types import PlayerStats
from ..models import SaveData, db, utc_now
from .db_helpers import rollback_database_session


COUNTER_ANALYTICS_FIELDS = {
    "kills": "enemiesKilled",
    "nemesis_kills": "nemesisKills",
    "damage_dealt": "damageDealt",
    "damage_taken": "damageTaken",
    "pistol_shots": "pistolShotsFired",
    "grenades_used": "grenadesUsed",
    "medkits_used": "medKitsUsed",
    "reloads": "reloads",
    "knife_uses": "knivesUsed",
}


def parse_save_payload_key_ring(raw_key_ring):
    if not raw_key_ring.strip():
        raise RuntimeError("SAVE_PAYLOAD_KEYS is missing. Add at least one key like v1:<base64-32-byte-key>.")

    key_ring = {}
    active_key_id = None

    for entry in raw_key_ring.split(","):
        key_id, separator, encoded_key = entry.strip().partition(":")
        if not separator or not key_id or not encoded_key:
            raise RuntimeError("SAVE_PAYLOAD_KEYS entries must use key_id:base64_key format.")

        try:
            key = base64.urlsafe_b64decode(encoded_key + "=" * (-len(encoded_key) % 4))
        except ValueError as error:
            raise RuntimeError(f"SAVE_PAYLOAD_KEYS entry {key_id} is not valid base64.") from error

        if len(key) != 32:
            raise RuntimeError(f"SAVE_PAYLOAD_KEYS entry {key_id} must decode to 32 bytes.")

        key_ring[key_id] = key
        active_key_id = active_key_id or key_id

    return active_key_id, key_ring


def get_user_stats(user_id):
    all_saves = SaveData.query.filter_by(user_id=user_id).all()
    payloads = [
        normalize_save_payload(build_save_payload(save))
        for save in all_saves
    ]

    def total(field):
        return sum((payload.get(field) or 0) for payload in payloads if payload)

    return asdict(PlayerStats(
        kills=total("kills"),
        nemesis_kills=total("nemesis_kills"),
        damage_dealt=total("damage_dealt"),
        damage_taken=total("damage_taken"),
        pistol_shots=total("pistol_shots"),
        grenades=total("grenades_used"),
        medkits=total("medkits_used"),
        reloads=total("reloads"),
        knife_uses=total("knife_uses"),
    ))


def get_empty_stats():
    return asdict(PlayerStats())


def parse_level_number(value):
    match = re.search(r"\d+", str(value or ""))
    if match is None:
        return 0

    return coerce_int(match.group(0), 0)


def get_latest_save_payload(user_id):
    try:
        payloads = list_db_save_payloads(user_id)
    except SQLAlchemyError:
        rollback_database_session("Latest save query")
        payloads = []

    payloads.extend(list_fallback_save_payloads(user_id))
    return choose_latest_save_payload(*payloads)


def get_latest_run_summary(user_id):
    payload = get_latest_save_payload(user_id)

    if payload is None:
        return None

    return {
        "difficulty": payload.get("difficulty", "EASY"),
        "character": FAVORITE_CHARACTER_LABELS.get(
            str(payload.get("character_id", "")).lower(),
            str(payload.get("character_id", "Unknown")).title()
        ),
        "current_level": payload.get("current_level_id", "1"),
        "kills": coerce_int(payload.get("kills"), 0),
        "game_won": coerce_bool(payload.get("game_won"), False),
        "updated_at": payload.get("updated_at"),
    }


def get_user_save(character_id=None, create=False):
    user_id = session.get("user_id")

    if user_id is None:
        return None

    if character_id is None:
        character_id = session.get("selected_character", "leon")

    character_id = str(character_id).lower()

    save_data = SaveData.query.filter_by(
        user_id=user_id,
        character_id=character_id
    ).first()

    if save_data is None and create:
        save_data = SaveData(
            user_id=user_id,
            character_id=character_id
        )
        db.session.add(save_data)

    return save_data


def coerce_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def coerce_bool(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}

    return bool(value)


def build_save_payload_from_request(data, updated_at=None):
    timestamp = updated_at or utc_now()

    return {
        "difficulty": str(data.get("difficulty", "EASY")).upper(),
        "character_id": str(data.get("character_id", "leon")).lower(),
        "health": coerce_int(data.get("health"), 100),
        "medkits": coerce_int(data.get("medkits"), 0),
        "grenades": coerce_int(data.get("grenades"), 0),
        "ammo_in_gun": coerce_int(data.get("ammo_in_gun"), 0),
        "ammo_in_bag": coerce_int(data.get("ammo_in_bag"), 0),
        "mag_capacity": coerce_int(data.get("mag_capacity"), 8),
        "laser_upgrade": coerce_bool(data.get("laser_upgrade"), False),
        "shield_owned": coerce_bool(data.get("shield_owned"), False),
        "shield_on": coerce_bool(data.get("shield_on"), False),
        "current_level_id": str(data.get("current_level_id", "1")),
        "enemies_remaining": coerce_int(data.get("enemies_remaining"), 0),
        "level_complete": coerce_bool(data.get("level_complete"), False),
        "awaiting_choice": coerce_bool(data.get("awaiting_choice"), False),
        "game_won": coerce_bool(data.get("game_won"), False),
        "has_started_game": True,
        "kills": coerce_int(data.get("kills"), 0),
        "nemesis_kills": coerce_int(data.get("nemesis_kills"), 0),
        "damage_dealt": coerce_int(data.get("damage_dealt"), 0),
        "damage_taken": coerce_int(data.get("damage_taken"), 0),
        "pistol_shots": coerce_int(data.get("pistol_shots"), 0),
        "grenades_used": coerce_int(data.get("grenades_used"), 0),
        "medkits_used": coerce_int(data.get("medkits_used"), 0),
        "reloads": coerce_int(data.get("reloads"), 0),
        "knife_uses": coerce_int(data.get("knife_uses"), 0),
        "run_state": data.get("run_state"),
        "updated_at": timestamp.isoformat()
    }


def get_fallback_save_path(user_id, character_id):
    safe_character = "".join(
        char for char in str(character_id).lower()
        if char.isalnum() or char in {"-", "_"}
    ) or "leon"
    return Path(current_app.config["SAVE_FALLBACK_DIR"]) / f"user_{user_id}_{safe_character}.json"


def encrypt_save_payload(payload):
    active_key_id = current_app.config["SAVE_PAYLOAD_ACTIVE_KEY_ID"]
    key = current_app.config["SAVE_PAYLOAD_KEY_RING"][active_key_id]
    nonce = os.urandom(12)
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)

    return {
        "encrypted": True,
        "version": 1,
        "key_id": active_key_id,
        "nonce": base64.urlsafe_b64encode(nonce).decode("ascii").rstrip("="),
        "ciphertext": base64.urlsafe_b64encode(ciphertext).decode("ascii").rstrip("="),
    }


def decode_envelope_value(value):
    return base64.urlsafe_b64decode(str(value) + "=" * (-len(str(value)) % 4))


def decrypt_save_payload(envelope):
    if not isinstance(envelope, dict) or not envelope.get("encrypted"):
        if current_app.config.get("ALLOW_PLAINTEXT_SAVE_FALLBACKS"):
            return envelope
        return None

    key_id = envelope.get("key_id")
    key = current_app.config["SAVE_PAYLOAD_KEY_RING"].get(key_id)
    if key is None:
        return None

    try:
        nonce = decode_envelope_value(envelope.get("nonce", ""))
        ciphertext = decode_envelope_value(envelope.get("ciphertext", ""))
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode("utf-8"))
    except (InvalidTag, OSError, TypeError, ValueError, json.JSONDecodeError):
        return None


def write_fallback_save(user_id, character_id, payload):
    path = get_fallback_save_path(user_id, character_id)
    path.write_text(json.dumps(encrypt_save_payload(payload), separators=(",", ":")), encoding="utf-8")


def read_fallback_save(user_id, character_id):
    path = get_fallback_save_path(user_id, character_id)

    if not path.exists():
        return None

    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
        return normalize_save_payload(decrypt_save_payload(envelope))
    except (OSError, json.JSONDecodeError):
        return None


def list_fallback_save_payloads(user_id):
    pattern = f"user_{user_id}_*.json"
    payloads = []

    for path in Path(current_app.config["SAVE_FALLBACK_DIR"]).glob(pattern):
        try:
            envelope = json.loads(path.read_text(encoding="utf-8"))
            payload = normalize_save_payload(decrypt_save_payload(envelope))
        except (OSError, json.JSONDecodeError):
            continue

        if payload is not None:
            payloads.append(payload)

    return payloads


def parse_updated_at(value):
    if not value:
        return datetime.min

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return datetime.min


def normalize_save_payload(payload):
    if not isinstance(payload, dict):
        return None

    normalized = dict(payload)
    run_state = normalized.get("run_state")

    if isinstance(run_state, dict):
        player = run_state.get("player") or {}
        inventory = run_state.get("inventory") or {}
        progression = run_state.get("progression") or {}

        if player.get("characterId") is not None:
            normalized["character_id"] = str(player.get("characterId")).lower()

        if inventory.get("health") is not None:
            normalized["health"] = coerce_int(inventory.get("health"), normalized.get("health", 100))

        if progression.get("currentLevelId") is not None:
            normalized["current_level_id"] = str(progression.get("currentLevelId"))

        if progression.get("enemiesRemaining") is not None:
            normalized["enemies_remaining"] = coerce_int(
                progression.get("enemiesRemaining"),
                normalized.get("enemies_remaining", 0)
            )

        if progression.get("levelComplete") is not None:
            normalized["level_complete"] = coerce_bool(
                progression.get("levelComplete"),
                normalized.get("level_complete", False)
            )

        if progression.get("awaitingChoice") is not None:
            normalized["awaiting_choice"] = coerce_bool(
                progression.get("awaitingChoice"),
                normalized.get("awaiting_choice", False)
            )

        if progression.get("gameWon") is not None:
            normalized["game_won"] = coerce_bool(
                progression.get("gameWon"),
                normalized.get("game_won", False)
            )

        analytics = run_state.get("analytics") or {}
        for payload_key, analytics_key in COUNTER_ANALYTICS_FIELDS.items():
            normalized[payload_key] = max(
                coerce_int(normalized.get(payload_key), 0),
                coerce_int(analytics.get(analytics_key), 0)
            )

    normalized["difficulty"] = str(normalized.get("difficulty", "EASY")).upper()
    normalized["character_id"] = str(normalized.get("character_id", "leon")).lower()
    normalized["current_level_id"] = str(normalized.get("current_level_id", "1"))
    normalized["health"] = coerce_int(normalized.get("health"), 100)
    normalized["enemies_remaining"] = coerce_int(normalized.get("enemies_remaining"), 0)
    normalized["level_complete"] = coerce_bool(normalized.get("level_complete"), False)
    normalized["awaiting_choice"] = coerce_bool(normalized.get("awaiting_choice"), False)
    normalized["game_won"] = coerce_bool(normalized.get("game_won"), False)
    normalized["has_started_game"] = coerce_bool(normalized.get("has_started_game"), True)
    for payload_key in COUNTER_ANALYTICS_FIELDS:
        normalized[payload_key] = coerce_int(normalized.get(payload_key), 0)

    return normalized


def list_db_save_payloads(user_id, character_id=None):
    query = SaveData.query.filter_by(user_id=user_id)

    if character_id is not None:
        query = query.filter_by(character_id=str(character_id).lower())

    return [
        normalize_save_payload(build_save_payload(save_data))
        for save_data in query.all()
        if save_data.has_started_game
    ]


def choose_latest_save_payload(*payloads):
    candidates = [payload for payload in payloads if payload]

    if not candidates:
        return None

    return max(candidates, key=lambda payload: parse_updated_at(payload.get("updated_at")))


def update_save_data(save_data, data):
    save_data.difficulty = str(data.get("difficulty", save_data.difficulty or "EASY")).upper()
    save_data.character_id = str(data.get("character_id", save_data.character_id or "leon")).lower()

    save_data.health = coerce_int(data.get("health"), save_data.health)
    save_data.medkits = coerce_int(data.get("medkits"), save_data.medkits)
    save_data.grenades = coerce_int(data.get("grenades"), save_data.grenades)

    save_data.ammo_in_gun = coerce_int(data.get("ammo_in_gun"), save_data.ammo_in_gun)
    save_data.ammo_in_bag = coerce_int(data.get("ammo_in_bag"), save_data.ammo_in_bag)
    save_data.mag_capacity = coerce_int(data.get("mag_capacity"), save_data.mag_capacity)

    save_data.laser_upgrade = coerce_bool(data.get("laser_upgrade"), save_data.laser_upgrade)
    save_data.shield_owned = coerce_bool(data.get("shield_owned"), save_data.shield_owned)
    save_data.shield_on = coerce_bool(data.get("shield_on"), save_data.shield_on)

    save_data.current_level_id = str(data.get("current_level_id", save_data.current_level_id))
    save_data.enemies_remaining = coerce_int(data.get("enemies_remaining"), save_data.enemies_remaining)

    save_data.level_complete = coerce_bool(data.get("level_complete"), save_data.level_complete)
    save_data.awaiting_choice = coerce_bool(data.get("awaiting_choice"), save_data.awaiting_choice)
    save_data.game_won = coerce_bool(data.get("game_won"), save_data.game_won)
    save_data.kills = coerce_int(data.get("kills"), save_data.kills)
    save_data.damage_dealt = coerce_int(data.get("damage_dealt"), save_data.damage_dealt)
    save_data.damage_taken = coerce_int(data.get("damage_taken"), save_data.damage_taken)
    save_data.pistol_shots = coerce_int(data.get("pistol_shots"), save_data.pistol_shots)
    save_data.grenades_used = coerce_int(data.get("grenades_used"), save_data.grenades_used)
    save_data.medkits_used = coerce_int(data.get("medkits_used"), save_data.medkits_used)
    save_data.reloads = coerce_int(data.get("reloads"), save_data.reloads)
    save_data.knife_uses = coerce_int(data.get("knife_uses"), save_data.knife_uses)
    save_data.run_state_json = json.dumps(data.get("run_state")) if data.get("run_state") is not None else save_data.run_state_json

    save_data.has_started_game = True
    save_data.updated_at = utc_now()


def build_save_payload(save_data):
    run_state = None

    if save_data.run_state_json:
        try:
            run_state = json.loads(save_data.run_state_json)
        except json.JSONDecodeError:
            run_state = None

    return {
        "difficulty": save_data.difficulty,
        "character_id": save_data.character_id,
        "health": save_data.health,
        "medkits": save_data.medkits,
        "grenades": save_data.grenades,
        "ammo_in_gun": save_data.ammo_in_gun,
        "ammo_in_bag": save_data.ammo_in_bag,
        "mag_capacity": save_data.mag_capacity,
        "laser_upgrade": save_data.laser_upgrade,
        "shield_owned": save_data.shield_owned,
        "shield_on": save_data.shield_on,
        "current_level_id": save_data.current_level_id,
        "enemies_remaining": save_data.enemies_remaining,
        "level_complete": save_data.level_complete,
        "awaiting_choice": save_data.awaiting_choice,
        "game_won": save_data.game_won,
        "has_started_game": save_data.has_started_game,
        "kills": save_data.kills,
        "damage_dealt": save_data.damage_dealt,
        "damage_taken": save_data.damage_taken,
        "pistol_shots": save_data.pistol_shots,
        "grenades_used": save_data.grenades_used,
        "medkits_used": save_data.medkits_used,
        "reloads": save_data.reloads,
        "knife_uses": save_data.knife_uses,
        "run_state": run_state,
        "updated_at": save_data.updated_at.isoformat() if save_data.updated_at else None
    }
