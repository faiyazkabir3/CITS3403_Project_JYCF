import re
from app import *



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


@app.route("/")
@app.route("/login", methods=["GET", "POST"])
def show_login():
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
        session["user_id"] = user.id
        session["username"] = user.username
        session["display_name"] = get_display_name(user)
        session["is_guest"] = False

        return redirect(url_for("main_menu"))

    return render_template("login.html", error=None)


@app.route("/register", methods=["GET", "POST"])
def show_register():
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

        return redirect(url_for("show_login"))

    return render_template("register.html", error=None)


@app.route("/guest-login", methods=["POST"])
def guest_login():
    name = make_guest_name()

    session.clear()
    session["username"] = name
    session["is_guest"] = True

    return redirect(url_for("main_menu"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("show_login"))


@app.route("/main-menu")
@app.route("/main_menu")
def main_menu():
    username = session.get("username")
    is_guest = bool(session.get("is_guest"))
    user_id = session.get("user_id")
    profile_image = PROFILE_IMAGE_DEFAULT

    if not username:
        return redirect(url_for("show_login"))

    friends = []

    if not is_guest:
        if user_id is None:
            session.clear()
            return redirect(url_for("show_login"))

        user = User.query.get(user_id)

        if user is None:
            session.clear()
            return redirect(url_for("show_login"))

        username = get_display_name(user)
        profile_image = get_profile_image(user)
        session["display_name"] = username
        friends = get_friends(user_id)

    return render_template(
        "main_menu_view.html",
        username=username,
        friends=friends,
        is_guest=is_guest,
        user_id=user_id,
        profile_image=profile_image,
        leaderboard=get_leaderboard(current_user_id=user_id),
        can_view_profiles=not is_guest
    )


@app.route("/profile", methods=["GET", "POST"])
def profile():
    user_id = session.get("user_id")

    if user_id is None or session.get("is_guest"):
        if session.get("username"):
            return redirect(url_for("main_menu"))

        return redirect(url_for("show_login"))

    user = User.query.get(user_id)

    if user is None:
        session.clear()
        return redirect(url_for("show_login"))

    error = None
    success = None
    display_name_value = user.display_name or ""
    bio_value = get_profile_bio(user)
    selected_profile_image = get_profile_image(user)
    custom_profile_image = get_custom_profile_image(user)

    if request.method == "POST":
        display_name = request.form.get("display_name", "").strip()
        bio = request.form.get("bio", "").strip()
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

        if (request.content_length or 0) > PROFILE_IMAGE_UPLOAD_MAX_BYTES:
            error = "Profile image uploads must be 5MB or smaller."
        elif len(display_name) > 80:
            error = "Display name must be 80 characters or fewer."
        elif len(bio) > BIO_MAX_LENGTH:
            error = f"Bio must be {BIO_MAX_LENGTH} characters or fewer."
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
            except SQLAlchemyError as update_error:
                db.session.rollback()
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
        custom_profile_image=custom_profile_image,
        profile_images=PROFILE_IMAGE_OPTIONS,
        error=error,
        success=success
    )


@app.route("/profile/<int:user_id>", methods=["GET", "POST"])
def view_profile(user_id):
    current_user_id = session.get("user_id")

    if current_user_id is None or session.get("is_guest"):
        if session.get("username"):
            return redirect(url_for("main_menu"))

        return redirect(url_for("show_login"))

    profile_user = User.query.get(user_id)
    if profile_user is None:
        flash("Profile not found.")
        return redirect(url_for("main_menu"))

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
            else:
                flash("Profile action not recognised.")

            db.session.commit()
        except SQLAlchemyError as error:
            db.session.rollback()
            app.logger.warning(
                "Profile friend action failed for user %s and profile %s. %s",
                current_user_id,
                user_id,
                getattr(error, "orig", error)
            )
            flash("Profile action failed.")

        return redirect(url_for("view_profile", user_id=user_id))

    leaderboard_entry = get_leaderboard_entry_for_user(
        user_id,
        current_user_id=current_user_id
    )

    return render_template(
        "public_profile.html",
        profile_user=profile_user,
        display_name=get_display_name(profile_user),
        profile_image=get_profile_image(profile_user),
        bio=get_profile_bio(profile_user),
        leaderboard_entry=leaderboard_entry,
        friend_action=get_friend_action(current_user_id, user_id),
        is_self=current_user_id == user_id
    )


@app.route("/favicon.ico")
def favicon():
    return app.send_static_file("images/icons/settings.svg")


@app.route("/play")
def show_play():
    if "username" not in session:
        return redirect(url_for("show_login"))

    return render_template("play.html")


