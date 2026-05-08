import re
from flask import Blueprint

from app import *


main_bp = Blueprint("main", __name__)

MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 80
MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 255
MAX_CHAT_MESSAGE_LENGTH = 1000
USERNAME_PATTERN = re.compile(r"^[a-z0-9_]+$")


def normalize_auth_username(username):
    return str(username or "").strip().lower()


def validate_auth_username(username):
    if username == "":
        return "Please enter a username."

    if len(username) < MIN_USERNAME_LENGTH:
        return f"Username must be at least {MIN_USERNAME_LENGTH} characters."

    if len(username) > MAX_USERNAME_LENGTH:
        return f"Username must be {MAX_USERNAME_LENGTH} characters or fewer."

    if not USERNAME_PATTERN.fullmatch(username):
        return "Username can only use lowercase letters, numbers, and underscores."

    return None


def validate_auth_password(password, *, field_name="password"):
    label = field_name.capitalize()

    if password == "":
        return f"Please enter a {field_name}."

    if len(password) < MIN_PASSWORD_LENGTH:
        return f"{label} must be at least {MIN_PASSWORD_LENGTH} characters."

    if len(password) > MAX_PASSWORD_LENGTH:
        return f"{label} must be {MAX_PASSWORD_LENGTH} characters or fewer."

    return None


def validate_friend_username(username):
    return validate_auth_username(username)


def normalize_chat_message(message):
    return str(message or "").strip()


def validate_chat_message(message):
    if message == "":
        return "Message cannot be empty."

    if len(message) > MAX_CHAT_MESSAGE_LENGTH:
        return f"Message must be {MAX_CHAT_MESSAGE_LENGTH} characters or fewer."

    return None


def coerce_bounded_int(value, default=0, minimum=0, maximum=None):
    number = coerce_int(value, default)

    if number < minimum:
        return minimum

    if maximum is not None and number > maximum:
        return maximum

    return number


def normalize_save_token(value, default, *, max_length=20, transform="preserve"):
    token = str(value if value is not None else default).strip()

    if transform == "lower":
        token = token.lower()
    elif transform == "upper":
        token = token.upper()

    if not token:
        return default

    if len(token) > max_length:
        return default

    if not USERNAME_PATTERN.fullmatch(token.replace("-", "_")):
        return default

    return token


def sanitize_save_request_payload(data):
    if not isinstance(data, dict) or not data:
        return None

    difficulty = normalize_save_token(
        data.get("difficulty"),
        "EASY",
        max_length=20,
        transform="upper"
    )

    if difficulty not in {"EASY", "NORMAL", "HARD"}:
        difficulty = "EASY"

    run_state = data.get("run_state")
    if run_state is not None and not isinstance(run_state, dict):
        run_state = None

    return {
        "difficulty": difficulty,
        "character_id": normalize_save_token(
            data.get("character_id"),
            "leon",
            max_length=20,
            transform="lower"
        ),
        "health": coerce_bounded_int(data.get("health"), 100, minimum=0, maximum=100),
        "medkits": coerce_bounded_int(data.get("medkits"), 0, minimum=0, maximum=99),
        "grenades": coerce_bounded_int(data.get("grenades"), 0, minimum=0, maximum=99),
        "ammo_in_gun": coerce_bounded_int(data.get("ammo_in_gun"), 0, minimum=0, maximum=999),
        "ammo_in_bag": coerce_bounded_int(data.get("ammo_in_bag"), 0, minimum=0, maximum=999),
        "mag_capacity": coerce_bounded_int(data.get("mag_capacity"), 8, minimum=0, maximum=999),
        "laser_upgrade": coerce_bool(data.get("laser_upgrade"), False),
        "shield_owned": coerce_bool(data.get("shield_owned"), False),
        "shield_on": coerce_bool(data.get("shield_on"), False),
        "current_level_id": normalize_save_token(
            data.get("current_level_id"),
            "1",
            max_length=20,
            transform="preserve"
        ),
        "enemies_remaining": coerce_bounded_int(data.get("enemies_remaining"), 0, minimum=0, maximum=999),
        "level_complete": coerce_bool(data.get("level_complete"), False),
        "awaiting_choice": coerce_bool(data.get("awaiting_choice"), False),
        "game_won": coerce_bool(data.get("game_won"), False),
        "kills": coerce_bounded_int(data.get("kills"), 0, minimum=0, maximum=100000),
        "damage_dealt": coerce_bounded_int(data.get("damage_dealt"), 0, minimum=0, maximum=1000000),
        "damage_taken": coerce_bounded_int(data.get("damage_taken"), 0, minimum=0, maximum=1000000),
        "pistol_shots": coerce_bounded_int(data.get("pistol_shots"), 0, minimum=0, maximum=100000),
        "grenades_used": coerce_bounded_int(data.get("grenades_used"), 0, minimum=0, maximum=100000),
        "medkits_used": coerce_bounded_int(data.get("medkits_used"), 0, minimum=0, maximum=100000),
        "reloads": coerce_bounded_int(data.get("reloads"), 0, minimum=0, maximum=100000),
        "knife_uses": coerce_bounded_int(data.get("knife_uses"), 0, minimum=0, maximum=100000),
        "run_state": run_state,
    }


