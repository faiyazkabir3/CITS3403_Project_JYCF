from datetime import timedelta

import pytest
from flask_wtf.csrf import generate_csrf
from werkzeug.security import generate_password_hash

from app import app
from app.models import User, WorldMessage, db, utc_now


@pytest.fixture(autouse=True)
def clean_world_chat_tables():
    app.config["TESTING"] = True

    with app.app_context():
        WorldMessage.query.delete()
        User.query.delete()
        db.session.commit()

    yield

    with app.app_context():
        WorldMessage.query.delete()
        User.query.delete()
        db.session.commit()


@pytest.fixture
def client():
    return app.test_client()


def create_user(username, display_name=None):
    with app.app_context():
        user = User(
            username=username,
            display_name=display_name,
            password_hash=generate_password_hash("Password123!"),
        )
        db.session.add(user)
        db.session.commit()
        return user.id


def login_user_session(client, user_id, username, *, is_guest=False):
    with client.session_transaction() as session:
        session["_user_id"] = str(user_id)
        session["_fresh"] = True
        session["user_id"] = user_id
        session["username"] = username
        session["display_name"] = username
        session["is_guest"] = is_guest


def get_csrf_headers(client, path="/"):
    with client:
        client.get(path)
        csrf_token = generate_csrf()

    return {"X-CSRFToken": csrf_token}


def test_get_world_chat_messages_returns_saved_history_in_order(client):
    first_user_id = create_user("world_alpha", "Alpha")
    second_user_id = create_user("world_bravo", "Bravo")
    base_time = utc_now()

    with app.app_context():
        db.session.add_all([
            WorldMessage(user_id=first_user_id, message="First message", created_at=base_time),
            WorldMessage(user_id=second_user_id, message="Second message", created_at=base_time + timedelta(seconds=1)),
        ])
        db.session.commit()

    response = client.get("/world-chat/messages")
    payload = response.get_json()

    assert response.status_code == 200, "World chat history endpoint should be readable."
    assert payload["ok"] is True, "World chat history response should mark the request as successful."
    assert [message["message"] for message in payload["messages"]] == [
        "First message",
        "Second message",
    ], "World chat history should return saved messages in chronological order."
    assert payload["messages"][0]["display_name"] == "Alpha", (
        "World chat history should include the first author's display name."
    )
    assert payload["messages"][1]["display_name"] == "Bravo", (
        "World chat history should include the second author's display name."
    )


def test_post_world_chat_message_rejects_anonymous_and_guest_users(client):
    anonymous_response = client.post(
        "/world-chat/messages",
        json={"message": "hello"},
        headers=get_csrf_headers(client),
    )
    anonymous_payload = anonymous_response.get_json()

    assert anonymous_response.status_code == 403, "Anonymous users should not post world chat messages."
    assert anonymous_payload["ok"] is False, "Rejected anonymous world chat posts should report ok=false."

    guest_user_id = create_user("guest_world")
    login_user_session(client, guest_user_id, "guest_world", is_guest=True)

    guest_response = client.post(
        "/world-chat/messages",
        json={"message": "hello"},
        headers=get_csrf_headers(client, "/main_menu"),
    )
    guest_payload = guest_response.get_json()

    assert guest_response.status_code == 403, "Guest users should not post world chat messages."
    assert guest_payload["ok"] is False, "Rejected guest world chat posts should report ok=false."
    assert guest_payload["message"] == "Please log in to post in world chat.", (
        "Guest world chat rejection should explain that registered login is required."
    )


def test_post_world_chat_message_rejects_empty_and_overlong_messages(client):
    user_id = create_user("world_writer")
    login_user_session(client, user_id, "world_writer")

    empty_response = client.post(
        "/world-chat/messages",
        json={"message": "   "},
        headers=get_csrf_headers(client, "/main_menu"),
    )
    long_response = client.post(
        "/world-chat/messages",
        json={"message": "x" * 1001},
        headers=get_csrf_headers(client, "/main_menu"),
    )

    assert empty_response.status_code == 400, "Blank world chat messages should be rejected."
    assert empty_response.get_json()["message"] == "Message cannot be empty.", (
        "Blank world chat validation should return the empty-message error."
    )
    assert long_response.status_code == 400, "Overlong world chat messages should be rejected."
    assert long_response.get_json()["message"] == "Message must be 1000 characters or fewer.", (
        "Overlong world chat validation should return the length-limit error."
    )


def test_post_world_chat_message_saves_plaintext_message(client):
    user_id = create_user("world_sender", "Sender")
    login_user_session(client, user_id, "world_sender")

    response = client.post(
        "/world-chat/messages",
        json={"message": "Hello world chat"},
        headers=get_csrf_headers(client, "/main_menu"),
    )
    payload = response.get_json()

    assert response.status_code == 200, "Registered user should be able to post to world chat."
    assert payload["ok"] is True, "Accepted world chat post should report ok=true."
    assert payload["message"]["message"] == "Hello world chat", (
        "World chat post response should echo the saved message."
    )
    assert payload["message"]["display_name"] == "Sender", (
        "World chat post response should include the sender display name."
    )
    assert payload["message"]["is_current_user"] is True, (
        "World chat post response should mark the sender as the current user."
    )

    with app.app_context():
        stored_messages = WorldMessage.query.all()
        assert len(stored_messages) == 1, "Accepted world chat post should create one database row."
        assert stored_messages[0].message == "Hello world chat", (
            "World chat database row should store the normalized message text."
        )


def test_language_settings_defaults_to_english_for_guest(client):
    response = client.get("/settings/language")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["ok"] is True
    assert payload["language"] == "en"
    assert payload["authenticated"] is False
    assert {language["code"] for language in payload["languages"]} >= {"en", "nl", "bn", "zh-cn", "ja"}


def test_language_settings_rejects_unsupported_language(client):
    response = client.post(
        "/settings/language",
        json={"language": "pirate"},
        headers=get_csrf_headers(client),
    )
    payload = response.get_json()

    assert response.status_code == 400
    assert payload["ok"] is False
    assert payload["message"] == "Unsupported language."


def test_language_settings_persists_registered_user_preference(client):
    user_id = create_user("language_user")
    login_user_session(client, user_id, "language_user")

    response = client.post(
        "/settings/language",
        json={"language": "ja"},
        headers=get_csrf_headers(client, "/main_menu"),
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["ok"] is True
    assert payload["language"] == "ja"
    assert payload["authenticated"] is True

    with app.app_context():
        user = db.session.get(User, user_id)
        assert user.preferred_language == "ja"

    followup = client.get("/settings/language")
    assert followup.get_json()["language"] == "ja"


def test_language_settings_saves_guest_preference_in_session_only(client):
    guest_user_id = create_user("language_guest")
    login_user_session(client, guest_user_id, "language_guest", is_guest=True)

    response = client.post(
        "/settings/language",
        json={"language": "nl"},
        headers=get_csrf_headers(client, "/main_menu"),
    )
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["ok"] is True
    assert payload["language"] == "nl"
    assert payload["authenticated"] is False

    with app.app_context():
        user = db.session.get(User, guest_user_id)
        assert user.preferred_language == "en"

    assert client.get("/settings/language").get_json()["language"] == "nl"
