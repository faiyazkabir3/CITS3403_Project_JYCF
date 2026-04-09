const friendForm = document.querySelector("[data-friend-form]");
const friendUsernameInput = document.querySelector("[data-friend-username]");
const flashMessages = document.querySelectorAll("[data-flash-message]");

if (friendUsernameInput) {
  friendUsernameInput.focus();
}

if (friendForm && friendUsernameInput) {
  friendForm.addEventListener("submit", (event) => {
    const cleanedUsername = friendUsernameInput.value.trim().toLowerCase();

    if (!cleanedUsername) {
      event.preventDefault();
      friendUsernameInput.focus();
      return;
    }

    friendUsernameInput.value = cleanedUsername;

    const submitButton = friendForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "SENDING...";
    }
  });
}

flashMessages.forEach((message) => {
  window.setTimeout(() => {
    message.classList.add("is-hidden");
  }, 3000);
});