@main_bp.route("/")
@main_bp.route("/login", methods=["GET", "POST"])
def show_login():
    if request.method == "GET" and request.path == "/login" and current_user.is_authenticated:
        logout_user()
        session.clear()
        return render_template("login.html", error=None)

    if current_user.is_authenticated:
        return redirect(url_for("main.main_menu"))

    if request.method == "POST":
        username = normalize_auth_username(request.form.get("username", ""))
        password = str(request.form.get("password", ""))

        username_error = validate_auth_username(username)
        if username_error is not None:
            return render_template("login.html", error=username_error)

        password_error = validate_auth_password(password)
        if password_error is not None:
            return render_template("login.html", error=password_error)

        user = User.query.filter_by(username=username).first()

        if user is None:
            return render_template("login.html", error="Invalid username or password.")

        if not check_password_hash(user.password_hash, password):
            return render_template("login.html", error="Invalid username or password.")

        session.clear()
        login_user(user)
        session["user_id"] = user.id
        session["username"] = user.username
        session["display_name"] = get_display_name(user)
        session["is_guest"] = False

        return redirect(url_for("main.main_menu"))

    return render_template("login.html", error=None)


@main_bp.route("/register", methods=["GET", "POST"])
def show_register():
    if current_user.is_authenticated:
        return redirect(url_for("main.main_menu"))

    if request.method == "POST":
        username = normalize_auth_username(request.form.get("username", ""))
        password = str(request.form.get("password", ""))
        confirm = str(request.form.get("confirm-password", ""))

        username_error = validate_auth_username(username)
        if username_error is not None:
            return render_template("register.html", error=username_error)

        password_error = validate_auth_password(password)
        if password_error is not None:
            return render_template("register.html", error=password_error)

        confirm_error = validate_auth_password(confirm, field_name="confirm password")
        if confirm_error is not None:
            return render_template("register.html", error=confirm_error)

        if password != confirm:
            return render_template("register.html", error="Passwords do not match.")

        user = User.query.filter_by(username=username).first()
        if user is not None:
            return render_template("register.html", error="Username already exists.")

        new_user = User(
            username=username,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256')
        )

        db.session.add(new_user)
        db.session.commit()

        return redirect(url_for("main.show_login"))

    return render_template("register.html", error=None)


@main_bp.route("/guest-login", methods=["POST"])
def guest_login():
    name = make_guest_name()

    logout_user()
    session.clear()
    session["username"] = name
    session["is_guest"] = True

    return redirect(url_for("main.main_menu"))


@main_bp.route("/logout", methods=["POST"])
def logout():
    logout_user()
    session.clear()
    return redirect(url_for("main.show_login"))


def format_agent_joined_date(user):
    joined_at = getattr(user, "created_at", None)
    if not joined_at:
        return "UNKNOWN"

    return joined_at.strftime("%d %b %Y").upper()


WORLD_CHAT_LIMIT = 30


def serialize_world_message(message):
    author = getattr(message, "user", None)

    if author is None:
        display_name = "Unknown Agent"
        profile_image = url_for("static", filename=PROFILE_IMAGE_DEFAULT)
        is_current_message_user = False
    else:
        display_name = get_display_name(author)
        profile_image = url_for("static", filename=(author.profile_image or PROFILE_IMAGE_DEFAULT))
        is_current_message_user = current_user.is_authenticated and current_user.id == message.user_id

    return {
        "id": message.id,
        "user_id": message.user_id,
        "display_name": display_name,
        "profile_image": profile_image,
        "message": message.message,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "is_current_user": is_current_message_user,
    }


@main_bp.route("/world-chat/messages", methods=["GET"])
def get_world_chat_messages():
    messages = (
        WorldMessage.query
        .order_by(WorldMessage.created_at.desc(), WorldMessage.id.desc())
        .limit(WORLD_CHAT_LIMIT)
        .all()
    )
    messages.reverse()

    return jsonify({
        "ok": True,
        "messages": [serialize_world_message(message) for message in messages],
    })


