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

let gameEngine = null;

function showScreen(screenToShow) {
  const screens = [startScreen, difficultyScreen, loadScreen, gameScreen];

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  screenToShow.classList.add("active");
}

newGameBtn.addEventListener("click", () => {
  showScreen(difficultyScreen);
});

loadGameBtn.addEventListener("click", () => {
  showScreen(loadScreen);
});

backToMainBtn.addEventListener("click", () => {
  window.location.href = "main_menu.html";
});

difficultyBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

loadBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

gameBackBtn.addEventListener("click", () => {
  showScreen(startScreen);
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedDifficulty = button.dataset.difficulty.toUpperCase();

    difficultyDisplay.textContent = selectedDifficulty;
    showScreen(gameScreen);

    gameEngine = bootGameUI({
      difficultyText: selectedDifficulty
    });

    window.gameEngine = gameEngine;
  });
});