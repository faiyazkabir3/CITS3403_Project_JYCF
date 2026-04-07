import { bootGameUI } from "./gameUI.js";

const startScreen = document.getElementById("start-screen");
const difficultyScreen = document.getElementById("difficulty-screen");
const loadScreen = document.getElementById("load-screen");
const gameScreen = document.getElementById("game-screen");

const newGameBtn = document.getElementById("new-game-btn");
const loadGameBtn = document.getElementById("load-game-btn");

const backToMainBtn = document.getElementById("back-to-main-btn");
const difficultyBackBtn = document.getElementById("difficulty-back-btn");
const loadBackBtn = document.getElementById("load-back-btn");
const gameBackBtn = document.getElementById("game-back-btn");

const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const difficultyDisplay = document.getElementById("difficulty-display");

const loadMessage = document.querySelector("#load-screen .subtitle");
const loadStatusText = document.querySelector("#load-screen .placeholder-box p");

let gameEngine = null;

function showScreen(screenToShow) {
  const screens = [startScreen, difficultyScreen, loadScreen, gameScreen];

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  screenToShow.classList.add("active");
}

function resetLoadMessage() {
  if (loadMessage) {
    loadMessage.textContent = "Saved game loading will be added later.";
  }

  if (loadStatusText) {
    loadStatusText.textContent = "NO SAVE DATA AVAILABLE";
  }
}

function destroyGameUI() {
  if (gameEngine && typeof gameEngine.destroy === "function") {
    gameEngine.destroy();
  }

  gameEngine = null;
  window.gameEngine = null;
}

function startNewGame(selectedDifficulty) {
  resetLoadMessage();
  destroyGameUI();

  difficultyDisplay.textContent = selectedDifficulty;
  showScreen(gameScreen);

  gameEngine = bootGameUI({
    difficultyText: selectedDifficulty
  });

  window.gameEngine = gameEngine;
}

async function loadSavedGame() {
  resetLoadMessage();
  destroyGameUI();

  showScreen(loadScreen);

  if (loadMessage) {
    loadMessage.textContent = "Checking saved progress...";
  }

  if (loadStatusText) {
    loadStatusText.textContent = "LOADING...";
  }

  try {
    const response = await fetch("/load-game");
    const data = await response.json();

    if (!response.ok || !data.ok || !data.save_data) {
      if (loadMessage) {
        loadMessage.textContent = "Could not load your saved game.";
      }

      if (loadStatusText) {
        loadStatusText.textContent = "PLEASE TRY AGAIN.";
      }

      return;
    }

    const saveData = data.save_data;
    const selectedDifficulty = String(saveData.difficulty || "EASY").toUpperCase();

    difficultyDisplay.textContent = selectedDifficulty;
    showScreen(gameScreen);

    gameEngine = bootGameUI({
      difficultyText: selectedDifficulty,
      saveData
    });

    window.gameEngine = gameEngine;
  } catch (error) {
    if (loadMessage) {
      loadMessage.textContent = "Could not load your saved game.";
    }

    if (loadStatusText) {
      loadStatusText.textContent = "PLEASE TRY AGAIN.";
    }
  }
}

newGameBtn.addEventListener("click", () => {
  showScreen(difficultyScreen);
});

loadGameBtn.addEventListener("click", async () => {
  await loadSavedGame();
});

backToMainBtn.addEventListener("click", () => {
  destroyGameUI();
  window.location.href = "/main-menu";
});

difficultyBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

loadBackBtn.addEventListener("click", () => {
  resetLoadMessage();
  showScreen(startScreen);
});

gameBackBtn.addEventListener("click", () => {
  destroyGameUI();
  showScreen(startScreen);
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedDifficulty = button.dataset.difficulty.toUpperCase();
    startNewGame(selectedDifficulty);
  });
});
