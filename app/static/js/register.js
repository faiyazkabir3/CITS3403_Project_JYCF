const authForms = document.querySelectorAll("#login-form, #register-form");
const guestForms = document.querySelectorAll(".guest-form");

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 80;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

function normalizeUsernameInput(form) {
  const usernameInput = form.querySelector('input[name="username"]');

  if (!usernameInput) {
    return null;
  }

  usernameInput.value = usernameInput.value.trim().toLowerCase();
  return usernameInput;
}

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

function validateUsernameInput(input, strictPattern) {
  if (!input) {
    return true;
  }

  const value = input.value.trim().toLowerCase();
  input.value = value;

  if (!value) {
    return showFieldError(input, "Please enter a username.");
  }

  if (value.length < MIN_USERNAME_LENGTH) {
    return showFieldError(input, `Username must be at least ${MIN_USERNAME_LENGTH} characters.`);
  }

  if (value.length > MAX_USERNAME_LENGTH) {
    return showFieldError(input, `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);
  }

  if (strictPattern && !USERNAME_PATTERN.test(value)) {
    return showFieldError(input, "Username can only use lowercase letters, numbers, and underscores.");
  }

  clearFieldError(input);
  return true;
}

function validatePasswordInput(input) {
  if (!input) {
    return true;
  }

  if (!input.value) {
    return showFieldError(input, "Please enter a password.");
  }

  clearFieldError(input);
  return true;
}

function validateConfirmPassword(passwordInput, confirmInput) {
  if (!confirmInput) {
    return true;
  }

  if (!confirmInput.value) {
    return showFieldError(confirmInput, "Please confirm your password.");
  }

  if (passwordInput && passwordInput.value !== confirmInput.value) {
    return showFieldError(confirmInput, "Passwords do not match.");
  }

  clearFieldError(confirmInput);
  return true;
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
  const usernameInput = form.querySelector('input[name="username"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const confirmInput = form.querySelector('input[name="confirm-password"]');
  const isRegisterForm = form.id === "register-form";

  if (usernameInput) {
    usernameInput.addEventListener("input", () => {
      validateUsernameInput(usernameInput, isRegisterForm);
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      clearFieldError(passwordInput);

      if (confirmInput && confirmInput.value) {
        validateConfirmPassword(passwordInput, confirmInput);
      }
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener("input", () => {
      validateConfirmPassword(passwordInput, confirmInput);
    });
  }

  form.addEventListener("submit", (event) => {
    normalizeUsernameInput(form);

    const usernameValid = validateUsernameInput(usernameInput, isRegisterForm);
    const passwordValid = validatePasswordInput(passwordInput);
    const confirmValid = validateConfirmPassword(passwordInput, confirmInput);

    if (!usernameValid || !passwordValid || !confirmValid) {
      event.preventDefault();
      return;
    }

    setBusyButton(form, isRegisterForm ? "REGISTERING..." : "LOGGING IN...");
  });
});

guestForms.forEach((form) => {
  form.addEventListener("submit", () => {
    localStorage.removeItem("playerName");
    setBusyButton(form, "ENTERING...");
  });
});
