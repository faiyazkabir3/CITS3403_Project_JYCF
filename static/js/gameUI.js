import { createCombatEngine } from "./combat-engine.js";

function $(selector) {
  return document.querySelector(selector);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeWriter(element, text, speed = 24, isStale = () => false) {
  if (!element) return;

  element.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    if (isStale()) return;
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

async function playEventSequence(element, events, speed = 24, pause = 460, isStale = () => false) {
  if (!events || events.length === 0) return;

  for (const eventText of events) {
    if (isStale()) return;
    await typeWriter(element, eventText, speed, isStale);
    if (isStale()) return;
    appendCombatLog(eventText);
    await sleep(pause);
  }
}

function isGameOver(engine) {
  return engine.state.progression.gameOver || engine.state.inventory.health <= 0;
}

function showActionGroup(groupId) {
  ["main-actions", "attack-actions", "inventory-actions"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = id === groupId ? "flex" : "none";
    }
  });
}

function showMainActions() {
  showActionGroup("main-actions");
}

function showAttackActions() {
  showActionGroup("attack-actions");
}

function showInventoryActions() {
  showActionGroup("inventory-actions");
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function renderStats(engine) {
  const state = engine.state;
  const derived = engine.getDerivedStats();
  const currentLevel = engine.getCurrentLevel();
  const enemy = state.combat.enemy;

  const topLeft = $(".top-left");
  if (topLeft && currentLevel) {
    topLeft.textContent = `LEVEL ${currentLevel.id} - ${currentLevel.title}`;
  }

  const shieldText = state.shield.hasShield
    ? `${state.shield.equipped ? "ON" : "OFF"} (${state.shield.durability})`
    : "NONE";
  const statusText = [
    state.status.poisonTurns > 0 ? `POISON ${state.status.poisonTurns}` : null,
    state.status.corrosionTurns > 0 ? `CORROSION ${state.status.corrosionTurns}` : null
  ]
    .filter(Boolean)
    .join(" / ") || "CLEAR";
  const enemyLabel = enemy ? `${enemy.name} (${Math.max(enemy.hp, 0)} HP)` : "-";

  const statsUl = $("#player-stats-list");
  if (statsUl) {
    const lines = [
      `CHARACTER: ${state.player.characterName}`,
      `PERK: ${state.player.perkName}`,
      `HP: ${state.inventory.health}/${state.inventory.maxHealth}`,
      `COINS: ${state.inventory.coins}`,
      `MED: ${state.inventory.medKits}`,
      `GREN: ${state.inventory.grenades}`,
      `PISTOL: ${state.pistol.ammoInGun}/${state.pistol.magCapacity}`,
      `PISTOL BAG: ${state.pistol.ammoInBag}`
    ];

    if (state.rifle.owned) {
      lines.push(`RIFLE: ${state.rifle.ammoInGun}/${state.rifle.magCapacity} | BAG ${state.rifle.ammoInBag}`);
    }

    lines.push(
      `SHIELD: ${shieldText}`,
      `AGI / COUR: ${state.stats.agility} / ${state.stats.courage}`,
      `DODGE / CRIT: ${formatPercent(derived.dodgeChance)} / ${formatPercent(derived.critChance)}`,
      `ARMOUR CUT: ${formatPercent(derived.armourReduction)}`,
      `LEVEL: ${state.progression.currentLevelId}`,
      `ENEMIES LEFT: ${state.progression.enemiesRemaining}`,
      `ENEMY: ${enemyLabel}`,
      `STATUS: ${isGameOver(engine) ? "DEAD" : statusText}`
    );

    statsUl.innerHTML = lines.map((line) => `<li>${line}</li>`).join("");
  }
}

function renderWeaponVisibility(engine) {
  const rifleOwned = engine.state.rifle.owned;
  const rifleBtn = $("#rifle-btn");
  const reloadRifleBtn = $("#reload-rifle-btn");

  if (rifleBtn) {
    rifleBtn.style.display = rifleOwned ? "" : "none";
  }

  if (reloadRifleBtn) {
    reloadRifleBtn.style.display = rifleOwned ? "" : "none";
  }
}

function renderChoiceBox(engine, onChoose, locked) {
  const choiceBox = $("#path-choice-box");
  const choiceButtons = $("#path-choice-buttons");
  if (!choiceBox || !choiceButtons) return;

  if (!engine.hasChoices() || isGameOver(engine)) {
    choiceBox.style.display = "none";
    choiceButtons.innerHTML = "";
    return;
  }

  choiceBox.style.display = "block";
  choiceButtons.innerHTML = "";

  engine.getAvailableChoices().forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.disabled = locked;
    button.innerHTML = `
      <span class="choice-title">${choice.label}</span>
      <span class="choice-desc">${choice.description}</span>
    `;
    button.addEventListener("click", () => onChoose(choice.id));
    choiceButtons.appendChild(button);
  });
}

