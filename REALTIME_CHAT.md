# Realtime Chat Documentation

Updated: 24 April 2026

This document explains the realtime chat update, why it is better than the previous chat flow, and how the new implementation works. If this file and the code ever disagree, the code is the source of truth.

## Branch Comparison: `chat_update` vs `main`

This comparison was made from the current branch, `chat_update`, against the `main` branch versions of the chat-related files.

### `main` branch chat system

The `main` branch uses a standard Flask form workflow:

- `app.py` handles `GET` and `POST` in `/chat/<friend_id>`.
- A submitted message is saved to the `Message` table.
- Flask redirects back to the same chat route after saving.
- The browser reloads the page to show the updated conversation.
- `templates/chat.html` renders existing messages and a normal HTML form.
- There is no `static/js/chat.js` file in `main`.
- There is no Socket.IO server setup in `main`.
- The app starts with `app.run(debug=True)`.

The `main` version is simpler and still persists messages, but it is not realtime. The other user only sees new messages after refreshing or reopening the chat page.

### Current `chat_update` chat system

The current branch keeps the same database-backed chat history, but adds a realtime layer:

- `app.py` imports and initializes `Flask-SocketIO`.
- `/chat/<friend_id>` still supports the normal server-rendered page and `POST` fallback.
- The HTTP chat route now checks that the target user is an accepted friend.
- Socket events validate login state, guest mode, friend ID parsing, accepted-friend access, and empty messages.
- `templates/chat.html` adds `data-*` attributes so the browser knows the current user and friend IDs.
- `templates/chat.html` loads the Socket.IO client and `static/js/chat.js`.
- `static/js/chat.js` joins a private room, sends messages through `chat:send`, and appends incoming `chat:new` events without refreshing.
- The app starts with `socketio.run(app, debug=True)`.

The current version therefore keeps the reliable persistence behavior from `main`, but adds live delivery and stricter access control.

### Important code differences

| Area | `main` | Current `chat_update` |
| --- | --- | --- |
| Server startup | `app.run(debug=True)` | `socketio.run(app, debug=True)` |
| Realtime library | None | `Flask-SocketIO` |
| Client JavaScript | None | `static/js/chat.js` |
| Message send path | HTML form `POST` only | Socket.IO first, HTML form fallback |
| Page update | Full page reload | Append new message in-place |
| Conversation room | None | `chat:<smaller_user_id>:<larger_user_id>` |
| Friend validation | Login check, then loads `User.query.get(friend_id)` | Accepted-friend check before page access and socket access |
| Guest handling | Only checks missing login in chat route | Blocks guests in chat route and socket connection |
| Empty message handling | Saves if `msg` is truthy | Trims whitespace and rejects empty socket messages |
| Duplicate handling | Not needed because the page reloads | Uses `data-message-id` and `seenMessageIds` |

### Practical effect

In `main`, sending a message is reliable but feels like a traditional web form. In the current branch, sending a message feels like a live chat app because both participants receive the saved message immediately through the shared Socket.IO room.

The current branch is also safer because typing another user's ID into `/chat/<friend_id>` is not enough to open a chat. The target must already be an accepted friend, and the same rule is repeated in the socket events so bypassing the page route does not bypass the permission check.

## 1. What Changed

The chat system used to work as a normal Flask form:

- open `/chat/<friend_id>`
- type a message
- submit the form with `POST`
- save the message in the database
- redirect back to the same page
- reload the full chat history from the database

The chat system now uses realtime Socket.IO updates on top of the existing Flask page:

- the chat page still loads server-rendered message history first
- the browser then opens a live Socket.IO connection
- both users join the same private room for that conversation
- when one user sends a message, the server saves it and immediately emits it to both users
- the page appends the new message without a refresh

This keeps the old persistence model, but removes the need to reload the page to see new messages.

## 2. Why The New Version Is Better

### 2.1 Better user experience

The old version felt delayed because the other user could not see a new message until they refreshed or reloaded the page. The new version pushes the message instantly to both chat windows.

### 2.2 Lower UI friction

The old version refreshed the whole page after every send. That meant:

- the browser did extra page navigation work
- the chat position could jump
- the user lost the feeling of a live conversation

The new version updates only the message list, so the conversation feels continuous.

### 2.3 Stronger access control

The old `/chat/<friend_id>` route only checked whether the user was logged in. The new version adds accepted-friend validation to both:

- the normal chat route
- the realtime socket events

That means a user cannot simply type another user ID in the URL and start chatting unless they are already accepted friends.

### 2.4 Safer session behavior

The update keeps standard Flask session-cookie behavior:

- two normal tabs in the same browser profile share the same login
- two separate browser contexts or incognito windows can use different accounts

This is the normal and expected behavior for cookie-based web apps.

### 2.5 Test coverage targets

The marking-focused suite keeps chat coverage in pytest and Selenium. Useful coverage targets are:

