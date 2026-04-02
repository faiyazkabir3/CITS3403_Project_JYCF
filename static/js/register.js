const registerForm = document.getElementById("register-form");
const guestButton = document.getElementById("guest-login-btn");

function makeGuestName() {
  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  return "Operator" + randomNumber;
}

function registerUser(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (username === "") {
    alert("Please enter a username.");
    return;
  }

  if (password === "") {
    alert("Please enter a password.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  localStorage.setItem("playerName", username);

  alert("Account created. Your username is: " + username);

  window.location.href = "main_menu.html";
}

function guestLogin() {
  const guestName = makeGuestName();

  localStorage.setItem("playerName", guestName);

  alert("Your guest operator ID is: " + guestName);

  window.location.href = "main_menu.html";
}

if (registerForm) {
  registerForm.addEventListener("submit", registerUser);
}

if (guestButton) {
  guestButton.addEventListener("click", guestLogin);
}