@main_bp.route("/world-chat/messages", methods=["POST"])
def post_world_chat_message():
    if not current_user.is_authenticated or session.get("is_guest"):
        return jsonify({"ok": False, "message": "Please log in to post in world chat."}), 403

    payload = request.get_json(silent=True) or {}
    message = normalize_chat_message(payload.get("message"))
    error = validate_chat_message(message)

    if error:
        return jsonify({"ok": False, "message": error}), 400

    world_message = WorldMessage(
        user_id=current_user.id,
        message=message,
    )
    db.session.add(world_message)
    db.session.commit()

    return jsonify({
        "ok": True,
        "message": serialize_world_message(world_message),
    })


@main_bp.route("/main-menu")
@main_bp.route("/main_menu")
def main_menu():
    is_guest = bool(session.get("is_guest")) and not current_user.is_authenticated
    username = get_display_name(current_user) if current_user.is_authenticated else session.get("username")
    user_id = current_user.id if current_user.is_authenticated else session.get("user_id")
    profile_image = PROFILE_IMAGE_DEFAULT
    agent_joined_date = "GUEST SESSION"
    agent_dossier = get_agent_dossier()
    agent_showcase_badges = []

    if not username:
        return redirect(url_for("main.show_login"))

    friends = []
    unread_message_count = 0

    if current_user.is_authenticated:
        user = current_user
        username = get_display_name(user)
        profile_image = get_profile_image(user)
        agent_joined_date = format_agent_joined_date(user)
        achievements = get_user_achievements(user.id)
        agent_dossier = get_agent_dossier(user)
        agent_showcase_badges = get_agent_showcase_badges(achievements)
        session["user_id"] = user.id
        session["username"] = user.username
        session["display_name"] = username
        friends = get_friends(user_id)
        unread_message_count = get_unread_message_count(user_id)
    elif not is_guest:
        session.clear()
        return redirect(url_for("main.show_login"))

    return render_template(
        "main_menu_view.html",
        username=username,
        friends=friends,
        is_guest=is_guest,
        user_id=user_id,
        profile_image=profile_image,
        agent_joined_date=agent_joined_date,
        agent_dossier=agent_dossier,
        agent_showcase_badges=agent_showcase_badges,
        leaderboard=get_leaderboard(current_user_id=user_id),
        unread_message_count=unread_message_count,
        can_view_profiles=not is_guest
    )


