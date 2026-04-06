import { bootGameUI } from "./gameUI.js";
import { loadGame, deleteSave, getSavePreviewText } from "./progression.js";

const startScreen = document.getElementById("start-screen");
const characterScreen = document.getElementById("character-screen");
const difficultyScreen = document.getElementById("difficulty-screen");
const loadScreen = document.getElementById("load-screen");
const gameScreen = document.getElementById("game-screen");

const newGameBtn = document.getElementById("new-game-btn");
const loadGameBtn = document.getElementById("load-game-btn");

const backToMainBtn = document.getElementById("back-to-main-btn");
const characterBackBtn = document.getElementById("character-back-btn");
const difficultyBackBtn = document.getElementById("difficulty-back-btn");
const loadBackBtn = document.getElementById("load-back-btn");
const gameBackBtn = document.getElementById("game-back-btn");

const characterButtons = document.querySelectorAll(".character-card");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const difficultyDisplay = document.getElementById("difficulty-display");
const selectedCharacterDisplay = document.getElementById("selected-character-display");

const loadLatestSaveBtn = document.getElementById("load-latest-save-btn");
const deleteSaveBtn = document.getElementById("delete-save-btn");
const savePreview = document.getElementById("save-preview");

let gameEngine = null;
let selectedCharacter = "leon";

const CHARACTER_LABELS = {
  leon: "LEON",
  quite: "QUITE"
};

function showScreen(screenToShow) {
  const screens = [
    startScreen,
    characterScreen,
    difficultyScreen,
    loadScreen,
    gameScreen
  ];

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  screenToShow.classList.add("active");
}

function updateSelectedCharacterText() {
  if (selectedCharacterDisplay) {
    selectedCharacterDisplay.textContent = CHARACTER_LABELS[selectedCharacter] || "LEON";
  }
}

function refreshSavePreview() {
  if (savePreview) {
    savePreview.textContent = getSavePreviewText();
  }
}

function bootNewRun(selectedDifficulty) {
  difficultyDisplay.textContent = selectedDifficulty;
  showScreen(gameScreen);

  gameEngine = bootGameUI({
    difficultyText: selectedDifficulty,
    selectedCharacter
  });

  window.gameEngine = gameEngine;
}

function bootLoadedRun(savedPayload) {
  if (!savedPayload || !savedPayload.state) return;

  difficultyDisplay.textContent = savedPayload.state.difficulty || "EASY";
  showScreen(gameScreen);

  gameEngine = bootGameUI({
    difficultyText: savedPayload.state.difficulty || "EASY",
    selectedCharacter: savedPayload.state.player?.characterId || "leon",
    savedState: savedPayload.state
  });

  window.gameEngine = gameEngine;
}

newGameBtn.addEventListener("click", () => {
  showScreen(characterScreen);
});

loadGameBtn.addEventListener("click", () => {
  refreshSavePreview();
  showScreen(loadScreen);
});

backToMainBtn.addEventListener("click", () => {
  window.location.href = "/main-menu";
});

characterBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

difficultyBackBtn.addEventListener("click", () => {
  showScreen(characterScreen);
});

loadBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

gameBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

characterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCharacter = button.dataset.character || "leon";
    updateSelectedCharacterText();
    showScreen(difficultyScreen);
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedDifficulty = button.dataset.difficulty.toUpperCase();
    bootNewRun(selectedDifficulty);
  });
});

if (loadLatestSaveBtn) {
  loadLatestSaveBtn.addEventListener("click", () => {
    const savedPayload = loadGame();

    if (!savedPayload) {
      refreshSavePreview();
      return;
    }

    bootLoadedRun(savedPayload);
  });
}

if (deleteSaveBtn) {
  deleteSaveBtn.addEventListener("click", () => {
    deleteSave();
    refreshSavePreview();
  });
}

updateSelectedCharacterText();
refreshSavePreview();