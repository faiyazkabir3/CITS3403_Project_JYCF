const authForms = document.querySelectorAll("#login-form, #register-form");
const guestForms = document.querySelectorAll(".guest-form");

function normalizeUsernameInput(form) {
  const usernameInput = form.querySelector('input[name="username"]');

  if (!usernameInput) {
    return;
  }

  usernameInput.value = usernameInput.value.trim();
}

function setBusyButton(form, buttonText) {
  const submitButton = form.querySelector('button[type="submit"]');

  if (!submitButton) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = buttonText;
}

authForms.forEach((form) => {
  form.addEventListener("submit", () => {
    normalizeUsernameInput(form);
  });
});

guestForms.forEach((form) => {
  form.addEventListener("submit", () => {
    localStorage.removeItem("playerName");
    setBusyButton(form, "ENTERING...");
  });
});
