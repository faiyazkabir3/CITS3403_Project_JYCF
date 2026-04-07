import { getAchievementHtmlFromSavedData } from "./progression.js";

const playGameBtn = document.getElementById("play-game-btn");
const settingsBtn = document.getElementById("settings-btn");
const achievementsBtn = document.getElementById("achievements-btn");
const logoutBtn = document.getElementById("logout-btn");

const leftPanelTitle = document.getElementById("left-panel-title");
const leftPanelContent = document.getElementById("left-panel-content");

const menuButtons = [playGameBtn, settingsBtn, achievementsBtn, logoutBtn];

function setActiveButton(activeButton) {
  menuButtons.forEach((button) => {
    if (!button) return;
    button.classList.remove("active");
  });

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

function showAchievements() {
  leftPanelTitle.textContent = "ACHIEVEMENTS";
  leftPanelContent.innerHTML = getAchievementHtmlFromSavedData();
}

function showSettings() {
  leftPanelTitle.textContent = "SETTINGS";
  leftPanelContent.innerHTML = `
    <div class="achievement-card">
      <div class="achievement-title">SETTINGS PANEL</div>
      <div class="achievement-desc">Settings can be added later here.</div>
    </div>
  `;
}

if (playGameBtn) {
  playGameBtn.addEventListener("click", () => {
    setActiveButton(playGameBtn);
    window.location.href = "/play";
  });
}

if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    setActiveButton(settingsBtn);
    showSettings();
  });
}

if (achievementsBtn) {
  achievementsBtn.addEventListener("click", () => {
    setActiveButton(achievementsBtn);
    showAchievements();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    setActiveButton(logoutBtn);
    window.location.href = "/";
  });
}

showAchievements();