@main_bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    user = current_user
    user_id = user.id

    error = None
    success = None
    display_name_value = user.display_name or ""
    bio_value = get_profile_bio(user)
    selected_profile_image = get_profile_image(user)
    custom_profile_image = get_custom_profile_image(user)
    profile_background_value = get_profile_background(user)
    favorite_character_value = user.favorite_character or ""
    show_stats_to_friends_value = bool(user.show_stats_to_friends)
    allow_friend_messages_value = bool(user.allow_friend_messages)
    hide_from_leaderboard_value = bool(user.hide_from_leaderboard)

    if request.method == "POST":
        display_name = request.form.get("display_name", "").strip()
        bio = request.form.get("bio", "").strip()
        favorite_character = normalize_save_token(
            request.form.get("favorite_character", ""),
            "",
            max_length=20,
            transform="lower"
        )
        profile_background = normalize_save_token(
            request.form.get("profile_background", "default"),
            "default",
            max_length=20,
            transform="lower"
        )
        show_stats_to_friends = request.form.get("show_stats_to_friends") == "on"
        allow_friend_messages = request.form.get("allow_friend_messages") == "on"
        hide_from_leaderboard = request.form.get("hide_from_leaderboard") == "on"
        profile_image = normalize_profile_image_path(
            request.form.get("profile_image", selected_profile_image)
        )
        uploaded_profile_image = request.files.get("custom_profile_image")
        has_uploaded_profile_image = bool(
            uploaded_profile_image
            and (uploaded_profile_image.filename or "").strip()
        )
        current_password = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm_password = request.form.get("confirm_password", "")
        wants_password_change = any([
            current_password,
            new_password,
            confirm_password,
        ])
        new_uploaded_profile_image = None

        display_name_value = display_name
        bio_value = bio
        selected_profile_image = profile_image
        profile_background_value = profile_background
        favorite_character_value = favorite_character
        show_stats_to_friends_value = show_stats_to_friends
        allow_friend_messages_value = allow_friend_messages
        hide_from_leaderboard_value = hide_from_leaderboard

        if (request.content_length or 0) > PROFILE_IMAGE_UPLOAD_MAX_BYTES:
            error = "Profile image uploads must be 5MB or smaller."
        elif len(display_name) > 80:
            error = "Display name must be 80 characters or fewer."
        elif len(bio) > BIO_MAX_LENGTH:
            error = f"Bio must be {BIO_MAX_LENGTH} characters or fewer."
        elif favorite_character not in FAVORITE_CHARACTER_LABELS:
            error = "Choose one of the available favorite characters."
        elif profile_background not in PROFILE_BACKGROUND_LABELS:
            error = "Choose one of the available profile backgrounds."
        elif has_uploaded_profile_image:
            error = validate_uploaded_profile_image(uploaded_profile_image)
        elif not is_selectable_profile_image_for_user(profile_image, user_id):
            error = "Choose one of the available profile pictures or upload your own JPEG."
        elif wants_password_change:
            if not current_password or not new_password or not confirm_password:
                error = "Fill in all password fields to change your password."
            elif not check_password_hash(user.password_hash, current_password):
                error = "Current password is incorrect."
            elif new_password != confirm_password:
                error = "New passwords do not match."

        if error is None:
            if has_uploaded_profile_image:
                profile_image, upload_error = save_uploaded_profile_image(
                    uploaded_profile_image,
                    user_id
                )

                if upload_error is not None:
                    error = upload_error
                else:
                    new_uploaded_profile_image = profile_image
                    selected_profile_image = profile_image
                    custom_profile_image = profile_image

        if error is None:
            previous_profile_image = normalize_profile_image_path(user.profile_image)
            user.display_name = display_name or None
            user.bio = bio or None
            user.profile_image = profile_image
            user.profile_background = profile_background
            user.favorite_character = favorite_character
            user.show_stats_to_friends = show_stats_to_friends
            user.allow_friend_messages = allow_friend_messages
            user.hide_from_leaderboard = hide_from_leaderboard

            if wants_password_change:
                user.password_hash = generate_password_hash(
                    new_password,
                    method="pbkdf2:sha256"
                )

            try:
                db.session.commit()
                session["display_name"] = get_display_name(user)
                success = "Profile updated."
                if previous_profile_image != user.profile_image:
                    delete_uploaded_profile_image(previous_profile_image)
                display_name_value = user.display_name or ""
                bio_value = get_profile_bio(user)
                selected_profile_image = get_profile_image(user)
                custom_profile_image = get_custom_profile_image(user)
                profile_background_value = get_profile_background(user)
                favorite_character_value = user.favorite_character or ""
                show_stats_to_friends_value = bool(user.show_stats_to_friends)
                allow_friend_messages_value = bool(user.allow_friend_messages)
                hide_from_leaderboard_value = bool(user.hide_from_leaderboard)
            except SQLAlchemyError as update_error:
                rollback_database_session("Profile update")
                if new_uploaded_profile_image is not None:
                    delete_uploaded_profile_image(new_uploaded_profile_image)
                app.logger.warning(
                    "Profile update failed for user %s. %s",
                    user_id,
                    getattr(update_error, "orig", update_error)
                )
                error = "Profile update failed."

    return render_template(
        "profile.html",
        username=get_display_name(user),
        login_username=user.username,
        display_name=display_name_value,
        bio=bio_value,
        bio_max_length=BIO_MAX_LENGTH,
        profile_image=selected_profile_image,
        profile_background=profile_background_value,
        profile_backgrounds=PROFILE_BACKGROUND_OPTIONS,
        custom_profile_image=custom_profile_image,
        profile_images=PROFILE_IMAGE_OPTIONS,
        favorite_characters=FAVORITE_CHARACTER_OPTIONS,
        favorite_character=favorite_character_value,
        show_stats_to_friends=show_stats_to_friends_value,
        allow_friend_messages=allow_friend_messages_value,
        hide_from_leaderboard=hide_from_leaderboard_value,
        error=error,
        success=success
    )


