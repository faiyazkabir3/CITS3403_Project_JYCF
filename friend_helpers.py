import random
from dataclasses import asdict
from datetime import datetime

from flask import current_app, request, session
from sqlalchemy.exc import SQLAlchemyError

from app_constants import ONLINE_WINDOW, PRESENCE_REFRESH_INTERVAL
from db_helpers import rollback_database_session
from domain_types import FriendAction
from models import Friend, FriendRequest, Message, User, db, utc_now
from profile_helpers import get_display_name


def friend_action_to_dict(friend_action):
    return {
        key: value
        for key, value in asdict(friend_action).items()
        if value is not None
    }


def parse_iso_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def register_presence_hooks(app):
    @app.before_request
    def refresh_current_user_presence():
        if request.endpoint == "static" or request.path.startswith("/socket.io"):
            return

        user_id = session.get("user_id")

        if user_id is None or session.get("is_guest"):
            return

        now = utc_now()
        last_presence_refresh = parse_iso_datetime(session.get("last_presence_refresh_at"))

        if (
            last_presence_refresh is not None
            and now - last_presence_refresh < PRESENCE_REFRESH_INTERVAL
        ):
            return

        try:
            User.query.filter_by(id=user_id).update(
                {"last_seen": now},
                synchronize_session=False
            )
            db.session.commit()
            session["last_presence_refresh_at"] = now.isoformat()
        except SQLAlchemyError as error:
            rollback_database_session("Presence update")
            current_app.logger.warning(
                "Presence update failed for user %s. %s",
                user_id,
                getattr(error, "orig", error)
            )

    @app.context_processor
    def inject_presence_helpers():
        return {
            "get_friend_presence": get_friend_presence,
        }


def get_friends(user_id):
    friendships = Friend.query.filter_by(user_id=user_id, status="accepted").all()
    friend_ids = [f.friend_id for f in friendships]
    friends = User.query.filter(User.id.in_(friend_ids)).all()
    return sorted(friends, key=lambda user: get_display_name(user).lower())


def is_user_online(user):
    if user is None or user.last_seen is None:
        return False

    return utc_now() - user.last_seen <= ONLINE_WINDOW


def get_friend_presence(user):
    online = is_user_online(user)
    return {
        "is_online": online,
        "label": "Online" if online else "Offline",
        "class_name": "online" if online else "offline",
    }


def get_accepted_friend(current_user_id, friend_id):
    friendship = Friend.query.filter_by(
        user_id=current_user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

    if friendship is None:
        return None

    return User.query.get(friend_id)


def can_view_friend_stats(viewer_id, profile_user):
    if profile_user is None:
        return False

    if viewer_id == profile_user.id:
        return True

    if not profile_user.show_stats_to_friends:
        return False

    return get_accepted_friendship(viewer_id, profile_user.id) is not None


def can_message_friend(sender_id, receiver_user):
    if receiver_user is None:
        return False

    if not receiver_user.allow_friend_messages:
        return False

    return get_accepted_friendship(sender_id, receiver_user.id) is not None


def format_message_timestamp(timestamp):
    if timestamp is None:
        return ""

    return timestamp.strftime("%d %b %H:%M")


def get_unread_message_count(user_id, friend_id=None):
    query = Message.query.filter(
        Message.receiver_id == user_id,
        Message.read_at.is_(None)
    )

    if friend_id is not None:
        query = query.filter(Message.sender_id == friend_id)

    return query.count()


def get_recent_conversations(user_id):
    conversations = []

    for friend in get_friends(user_id):
        latest_message = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == friend.id)) |
            ((Message.sender_id == friend.id) & (Message.receiver_id == user_id))
        ).order_by(Message.timestamp.desc()).first()
        latest_preview = "No messages yet"

        if latest_message is not None:
            latest_preview = latest_message.message or "Encrypted message"

        conversations.append({
            "friend": friend,
            "display_name": get_display_name(friend),
            "latest_message": latest_preview,
            "timestamp": format_message_timestamp(latest_message.timestamp) if latest_message else "",
            "unread_count": get_unread_message_count(user_id, friend.id),
        })

    return sorted(
        conversations,
        key=lambda item: item["timestamp"] or "",
        reverse=True
    )


def get_accepted_friendship(user_id, friend_id):
    return Friend.query.filter_by(
        user_id=user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()


def get_pending_friend_request(from_user_id, to_user_id):
    return FriendRequest.query.filter_by(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        status="pending"
    ).first()


def ensure_accepted_friendship(user_id, friend_id):
    if get_accepted_friendship(user_id, friend_id) is None:
        db.session.add(Friend(
            user_id=user_id,
            friend_id=friend_id,
            status="accepted"
        ))


def accept_pending_friend_request(friend_request):
    friend_request.status = "accepted"
    ensure_accepted_friendship(friend_request.from_user_id, friend_request.to_user_id)
    ensure_accepted_friendship(friend_request.to_user_id, friend_request.from_user_id)


def create_friend_request(from_user_id, to_user_id):
    if from_user_id == to_user_id:
        return False, "You can't send a friend request to yourself."

    if get_accepted_friendship(from_user_id, to_user_id) is not None:
        return False, "You are already friends."

    if get_pending_friend_request(from_user_id, to_user_id) is not None:
        return False, "Friend request already sent."

    if get_pending_friend_request(to_user_id, from_user_id) is not None:
        return False, "This user already sent you a friend request."

    db.session.add(FriendRequest(
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        status="pending"
    ))
    return True, "Friend request sent."


def get_friend_action(current_user_id, profile_user_id):
    if current_user_id == profile_user_id:
        return friend_action_to_dict(FriendAction(
            state="self",
            label="YOUR PROFILE",
            disabled=True,
        ))

    if get_accepted_friendship(current_user_id, profile_user_id) is not None:
        return friend_action_to_dict(FriendAction(
            state="friends",
            label="FRIENDS",
            disabled=True,
        ))

    if get_pending_friend_request(current_user_id, profile_user_id) is not None:
        return friend_action_to_dict(FriendAction(
            state="outgoing_pending",
            label="REQUEST SENT",
            disabled=True,
        ))

    incoming_request = get_pending_friend_request(profile_user_id, current_user_id)
    if incoming_request is not None:
        return friend_action_to_dict(FriendAction(
            state="incoming_pending",
            label="ACCEPT REQUEST",
            disabled=False,
            action="accept_friend_request",
        ))

    return friend_action_to_dict(FriendAction(
        state="add",
        label="ADD FRIEND",
        disabled=False,
        action="send_friend_request",
    ))


def make_guest_name():
    num = random.randint(10000, 99999)
    return "Operator" + str(num)
