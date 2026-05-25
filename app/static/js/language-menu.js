import { getCurrentLanguage, initLanguage, setLanguage } from "./translation.js";

const languageModal = document.querySelector("[data-language-modal]");
const openLanguageButtons = document.querySelectorAll("[data-open-language]");
const closeLanguageButtons = document.querySelectorAll("[data-close-language]");
const confirmLanguageButton = document.querySelector("[data-confirm-language]");
const languageOptions = document.querySelectorAll("[data-lang-option]");
const languageLabels = document.querySelectorAll("[data-current-language-label]");

let selectedLanguage = "en";

function playUiButtonSound() {
  document.dispatchEvent(new CustomEvent("settings:button-sound"));
}

function renderLanguageSelection() {
  languageOptions.forEach((button) => {
    const isSelected = button.dataset.langOption === selectedLanguage;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  languageLabels.forEach((label) => {
    label.textContent = selectedLanguage.toUpperCase();
  });
}

function setLanguageModalOpen(isOpen) {
  if (!languageModal) {
    return;
  }

  languageModal.hidden = !isOpen;
  languageModal.setAttribute("aria-hidden", String(!isOpen));
}

function openLanguageModal() {
  selectedLanguage = getCurrentLanguage();
  renderLanguageSelection();
  setLanguageModalOpen(true);
}

function closeLanguageModal() {
  setLanguageModalOpen(false);
}

openLanguageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    openLanguageModal();
  });
});

closeLanguageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    closeLanguageModal();
  });
});

languageOptions.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    selectedLanguage = button.dataset.langOption || "en";
    renderLanguageSelection();
  });
});

confirmLanguageButton?.addEventListener("click", async () => {
  playUiButtonSound();
  confirmLanguageButton.disabled = true;

  try {
    selectedLanguage = await setLanguage(selectedLanguage);
    renderLanguageSelection();
    closeLanguageModal();
  } catch (error) {
    console.error(error);
  } finally {
    confirmLanguageButton.disabled = false;
  }
});

languageModal?.addEventListener("click", (event) => {
  if (event.target === languageModal) {
    playUiButtonSound();
    closeLanguageModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && languageModal && !languageModal.hidden) {
    playUiButtonSound();
    closeLanguageModal();
  }
});

document.addEventListener("languagechange", (event) => {
  const nextLanguage = event.detail?.language || getCurrentLanguage();

  if (languageModal && !languageModal.hidden && nextLanguage !== selectedLanguage) {
    return;
  }

  selectedLanguage = nextLanguage;
  renderLanguageSelection();
});

await initLanguage();
if (!languageModal || languageModal.hidden) {
  selectedLanguage = getCurrentLanguage();
}
renderLanguageSelection();
