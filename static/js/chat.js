const chatPage = document.body;
const messagesContainer = document.querySelector("[data-chat-messages]");
const chatForm = document.querySelector("[data-chat-form]");
const chatInput = document.querySelector("[data-chat-input]");
const chatSubmitButton = document.querySelector("[data-chat-submit]");
const chatStatus = document.querySelector("[data-chat-status]");
const chatAlert = document.querySelector("[data-chat-alert]");

const currentUserId = Number(chatPage?.dataset.currentUserId || 0);
const friendId = Number(chatPage?.dataset.friendId || 0);

let socket = null;
let isRoomJoined = false;
let alertTimeoutId = null;

const seenMessageIds = new Set(
  Array.from(document.querySelectorAll("[data-message-id]"))
    .map((element) => element.dataset.messageId)
    .filter(Boolean)
);

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

function appendMessage(messageData) {
  if (!messagesContainer || !messageData || !messageData.message) {
    return;
  }

  const messageId = String(messageData.id ?? "");
  if (messageId && seenMessageIds.has(messageId)) {
    return;
  }

  const messageElement = document.createElement("div");
  const isOutgoing = Number(messageData.sender_id) === currentUserId;
  const textElement = document.createElement("span");
  const timeElement = document.createElement("time");

  messageElement.className = `chat-message ${isOutgoing ? "outgoing" : "incoming"}`;
  textElement.textContent = messageData.message;

  if (messageData.timestamp) {
    const sentAt = new Date(messageData.timestamp);
    timeElement.dateTime = messageData.timestamp;
    timeElement.textContent = sentAt.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  messageElement.append(textElement, timeElement);

  if (messageId) {
    messageElement.dataset.messageId = messageId;
    seenMessageIds.add(messageId);
  }

  messagesContainer.append(messageElement);
  scrollMessagesToBottom();
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

  socket.on("chat:new", (messageData) => {
    appendMessage(messageData);
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

if (messagesContainer && chatForm && chatInput) {
  scrollMessagesToBottom();
  chatInput.focus();

  chatForm.addEventListener("submit", (event) => {
    const trimmedMessage = chatInput.value.trim();

    if (!trimmedMessage) {
      event.preventDefault();
      chatInput.value = "";
      chatInput.focus();
      return;
    }

    chatInput.value = trimmedMessage;

    if (!socket || !socket.connected || !isRoomJoined) {
      return;
    }

    event.preventDefault();
    setSubmitPending(true);

    socket.emit(
      "chat:send",
      {
        friend_id: friendId,
        message: trimmedMessage,
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
  });

  connectRealtimeChat();
}
