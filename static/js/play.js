import { initLanguage } from "./translation.js";
await initLanguage();

import { bootGameUI } from "./gameUI.js";
import {
  isQuiteTutorialActive,
  setQuiteTutorialActive,
  stopQuiteTutorial
} from "./tutorialGuide.js";

const STORAGE_KEY = "shadows_audio_settings";
const UI_BUTTON_SOUND = "/static/audio/sfx/ui/button_click.mp3";
const ERROR_BEEP_SOUND = "/static/audio/sfx/system/error_beep.mp3";
const uiButtonAudio = new Audio(UI_BUTTON_SOUND);
const errorBeepAudio = new Audio(ERROR_BEEP_SOUND);
uiButtonAudio.preload = "auto";
errorBeepAudio.preload = "auto";

function loadAudioSettings() {
  const defaultSettings = {
    musicVolume: 50,
    sfxVolume: 50,
    muted: false
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSettings;

    const parsed = JSON.parse(saved);
    return {
      musicVolume: Number(parsed.musicVolume) || 50,
      sfxVolume: Number(parsed.sfxVolume) || 50,
      muted: Boolean(parsed.muted)
    };
  } catch {
    return defaultSettings;
  }
}

function playUiButtonSound() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  uiButtonAudio.pause();
  uiButtonAudio.currentTime = 0;
  uiButtonAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  uiButtonAudio.play().catch(() => {});
}

function playErrorBeep() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  errorBeepAudio.pause();
  errorBeepAudio.currentTime = 0;
  errorBeepAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  errorBeepAudio.play().catch(() => {});
}

const startScreen = document.getElementById("start-screen");
const characterScreen = document.getElementById("character-screen");
const difficultyScreen = document.getElementById("difficulty-screen");
const tutorialScreen = document.getElementById("tutorial-screen");
const loadScreen = document.getElementById("load-screen");
const gameScreen = document.getElementById("game-screen");

const newGameBtn = document.getElementById("new-game-btn");
const loadGameBtn = document.getElementById("load-game-btn");

const backToMainBtn = document.getElementById("back-to-main-btn");
const characterBackBtn = document.getElementById("character-back-btn");
const difficultyBackBtn = document.getElementById("difficulty-back-btn");
const tutorialBackBtn = document.getElementById("tutorial-back-btn");
const loadBackBtn = document.getElementById("load-back-btn");
const gameBackBtn = document.getElementById("game-back-btn");

const characterButtons = document.querySelectorAll(".character-card");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const difficultyDisplay = document.getElementById("difficulty-display");
const selectedCharacterDisplay = document.getElementById("selected-character-display");

const loadLatestSaveBtn = document.getElementById("load-latest-save-btn");
const loadLeonSaveBtn = document.getElementById("load-leon-save-btn");
const loadQuiteSaveBtn = document.getElementById("load-quite-save-btn");
const savePreview = document.getElementById("save-preview");
const tutorialGuideBtn = document.getElementById("tutorial-guide-btn");
const tutorialSkipBtn = document.getElementById("tutorial-skip-btn");

let gameEngine = null;
let selectedCharacter = "leon";
let pendingDifficulty = "EASY";

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
    tutorialScreen,
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
  const runState = saveData.run_state;
  const coins = runState?.inventory?.coins;
  const stats = runState?.stats;

  setSavePreview([
    `CHARACTER: ${CHARACTER_LABELS[(saveData.character_id || "leon").toLowerCase()] || "LEON"}`,
    `DIFFICULTY: ${(saveData.difficulty || "EASY").toUpperCase()}`,
    `LEVEL: ${saveData.current_level_id || "1"}`,
    `HP: ${saveData.health ?? 100}`,
    `COINS: ${coins ?? 0}`,
    `AGI/COUR: ${stats?.agility ?? "-"} / ${stats?.courage ?? "-"}`,
    `SAVED: ${formatSavedTime(saveData.updated_at)}`
  ]);
}

function buildSavedState(saveData) {
  if (saveData.run_state) {
    return structuredClone(saveData.run_state);
  }

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
      pistolShotsFired: saveData.pistol_shots ?? 0,
      rifleShotsFired: saveData.rifle_shots ?? 0,
      grenadesUsed: saveData.grenades_used ?? 0,
      medKitsUsed: saveData.medkits_used ?? 0,
      reloads: saveData.reloads ?? 0,
      knivesUsed: saveData.knife_uses ?? 0,
      sidearmShotsFired: saveData.sidearm_shots ?? 0,
      axeReactions: saveData.axe_reactions ?? 0,
      axeSharpenChargesSpent: saveData.axe_sharpen_charges_spent ?? 0,
      enemiesKilled: saveData.kills ?? 0,
      nemesisKills: saveData.nemesis_kills ?? 0,
      damageDealt: saveData.damage_dealt ?? 0,
      damageTaken: saveData.damage_taken ?? 0,
      dodgesPrepared: 0,
      emergencySuccesses: 0,
      emergencyFailures: 0,
      emergencySequenceClears: 0,
      coinsEarned: 0,
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
    selectedCharacter,
    tutorialGuideActive: isQuiteTutorialActive()
  });

  window.gameEngine = gameEngine;
}

