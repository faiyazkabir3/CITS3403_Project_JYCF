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

function showScreen(screenToShow) {
  const screens = [startScreen, difficultyScreen, loadScreen, gameScreen];

  screens.forEach(function (screen) {
    screen.classList.remove("active");
  });

  screenToShow.classList.add("active");
}

newGameBtn.addEventListener("click", function () {
  showScreen(difficultyScreen);
});

loadGameBtn.addEventListener("click", function () {
  showScreen(loadScreen);
});

backToMainBtn.addEventListener("click", function () {
  window.location.href = "main_menu.html";
});

difficultyBackBtn.addEventListener("click", function () {
  showScreen(startScreen);
});

loadBackBtn.addEventListener("click", function () {
  showScreen(startScreen);
});

gameBackBtn.addEventListener("click", function () {
  showScreen(startScreen);
});

difficultyButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const selectedDifficulty = button.dataset.difficulty;
    difficultyDisplay.textContent = selectedDifficulty.toUpperCase();
    showScreen(gameScreen);
  });
});