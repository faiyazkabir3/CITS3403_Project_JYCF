// gameUI.js
import { createCombatEngine } from "./combat-engine.js";

function $(selector) {
  return document.querySelector(selector);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeWriter(element, text, speed = 20) {
  if (!element) return;

  element.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    element.textContent += text[i];
    await sleep(speed);
  }
}

function appendCombatLog(text) {
  const logList = $("#combat-log-list");
  if (!logList) return;

  const entry = document.createElement("div");
  entry.className = "combat-log-entry";
  entry.textContent = text;

  logList.prepend(entry);

  while (logList.children.length > 12) {
    logList.removeChild(logList.lastChild);
  }
}

async function playEventSequence(element, events, speed = 20, pause = 450) {
  if (!element || !events || events.length === 0) return;

  for (const eventText of events) {
    await typeWriter(element, eventText, speed);
    appendCombatLog(eventText);
    await sleep(pause);
  }
}

function renderStats(engine) {
  const state = engine.state;
  const currentLevel = engine.getCurrentLevel();
  const enemy = state.combat.enemy;

  const topLeft = $(".top-left");
  if (topLeft && currentLevel) {
    topLeft.textContent = `LEVEL ${currentLevel.id}`;
  }

  const statsUl = $(".player-stat-box ul");
  if (statsUl) {
    statsUl.innerHTML = `
      <li>HP: ${state.inventory.health}</li>
      <li>MED: ${state.inventory.medKits}</li>
      <li>GREN: ${state.inventory.grenades}</li>
      <li>PISTOL: ${state.pistol.ammoInGun}/${state.pistol.magCapacity}</li>
      <li>BAG AMMO: ${state.pistol.ammoInBag}</li>
      <li>SHIELD: ${state.shield.equipped ? "ON" : "OFF"}</li>
      <li>LEVEL: ${state.progression.currentLevelId}</li>
      <li>ENEMIES LEFT: ${state.progression.enemiesRemaining}</li>
      <li>ENEMY HP: ${enemy ? enemy.hp : "-"}</li>
    `;
  }
}

function showMainActions() {
  const mainActions = $("#main-actions");
  const attackActions = $("#attack-actions");
  const inventoryActions = $("#inventory-actions");

  if (mainActions) mainActions.style.display = "flex";
  if (attackActions) attackActions.style.display = "none";
  if (inventoryActions) inventoryActions.style.display = "none";
}

function showAttackActions() {
  const mainActions = $("#main-actions");
  const attackActions = $("#attack-actions");
  const inventoryActions = $("#inventory-actions");

  if (mainActions) mainActions.style.display = "none";
  if (attackActions) attackActions.style.display = "flex";
  if (inventoryActions) inventoryActions.style.display = "none";
}

function showInventoryActions() {
  const mainActions = $("#main-actions");
  const attackActions = $("#attack-actions");
  const inventoryActions = $("#inventory-actions");

  if (mainActions) mainActions.style.display = "none";
  if (attackActions) attackActions.style.display = "none";
  if (inventoryActions) inventoryActions.style.display = "flex";
}

function setActionButtonsDisabled(disabled) {
  const buttons = document.querySelectorAll(
    "#main-actions button, #attack-actions button, #inventory-actions button"
  );

  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}

function renderChoiceBox(engine, onChoose) {
  const choiceBox = $("#path-choice-box");
  const choiceButtons = $("#path-choice-buttons");

  if (!choiceBox || !choiceButtons) return;

  if (!engine.hasChoices()) {
    choiceBox.style.display = "none";
    choiceButtons.innerHTML = "";
    return;
  }

  const choices = engine.getAvailableChoices();
  choiceButtons.innerHTML = "";
  choiceBox.style.display = "block";

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.innerHTML = `
      <span class="choice-title">${choice.label}</span>
      <span class="choice-desc">${choice.description}</span>
    `;

    button.addEventListener("click", () => {
      onChoose(choice.id);
    });

    choiceButtons.appendChild(button);
  });
}

