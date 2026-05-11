import { t, initLanguage } from "./translation.js";

await initLanguage();

const friendForm = document.querySelector("[data-friend-form]");
const friendUsernameInput = document.querySelector("[data-friend-username]");
const flashMessages = document.querySelectorAll("[data-flash-message]");

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 80;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

function clearFieldError(input) {
  if (!input) {
    return;
  }

  input.setCustomValidity("");
}

function showFieldError(input, message) {
  if (!input) {
    return false;
  }

  input.setCustomValidity(message);
  input.reportValidity();
  return false;
}

function normalizeFriendUsername() {
  if (!friendUsernameInput) {
    return "";
  }

  const cleanedUsername = friendUsernameInput.value.trim().toLowerCase();
  friendUsernameInput.value = cleanedUsername;
  return cleanedUsername;
}

function validateFriendUsername() {
  if (!friendUsernameInput) {
    return true;
  }

  const cleanedUsername = normalizeFriendUsername();

  if (!cleanedUsername) {
    return showFieldError(friendUsernameInput, t("friends.validation.enterUsername"));
  }

  if (cleanedUsername.length < MIN_USERNAME_LENGTH) {
    return showFieldError(
      friendUsernameInput,
      t("friends.validation.minLength", { amount: MIN_USERNAME_LENGTH })

    );
  }

  if (cleanedUsername.length > MAX_USERNAME_LENGTH) {
    return showFieldError(
      friendUsernameInput,
      t("friends.validation.maxLength", { amount: MAX_USERNAME_LENGTH })
    );
  }

  if (!USERNAME_PATTERN.test(cleanedUsername)) {
    return showFieldError(
      friendUsernameInput,
      t("friends.validation.allowedCharacters")
    );
  }

  clearFieldError(friendUsernameInput);
  return true;
}

if (friendUsernameInput) {
  friendUsernameInput.focus();

  friendUsernameInput.addEventListener("input", () => {
    validateFriendUsername();
  });
}

if (friendForm && friendUsernameInput) {
  friendForm.addEventListener("submit", (event) => {
    const isValid = validateFriendUsername();

    if (!isValid) {
      event.preventDefault();
      friendUsernameInput.focus();
      return;
    }

    const submitButton = friendForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = t("friends.sending");
    }
  });
}

flashMessages.forEach((message) => {
  window.setTimeout(() => {
    message.classList.add("is-hidden");
  }, 3000);
});
