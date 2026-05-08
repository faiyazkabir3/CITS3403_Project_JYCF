# End-To-End Encrypted Chat Documentation

Updated: 8 May 2026

This document explains how the direct chat end-to-end encryption system works in this project. It focuses on the encrypted chat layer built on top of the realtime Socket.IO chat system.

If this document and the code ever disagree, the code is the source of truth. The main files are:

- `static/js/chat.js`
- `templates/chat.html`
- `routes.py`
- `app.py`
- `models.py`

## 1. What End-To-End Encryption Means Here

End-to-end encryption means the chat message is encrypted in the sender's browser before it is sent to Flask. The server stores and forwards the encrypted message, but it does not need the plaintext message to perform its job.

In this project:

- the sender's browser encrypts the message
- Flask receives ciphertext, not plaintext
- the database stores ciphertext, not plaintext
- Socket.IO broadcasts ciphertext to the chat room
- the receiver's browser decrypts the message locally

The server still controls authentication, friendship checks, message storage, and realtime delivery. It just does not decrypt message text.

## 2. Cryptography Used

The browser code uses the Web Crypto API in `static/js/chat.js`.

| Purpose | Algorithm | Where |
| --- | --- | --- |
| User chat key pair | ECDH P-256 | Browser |
| Shared message key derivation | ECDH P-256 | Browser |
| Message encryption | AES-GCM 256-bit | Browser |
| Key ID generation | SHA-256 of public key | Browser and Flask |
| Nonce generation | 12 random bytes | Browser |

### Why These Pieces Are Used

ECDH lets two browsers derive the same shared secret without sending private keys over the network.

AES-GCM encrypts the message and also detects tampering. If the ciphertext, nonce, or key is wrong, decryption fails.

SHA-256 key IDs give the app a short identifier for a public key. The key ID is not secret. It is used to identify and validate which public key was used.

## 3. Key Storage Model

Each logged-in user gets a browser-side chat key pair.

The key pair contains:

- a public ECDH key
- a private ECDH key
- a key ID derived from the public key

The private key is stored in browser `localStorage` under a user-specific key:

```text
cits3403:e2ee:<current_user_id>
```

Only the public key is sent to Flask.

### Important Consequence

If the user clears browser storage, changes browser, or uses another device, that browser will not have the original private key. Old messages may show as:

```text
Locked encrypted message
```

This is expected for this implementation. Because Flask does not have the private key, Flask cannot recover old plaintext messages.

## 4. Public Key Registration

When a user opens `/chat/<friend_id>`, `bootEncryptedChat()` runs in `static/js/chat.js`.

The startup flow is:

1. Check whether `window.crypto.subtle` is available.
2. Load the current user's existing key pair from `localStorage`.
3. If no key pair exists, generate a new ECDH P-256 key pair.
4. Export the public key and private key as base64url strings.
5. Store the exported key record in `localStorage`.
6. Send the current user's public key to Flask with `POST /chat/keys/<friend_id>`.
7. Fetch the friend's public key from Flask.
8. Render existing encrypted chat history.
9. Connect to the realtime Socket.IO chat room.

The Flask route is:

```text
POST /chat/keys/<friend_id>
```

It saves the current user's public chat key on the `User` row:

```text
chat_public_key
chat_key_id
chat_key_created_at
```

The same route also returns the friend's public key when available.

## 5. Sending An Encrypted Message

When the user submits the chat form, `handleChatSubmit()` prevents the normal browser submission at first. The message is encrypted before any send path is used.

The send flow is:

1. Read and trim the message from the input box.
2. Reject blank messages in the browser.
3. Call `encryptMessage(plainText)`.
4. Ensure the friend's public key is available.
5. Import the friend's public key.
6. Use ECDH with:
   - the sender's private key
   - the friend's public key
7. Derive an AES-GCM 256-bit key.
8. Generate a fresh 12-byte random nonce.
9. Encrypt the plaintext with AES-GCM.
10. Build an encrypted payload.
11. Send the encrypted payload through Socket.IO if live chat is connected.
12. If live chat is not connected, submit the encrypted payload through the normal Flask form fallback.

The encrypted payload contains:

```text
ciphertext
nonce
sender_public_key
sender_key_id
recipient_public_key
recipient_key_id
encryption_version
```

The encrypted payload does not contain the plaintext message.

## 6. Realtime Send Path

If Socket.IO is connected and the browser has joined the room, the client emits:

```text
chat:send
```

with this shape:

```json
{
  "friend_id": 2,
  "message": {
    "ciphertext": "...",
    "nonce": "...",
    "sender_public_key": "...",
    "sender_key_id": "...",
    "recipient_public_key": "...",
    "recipient_key_id": "...",
    "encryption_version": 1
  }
}
```

