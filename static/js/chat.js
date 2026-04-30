const chatPage = document.body;
const messagesContainer = document.querySelector("[data-chat-messages]");
const chatForm = document.querySelector("[data-chat-form]");
const chatInput = document.querySelector("[data-chat-input]");
const chatSubmitButton = document.querySelector("[data-chat-submit]");
const chatStatus = document.querySelector("[data-chat-status]");
const chatAlert = document.querySelector("[data-chat-alert]");
const chatHistoryScript = document.querySelector("[data-chat-history]");
const ciphertextInput = document.querySelector("[data-chat-ciphertext]");
const nonceInput = document.querySelector("[data-chat-nonce]");
const senderPublicKeyInput = document.querySelector("[data-chat-sender-public-key]");
const senderKeyIdInput = document.querySelector("[data-chat-sender-key-id]");
const recipientPublicKeyInput = document.querySelector("[data-chat-recipient-public-key]");
const recipientKeyIdInput = document.querySelector("[data-chat-recipient-key-id]");
const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');

const currentUserId = Number(chatPage?.dataset.currentUserId || 0);
const friendId = Number(chatPage?.dataset.friendId || 0);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let socket = null;
let isRoomJoined = false;
let alertTimeoutId = null;
let ownKeyRecord = null;
let friendKeyRecord = null;
let pendingFriendKeyPromise = null;

const seenMessageIds = new Set();

function bytesToBase64Url(bytes) {
  const binary = Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join("");
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = window.atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hashKeyId(publicKey) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(publicKey));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function getStorageKey() {
  return `cits3403:e2ee:${currentUserId}`;
}

