const guestBtn = document.getElementById("guest-login-btn");

function makeGuestName() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return "Operator" + num;
}

function guestLogin() {
  const name = makeGuestName();

  localStorage.setItem("playerName", name);
  alert("Your guest operator ID is: " + name);

  window.location.href = "/main-menu";
}

if (guestBtn) {
  guestBtn.addEventListener("click", guestLogin);
}
