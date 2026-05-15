from datetime import datetime

import pytest

from achievement_helpers import (
    achievement_is_unlocked,
    get_achievement_badge_image,
    get_achievement_definitions,
)
from chat_helpers import (
    build_chat_key_id,
    build_chat_room_key,
    parse_friend_id,
    validate_encrypted_chat_payload,
)
from domain_types import AchievementDefinition
from save_helpers import (
    choose_latest_save_payload,
    normalize_save_payload,
    parse_level_number,
    parse_save_payload_key_ring,
)

from routes import (
    normalize_chat_message,
    normalize_auth_username,
    sanitize_save_request_payload,
    validate_auth_password,
    validate_auth_username,
    validate_chat_message,
    validate_friend_username,
)


def test_username_normalization_and_validation():
    assert normalize_auth_username("  Faiyaz_3  ") == "faiyaz_3"
    assert validate_auth_username("faiyaz_3") is None
    assert validate_auth_username("ab") == "Username must be at least 3 characters."
    assert validate_auth_username("bad-name") == "Username can only use lowercase letters, numbers, and underscores."


def test_password_validation_enforces_required_length():
    assert validate_auth_password("RouteZero123!") is None
    assert validate_auth_password("") == "Please enter a password."
    assert validate_auth_password("short") == "Password must be at least 6 characters."
    assert validate_auth_password("", field_name="confirm password") == "Please enter a confirm password."


def test_chat_message_validation_trims_and_limits_content():
    assert validate_chat_message("hello") is None
    assert validate_chat_message("") == "Message cannot be empty."
    assert validate_chat_message("x" * 1001) == "Message must be 1000 characters or fewer."


def test_chat_message_normalization_strips_whitespace():
    assert normalize_chat_message("  hello survivor  ") == "hello survivor"
    assert normalize_chat_message("\nkeep moving\t") == "keep moving"
    assert normalize_chat_message(None) == ""


def test_friend_and_level_helpers_normalize_route_values():
    assert validate_friend_username("valid_friend_1") is None
    assert validate_friend_username("") == "Please enter a username."
    assert validate_friend_username("bad-name") == "Username can only use lowercase letters, numbers, and underscores."
    assert parse_friend_id("42") == 42
    assert parse_friend_id("not-a-number") is None
    assert build_chat_room_key(9, 3) == "chat:3:9"
    assert parse_level_number("level-12") == 12
    assert parse_level_number("safehouse") == 0


def test_save_payload_sanitization_clamps_and_defaults_values():
    payload = sanitize_save_request_payload({
        "difficulty": "nightmare",
        "character_id": "Quite",
        "health": "999",
        "medkits": "-4",
        "grenades": "500",
        "ammo_in_gun": "bad",
        "mag_capacity": "12",
        "laser_upgrade": "on",
        "shield_owned": "yes",
        "shield_on": "",
        "current_level_id": "level-2",
        "kills": "100001",
        "nemesis_kills": "100001",
        "damage_dealt": "42",
        "run_state": "not-a-dict",
    })

    assert payload["difficulty"] == "EASY"
    assert payload["character_id"] == "quite"
    assert payload["health"] == 100
    assert payload["medkits"] == 0
    assert payload["grenades"] == 99
    assert payload["ammo_in_gun"] == 0
    assert payload["mag_capacity"] == 12
    assert payload["laser_upgrade"] is True
    assert payload["shield_owned"] is True
    assert payload["shield_on"] is False
    assert payload["current_level_id"] == "level-2"
    assert payload["kills"] == 100000
    assert payload["nemesis_kills"] == 100000
    assert payload["damage_dealt"] == 42
    assert payload["run_state"] is None


def test_save_key_ring_parses_active_key_and_rejects_bad_lengths():
    active_key_id, key_ring = parse_save_payload_key_ring("v2:MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI")

    assert active_key_id == "v2"
    assert len(key_ring["v2"]) == 32

    with pytest.raises(RuntimeError, match="must decode to 32 bytes"):
        parse_save_payload_key_ring("v1:c2hvcnQ")