@main_bp.route("/profile/<int:user_id>", methods=["GET", "POST"])
@login_required
def view_profile(user_id):
    current_user_id = current_user.id

    profile_user = User.query.get(user_id)
    if profile_user is None:
        flash("Profile not found.")
        return redirect(url_for("main.main_menu"))

    if request.method == "POST":
        action = request.form.get("action")

        try:
            if action == "send_friend_request":
                _, message = create_friend_request(current_user_id, user_id)
                flash(message)
            elif action == "accept_friend_request":
                incoming_request = get_pending_friend_request(user_id, current_user_id)

                if incoming_request is None:
                    flash("Friend request not found.")
                else:
                    accept_pending_friend_request(incoming_request)
                    flash("Friend request accepted.")
            elif action == "profile_reaction":
                reaction_type = request.form.get("reaction_type", "")

                if reaction_type not in PROFILE_REACTION_VALUES:
                    flash("Reaction not recognised.")
                else:
                    reaction = ProfileReaction.query.filter_by(
                        profile_user_id=user_id,
                        reactor_user_id=current_user_id
                    ).first()

                    if reaction is None:
                        db.session.add(ProfileReaction(
                            profile_user_id=user_id,
                            reactor_user_id=current_user_id,
                            reaction_type=reaction_type
                        ))
                    else:
                        reaction.reaction_type = reaction_type
                        reaction.updated_at = utc_now()

                    flash("Profile reaction saved.")
            elif action == "profile_comment":
                comment = normalize_profile_comment(request.form.get("comment", ""))
                comment_error = validate_profile_comment(comment)

                if comment_error is not None:
                    flash(comment_error)
                else:
                    db.session.add(ProfileComment(
                        profile_user_id=user_id,
                        author_user_id=current_user_id,
                        comment=comment
                    ))
                    flash("Comment posted.")
            else:
                flash("Profile action not recognised.")

            db.session.commit()
        except SQLAlchemyError as error:
            rollback_database_session("Profile action")
            app.logger.warning(
                "Profile friend action failed for user %s and profile %s. %s",
                current_user_id,
                user_id,
                getattr(error, "orig", error)
            )
            flash("Profile action failed.")

        return redirect(url_for("main.view_profile", user_id=user_id))

    leaderboard_entry = None if profile_user.hide_from_leaderboard else get_leaderboard_entry_for_user(
        user_id,
        current_user_id=current_user_id
    )
    achievements = get_user_achievements(user_id)
    unlocked_count = sum(1 for achievement in achievements if achievement["unlocked"])
    latest_run = get_latest_run_summary(user_id)
    can_view_stats = can_view_friend_stats(current_user_id, profile_user)

    return render_template(
        "public_profile.html",
        profile_user=profile_user,
        display_name=get_display_name(profile_user),
        profile_image=get_profile_image(profile_user),
        profile_background=get_profile_background(profile_user),
        bio=get_profile_bio(profile_user),
        leaderboard_entry=leaderboard_entry,
        favorite_character=FAVORITE_CHARACTER_LABELS.get(profile_user.favorite_character or "", "No Favorite"),
        unlocked_achievement_count=unlocked_count,
        total_achievement_count=len(achievements),
        profile_badges=get_profile_badges(profile_user, achievements, leaderboard_entry),
        latest_run=latest_run,
        can_view_stats=can_view_stats,
        reaction_options=get_profile_reaction_counts(user_id, current_user_id),
        profile_comments=get_profile_comments(user_id),
        profile_comment_max_length=PROFILE_COMMENT_MAX_LENGTH,
        friend_action=get_friend_action(current_user_id, user_id),
        is_self=current_user_id == user_id
    )


@main_bp.route("/favicon.ico")
def favicon():
    return app.send_static_file("images/icons/game_logo.svg")


@main_bp.route("/play")
def show_play():
    if "username" not in session:
        return redirect(url_for("main.show_login"))

    return render_template("play.html")


@main_bp.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("main.show_login"))

    user_id = session.get("user_id")
    username = session.get("username", "Player")

    if user_id is None or session.get("is_guest"):
        stats = get_empty_stats()
        achievements = []
    else:
        user = User.query.get(user_id)
        if user is not None:
            username = get_display_name(user)
        stats = get_user_stats(user_id)
        achievements = get_user_achievements(user_id)

    return render_template(
        "achievements.html",
        username=username,
        achievements=achievements,
        stats=stats
    )


@main_bp.route("/save-game", methods=["POST"])
@login_required
def save_game():
    user_id = current_user.id

    data = request.get_json(silent=True)
    sanitized_data = sanitize_save_request_payload(data)

    if sanitized_data is None:
        return jsonify({
            "ok": False,
            "message": "Invalid save data received."
        }), 400

    character_id = sanitized_data["character_id"]
    session["selected_character"] = character_id

    fallback_payload = build_save_payload_from_request(sanitized_data)

    try:
        save_data = get_user_save(character_id=character_id, create=True)
        update_save_data(save_data, sanitized_data)
        unlocked_achievements = unlock_achievements_for_user(session["user_id"])
        db.session.commit()
    except SQLAlchemyError as error:
        rollback_database_session("Save game")

        try:
            write_fallback_save(user_id, character_id, fallback_payload)
        except OSError:
            app.logger.exception("Save failed for user %s.", user_id)
            return jsonify({
                "ok": False,
                "message": "Save failed."
            }), 500

        app.logger.warning(
            "SQLite save failed for user %s; wrote fallback save instead. %s",
            user_id,
            getattr(error, "orig", error)
        )
        return jsonify({
            "ok": True,
            "message": "Game saved locally."
        })

    try:
        write_fallback_save(user_id, character_id, build_save_payload(save_data))
    except OSError as error:
        app.logger.warning(
            "Backup save write failed for user %s after database save succeeded. %s",
            user_id,
            error
        )

    return jsonify({
        "ok": True,
        "message": "Game saved.",
        "achievements_unlocked": unlocked_achievements
    })


