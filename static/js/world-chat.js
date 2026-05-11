import { t } from "./translation.js";

const worldChatToggle = document.querySelector("[data-world-chat-toggle]");
const worldChatModal = document.querySelector("[data-world-chat-modal]");
const worldChatPanel = document.querySelector("[data-world-chat-panel]");
const worldChatClose = document.querySelector("[data-world-chat-close]");
const worldChatStatus = document.querySelector("[data-world-chat-status]");
const worldChatMessages = document.querySelector("[data-world-chat-messages]");
const worldChatForm = document.querySelector("[data-world-chat-form]");
const worldChatInput = document.querySelector("[data-world-chat-input]");
const worldChatSubmit = document.querySelector("[data-world-chat-submit]");
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
const canViewProfiles = Number(document.body?.dataset.userId || 0) > 0;
const WORLD_CHAT_MAX_LINES = 1;

let worldChatPollTimer = null;
let worldChatIsOpen = false;

function setWorldChatStatus(message, state = "idle") {
  if (!worldChatStatus) {
    return;
  }

  worldChatStatus.textContent = message;
  worldChatStatus.dataset.state = state;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatWorldChatTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWorldChatAuthorMarkup(message) {
  const safeName = escapeHtml(message.display_name || t("worldChat.unknownAgent"));
  const authorUserId = Number(message.user_id);

  if (canViewProfiles && Number.isInteger(authorUserId) && authorUserId > 0) {
    return `<a class="world-chat-profile-link" href="/profile/${authorUserId}">${safeName}</a>`;
  }

  return `<strong>${safeName}</strong>`;
}

function countWorldChatLines(message) {
  if (!message) {
    return 0;
  }

  return String(message).split(/\r\n|\r|\n/).length;
}

function validateWorldChatDraft(message) {
  if (countWorldChatLines(message) > WORLD_CHAT_MAX_LINES) {
    return t("worldChat.oneLineOnly");
  }

  return null;
}

function renderWorldChatMessages(messages) {
  if (!worldChatMessages) {
    return;
  }

  if (!messages.length) {
    worldChatMessages.innerHTML = `<p class="world-chat-empty">${escapeHtml(t("worldChat.noMessages"))}</p>`;
    return;
  }

  worldChatMessages.innerHTML = messages.map((message) => {
    const messageVariantClass = message.is_current_user ? "outgoing" : "incoming";
    const authorMarkup = buildWorldChatAuthorMarkup(message);
    const safeText = escapeHtml(message.message || "");
    const safeTime = escapeHtml(formatWorldChatTime(message.created_at));
    const safeDateTime = escapeHtml(message.created_at || "");

    return `
      <article class="world-chat-message ${messageVariantClass}">
        <div class="world-chat-message-meta">
          ${authorMarkup}
        </div>
        <p>${safeText}</p>
        <time datetime="${safeDateTime}">${safeTime}</time>
      </article>
    `;
  }).join("");

  worldChatMessages.scrollTop = worldChatMessages.scrollHeight;
}

async function parseWorldChatResponse(response, fallbackMessage) {
  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload || !payload.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

async function loadWorldChatMessages() {
  if (!worldChatMessages) {
    return;
  }

  try {
    setWorldChatStatus(t("worldChat.loading"), "idle");

    const response = await fetch("/world-chat/messages", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    const payload = await parseWorldChatResponse(response, t("worldChat.loadError"));

    renderWorldChatMessages(payload.messages || []);
    setWorldChatStatus(t("worldChat.live"), "online");
  } catch (error) {
    setWorldChatStatus(error.message || t("worldChat.loadError"), "error");
  }
}

function stopWorldChatPolling() {
  if (worldChatPollTimer !== null) {
    window.clearInterval(worldChatPollTimer);
    worldChatPollTimer = null;
  }
}

function startWorldChatPolling() {
  stopWorldChatPolling();
  worldChatPollTimer = window.setInterval(() => {
    if (worldChatIsOpen) {
      loadWorldChatMessages();
    }
  }, 5000);
}

function setWorldChatOpen(isOpen) {
  if (!worldChatToggle || !worldChatModal || !worldChatPanel) {
    return;
  }

  worldChatIsOpen = isOpen;
  worldChatModal.hidden = !isOpen;
  worldChatModal.setAttribute("aria-hidden", String(!isOpen));
  worldChatToggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    loadWorldChatMessages();
    startWorldChatPolling();

    if (worldChatInput) {
      window.requestAnimationFrame(() => {
        worldChatInput.focus();
      });
    }
  } else {
    stopWorldChatPolling();
  }
}

async function handleWorldChatSubmit(event) {
  event.preventDefault();

  if (!worldChatInput || !worldChatSubmit) {
    return;
  }

  const rawMessage = worldChatInput.value;
  const draftError = validateWorldChatDraft(rawMessage);

  if (draftError) {
    setWorldChatStatus(draftError, "error");
    worldChatInput.focus();
    return;
  }

  const message = rawMessage.trim();

  if (!message) {
    setWorldChatStatus(t("worldChat.emptyMessage"), "error");
    worldChatInput.focus();
    return;
  }

  worldChatSubmit.disabled = true;
  worldChatSubmit.textContent = t("worldChat.sending");

  try {
    const response = await fetch("/world-chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ message }),
    });

    await parseWorldChatResponse(response, t("worldChat.sendError"));

    worldChatInput.value = "";
    setWorldChatStatus(t("worldChat.sent"), "online");
    await loadWorldChatMessages();
    worldChatInput.focus();
  } catch (error) {
    setWorldChatStatus(error.message || t("worldChat.sendError"), "error");
  } finally {
    worldChatSubmit.disabled = false;
    worldChatSubmit.textContent = t("worldChat.send");
  }
}

if (worldChatToggle && worldChatModal && worldChatPanel) {
  worldChatToggle.addEventListener("click", () => {
    setWorldChatOpen(!worldChatIsOpen);
  });

  worldChatClose?.addEventListener("click", () => {
    setWorldChatOpen(false);
    worldChatToggle.focus();
  });

  worldChatModal.addEventListener("click", (event) => {
    if (event.target === worldChatModal) {
      setWorldChatOpen(false);
      worldChatToggle.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && worldChatIsOpen) {
      setWorldChatOpen(false);
      worldChatToggle.focus();
    }
  });

  worldChatForm?.addEventListener("submit", handleWorldChatSubmit);
  worldChatInput?.addEventListener("paste", (event) => {
    const pastedText = event.clipboardData?.getData("text") || "";
    const draftError = validateWorldChatDraft(pastedText);

    if (!draftError) {
      return;
    }

    event.preventDefault();
    setWorldChatStatus(draftError, "error");
  });
}