async function exportOwnKeys(keyPair) {
  const publicKey = bytesToBase64Url(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const privateKey = bytesToBase64Url(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

  return {
    publicKey,
    privateKey,
    keyId: await hashKeyId(publicKey),
  };
}

async function importPrivateKey(privateKey) {
  return crypto.subtle.importKey(
    "pkcs8",
    base64UrlToBytes(privateKey),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

async function importPublicKey(publicKey) {
  return crypto.subtle.importKey(
    "spki",
    base64UrlToBytes(publicKey),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

async function loadOrCreateOwnKeyRecord() {
  const saved = window.localStorage.getItem(getStorageKey());

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.publicKey && parsed.privateKey && parsed.keyId) {
        return {
          ...parsed,
          privateCryptoKey: await importPrivateKey(parsed.privateKey),
        };
      }
    } catch {
      window.localStorage.removeItem(getStorageKey());
    }
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const exported = await exportOwnKeys(keyPair);
  window.localStorage.setItem(getStorageKey(), JSON.stringify(exported));

  return {
    ...exported,
    privateCryptoKey: keyPair.privateKey,
  };
}

async function deriveMessageKey(peerPublicKey) {
  const publicKey = await importPublicKey(peerPublicKey);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    ownKeyRecord.privateCryptoKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(plainText) {
  const freshFriendKey = await ensureFriendKey();
  if (!freshFriendKey) {
    throw new Error("Friend encryption key is not available yet.");
  }

  const key = await deriveMessageKey(freshFriendKey.public_key);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encoder.encode(plainText)
  );

  return {
    ciphertext: bytesToBase64Url(ciphertext),
    nonce: bytesToBase64Url(nonce),
    sender_public_key: ownKeyRecord.publicKey,
    sender_key_id: ownKeyRecord.keyId,
    recipient_public_key: freshFriendKey.public_key,
    recipient_key_id: freshFriendKey.key_id,
    encryption_version: 1,
  };
}

async function decryptMessage(messageData) {
  const isOutgoing = Number(messageData.sender_id) === currentUserId;
  const peerPublicKey = isOutgoing
    ? messageData.recipient_public_key || friendKeyRecord?.public_key
    : messageData.sender_public_key;

  if (!messageData.ciphertext || !messageData.nonce || !peerPublicKey || !ownKeyRecord) {
    return null;
  }

  try {
    const key = await deriveMessageKey(peerPublicKey);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(messageData.nonce) },
      key,
      base64UrlToBytes(messageData.ciphertext)
    );
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}

function scrollMessagesToBottom() {
  if (!messagesContainer) {
    return;
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setChatStatus(message, state = "idle") {
  if (!chatStatus) {
    return;
  }

  chatStatus.textContent = message;
  chatStatus.dataset.state = state;
}

function showChatAlert(message) {
  if (!chatAlert) {
    return;
  }

  chatAlert.hidden = false;
  chatAlert.textContent = message;

  if (alertTimeoutId !== null) {
    window.clearTimeout(alertTimeoutId);
  }

  alertTimeoutId = window.setTimeout(() => {
    chatAlert.hidden = true;
    alertTimeoutId = null;
  }, 4000);
}

function clearChatAlert() {
  if (!chatAlert) {
    return;
  }

  chatAlert.hidden = true;
  chatAlert.textContent = "";

  if (alertTimeoutId !== null) {
    window.clearTimeout(alertTimeoutId);
    alertTimeoutId = null;
  }
}

function setSubmitPending(isPending) {
  if (!chatSubmitButton) {
    return;
  }

  chatSubmitButton.disabled = isPending;
  chatSubmitButton.textContent = isPending ? "Sending..." : "Send";
}

function getCsrfToken() {
  return csrfTokenMeta?.content || "";
}

async function fetchChatKeys(method = "GET") {
  const csrfToken = getCsrfToken();
  const response = await fetch(`/chat/keys/${friendId}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(method === "POST" && csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: method === "POST" ? JSON.stringify({ public_key: ownKeyRecord.publicKey }) : undefined,
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  if (!result.ok) {
    return null;
  }

  if (result.friend_key) {
    friendKeyRecord = result.friend_key;
  }

  return result;
}

async function ensureFriendKey() {
  if (friendKeyRecord) {
    return friendKeyRecord;
  }

  if (pendingFriendKeyPromise) {
    return pendingFriendKeyPromise;
  }

  pendingFriendKeyPromise = fetchChatKeys("GET")
    .then(() => friendKeyRecord)
    .finally(() => {
      pendingFriendKeyPromise = null;
    });

  return pendingFriendKeyPromise;
}

function pollFriendKey() {
  if (friendKeyRecord) {
    return;
  }

  window.setTimeout(async () => {
    await ensureFriendKey();
    pollFriendKey();
  }, 1000);
}

function parseInitialMessages() {
  if (!chatHistoryScript?.textContent) {
    return [];
  }

  try {
    return JSON.parse(chatHistoryScript.textContent);
  } catch {
    return [];
  }
}

async function appendMessage(messageData) {
  if (!messagesContainer || !messageData) {
    return;
  }

  const messageId = String(messageData.id ?? "");
  if (messageId && seenMessageIds.has(messageId)) {
    return;
  }

  const messageElement = document.createElement("div");
  const isOutgoing = Number(messageData.sender_id) === currentUserId;
  const plaintext = await decryptMessage(messageData);

  messageElement.className = `chat-message ${isOutgoing ? "outgoing" : "incoming"}`;
  messageElement.textContent = plaintext || "Locked encrypted message";

  if (!plaintext) {
    messageElement.dataset.locked = "true";
  }

  if (messageId) {
    messageElement.dataset.messageId = messageId;
    seenMessageIds.add(messageId);
  }

  messagesContainer.append(messageElement);
  scrollMessagesToBottom();
}

async function renderInitialMessages() {
  const messages = parseInitialMessages();

  for (const messageData of messages) {
    await appendMessage(messageData);
  }
}

function joinChatRoom() {
  if (!socket || !socket.connected || !friendId) {
    return;
  }

  socket.emit("chat:join", { friend_id: friendId }, (response = {}) => {
    if (!response.ok) {
      isRoomJoined = false;
      setChatStatus("Live chat unavailable.", "error");
      showChatAlert(response.message || "Unable to join this chat.");
      return;
    }

    isRoomJoined = true;
    clearChatAlert();
    setChatStatus("Live chat connected.", "online");
  });
}

function connectRealtimeChat() {
  if (
    !messagesContainer ||
    !chatForm ||
    !chatInput ||
    !currentUserId ||
    !friendId
  ) {
    setChatStatus("Live chat unavailable.", "error");
    return;
  }

  if (typeof window.io !== "function") {
    setChatStatus("Live chat client failed to load.", "error");
    showChatAlert("Socket.IO client did not load. Check your internet connection and restart the app.");
    return;
  }

  socket = window.io({
    transports: ["polling", "websocket"],
  });

  socket.on("connect", () => {
    setChatStatus("Connecting live chat...", "idle");
    joinChatRoom();
  });

  socket.on("disconnect", () => {
    isRoomJoined = false;
    setChatStatus("Reconnecting live chat...", "error");
  });

  socket.on("connect_error", (error) => {
    isRoomJoined = false;
    setChatStatus("Live chat unavailable.", "error");
    showChatAlert(
      error?.message || "Unable to connect to live chat. Start the app with python app.py instead of flask run."
    );
  });

  socket.on("chat:new", async (messageData) => {
    await appendMessage(messageData);
    clearChatAlert();
    setChatStatus("Live chat connected.", "online");
  });

  socket.on("chat:error", (payload = {}) => {
    setChatStatus("Live chat unavailable.", "error");
    showChatAlert(payload.message || "Chat error.");
    setSubmitPending(false);
  });

  window.addEventListener("beforeunload", () => {
    if (!socket) {
      return;
    }

    socket.emit("chat:leave", { friend_id: friendId });
  });
}

function fillEncryptedForm(encryptedPayload) {
  ciphertextInput.value = encryptedPayload.ciphertext;
  nonceInput.value = encryptedPayload.nonce;
  senderPublicKeyInput.value = encryptedPayload.sender_public_key;
  senderKeyIdInput.value = encryptedPayload.sender_key_id;
  recipientPublicKeyInput.value = encryptedPayload.recipient_public_key;
  recipientKeyIdInput.value = encryptedPayload.recipient_key_id;
}

async function handleChatSubmit(event) {
  const trimmedMessage = chatInput.value.trim();
  event.preventDefault();

  if (!trimmedMessage) {
    chatInput.value = "";
    chatInput.focus();
    return;
  }

  setSubmitPending(true);

  try {
    const encryptedPayload = await encryptMessage(trimmedMessage);

    if (!socket || !socket.connected || !isRoomJoined) {
      fillEncryptedForm(encryptedPayload);
      HTMLFormElement.prototype.submit.call(chatForm);
      return;
    }

    socket.emit(
      "chat:send",
      {
        friend_id: friendId,
        message: encryptedPayload,
      },
      (response = {}) => {
        setSubmitPending(false);

        if (!response.ok) {
          setChatStatus("Live chat unavailable.", "error");
          showChatAlert(response.message || "Unable to send message.");
          return;
        }

        clearChatAlert();
        setChatStatus("Live chat connected.", "online");
        chatInput.value = "";
        chatInput.focus();
      }
    );
  } catch (error) {
    setSubmitPending(false);
    showChatAlert(error?.message || "Message encryption failed.");
    chatInput.focus();
  }
}

async function bootEncryptedChat() {
  if (!window.crypto?.subtle) {
    setChatStatus("Encrypted chat unavailable.", "error");
    showChatAlert("This browser does not support Web Crypto.");
    return;
  }

  ownKeyRecord = await loadOrCreateOwnKeyRecord();
  await fetchChatKeys("POST");
  await renderInitialMessages();
  connectRealtimeChat();
  pollFriendKey();
}

if (messagesContainer && chatForm && chatInput) {
  chatForm.addEventListener("submit", handleChatSubmit);
  chatInput.focus();
  bootEncryptedChat().catch((error) => {
    setChatStatus("Encrypted chat unavailable.", "error");
    showChatAlert(error?.message || "Unable to start encrypted chat.");
  });
}
