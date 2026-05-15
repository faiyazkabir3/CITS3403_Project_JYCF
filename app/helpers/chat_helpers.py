import hashlib

from .save_helpers import coerce_int


def build_chat_room_key(user_a_id, user_b_id):
    first_id, second_id = sorted((int(user_a_id), int(user_b_id)))
    return f"chat:{first_id}:{second_id}"


def parse_friend_id(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def serialize_chat_message(message):
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "ciphertext": message.ciphertext,
        "nonce": message.nonce,
        "sender_key_id": message.sender_key_id,
        "sender_public_key": message.sender_public_key,
        "recipient_key_id": message.recipient_key_id,
        "recipient_public_key": message.recipient_public_key,
        "encryption_version": message.encryption_version,
        "timestamp": message.timestamp.isoformat() if message.timestamp else None,
    }


def build_chat_key_id(public_key):
    return hashlib.sha256(public_key.encode("utf-8")).hexdigest()[:32]


def serialize_chat_public_key(user):
    if user is None or not user.chat_public_key or not user.chat_key_id:
        return None

    return {
        "user_id": user.id,
        "public_key": user.chat_public_key,
        "key_id": user.chat_key_id,
        "created_at": user.chat_key_created_at.isoformat() if user.chat_key_created_at else None,
    }


def validate_encrypted_chat_payload(payload):
    if not isinstance(payload, dict):
        return None

    ciphertext = str(payload.get("ciphertext", "")).strip()
    nonce = str(payload.get("nonce", "")).strip()
    sender_public_key = str(payload.get("sender_public_key", "")).strip()
    sender_key_id = str(payload.get("sender_key_id", "")).strip()
    recipient_public_key = str(payload.get("recipient_public_key", "")).strip()
    recipient_key_id = str(payload.get("recipient_key_id", "")).strip()

    if not ciphertext or not nonce or not sender_public_key or not sender_key_id:
        return None

    if sender_key_id != build_chat_key_id(sender_public_key):
        return None

    if recipient_public_key and recipient_key_id != build_chat_key_id(recipient_public_key):
        return None

    return {
        "ciphertext": ciphertext,
        "nonce": nonce,
        "sender_public_key": sender_public_key,
        "sender_key_id": sender_key_id,
        "recipient_public_key": recipient_public_key or None,
        "recipient_key_id": recipient_key_id or None,
        "encryption_version": coerce_int(payload.get("encryption_version"), 1),
    }