- same-browser shared session behavior
- separate browser context behavior
- realtime friend-to-friend chat delivery
- non-friend chat denial
- guest and unauthenticated socket rejection

## 3. Main Files Involved

### Backend

- `app.py`
- `models.py`
- `requirements.txt`
- `scripts/run_selenium_server.py`

### Frontend

- `templates/chat.html`
- `templates/main_menu_view.html`
- `static/js/chat.js`
- `static/css/global.css`

### Tests

- `tests/unit/test_helpers.py`
- `tests/selenium/test_browser_flows.py`

## 4. How The Old Chat Worked

The old chat was a classic request/response flow:

1. User opens `/chat/<friend_id>`.
2. Flask loads all messages between the two users from the `Message` table.
3. User submits the form.
4. Flask inserts one new `Message` row.
5. Flask redirects back to `/chat/<friend_id>`.
6. The browser reloads the page and fetches the full message list again.

This worked for persistence, but it was not truly live.

## 5. How The New Chat Works

### 5.1 Initial page load

The server still renders the chat page normally. This gives the page:

- the friend name
- the existing message history
- the current user ID
- the friend ID

This means the chat page still works even before the live connection is established.

### 5.2 Socket connection

After the page loads, `static/js/chat.js`:

- reads the current user ID and friend ID from `data-*` attributes
- loads the Socket.IO client
- opens a connection back to the Flask app
- requests to join the private room for that conversation

If the connection succeeds, the page shows `Live chat connected.`.

### 5.3 Private room model

Each one-to-one conversation uses a deterministic room key:

```text
chat:<smaller_user_id>:<larger_user_id>
```

That means both participants always join the same room even if they open the chat from opposite directions.

Example:

- user `1` chatting with user `2`
- room key becomes `chat:1:2`

### 5.4 Sending a message

When the user presses send:

1. the browser trims the message text
2. the client emits `chat:send`
3. the server validates the session and friendship
4. the server saves the message in the `Message` table
5. the server emits `chat:new` to the room
6. both clients append the new message immediately

This gives realtime behavior while keeping database persistence.

### 5.5 Receiving a message

Each chat page listens for `chat:new`.

When that event arrives:

- the message is appended to the current chat window
- duplicates are ignored using the saved message ID
- the message list scrolls to the newest entry

No page reload is needed.

### 5.6 Fallback behavior

The chat form still exists as a normal HTML form. If realtime chat is unavailable, the browser can still submit the form with standard Flask `POST` behavior.

This fallback matters because it keeps the feature usable even if:

- the Socket.IO client fails to load
- the live connection drops
- the app is started incorrectly

## 6. Security And Validation Rules

The new version applies validation in both HTTP and socket flows.

### 6.1 Authentication

Socket connections are rejected if the user is:

- not logged in
- in guest mode

### 6.2 Friendship check

Chat access is allowed only when the target user is an accepted friend.

This check is used in:

- the `/chat/<friend_id>` route
- `chat:join`
- `chat:send`

### 6.3 Empty message handling

Blank or whitespace-only messages are rejected before they are saved.

## 7. Frontend Behavior

The chat page now has a fixed layout:

- top bar with back button, `Chat with <user>`, and connection status
- middle area with scrollable messages
- bottom composer with input and send button

Only the message list scrolls. The chat title and live-status stay visible at the top so the user always knows who they are talking to.

## 8. Server Startup Notes

For realtime chat, the app should be started with:

```powershell
python app.py
```

Do not rely on `flask run` for this feature. The Socket.IO server should be started through:

```python
socketio.run(app)
```

This is already configured in the application.

## 9. Events Used

The chat implementation uses these socket events:

- `chat:join`
- `chat:leave`
- `chat:send`
- `chat:new`
- `chat:error`

### Event roles

- `chat:join`: asks to join the private conversation room
- `chat:leave`: leaves the room when the page unloads
- `chat:send`: sends a new outgoing message to the server
- `chat:new`: broadcasts a saved message to both chat participants
- `chat:error`: reports validation or connection problems back to the client

## 10. Database Model

The update did not introduce a new message schema. It still uses the existing `Message` model:

- `sender_id`
- `receiver_id`
- `message`
- `timestamp`

This made the upgrade lower-risk because the persistence layer already existed.

## 11. Automated Test Coverage

The Playwright chat spec checks four main cases:

1. two tabs in the same browser context share one login session
2. two separate browser contexts keep different accounts
3. accepted friends receive messages live without refresh
4. non-friends, guests, and unauthenticated users are blocked from realtime chat

This gives better confidence than the previous implementation, which did not have targeted realtime chat tests.

## 12. Summary

The new chat is better because it:

- delivers messages immediately
- avoids full-page refreshes on every send
- keeps database persistence
- adds friend-based access control
- keeps the UI stable while chatting
- preserves a non-JS fallback
- includes dedicated browser-level tests

In short:

- the old chat was database-backed but refresh-driven
- the new chat is still database-backed, but now realtime and safer