@main_bp.route("/load-game")
@login_required
def load_game():
    user_id = current_user.id

    requested_character_id = request.args.get("character_id")
    character_id = str(requested_character_id).lower() if requested_character_id else None

    db_payloads = []
    fallback_payloads = []

    try:
        db_payloads = list_db_save_payloads(user_id, character_id=character_id)
    except SQLAlchemyError as error:
        rollback_database_session("Load game")
        app.logger.warning(
            "Database load failed for user %s; falling back to JSON save. %s",
            user_id,
            getattr(error, "orig", error)
        )

    if character_id is not None:
        fallback_payload = read_fallback_save(user_id, character_id)
        if fallback_payload is not None:
            fallback_payloads.append(fallback_payload)
    else:
        fallback_payloads = list_fallback_save_payloads(user_id)

    save_payload = choose_latest_save_payload(*db_payloads, *fallback_payloads)

    if save_payload is None:
        return jsonify({
            "ok": False,
            "message": "Start a new game first."
        })

    session["selected_character"] = str(save_payload.get("character_id", "leon")).lower()

    return jsonify({
        "ok": True,
        "message": "Save loaded.",
        "save_data": save_payload
    })

@main_bp.route("/add_friend/<int:user_id>", methods=["POST"])
@login_required
def add_friend(user_id):
    current_user_id = current_user.id

    if current_user_id == user_id:
        flash("You cannot add yourself.")
        return redirect(url_for("main.show_friends"))

    target_user = User.query.get(user_id)
    if target_user is None:
        flash("User not found.")
        return redirect(url_for("main.show_friends"))

    try:
        _, message = create_friend_request(current_user_id, user_id)
        db.session.commit()
        flash(message)
    except SQLAlchemyError as error:
        rollback_database_session("Friend request")
        app.logger.warning(
            "Friend request failed for user %s and target %s. %s",
            current_user_id,
            user_id,
            getattr(error, "orig", error)
        )
        flash("Friend request failed.")

    return redirect(url_for("main.view_profile", user_id=user_id))


@main_bp.route('/friends', methods=['GET', 'POST'])
@login_required
def show_friends():
    user = current_user

    if request.method == 'POST':
        from_user_id = user.id
        friend_username = normalize_auth_username(request.form.get('friend_username', ''))
        friend_username_error = validate_friend_username(friend_username)

        if friend_username_error is not None:
            flash(friend_username_error)
            return redirect(url_for('main.show_friends'))

        if friend_username == user.username:
            flash("You cannot add yourself.")
            return redirect(url_for('main.show_friends'))

        friend = User.query.filter_by(username=friend_username).first()

        if friend:
            try:
                _, message = create_friend_request(from_user_id, friend.id)
                db.session.commit()
                flash(message)
            except SQLAlchemyError as error:
                rollback_database_session("Friend request")
                app.logger.warning(
                    "Friend request failed for user %s and target %s. %s",
                    from_user_id,
                    friend.id,
                    getattr(error, "orig", error)
                )
                flash("Friend request failed.")
        else:
            flash('User not found.')

        return redirect(url_for('main.show_friends'))

    # Get pending requests for current user
    incoming_requests = FriendRequest.query.filter_by(
        to_user_id=user.id, status='pending'
    ).all()

    # Get friends (accepted requests)
    friends = get_friends(current_user.id)
    recent_conversations = get_recent_conversations(current_user.id)
    return render_template(
        'friends_view.html',
        username=get_display_name(user),
        current_user=user,
        incoming_requests=incoming_requests,
        friends=friends,
        recent_conversations=recent_conversations
    )


@main_bp.route("/accept_friend/<int:request_id>", methods=["POST"])
@login_required
def accept_friend(request_id):
    current_user_id = current_user.id

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user_id:
        accept_pending_friend_request(friend_request)
        db.session.commit()

    return redirect(url_for("main.show_friends"))


