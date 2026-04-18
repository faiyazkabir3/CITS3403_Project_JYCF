const STORAGE_KEY = "shadows_audio_settings";

const defaultSettings = {
  musicVolume: 50,
  sfxVolume: 50,
  muted: false
};

function clampVolume(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return { ...defaultSettings };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      musicVolume: clampVolume(parsed.musicVolume),
      sfxVolume: clampVolume(parsed.sfxVolume),
      muted: Boolean(parsed.muted)
    };
  } catch (error) {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const settingsModal = document.getElementById("settings-modal");
const openSettingsBtn = document.getElementById("open-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");

const musicSlider = document.getElementById("music-volume");
const sfxSlider = document.getElementById("sfx-volume");
const muteCheckbox = document.getElementById("mute-audio");

const musicValue = document.getElementById("music-volume-value");
const sfxValue = document.getElementById("sfx-volume-value");
const muteStatus = document.getElementById("mute-status");

let settings = loadSettings();

function renderSettings() {
  if (musicSlider) musicSlider.value = settings.musicVolume;
  if (sfxSlider) sfxSlider.value = settings.sfxVolume;
  if (muteCheckbox) muteCheckbox.checked = settings.muted;

  if (musicValue) musicValue.textContent = String(settings.musicVolume);
  if (sfxValue) sfxValue.textContent = String(settings.sfxVolume);
  if (muteStatus) muteStatus.textContent = settings.muted ? "ON" : "OFF";
}

function persistAndRender() {
  saveSettings(settings);
  renderSettings();
}

function openSettingsModal() {
  if (!settingsModal) return;
  settingsModal.hidden = false;
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  if (!settingsModal) return;
  settingsModal.hidden = true;
  settingsModal.setAttribute("aria-hidden", "true");
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", openSettingsModal);
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", closeSettingsModal);
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && settingsModal && !settingsModal.hidden) {
    closeSettingsModal();
  }
});

if (musicSlider) {
  musicSlider.addEventListener("input", () => {
    settings.musicVolume = clampVolume(musicSlider.value);
    persistAndRender();
  });
}

if (sfxSlider) {
  sfxSlider.addEventListener("input", () => {
    settings.sfxVolume = clampVolume(sfxSlider.value);
    persistAndRender();
  });
}

if (muteCheckbox) {
  muteCheckbox.addEventListener("change", () => {
    settings.muted = muteCheckbox.checked;
    persistAndRender();
  });
}

renderSettings();
