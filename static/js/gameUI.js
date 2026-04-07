import { createCombatEngine } from "./combat-engine.js";

function $(selector) {
  return document.querySelector(selector);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeWriter(element, text, speed = 18) {
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

async function playEventSequence(element, events, speed = 18, pause = 360) {
  if (!element || !events || events.length === 0) return;

  for (const eventText of events) {
    await typeWriter(element, eventText, speed);
    appendCombatLog(eventText);
    await sleep(pause);
  }
}

function isGameOver(engine) {
  return engine.state.progression.gameOver || engine.state.inventory.health <= 0;
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

function updateActionAvailability(engine, locked = false) {
  const dead = isGameOver(engine);
  const waitingForChoice = engine.state.progression.awaitingChoice;
  const inCombat = engine.state.combat.inCombat;

  const attackBtn = $("#attack-btn");
  const defendBtn = $("#defend-btn");
  const inventoryBtn = $("#inventory-btn");
  const saveBtn = $("#save-btn");

  const pistolBtn = $("#pistol-btn");
  const knifeBtn = $("#knife-btn");
  const grenadeBtn = $("#grenade-btn");
  const attackBackBtn = $("#attack-back-btn");

  const reloadBtn = $("#reload-btn");
  const medkitBtn = $("#medkit-btn");
  const shieldBtn = $("#shield-btn");
  const inventoryBackBtn = $("#inventory-back-btn");

  const choiceButtons = document.querySelectorAll("#path-choice-buttons button");

  if (attackBtn) attackBtn.disabled = dead || waitingForChoice || locked || !inCombat;
  if (defendBtn) defendBtn.disabled = dead || waitingForChoice || locked || !inCombat;
  if (inventoryBtn) inventoryBtn.disabled = dead || waitingForChoice || locked;
  if (saveBtn) saveBtn.disabled = locked;

  if (pistolBtn) pistolBtn.disabled = dead || locked || !inCombat;
  if (knifeBtn) knifeBtn.disabled = dead || locked || !inCombat;
  if (grenadeBtn) grenadeBtn.disabled = dead || locked || !inCombat;
  if (attackBackBtn) attackBackBtn.disabled = dead || locked;

  if (reloadBtn) reloadBtn.disabled = dead || locked;
  if (medkitBtn) medkitBtn.disabled = dead || locked;
  if (shieldBtn) shieldBtn.disabled = dead || locked;
  if (inventoryBackBtn) inventoryBackBtn.disabled = dead || locked;

  choiceButtons.forEach((button) => {
    button.disabled = dead || locked || !waitingForChoice;
  });

  if (dead) {
    showMainActions();
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

  const statsUl = $("#player-stats-list");
  if (statsUl) {
    statsUl.innerHTML = `
      <li>CHARACTER: ${state.player.characterName}</li>
      <li>PERK: ${state.player.perkName}</li>
      <li>HP: ${state.inventory.health}</li>
      <li>MED: ${state.inventory.medKits}</li>
      <li>GREN: ${state.inventory.grenades}</li>
      <li>PISTOL: ${state.pistol.ammoInGun}/${state.pistol.magCapacity}</li>
      <li>BAG AMMO: ${state.pistol.ammoInBag}</li>
      <li>SHIELD: ${state.shield.equipped ? "ON" : "OFF"}</li>
      <li>LEVEL: ${state.progression.currentLevelId}</li>
      <li>ENEMIES LEFT: ${state.progression.enemiesRemaining}</li>
      <li>ENEMY HP: ${enemy ? Math.max(enemy.hp, 0) : "-"}</li>
      <li>STATUS: ${isGameOver(engine) ? "DEAD" : "ALIVE"}</li>
    `;
  }
}

function renderChoiceBox(engine, onChoose) {
  const choiceBox = $("#path-choice-box");
  const choiceButtons = $("#path-choice-buttons");

  if (!choiceBox || !choiceButtons) return;

  if (isGameOver(engine)) {
    choiceBox.style.display = "none";
    choiceButtons.innerHTML = "";
    return;
  }

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

function buildSavePayload(engine) {
  const state = engine.state;

  return {
    difficulty: state.difficulty,
    character_id: state.player.characterId,
    health: state.inventory.health,
    medkits: state.inventory.medKits,
    grenades: state.inventory.grenades,
    ammo_in_gun: state.pistol.ammoInGun,
    ammo_in_bag: state.pistol.ammoInBag,
    mag_capacity: state.pistol.magCapacity,
    laser_upgrade: state.pistol.hasLaser,
    shield_owned: state.shield.hasShield,
    shield_on: state.shield.equipped,
    current_level_id: state.progression.currentLevelId,
    enemies_remaining: state.progression.enemiesRemaining,
    level_complete: state.progression.levelComplete,
    awaiting_choice: state.progression.awaitingChoice,
    game_won: state.progression.gameWon
  };
}

async function saveGameToBackend(engine) {
  const payload = buildSavePayload(engine);

  const response = await fetch("/save-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

export function bootGameUI({
  difficultyText = "EASY",
  selectedCharacter = "leon",
  savedState = null
} = {}) {
  const engine = createCombatEngine({
    difficulty: difficultyText,
    character: selectedCharacter,
    savedState
  });

  const storyText = $("#story-text");
  let locked = false;

  async function autoSave() {
    engine.state.analytics.savesMade += 1;

    try {
      await saveGameToBackend(engine);
    } catch (error) {
      console.error("Auto save failed:", error);
    }
  }

  async function runAndRender(events) {
    renderStats(engine);
    renderChoiceBox(engine, handlePathChoice);
    updateActionAvailability(engine, locked);
    await playEventSequence(storyText, events);
    renderStats(engine);
    renderChoiceBox(engine, handlePathChoice);
    updateActionAvailability(engine, locked);
    await autoSave();
  }

  async function postLevelFlow() {
    if (isGameOver(engine)) {
      updateActionAvailability(engine, false);
      showMainActions();
      return;
    }

    if (engine.state.progression.awaitingChoice) {
      updateActionAvailability(engine, false);
      renderChoiceBox(engine, handlePathChoice);
      return;
    }

    if (
      engine.state.progression.levelComplete &&
      !engine.state.progression.gameWon
    ) {
      await sleep(800);
      const nextLevelEvents = engine.advanceToNextLevel();
      await runAndRender(nextLevelEvents);
    }
  }

  async function handleAction(actionKey) {
    if (locked || isGameOver(engine)) {
      updateActionAvailability(engine, locked);
      return;
    }

    locked = true;
    updateActionAvailability(engine, locked);

    const events = engine.dispatch(actionKey);
    await runAndRender(events);
    await postLevelFlow();

    locked = false;
    updateActionAvailability(engine, locked);

    if (isGameOver(engine)) {
      showMainActions();
    }
  }

  async function handlePathChoice(choiceId) {
    if (locked || isGameOver(engine)) {
      updateActionAvailability(engine, locked);
      return;
    }

    locked = true;
    updateActionAvailability(engine, locked);

    const choiceBox = $("#path-choice-box");
    if (choiceBox) choiceBox.style.display = "none";

    const events = engine.choosePath(choiceId);
    await runAndRender(events);

    locked = false;
    updateActionAvailability(engine, locked);

    if (!isGameOver(engine)) {
      showMainActions();
    }
  }

  async function startGame() {
    showMainActions();
    updateActionAvailability(engine, false);

    if (savedState) {
      const resumeEvents = engine.resumeFromSave();
      await runAndRender(resumeEvents);
      return;
    }

    const introEvents = engine.startLevel();
    await runAndRender(introEvents);
  }

  const attackBtn = $("#attack-btn");
  const defendBtn = $("#defend-btn");
  const inventoryBtn = $("#inventory-btn");
  const saveBtn = $("#save-btn");

  if (attackBtn) {
    attackBtn.addEventListener("click", () => {
      if (locked || isGameOver(engine) || engine.state.progression.awaitingChoice) return;
      showAttackActions();
      updateActionAvailability(engine, locked);
    });
  }

  if (defendBtn) {
    defendBtn.addEventListener("click", async () => {
      await handleAction("dodge");
    });
  }

  if (inventoryBtn) {
    inventoryBtn.addEventListener("click", () => {
      if (locked || isGameOver(engine) || engine.state.progression.awaitingChoice) return;
      showInventoryActions();
      updateActionAvailability(engine, locked);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        const result = await saveGameToBackend(engine);

        if (result.ok) {
          appendCombatLog("Game saved successfully.");
          if (storyText) {
            storyText.textContent = "Game saved successfully.";
          }
        } else {
          appendCombatLog(result.message || "Save failed.");
          if (storyText) {
            storyText.textContent = result.message || "Save failed.";
          }
        }
      } catch (error) {
        console.error("Save failed:", error);
        appendCombatLog("Save failed.");
        if (storyText) {
          storyText.textContent = "Save failed.";
        }
      }
    });
  }

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
      if (locked || isGameOver(engine)) return;
      showMainActions();
      updateActionAvailability(engine, locked);
    });
  }

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
      if (locked || isGameOver(engine)) return;
      showMainActions();
      updateActionAvailability(engine, locked);
    });
  }

  startGame();

  return engine;
}