@main_bp.route("/reject_friend/<int:request_id>", methods=["POST"])
@login_required
def reject_friend(request_id):
    current_user_id = current_user.id

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user_id:
        db.session.delete(friend_request)
        db.session.commit()

    return redirect(url_for("main.show_friends"))

@main_bp.route("/unfriend/<int:friend_id>", methods=["POST"])
@login_required
def unfriend(friend_id):
    current_user_id = current_user.id

    friend = User.query.get(friend_id)
    if friend is None:
        flash("Friend not found.")
        return redirect(url_for("main.show_friends"))

    friendships = Friend.query.filter(
        Friend.status == "accepted",
        (
            ((Friend.user_id == current_user_id) & (Friend.friend_id == friend_id)) |
            ((Friend.user_id == friend_id) & (Friend.friend_id == current_user_id))
        )
    ).all()

    if not friendships:
        flash("That user is not in your friends list.")
        return redirect(url_for("main.show_friends"))

    try:
        for friendship in friendships:
            db.session.delete(friendship)

        db.session.commit()
        flash(f"Removed {get_display_name(friend)} from your friends.")
    except SQLAlchemyError as error:
        rollback_database_session("Unfriend")
        app.logger.warning(
            "Unfriend failed for user %s and friend %s. %s",
            current_user_id,
            friend_id,
            getattr(error, "orig", error)
        )
        flash("Could not remove friend.")

    return redirect(url_for("main.show_friends"))


@main_bp.route("/chat/keys/<int:friend_id>", methods=["GET", "POST"])
@login_required
def chat_keys(friend_id):
    user = current_user._get_current_object()
    current_user_id = user.id

    friend = get_accepted_friend(current_user_id, friend_id)
    if friend is None:
        return jsonify({"ok": False, "message": "You can only chat with accepted friends."}), 403

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        public_key = str(data.get("public_key", "")).strip()

        if not public_key:
            return jsonify({"ok": False, "message": "Chat public key is required."}), 400

        user.chat_public_key = public_key
        user.chat_key_id = build_chat_key_id(public_key)
        user.chat_key_created_at = utc_now()
        db.session.commit()

    return jsonify({
        "ok": True,
        "current_user_key": serialize_chat_public_key(user),
        "friend_key": serialize_chat_public_key(friend),
    })

@main_bp.route("/chat/keys", methods=["POST"])
@login_required
def register_chat_key():
    user = current_user._get_current_object()
    data = request.get_json(silent=True) or {}
    public_key = str(data.get("public_key", "")).strip()

    if not public_key:
        return jsonify({"ok": False, "message": "Chat public key is required."}), 400

    try:
        user.chat_public_key = public_key
        user.chat_key_id = build_chat_key_id(public_key)
        user.chat_key_created_at = utc_now()
        db.session.commit()
    except SQLAlchemyError as error:
        rollback_database_session("Chat key registration")
        app.logger.warning(
            "Chat key registration failed for user %s. %s",
            user.id,
            getattr(error, "orig", error)
        )
        return jsonify({"ok": False, "message": "Chat key registration failed."}), 500

    return jsonify({
        "ok": True,
        "current_user_key": serialize_chat_public_key(user),
    })

@main_bp.route("/chat/<int:friend_id>", methods=["GET", "POST"])
@login_required
def chat(friend_id):
    current_user_id = current_user.id

    friend = get_accepted_friend(current_user_id, friend_id)

    if friend is None:
        flash("You can only chat with users in your friends list.")
        return redirect(url_for("main.show_friends"))

    if not friend.allow_friend_messages:
        flash("This friend is not accepting messages right now.")
        return redirect(url_for("main.show_friends"))

    if request.method == "POST":
        encrypted_payload = validate_encrypted_chat_payload({
            "ciphertext": request.form.get("ciphertext"),
            "nonce": request.form.get("nonce"),
            "sender_public_key": request.form.get("sender_public_key"),
            "sender_key_id": request.form.get("sender_key_id"),
            "recipient_public_key": request.form.get("recipient_public_key"),
            "recipient_key_id": request.form.get("recipient_key_id"),
            "encryption_version": request.form.get("encryption_version"),
        })

        if encrypted_payload:
            message = Message(
                sender_id=current_user_id,
                receiver_id=friend_id,
                message=None,
                **encrypted_payload,
                timestamp=utc_now()
            )
            db.session.add(message)
            db.session.commit()
            return redirect(url_for("main.chat", friend_id=friend_id))

        flash("Message encryption failed.")

    messages = Message.query.filter(
        ((Message.sender_id == current_user_id) & (Message.receiver_id == friend_id)) |
        ((Message.sender_id == friend_id) & (Message.receiver_id == current_user_id))
    ).order_by(Message.timestamp).all()

    unread_messages = Message.query.filter_by(
        sender_id=friend_id,
        receiver_id=current_user_id,
        read_at=None
    ).all()

    if unread_messages:
        for message in unread_messages:
            message.read_at = utc_now()
        db.session.commit()

    return render_template(
        "chat.html",
        messages=messages,
        chat_messages=[serialize_chat_message(message) for message in messages],
        friend=friend,
        current_user=current_user_id,
        format_message_timestamp=format_message_timestamp
    )