@app.route("/achievements")
def show_achievements():
    if "username" not in session:
        return redirect(url_for("show_login"))

    user_id = session.get("user_id")
    username = session.get("username", "Player")

    if user_id is None or session.get("is_guest"):
        stats = get_empty_stats()
    else:
        user = User.query.get(user_id)
        if user is not None:
            username = get_display_name(user)
        stats = get_user_stats(user_id)

    return render_template(
        "achievements.html",
        username=username,
        achievements=[],
        stats=stats
    )


@app.route("/save-game", methods=["POST"])
def save_game():
    if session.get("user_id") is None or session.get("is_guest"):
        return jsonify({
            "ok": False,
            "message": "Please log in to save your game."
        }), 401

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "ok": False,
            "message": "No save data received."
        }), 400

    character_id = str(data.get("character_id", "leon")).lower()
    session["selected_character"] = character_id

    fallback_payload = build_save_payload_from_request(data)

    try:
        save_data = get_user_save(character_id=character_id, create=True)
        update_save_data(save_data, data)
        db.session.commit()
    except SQLAlchemyError as error:
        db.session.rollback()

        try:
            write_fallback_save(session["user_id"], character_id, fallback_payload)
        except OSError:
            app.logger.exception("Save failed for user %s.", session.get("user_id"))
            return jsonify({
                "ok": False,
                "message": "Save failed."
            }), 500

        app.logger.warning(
            "SQLite save failed for user %s; wrote fallback save instead. %s",
            session.get("user_id"),
            getattr(error, "orig", error)
        )
        return jsonify({
            "ok": True,
            "message": "Game saved locally."
        })

    try:
        write_fallback_save(session["user_id"], character_id, build_save_payload(save_data))
    except OSError as error:
        app.logger.warning(
            "Backup save write failed for user %s after database save succeeded. %s",
            session.get("user_id"),
            error
        )

    return jsonify({
        "ok": True,
        "message": "Game saved."
    })


@app.route("/load-game")
def load_game():
    if session.get("user_id") is None or session.get("is_guest"):
        return jsonify({
            "ok": False,
            "message": "Please log in to load your game."
        }), 401

    requested_character_id = request.args.get("character_id")
    character_id = str(requested_character_id).lower() if requested_character_id else None

    db_payloads = []
    fallback_payloads = []

    try:
        db_payloads = list_db_save_payloads(session["user_id"], character_id=character_id)
    except SQLAlchemyError as error:
        db.session.rollback()
        app.logger.warning(
            "Database load failed for user %s; falling back to JSON save. %s",
            session.get("user_id"),
            getattr(error, "orig", error)
        )

    if character_id is not None:
        fallback_payload = read_fallback_save(session["user_id"], character_id)
        if fallback_payload is not None:
            fallback_payloads.append(fallback_payload)
    else:
        fallback_payloads = list_fallback_save_payloads(session["user_id"])

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

@app.route("/add_friend/<int:user_id>")
def add_friend(user_id):
    current_user = session.get("user_id")

    if session.get("is_guest"):
        return redirect(url_for("main_menu"))

    if not current_user:
        return redirect(url_for("show_login"))

    if current_user == user_id:
        flash("You cannot add yourself.")
        return redirect(url_for("main_menu"))

    current_user_record = User.query.get(current_user)
    if current_user_record is None:
        session.clear()
        return redirect(url_for("show_login"))

    target_user = User.query.get(user_id)
    if target_user is None:
        flash("User not found.")
        return redirect(url_for("main_menu"))

    try:
        _, message = create_friend_request(current_user, user_id)
        db.session.commit()
        flash(message)
    except SQLAlchemyError as error:
        db.session.rollback()
        app.logger.warning(
            "Friend request failed for user %s and target %s. %s",
            current_user,
            user_id,
            getattr(error, "orig", error)
        )
        flash("Friend request failed.")

    return redirect(url_for("view_profile", user_id=user_id))


@app.route('/friends', methods=['GET', 'POST'])
def show_friends():
    if session.get("is_guest"):
        return redirect(url_for("main_menu"))

    current_user = User.query.get(session.get('user_id'))
    if current_user is None:
        session.clear()
        return redirect(url_for('show_login'))
    
    if request.method == 'POST':
        from_user_id = session.get('user_id')
        friend_username = normalize_auth_username(request.form.get('friend_username', ''))
        friend_username_error = validate_friend_username(friend_username)

        if friend_username_error is not None:
            flash(friend_username_error)
            return redirect(url_for('show_friends'))

        if friend_username == current_user.username:
            flash("You cannot add yourself.")
            return redirect(url_for('show_friends'))

        friend = User.query.filter_by(username=friend_username).first()

        if friend:
            try:
                _, message = create_friend_request(from_user_id, friend.id)
                db.session.commit()
                flash(message)
            except SQLAlchemyError as error:
                db.session.rollback()
                app.logger.warning(
                    "Friend request failed for user %s and target %s. %s",
                    from_user_id,
                    friend.id,
                    getattr(error, "orig", error)
                )
                flash("Friend request failed.")
        else:
            flash('User not found.')
        
        return redirect(url_for('show_friends'))
    
    # Get pending requests for current user
    incoming_requests = FriendRequest.query.filter_by(
        to_user_id=current_user.id, status='pending'
    ).all()
    
    # Get friends (accepted requests)
    friends = get_friends(current_user.id)
    
    return render_template(
        'friends_view.html',
        username=get_display_name(current_user),
        current_user=current_user,
        incoming_requests=incoming_requests,
        friends=friends
    )