Flask handles this in `handle_chat_send()` in `routes.py`. The handler is attached to the shared `socketio` instance created in `app.py`.

The server then:

1. Checks the user is logged in and is not a guest.
2. Parses the friend ID.
3. Confirms the two users are accepted friends.
4. Validates the encrypted payload.
5. Creates a `Message` row with `message=None`.
6. Stores only the encrypted fields.
7. Emits `chat:new` to the private conversation room.

The room name is deterministic:

```text
chat:<smaller_user_id>:<larger_user_id>
```

For example, users `4` and `9` share this room:

```text
chat:4:9
```

## 7. Form Fallback Send Path

If realtime chat is unavailable, the same encrypted payload is copied into hidden form fields in `templates/chat.html`.

The hidden fields are:

```text
ciphertext
nonce
sender_public_key
sender_key_id
recipient_public_key
recipient_key_id
encryption_version
```

Then the browser submits the normal form to:

```text
POST /chat/<friend_id>
```

The Flask route validates and stores the encrypted payload in the same `Message` table. This means the fallback path still preserves end-to-end encryption.

## 8. Receiving And Decrypting Messages

Messages reach the browser in two ways:

- initial chat history embedded in the server-rendered page as JSON
- realtime `chat:new` Socket.IO events

Both paths use the same `appendMessage(messageData)` function.

For every encrypted message, the browser:

1. Determines whether the message is outgoing or incoming.
2. Chooses the peer public key:
   - outgoing message: use the recipient public key
   - incoming message: use the sender public key
3. Derives the same AES-GCM key with ECDH.
4. Attempts to decrypt the ciphertext using the stored nonce.
5. Displays the plaintext if decryption succeeds.
6. Displays `Locked encrypted message` if decryption fails.

Decryption can fail if:

- the browser does not have the original private key
- the message was encrypted for a different key
- the ciphertext or nonce was changed
- the stored public key metadata is missing

## 9. Database Fields

The `User` model stores public chat-key metadata:

```text
chat_public_key
chat_key_id
chat_key_created_at
```

The `Message` model stores encrypted chat payloads:

```text
id
sender_id
receiver_id
message
ciphertext
nonce
sender_key_id
sender_public_key
recipient_key_id
recipient_public_key
encryption_version
timestamp
```

For encrypted messages, `message` is set to `None`. The old `message` column remains nullable for compatibility with earlier chat versions.

## 10. Server-Side Validation

The server cannot decrypt messages, but it still validates the envelope.

`validate_encrypted_chat_payload()` checks that:

- the payload is a dictionary
- `ciphertext` is present
- `nonce` is present
- `sender_public_key` is present
- `sender_key_id` is present
- `sender_key_id` matches the SHA-256-derived ID for `sender_public_key`
- if a recipient public key exists, `recipient_key_id` matches it
- `encryption_version` is converted to an integer, defaulting to `1`

The server also enforces access rules in both HTTP and Socket.IO flows:

- guests cannot use chat
- unauthenticated users cannot use chat
- users can only chat with accepted friends
- invalid friend IDs are rejected

## 11. What The Server Can And Cannot See

The server can see:

- sender ID
- receiver ID
- message timestamp
- ciphertext
- nonce
- sender public key
- recipient public key
- key IDs
- which users are chatting

The server should not see:

- plaintext message content
- browser private keys
- derived AES message keys

This protects message content from normal server-side database inspection, because the stored rows do not contain readable message text.

## 12. Limitations And Tradeoffs

This implementation is intentionally simple and suitable for the project, but it is not a full production messenger protocol.

Current limitations:

- private keys are stored in browser `localStorage`
- there is no key backup or export UI
- there is no multi-device key synchronization
- there is no user-facing public-key verification screen
- there is no forward secrecy per message
- changing or clearing browser storage can make old messages undecryptable
- a compromised browser can still read messages after decryption
- the server still sees metadata such as who talked to whom and when

These tradeoffs keep the implementation understandable while still ensuring new chat messages are encrypted before Flask stores or broadcasts them.

## 13. End-To-End Flow Summary

```text
Sender browser
  creates or loads private key
  fetches friend's public key
  derives shared AES-GCM key
  encrypts plaintext message
  sends encrypted payload

Flask server
  validates login and friendship
  validates encrypted payload metadata
  stores ciphertext in Message table
  broadcasts ciphertext to chat room

Receiver browser
  receives encrypted payload
  uses own private key and sender public key
  derives the same AES-GCM key
  decrypts ciphertext locally
  displays plaintext message
```

The key design point is that plaintext exists only in the user's browser before encryption and after decryption. The server handles delivery and persistence without needing to read the message body.
