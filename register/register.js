function makeGuestName() {
  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  return "Operator" + randomNumber;
}

function guestLogin() {
  const guestName = makeGuestName();

  localStorage.setItem("playerName", guestName);

  alert("Your guest operator ID is: " + guestName);

  window.location.href = "../main_menu/main_menu.html";
}

const guestButton = document.getElementById("guest-login-btn");

if (guestButton) {
  guestButton.onclick = guestLogin;
}