@app.route("/accept_friend/<int:request_id>")
def accept_friend(request_id):
    current_user = session.get('user_id')
    if not current_user:
        return redirect(url_for("show_login"))

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user:
        accept_pending_friend_request(friend_request)
        db.session.commit()

    return redirect(url_for("show_friends"))

@app.route("/reject_friend/<int:request_id>")
def reject_friend(request_id):
    current_user = session.get('user_id')
    if not current_user:
        return redirect(url_for("show_login"))

    friend_request = FriendRequest.query.get(request_id)
    if friend_request and friend_request.to_user_id == current_user:
        db.session.delete(friend_request)
        db.session.commit()

    return redirect(url_for("show_friends"))

@app.route("/chat/<int:friend_id>", methods=["GET", "POST"])
def chat(friend_id):
    current_user = session.get("user_id")

    if current_user is None or session.get("is_guest"):
        return redirect(url_for("show_login"))

    friend = get_accepted_friend(current_user, friend_id)

    if friend is None:
        flash("You can only chat with users in your friends list.")
        return redirect(url_for("show_friends"))

    if request.method == "POST":
        msg = normalize_chat_message(request.form.get("message", ""))
        message_error = validate_chat_message(msg)

        if message_error is not None:
            flash(message_error)
            return redirect(url_for("chat", friend_id=friend_id))

        message = Message(
            sender_id=session["user_id"],
            receiver_id=friend_id,
            message=msg,
            timestamp=datetime.utcnow()
        )
        db.session.add(message)
        db.session.commit()
        return redirect(url_for("chat", friend_id=friend_id))

    messages = Message.query.filter(
        ((Message.sender_id == current_user) & (Message.receiver_id == friend_id)) |
        ((Message.sender_id == friend_id) & (Message.receiver_id == current_user))
    ).order_by(Message.timestamp).all()

    return render_template(
        "chat.html",
        messages=messages,
        friend=friend,
        current_user=session["user_id"]
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
    message_text = normalize_chat_message((data or {}).get("message", ""))

    if current_user is None or session.get("is_guest"):
        socketio.emit("chat:error", {"message": "Please log in to use chat."}, to=request.sid)
        return {"ok": False, "message": "Please log in to use chat."}

    if friend_id is None:
        socketio.emit("chat:error", {"message": "Chat user is invalid."}, to=request.sid)
        return {"ok": False, "message": "Chat user is invalid."}

    if get_accepted_friend(current_user, friend_id) is None:
        socketio.emit("chat:error", {"message": "You can only chat with accepted friends."}, to=request.sid)
        return {"ok": False, "message": "You can only chat with accepted friends."}

    message_error = validate_chat_message(message_text)
    if message_error is not None:
        socketio.emit("chat:error", {"message": message_error}, to=request.sid)
        return {"ok": False, "message": message_error}

    room_key = build_chat_room_key(current_user, friend_id)
    join_room(room_key)

    message = Message(
        sender_id=current_user,
        receiver_id=friend_id,
        message=message_text,
        timestamp=datetime.utcnow()
    )
    db.session.add(message)
    db.session.commit()

    payload = serialize_chat_message(message)
    socketio.emit("chat:new", payload, to=room_key)

    return {
        "ok": True,
        "message": payload,
    }

@app.route("/friend-stats/<int:friend_id>")
def friend_stats(friend_id):
    current_user_id = session.get("user_id")

    if current_user_id is None or session.get("is_guest"):
        return redirect(url_for("show_login"))

    friendship = Friend.query.filter_by(
        user_id=current_user_id,
        friend_id=friend_id,
        status="accepted"
    ).first()

    if friendship is None:
        flash("You can only view stats for users in your friends list.")
        return redirect(url_for("show_friends"))

    friend = User.query.get(friend_id)
    if friend is None:
        flash("Friend not found.")
        return redirect(url_for("show_friends"))

    stats = get_user_stats(friend_id)

    return render_template(
        "friend_stats.html",
        username=session.get("username", "Player"),
        friend=friend,
        stats=stats
    )