def test_save_payload_normalization_prefers_run_state_and_latest_timestamp():
    normalized = normalize_save_payload({
        "difficulty": "easy",
        "character_id": "leon",
        "health": 20,
        "current_level_id": "1",
        "kills": 1,
        "updated_at": "2026-01-01T10:00:00",
        "run_state": {
            "player": {"characterId": "quite"},
            "inventory": {"health": 88},
            "progression": {"currentLevelId": "level-3", "enemiesRemaining": 2, "levelComplete": True},
            "analytics": {"enemiesKilled": 5, "nemesisKills": 1, "damageDealt": 300},
        },
    })

    latest = choose_latest_save_payload(
        normalized,
        {"updated_at": "2026-02-01T10:00:00", "character_id": "leon"},
        {"updated_at": "not-a-date", "character_id": "older"},
    )

    assert normalized["difficulty"] == "EASY"
    assert normalized["character_id"] == "quite"
    assert normalized["health"] == 88
    assert normalized["current_level_id"] == "level-3"
    assert normalized["enemies_remaining"] == 2
    assert normalized["level_complete"] is True
    assert normalized["kills"] == 5
    assert normalized["nemesis_kills"] == 1
    assert normalized["damage_dealt"] == 300
    assert latest["character_id"] == "leon"
    assert choose_latest_save_payload(None, {}) is None


def test_encrypted_chat_payload_requires_matching_key_ids():
    sender_public_key = "sender-public-key"
    recipient_public_key = "recipient-public-key"
    payload = {
        "ciphertext": "cipher",
        "nonce": "nonce",
        "sender_public_key": sender_public_key,
        "sender_key_id": build_chat_key_id(sender_public_key),
        "recipient_public_key": recipient_public_key,
        "recipient_key_id": build_chat_key_id(recipient_public_key),
        "encryption_version": "2",
    }

    assert validate_encrypted_chat_payload(payload) == {
        "ciphertext": "cipher",
        "nonce": "nonce",
        "sender_public_key": sender_public_key,
        "sender_key_id": build_chat_key_id(sender_public_key),
        "recipient_public_key": recipient_public_key,
        "recipient_key_id": build_chat_key_id(recipient_public_key),
        "encryption_version": 2,
    }

    bad_payload = dict(payload)
    bad_payload["sender_key_id"] = "wrong"
    assert validate_encrypted_chat_payload(bad_payload) is None


def test_achievement_unlock_logic_handles_regular_and_sharpshooter_rules():
    regular = AchievementDefinition(
        id="first_blood",
        name="First Blood",
        description="Defeat one enemy.",
        target=1,
        metric="kills",
        icon="I",
    )
    sharpshooter = AchievementDefinition(
        id="sharpshooter",
        name="Sharpshooter",
        description="Deal damage efficiently.",
        target=500,
        metric="damage_dealt",
        icon="S",
    )
    nemesis = AchievementDefinition(
        id="nemesis_hunter",
        name="Nemesis Hunter",
        description="Defeat Nemesis-T Type once.",
        target=1,
        metric="nemesis_kills",
        icon="NT",
    )

    assert achievement_is_unlocked(regular, {"kills": 1}) is True
    assert achievement_is_unlocked(regular, {"kills": 0}) is False
    assert achievement_is_unlocked(sharpshooter, {"damage_dealt": 500, "pistol_shots": 10}) is True
    assert achievement_is_unlocked(sharpshooter, {"damage_dealt": 500, "pistol_shots": 11}) is False
    assert achievement_is_unlocked(nemesis, {"nemesis_kills": 1}) is True
    assert achievement_is_unlocked(nemesis, {"nemesis_kills": 0}) is False


def test_nemesis_hunter_definition_uses_custom_jpeg_badge():
    definitions = {definition.id: definition for definition in get_achievement_definitions()}
    nemesis = definitions["nemesis_hunter"]

    assert nemesis.metric == "nemesis_kills"
    assert nemesis.tier_thresholds == (1, 1, 1)
    assert get_achievement_badge_image(nemesis, "gold") == "images/badges/nemesis_hunter.jpeg"


def test_tiered_achievement_badges_prefer_v2_assets_when_available():
    definitions = {definition.id: definition for definition in get_achievement_definitions()}

    assert get_achievement_badge_image(definitions["sharpshooter"], "gold") == (
        "images/badges/sharpshooter_gold_v2.png"
    )
    assert get_achievement_badge_image(definitions["sharpshooter"], "silver") == (
        "images/badges/sharpshooter_silver.png"
    )
    assert get_achievement_badge_image(definitions["first_blood"], "gold") == (
        "images/badges/first_blood_gold.png"
    )
