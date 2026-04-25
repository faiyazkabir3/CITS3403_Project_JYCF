import { loadLanguage } from "./translation.js";

const STORAGE_KEY = "shadows_audio_settings";
const UI_BUTTON_SOUND = "/static/audio/sfx/ui/button_click.mp3";

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
  } catch {
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

const menuThemeAudio = document.getElementById("menu-theme-audio");

const languageModal = document.getElementById("language-modal");
const openLanguageBtn = document.getElementById("open-language-btn");
const closeLanguageBtn = document.getElementById("close-language-btn");
const confirmLanguageBtn = document.getElementById("confirm-language-btn");
const currentLanguageLabel = document.getElementById("current-language-label");
const languageOptions = document.querySelectorAll("[data-lang-option]");

let settings = loadSettings();
const uiButtonAudio = new Audio(UI_BUTTON_SOUND);
uiButtonAudio.preload = "auto";

function playUiButtonSound() {
  if (settings.muted || settings.sfxVolume <= 0) return;

  uiButtonAudio.pause();
  uiButtonAudio.currentTime = 0;
  uiButtonAudio.volume = settings.sfxVolume / 100;
  uiButtonAudio.play().catch(() => {});
}

function syncMenuAudio() {
  if (!menuThemeAudio) return;

  menuThemeAudio.volume = settings.musicVolume / 100;
  menuThemeAudio.muted = settings.muted;

  if (settings.muted) {
    menuThemeAudio.pause();
    return;
  }

  menuThemeAudio.play().catch((error) => {
    console.error("Menu music could not start yet:", error);
  });
}

function renderSettings() {
  if (musicSlider) musicSlider.value = settings.musicVolume;
  if (sfxSlider) sfxSlider.value = settings.sfxVolume;
  if (muteCheckbox) muteCheckbox.checked = settings.muted;

  if (musicValue) musicValue.textContent = String(settings.musicVolume);
  if (sfxValue) sfxValue.textContent = String(settings.sfxVolume);
  if (muteStatus) muteStatus.textContent = settings.muted ? "ON" : "OFF";
}

function persistSettings() {
  saveSettings(settings);
  renderSettings();
  syncMenuAudio();
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
  openSettingsBtn.addEventListener("click", () => {
    playUiButtonSound();
    openSettingsModal();
    syncMenuAudio();
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", () => {
    playUiButtonSound();
    closeSettingsModal();
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      playUiButtonSound();
      closeSettingsModal();
    }
  });
}

if (musicSlider) {
  musicSlider.addEventListener("input", () => {
    settings.musicVolume = clampVolume(musicSlider.value);
    persistSettings();
  });
}

if (sfxSlider) {
  sfxSlider.addEventListener("input", () => {
    settings.sfxVolume = clampVolume(sfxSlider.value);
    persistSettings();
  });
}

if (muteCheckbox) {
  muteCheckbox.addEventListener("change", () => {
    settings.muted = muteCheckbox.checked;
    persistSettings();
  });
}

document.querySelectorAll(".menu-buttons a").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href) return;

    event.preventDefault();
    playUiButtonSound();

    window.setTimeout(() => {
      window.location.href = href;
    }, 350);
  });
});

document.addEventListener(
  "click",
  () => {
    syncMenuAudio();
  },
  { once: true }
);

document.addEventListener(
  "keydown",
  () => {
    syncMenuAudio();
  },
  { once: true }
);

let selectedLang = localStorage.getItem("lang") || "en";

function renderLanguageSelection() {
  languageOptions.forEach((button) => {
    const isSelected = button.dataset.langOption === selectedLang;
    button.classList.toggle("is-selected", isSelected);
  });

  if (currentLanguageLabel) {
    currentLanguageLabel.textContent = selectedLang.toUpperCase();
  }
}

function openLanguageModal() {
  if (!languageModal) return;
  renderLanguageSelection();
  languageModal.hidden = false;
  languageModal.setAttribute("aria-hidden", "false");
}

function closeLanguageModal() {
  if (!languageModal) return;
  languageModal.hidden = true;
  languageModal.setAttribute("aria-hidden", "true");
}

if (openLanguageBtn) {
  openLanguageBtn.addEventListener("click", () => {
    playUiButtonSound();
    openLanguageModal();
  });
}

if (closeLanguageBtn) {
  closeLanguageBtn.addEventListener("click", () => {
    playUiButtonSound();
    closeLanguageModal();
  });
}

languageOptions.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    selectedLang = button.dataset.langOption;
    renderLanguageSelection();
  });
});

if (confirmLanguageBtn) {
  confirmLanguageBtn.addEventListener("click", async () => {
    playUiButtonSound();
    await loadLanguage(selectedLang);
    closeLanguageModal();
  });
}

if (languageModal) {
  languageModal.addEventListener("click", (event) => {
    if (event.target === languageModal) {
      playUiButtonSound();
      closeLanguageModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (languageModal && !languageModal.hidden) {
    playUiButtonSound();
    closeLanguageModal();
    return;
  }

  if (settingsModal && !settingsModal.hidden) {
    playUiButtonSound();
    closeSettingsModal();
  }
});

loadLanguage(localStorage.getItem("lang") || "en");
renderSettings();
renderLanguageSelection();
syncMenuAudio();