@socketio.on("connect")
def handle_socket_connect():
    if session.get("user_id") is None or session.get("is_guest"):
        return False


@socketio.on("chat:join")
def handle_chat_join(data):
    current_user = session.get("user_id")
    friend_id = parse_friend_id((data or {}).get("friend_id"))

    if current_user is None or session.get("is_guest"):
        return {"ok": False, "message": "Please log in to use chat."}

    if friend_id is None:
        socketio.emit("chat:error", {"message": "Chat user is invalid."}, to=request.sid)
        return {"ok": False, "message": "Chat user is invalid."}

    friend = get_accepted_friend(current_user, friend_id)
    if friend is None:
        socketio.emit("chat:error", {"message": "You can only chat with accepted friends."}, to=request.sid)
        return {"ok": False, "message": "You can only chat with accepted friends."}

    room_key = build_chat_room_key(current_user, friend_id)
    join_room(room_key)
    return {
        "ok": True,
        "room": room_key,
        "friend": {
            "id": friend.id,
            "username": friend.username,
        },
    }


@socketio.on("chat:leave")
def handle_chat_leave(data):
    current_user = session.get("user_id")
    friend_id = parse_friend_id((data or {}).get("friend_id"))

    if current_user is None or friend_id is None:
        return {"ok": False}

    leave_room(build_chat_room_key(current_user, friend_id))
    return {"ok": True}


@socketio.on("chat:send")
def handle_chat_send(data):
    current_user = session.get("user_id")
    friend_id = parse_friend_id((data or {}).get("friend_id"))
    encrypted_payload = validate_encrypted_chat_payload((data or {}).get("message"))

    if current_user is None or session.get("is_guest"):
        socketio.emit("chat:error", {"message": "Please log in to use chat."}, to=request.sid)
        return {"ok": False, "message": "Please log in to use chat."}

    if friend_id is None:
        socketio.emit("chat:error", {"message": "Chat user is invalid."}, to=request.sid)
        return {"ok": False, "message": "Chat user is invalid."}

    friend = get_accepted_friend(current_user, friend_id)
    if friend is None:
        socketio.emit("chat:error", {"message": "You can only chat with accepted friends."}, to=request.sid)
        return {"ok": False, "message": "You can only chat with accepted friends."}

    if not friend.allow_friend_messages:
        socketio.emit("chat:error", {"message": "This friend is not accepting messages right now."}, to=request.sid)
        return {"ok": False, "message": "This friend is not accepting messages right now."}

    if encrypted_payload is None:
        socketio.emit("chat:error", {"message": "Message encryption failed."}, to=request.sid)
        return {"ok": False, "message": "Message encryption failed."}

    room_key = build_chat_room_key(current_user, friend_id)
    join_room(room_key)

    message = Message(
        sender_id=current_user,
        receiver_id=friend_id,
        message=None,
        **encrypted_payload,
        timestamp=utc_now()
    )
    db.session.add(message)
    db.session.commit()

    payload = serialize_chat_message(message)
    socketio.emit("chat:new", payload, to=room_key)

    return {
        "ok": True,
        "message": payload,
    }

@main_bp.route("/friend-stats/<int:friend_id>")
@login_required
def friend_stats(friend_id):
    current_user_id = current_user.id

    friendship = Friend.query.filter_by(
        user_id=current_user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

    if friendship is None:
        flash("You can only view stats for users in your friends list.")
        return redirect(url_for("main.show_friends"))

    friend = User.query.get(friend_id)
    if friend is None:
        flash("Friend not found.")
        return redirect(url_for("main.show_friends"))

    if not can_view_friend_stats(current_user_id, friend):
        return render_template(
            "friend_stats.html",
            username=session.get("username", "Player"),
            friend=friend,
            stats=get_empty_stats(),
            stats_private=True
        )

    stats = get_user_stats(friend_id)

    return render_template(
        "friend_stats.html",
        username=get_display_name(current_user),
        friend=friend,
        stats=stats,
        stats_private=False
    )
