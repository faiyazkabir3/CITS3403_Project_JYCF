import { bootGameUI } from "./gameUI.js";

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

const CHARACTER_PERKS = {
  leon: "TACTICAL SPECIALIST",
  quite: "AGILE SURVIVOR"
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

function setSavePreview(lines) {
  if (!savePreview) return;
  savePreview.textContent = lines.join("\n");
}

function formatSavedTime(savedAt) {
  if (!savedAt) return "UNKNOWN";

  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return "UNKNOWN";
  }

  return date.toLocaleString();
}

function showNoSavePreview(message = "Start a new game first.") {
  setSavePreview([
    "NO SAVED GAME FOUND",
    message
  ]);
}

function showSavePreview(saveData) {
  setSavePreview([
    `CHARACTER: ${CHARACTER_LABELS[(saveData.character_id || "leon").toLowerCase()] || "LEON"}`,
    `DIFFICULTY: ${(saveData.difficulty || "EASY").toUpperCase()}`,
    `LEVEL: ${saveData.current_level_id || "1"}`,
    `HP: ${saveData.health ?? 100}`,
    `SAVED: ${formatSavedTime(saveData.updated_at)}`
  ]);
}

function buildSavedState(saveData) {
  const characterId = (saveData.character_id || "leon").toLowerCase();

  return {
    difficulty: (saveData.difficulty || "EASY").toUpperCase(),

    player: {
      characterId,
      characterName: CHARACTER_LABELS[characterId] || "LEON",
      perkName: CHARACTER_PERKS[characterId] || "TACTICAL SPECIALIST"
    },

    inventory: {
      health: saveData.health ?? 100,
      medKits: saveData.medkits ?? 0,
      grenades: saveData.grenades ?? 0
    },

    pistol: {
      magCapacity: saveData.mag_capacity ?? 8,
      ammoInGun: saveData.ammo_in_gun ?? 0,
      ammoInBag: saveData.ammo_in_bag ?? 0,
      hasLaser: Boolean(saveData.laser_upgrade)
    },

    shield: {
      hasShield: Boolean(saveData.shield_owned),
      equipped: Boolean(saveData.shield_on),
      deflect: [0.3, 0.4]
    },

    analytics: {
      pistolShotsFired: 0,
      grenadesUsed: 0,
      medKitsUsed: 0,
      reloads: 0,
      knivesUsed: 0,
      enemiesKilled: 0,
      damageTaken: 0,
      dodgesPrepared: 0,
      savesMade: 0,
      achievementsUnlocked: []
    },

    combat: {
      inCombat: false,
      enemy: null,
      pendingDodge: false
    },

    progression: {
      currentLevelId: String(saveData.current_level_id || "1"),
      enemiesRemaining: saveData.enemies_remaining ?? 0,
      levelComplete: Boolean(saveData.level_complete),
      awaitingChoice: Boolean(saveData.awaiting_choice),
      gameWon: Boolean(saveData.game_won),
      gameOver: (saveData.health ?? 100) <= 0
    }
  };
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

function bootLoadedRun(saveData) {
  const savedState = buildSavedState(saveData);

  difficultyDisplay.textContent = savedState.difficulty || "EASY";
  selectedCharacter = savedState.player.characterId || "leon";
  updateSelectedCharacterText();
  showScreen(gameScreen);

  gameEngine = bootGameUI({
    difficultyText: savedState.difficulty || "EASY",
    selectedCharacter,
    savedState
  });

  window.gameEngine = gameEngine;
}

async function fetchCurrentSaveData() {
  const response = await fetch("/load-game");
  const result = await response.json();

  if (!result.ok || !result.save_data) {
    return {
      ok: false,
      message: result.message || "Start a new game first.",
      saveData: null
    };
  }

  return {
    ok: true,
    message: result.message || "Save loaded.",
    saveData: result.save_data
  };
}

async function refreshSavePreviewFromBackend() {
  setSavePreview(["CHECKING SAVE DATA..."]);

  try {
    const result = await fetchCurrentSaveData();

    if (!result.ok || !result.saveData) {
      showNoSavePreview(result.message);
      return null;
    }

    showSavePreview(result.saveData);
    return result.saveData;
  } catch (error) {
    console.error("Failed to load save preview:", error);
    setSavePreview([
      "LOAD FAILED",
      "Please try again."
    ]);
    return null;
  }
}

async function loadLatestSave() {
  try {
    const result = await fetchCurrentSaveData();

    if (!result.ok || !result.saveData) {
      showNoSavePreview(result.message);
      return;
    }

    showSavePreview(result.saveData);
    bootLoadedRun(result.saveData);
  } catch (error) {
    console.error("Failed to load save data:", error);
    setSavePreview([
      "LOAD FAILED",
      "Please try again."
    ]);
  }
}

newGameBtn.addEventListener("click", () => {
  showScreen(characterScreen);
});

loadGameBtn.addEventListener("click", async () => {
  showScreen(loadScreen);
  await refreshSavePreviewFromBackend();
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
  loadLatestSaveBtn.addEventListener("click", async () => {
    await loadLatestSave();
  });
}

if (deleteSaveBtn) {
  deleteSaveBtn.style.display = "none";
}

updateSelectedCharacterText();
showNoSavePreview();