export function bootGameUI({ difficultyText = "EASY" } = {}) {
  const engine = createCombatEngine({ difficulty: difficultyText });
  const storyText = $("#story-text");

  let locked = false;

  async function runAndRender(events) {
    renderStats(engine);
    renderChoiceBox(engine, handlePathChoice);
    await playEventSequence(storyText, events);
    renderStats(engine);
    renderChoiceBox(engine, handlePathChoice);
  }

  async function postLevelFlow() {
    if (engine.state.progression.awaitingChoice) {
      setActionButtonsDisabled(true);
      renderChoiceBox(engine, handlePathChoice);
      return;
    }

    if (
      engine.state.progression.levelComplete &&
      !engine.state.progression.gameWon
    ) {
      await sleep(1000);
      const nextLevelEvents = engine.advanceToNextLevel();
      await runAndRender(nextLevelEvents);
    }
  }

  async function handleAction(actionKey) {
    if (locked) return;
    locked = true;

    const events = engine.dispatch(actionKey);
    await runAndRender(events);
    await postLevelFlow();

    if (!engine.state.progression.awaitingChoice) {
      setActionButtonsDisabled(false);
      showMainActions();
    }

    locked = false;
  }

  async function handlePathChoice(choiceId) {
    if (locked) return;
    locked = true;

    const choiceBox = $("#path-choice-box");
    if (choiceBox) choiceBox.style.display = "none";

    const events = engine.choosePath(choiceId);
    await runAndRender(events);

    setActionButtonsDisabled(false);
    showMainActions();

    locked = false;
  }

  async function startGame() {
    showMainActions();
    setActionButtonsDisabled(false);

    const introEvents = engine.startLevel();
    await runAndRender(introEvents);
  }

  // Main actions
  const attackBtn = $("#attack-btn");
  const defendBtn = $("#defend-btn");
  const inventoryBtn = $("#inventory-btn");

  if (attackBtn) {
    attackBtn.addEventListener("click", () => {
      if (locked || engine.state.progression.awaitingChoice) return;
      showAttackActions();
    });
  }

  if (defendBtn) {
    defendBtn.addEventListener("click", async () => {
      await handleAction("dodge");
    });
  }

  if (inventoryBtn) {
    inventoryBtn.addEventListener("click", () => {
      if (locked || engine.state.progression.awaitingChoice) return;
      showInventoryActions();
    });
  }

  // Attack submenu
  const pistolBtn = $("#pistol-btn");
  const knifeBtn = $("#knife-btn");
  const grenadeBtn = $("#grenade-btn");
  const attackBackBtn = $("#attack-back-btn");

  if (pistolBtn) {
    pistolBtn.addEventListener("click", async () => {
      await handleAction("pistol");
    });
  }

  if (knifeBtn) {
    knifeBtn.addEventListener("click", async () => {
      await handleAction("knife");
    });
  }

  if (grenadeBtn) {
    grenadeBtn.addEventListener("click", async () => {
      await handleAction("grenade");
    });
  }

  if (attackBackBtn) {
    attackBackBtn.addEventListener("click", () => {
      if (locked) return;
      showMainActions();
    });
  }

  // Inventory submenu
  const reloadBtn = $("#reload-btn");
  const medkitBtn = $("#medkit-btn");
  const shieldBtn = $("#shield-btn");
  const inventoryBackBtn = $("#inventory-back-btn");

  if (reloadBtn) {
    reloadBtn.addEventListener("click", async () => {
      await handleAction("reloadPistol");
    });
  }

  if (medkitBtn) {
    medkitBtn.addEventListener("click", async () => {
      await handleAction("heal");
    });
  }

  if (shieldBtn) {
    shieldBtn.addEventListener("click", async () => {
      await handleAction("toggleShield");
    });
  }

  if (inventoryBackBtn) {
    inventoryBackBtn.addEventListener("click", () => {
      if (locked) return;
      showMainActions();
    });
  }

  startGame();

  return engine;
}