function renderShopBox(engine, locked, onBuy, onSell, onContinue) {
  const shopBox = $("#shop-box");
  const buyButtons = $("#shop-buy-buttons");
  const sellButtons = $("#shop-sell-buttons");
  const continueBtn = $("#shop-continue-btn");
  if (!shopBox || !buyButtons || !sellButtons || !continueBtn) return;

  if (!engine.isShopOpen() || isGameOver(engine)) {
    shopBox.style.display = "none";
    buyButtons.innerHTML = "";
    sellButtons.innerHTML = "";
    return;
  }

  const coins = engine.state.inventory.coins;
  shopBox.style.display = "block";
  buyButtons.innerHTML = "";
  sellButtons.innerHTML = "";

  engine.getShopInventory().forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.disabled = locked || item.disabled || coins < item.cost;
    button.innerHTML = `
      <span class="choice-title">${item.label} - ${item.cost}C</span>
      <span class="choice-desc">${item.description}</span>
    `;
    button.addEventListener("click", () => onBuy(item.id));
    buyButtons.appendChild(button);
  });

  const sellItems = engine.getSellInventory();
  if (sellItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "combat-log-entry";
    empty.textContent = "Nothing to sell yet.";
    sellButtons.appendChild(empty);
  } else {
    sellItems.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-btn";
      button.disabled = locked;
      button.innerHTML = `
        <span class="choice-title">${item.label} - +${item.value}C</span>
        <span class="choice-desc">${item.description}</span>
      `;
      button.addEventListener("click", () => onSell(item.id));
      sellButtons.appendChild(button);
    });
  }

  continueBtn.disabled = locked;
  continueBtn.onclick = onContinue;
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
    game_won: state.progression.gameWon,
    run_state: structuredClone(state)
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
  const emergencyBox = $("#emergency-box");
  const emergencyTitle = $("#emergency-title");
  const emergencyPrompt = $("#emergency-prompt");
  const emergencyKey = $("#emergency-key");
  const emergencyTimer = $("#emergency-timer");
  const emergencyProgress = $("#emergency-progress");
  const emergencyActionBtn = $("#emergency-action-btn");
  const emergencyFailBtn = $("#emergency-fail-btn");

  let locked = false;
  let isAnimatingEvents = false;
  let storyRenderId = 0;
  const emergencySession = {
    active: false,
    signature: null,
    deadline: 0,
    progress: 0,
    required: 0,
    key: "X",
    timerId: null
  };

  function clearEmergencySession() {
    if (emergencySession.timerId) {
      window.clearInterval(emergencySession.timerId);
    }

    emergencySession.active = false;
    emergencySession.signature = null;
    emergencySession.deadline = 0;
    emergencySession.progress = 0;
    emergencySession.required = 0;
    emergencySession.key = "X";
    emergencySession.timerId = null;
  }

  async function saveAtCheckpoint() {
    engine.state.analytics.savesMade += 1;

    try {
      await saveGameToBackend(engine);
    } catch (error) {
      console.error("Checkpoint save failed:", error);
    }
  }

  function isInteractionLocked() {
    return locked || isAnimatingEvents;
  }

  function updateActionAvailability() {
    const dead = isGameOver(engine);
    const inCombat = engine.state.combat.inCombat;
    const waitingForChoice = engine.hasChoices();
    const shopOpen = engine.isShopOpen();
    const emergencyActive = engine.hasEmergency();
    const interactionLocked = isInteractionLocked();
    const lockedOut = dead || interactionLocked || emergencyActive || shopOpen || waitingForChoice;

    const buttonStates = [
      ["attack-btn", dead || lockedOut || !inCombat],
      ["defend-btn", dead || lockedOut || !inCombat],
      ["inventory-btn", dead || lockedOut],
      ["save-btn", interactionLocked || emergencyActive],
      ["pistol-btn", dead || interactionLocked || !inCombat],
      ["rifle-btn", dead || interactionLocked || !inCombat || !engine.state.rifle.owned],
      ["knife-btn", dead || interactionLocked || !inCombat],
      ["grenade-btn", dead || interactionLocked || !inCombat],
      ["attack-back-btn", dead || interactionLocked || emergencyActive],
      ["reload-btn", dead || interactionLocked || emergencyActive],
      ["reload-rifle-btn", dead || interactionLocked || emergencyActive || !engine.state.rifle.owned],
      ["medkit-btn", dead || interactionLocked || emergencyActive],
      ["shield-btn", dead || interactionLocked || emergencyActive || !engine.state.shield.hasShield],
      ["inventory-back-btn", dead || interactionLocked || emergencyActive]
    ];

    buttonStates.forEach(([id, disabled]) => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = disabled;
      }
    });

    if (dead) {
      showMainActions();
    }
  }

  async function handleEmergencyResolution(success) {
    if (isInteractionLocked() || !engine.hasEmergency()) return;

    locked = true;
    const progress = emergencySession.progress;
    clearEmergencySession();
    renderAll();
    const events = engine.resolveEmergency(success, progress);
    await runAndRender(events);
    await postLevelFlow();
    locked = false;
    renderAll();
  }

  function renderEmergencyBox() {
    if (!emergencyBox || !emergencyTitle || !emergencyPrompt) return;

    if (!engine.hasEmergency() || isGameOver(engine)) {
      emergencyBox.style.display = "none";
      clearEmergencySession();
      return;
    }

    const emergency = engine.getEmergency();
    const signature = `${engine.state.progression.currentLevelId}:${emergency.title}:${emergency.prompt}`;
    if (emergencySession.signature !== signature) {
      clearEmergencySession();
      emergencySession.signature = signature;
      emergencySession.progress = 0;
      emergencySession.required = emergency.required;
      emergencySession.key = String(emergency.key || "X").toUpperCase();
      emergencySession.deadline = 0;
    }

    if (!isAnimatingEvents && !emergencySession.active) {
      emergencySession.active = true;
      emergencySession.deadline = Date.now() + emergency.timeLimitMs;
      emergencySession.timerId = window.setInterval(() => {
        if (!engine.hasEmergency()) {
          clearEmergencySession();
          return;
        }

        const remaining = emergencySession.deadline - Date.now();
        if (remaining <= 0 && !locked) {
          handleEmergencyResolution(false);
          return;
        }

        renderEmergencyBox();
      }, 100);
    }

    const remainingMs = emergencySession.active
      ? Math.max(emergencySession.deadline - Date.now(), 0)
      : emergency.timeLimitMs;
    emergencyBox.style.display = "block";
    emergencyTitle.textContent = emergency.title;
    emergencyPrompt.textContent = emergency.prompt;
    emergencyKey.textContent = emergencySession.key;
    emergencyTimer.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
    emergencyProgress.textContent = `${emergencySession.progress}/${emergencySession.required}`;

    if (emergencyActionBtn) {
      emergencyActionBtn.disabled = locked || !emergencySession.active;
    }

    if (emergencyFailBtn) {
      emergencyFailBtn.disabled = locked || !emergencySession.active;
    }
  }

  function renderAll() {
    const interactionLocked = isInteractionLocked();
    renderStats(engine);
    renderWeaponVisibility(engine);
    renderChoiceBox(engine, handlePathChoice, interactionLocked);
    renderShopBox(engine, interactionLocked, handleShopBuy, handleShopSell, handleShopContinue);
    renderEmergencyBox();
    updateActionAvailability();
  }

  async function runAndRender(events) {
    const renderId = ++storyRenderId;
    isAnimatingEvents = true;
    renderAll();
    await playEventSequence(storyText, events, 24, 460, () => renderId !== storyRenderId);

    if (renderId !== storyRenderId) {
      return;
    }

    isAnimatingEvents = false;
    renderAll();
  }

  async function postLevelFlow() {
    if (isGameOver(engine)) {
      showMainActions();
      renderAll();
      return;
    }

    if (engine.hasEmergency() || engine.isShopOpen() || engine.hasChoices()) {
      showMainActions();
      renderAll();
      return;
    }

    if (engine.state.progression.levelComplete && !engine.state.progression.gameWon) {
      await sleep(700);
      const nextLevelEvents = engine.advanceToNextLevel();
      await runAndRender(nextLevelEvents);
    }

    showMainActions();
    renderAll();
  }

  async function handleAction(actionKey) {
    if (isInteractionLocked() || isGameOver(engine) || engine.hasEmergency()) return;

    locked = true;
    renderAll();
    const events = engine.dispatch(actionKey);
    await runAndRender(events);
    await postLevelFlow();
    locked = false;
    renderAll();
  }

  async function handlePathChoice(choiceId) {
    if (isInteractionLocked() || isGameOver(engine) || engine.hasEmergency()) return;

    locked = true;
    renderAll();
    const events = engine.choosePath(choiceId);
    await runAndRender(events);
    await postLevelFlow();
    locked = false;
    renderAll();
  }

  async function handleShopBuy(itemId) {
    if (isInteractionLocked() || isGameOver(engine)) return;

    locked = true;
    renderAll();
    const events = engine.buy(itemId);
    await runAndRender(events);
    locked = false;
    renderAll();
  }

  async function handleShopSell(itemId) {
    if (isInteractionLocked() || isGameOver(engine)) return;

    locked = true;
    renderAll();
    const events = engine.sell(itemId);
    await runAndRender(events);
    locked = false;
    renderAll();
  }

  async function handleShopContinue() {
    if (isInteractionLocked() || isGameOver(engine)) return;

    locked = true;
    renderAll();
    const closeEvents = engine.closeShop();
    await runAndRender(closeEvents);

    if (!engine.hasChoices() && engine.state.progression.levelComplete && !engine.state.progression.gameWon) {
      const nextLevelEvents = engine.advanceToNextLevel();
      await runAndRender(nextLevelEvents);
    }

    locked = false;
    await postLevelFlow();
  }

  function registerEmergencyPress() {
    if (isInteractionLocked() || !engine.hasEmergency() || !emergencySession.active) return;

    emergencySession.progress += 1;
    renderEmergencyBox();

    if (emergencySession.progress >= emergencySession.required) {
      handleEmergencyResolution(true);
    }
  }

  function handleEmergencyKeydown(event) {
    if (!engine.hasEmergency() || !emergencySession.active) return;
    if (event.key.toUpperCase() !== emergencySession.key) return;

    event.preventDefault();
    registerEmergencyPress();
  }

  const attackBtn = $("#attack-btn");
  const defendBtn = $("#defend-btn");
  const inventoryBtn = $("#inventory-btn");
  const saveBtn = $("#save-btn");
  const pistolBtn = $("#pistol-btn");
  const rifleBtn = $("#rifle-btn");
  const knifeBtn = $("#knife-btn");
  const grenadeBtn = $("#grenade-btn");
  const attackBackBtn = $("#attack-back-btn");
  const reloadBtn = $("#reload-btn");
  const reloadRifleBtn = $("#reload-rifle-btn");
  const medkitBtn = $("#medkit-btn");
  const shieldBtn = $("#shield-btn");
  const inventoryBackBtn = $("#inventory-back-btn");

  if (attackBtn) {
    attackBtn.addEventListener("click", () => {
      if (isInteractionLocked() || isGameOver(engine) || engine.hasEmergency() || engine.isShopOpen() || engine.hasChoices()) return;
      showAttackActions();
      renderAll();
    });
  }

  if (defendBtn) {
    defendBtn.addEventListener("click", async () => {
      await handleAction("dodge");
    });
  }

  if (inventoryBtn) {
    inventoryBtn.addEventListener("click", () => {
      if (isInteractionLocked() || isGameOver(engine) || engine.hasEmergency() || engine.isShopOpen() || engine.hasChoices()) return;
      showInventoryActions();
      renderAll();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (isInteractionLocked() || engine.hasEmergency()) return;

      try {
        engine.state.analytics.savesMade += 1;
        const result = await saveGameToBackend(engine);
        const message = result.ok ? "Game saved successfully." : result.message || "Save failed.";
        appendCombatLog(message);
        if (storyText) {
          storyText.textContent = message;
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

  if (pistolBtn) pistolBtn.addEventListener("click", async () => handleAction("pistol"));
  if (rifleBtn) rifleBtn.addEventListener("click", async () => handleAction("rifle"));
  if (knifeBtn) knifeBtn.addEventListener("click", async () => handleAction("knife"));
  if (grenadeBtn) grenadeBtn.addEventListener("click", async () => handleAction("grenade"));

  if (attackBackBtn) {
    attackBackBtn.addEventListener("click", () => {
      if (isInteractionLocked() || engine.hasEmergency()) return;
      showMainActions();
      renderAll();
    });
  }

  if (reloadBtn) reloadBtn.addEventListener("click", async () => handleAction("reloadPistol"));
  if (reloadRifleBtn) reloadRifleBtn.addEventListener("click", async () => handleAction("reloadRifle"));
  if (medkitBtn) medkitBtn.addEventListener("click", async () => handleAction("heal"));
  if (shieldBtn) shieldBtn.addEventListener("click", async () => handleAction("toggleShield"));

  if (inventoryBackBtn) {
    inventoryBackBtn.addEventListener("click", () => {
      if (isInteractionLocked() || engine.hasEmergency()) return;
      showMainActions();
      renderAll();
    });
  }

  if (emergencyActionBtn) {
    emergencyActionBtn.addEventListener("click", () => {
      registerEmergencyPress();
    });
  }

  if (emergencyFailBtn) {
    emergencyFailBtn.addEventListener("click", async () => {
      await handleEmergencyResolution(false);
    });
  }

  window.addEventListener("keydown", handleEmergencyKeydown);

  async function startGame() {
    showMainActions();
    renderAll();

    if (savedState) {
      const resumeEvents = engine.resumeFromSave();
      await runAndRender(resumeEvents);
      await saveAtCheckpoint();
      return;
    }

    const introEvents = engine.startLevel();
    await runAndRender(introEvents);
    await saveAtCheckpoint();
  }

  startGame();
  return engine;
}
