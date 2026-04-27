Username required
3 to 80 characters
lowercase letters, numbers, and underscores only
gets trimmed and lowercased before checking in auth and friends flows

Password

required
minimum 6 characters
maximum 255 characters
on register, confirm password must also be filled and must match
no special complexity rule like symbol/uppercase requirement right now

Login

username format checked
password required
wrong username/password still gives invalid credentials
browser-side checks and server-side checks both exist now

Register

username format checked
password length checked
confirm password required
confirm password must match
duplicate usernames rejected

Add friend

friend username required
same username rules as normal username
cannot add yourself
invalid/missing user now gives visible feedback on the friends page

Chat message

cannot be empty
maximum 1000 characters
validation works for normal chat form and Socket.IO chat too
error message now shows on the chat page

Save data

must be logged in
empty/invalid save payload rejected
bad values are sanitised server-side
extreme values are clamped to allowed ranges
invalid difficulty defaults back to EASY
invalid run_state type gets rejected
this reduces simple inspect/devtools abuse, but does not fully stop cheating within allowed ranges