function beginNewRunWithGuideChoice(useGuide) {
  if (useGuide) {
    setQuiteTutorialActive(true);
  } else {
    stopQuiteTutorial();
  }

  bootNewRun(pendingDifficulty);
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
    savedState,
    tutorialGuideActive: false
  });

  window.gameEngine = gameEngine;
}

async function fetchCurrentSaveData(characterId = null) {
  const query = characterId ? `?character_id=${encodeURIComponent(characterId)}` : "";
  const response = await fetch(`/load-game${query}`);
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
      playErrorBeep();
      showNoSavePreview(result.message);
      return null;
    }

    showSavePreview(result.saveData);
    return result.saveData;
  } catch (error) {
    console.error("Failed to load save preview:", error);
    playErrorBeep();
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
      playErrorBeep();
      showNoSavePreview(result.message);
      return;
    }

    showSavePreview(result.saveData);
    bootLoadedRun(result.saveData);
  } catch (error) {
    console.error("Failed to load save data:", error);
    playErrorBeep();
    setSavePreview([
      "LOAD FAILED",
      "Please try again."
    ]);
  }
}

async function loadCharacterSave(characterId) {
  try {
    const result = await fetchCurrentSaveData(characterId);

    if (!result.ok || !result.saveData) {
      playErrorBeep();
      showNoSavePreview(result.message);
      return;
    }

    showSavePreview(result.saveData);
    bootLoadedRun(result.saveData);
  } catch (error) {
    console.error(`Failed to load ${characterId} save data:`, error);
    playErrorBeep();
    setSavePreview([
      "LOAD FAILED",
      "Please try again."
    ]);
  }
}

newGameBtn.addEventListener("click", () => {
  playUiButtonSound();
  showScreen(characterScreen);
});

loadGameBtn.addEventListener("click", async () => {
  playUiButtonSound();
  showScreen(loadScreen);
  await refreshSavePreviewFromBackend();
});

backToMainBtn.addEventListener("click", (event) => {
  event.preventDefault();
  playUiButtonSound();

  window.setTimeout(() => {
    window.location.href = backToMainBtn.getAttribute("href") || "/main_menu";
  }, 500);
});

characterBackBtn.addEventListener("click", () => {
  playUiButtonSound();
  showScreen(startScreen);
});

difficultyBackBtn.addEventListener("click", () => {
  playUiButtonSound();
  showScreen(characterScreen);
});

tutorialBackBtn.addEventListener("click", () => {
  playUiButtonSound();
  showScreen(difficultyScreen);
});

loadBackBtn.addEventListener("click", () => {
  playUiButtonSound();
  showScreen(startScreen);
});

gameBackBtn.addEventListener("click", (event) => {
  event.preventDefault();
  playUiButtonSound();

  window.setTimeout(() => {
    window.location.href = gameBackBtn.getAttribute("href") || "/main_menu";
  }, 500);
});

characterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    selectedCharacter = button.dataset.character || "leon";
    updateSelectedCharacterText();
    showScreen(difficultyScreen);
  });
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playUiButtonSound();
    pendingDifficulty = button.dataset.difficulty.toUpperCase();
    showScreen(tutorialScreen);
  });
});

if (tutorialGuideBtn) {
  tutorialGuideBtn.addEventListener("click", () => {
    playUiButtonSound();
    beginNewRunWithGuideChoice(true);
  });
}

if (tutorialSkipBtn) {
  tutorialSkipBtn.addEventListener("click", () => {
    playUiButtonSound();
    beginNewRunWithGuideChoice(false);
  });
}

if (loadLatestSaveBtn) {
  loadLatestSaveBtn.addEventListener("click", async () => {
    playUiButtonSound();
    await loadLatestSave();
  });
}

if (loadLeonSaveBtn) {
  loadLeonSaveBtn.addEventListener("click", async () => {
    playUiButtonSound();
    await loadCharacterSave("leon");
  });
}

if (loadQuiteSaveBtn) {
  loadQuiteSaveBtn.addEventListener("click", async () => {
    playUiButtonSound();
    await loadCharacterSave("quite");
  });
}

updateSelectedCharacterText();
showNoSavePreview();
