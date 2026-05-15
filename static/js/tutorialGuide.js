export const TUTORIAL_STORAGE_KEYS = {
  completed: "shadows_quite_tutorial_completed",
  active: "shadows_quite_tutorial_active"
};

const TUTORIAL_LEVEL_IDS = new Set(["1", "2", "3"]);

const ACTION_CONFIG = {
  pistol: {
    group: "attack",
    groupButtonId: "attack-btn",
    buttonId: "pistol-btn",
    loadoutKeys: ["pistol"]
  },
  rifle: {
    group: "attack",
    groupButtonId: "attack-btn",
    buttonId: "rifle-btn",
    loadoutKeys: ["rifle"]
  },
  knife: {
    group: "attack",
    groupButtonId: "attack-btn",
    buttonId: "knife-btn",
    loadoutKeys: ["knife"]
  },
  grenade: {
    group: "attack",
    groupButtonId: "attack-btn",
    buttonId: "grenade-btn",
    loadoutKeys: ["grenade"]
  },
  heal: {
    group: "inventory",
    groupButtonId: "inventory-btn",
    buttonId: "medkit-btn",
    loadoutKeys: ["medkit"],
    highlightHealth: true
  },
  reloadPistol: {
    group: "inventory",
    groupButtonId: "inventory-btn",
    buttonId: "reload-btn",
    loadoutKeys: ["pistol"]
  },
  reloadRifle: {
    group: "inventory",
    groupButtonId: "inventory-btn",
    buttonId: "reload-rifle-btn",
    loadoutKeys: ["rifle"]
  },
  dodge: {
    group: "main",
    buttonId: "defend-btn",
    loadoutKeys: []
  },
  toggleShield: {
    group: "inventory",
    groupButtonId: "inventory-btn",
    buttonId: "shield-btn",
    loadoutKeys: ["shield"]
  }
};

function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorageFlag(key) {
  return getLocalStorage()?.getItem(key) === "true";
}

function writeStorageFlag(key, value) {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.setItem(key, value ? "true" : "false");
}

export function isQuiteTutorialCompleted() {
  return readStorageFlag(TUTORIAL_STORAGE_KEYS.completed);
}

export function isQuiteTutorialActive() {
  return readStorageFlag(TUTORIAL_STORAGE_KEYS.active);
}

export function setQuiteTutorialActive(active) {
  writeStorageFlag(TUTORIAL_STORAGE_KEYS.active, active);
}

export function completeQuiteTutorial() {
  writeStorageFlag(TUTORIAL_STORAGE_KEYS.completed, true);
  writeStorageFlag(TUTORIAL_STORAGE_KEYS.active, false);
}

export function stopQuiteTutorial() {
  writeStorageFlag(TUTORIAL_STORAGE_KEYS.active, false);
}

export function resetQuiteTutorialCompletion() {
  const storage = getLocalStorage();
  if (!storage) return;

  storage.removeItem(TUTORIAL_STORAGE_KEYS.completed);
}

function getCharacterTip(state) {
  if (state.player.characterId === "quite") {
    return "You picked my kit: stronger dodges, medkits heal 15 extra, and at 70 AGI Quick and Swift lets the pistol fire twice.";
  }

  return "Leon can lean on his shield. My Agile Survivor perks only apply when I am the operator.";
}

function buildCue({
  id,
  text,
  requiredAction = null,
  loadoutHighlights = [],
  highlightHealth = false,
  complete = false
}) {
  const actionConfig = requiredAction ? ACTION_CONFIG[requiredAction] : null;
  const buttonHighlights = [];
  const mergedLoadoutHighlights = new Set(loadoutHighlights);

  if (actionConfig?.groupButtonId) {
    buttonHighlights.push(actionConfig.groupButtonId);
  }

  if (actionConfig?.buttonId) {
    buttonHighlights.push(actionConfig.buttonId);
  }

  (actionConfig?.loadoutKeys || []).forEach((key) => mergedLoadoutHighlights.add(key));

  return {
    id,
    text,
    requiredAction,
    requiredGroup: actionConfig?.group || null,
    requiredButtonId: actionConfig?.buttonId || null,
    requiredGroupButtonId: actionConfig?.groupButtonId || null,
    buttonHighlights,
    loadoutHighlights: [...mergedLoadoutHighlights],
    highlightHealth: highlightHealth || Boolean(actionConfig?.highlightHealth),
    lockActions: Boolean(requiredAction),
    complete
  };
}

function shouldTeachHeal(state) {
  return (
    state.combat.inCombat &&
    state.inventory.medKits > 0 &&
    (
      state.inventory.health <= 70 ||
      state.status.poisonTurns > 0 ||
      state.status.corrosionTurns > 0
    )
  );
}

function getLevelClearCue(state, progress) {
  const levelId = String(state.progression.currentLevelId);

  if (!state.progression.levelComplete || state.combat.inCombat) {
    return null;
  }

  if (levelId === "1") {
    return buildCue({
      id: "level-1-clear",
      text: "Clean work. Fast zombies hate a close blade because the hit can stun them before they get momentum."
    });
  }

  if (levelId === "2") {
    return buildCue({
      id: "level-2-clear",
      text: "Good clear. Use the shop terminal if it opens, then we run the final tutorial stage."
    });
  }

  if (levelId === "3" && state.progression.awaitingChoice) {
    return buildCue({
      id: "tutorial-complete",
      text: progress.healLessonSeen
        ? "Tutorial complete. Knife fast targets, grenade heavy armor, pistol ranged or screamers, dodge charger rushes, and heal when HP drops or poison lands. Choose your route."
        : "Tutorial complete. Knife fast targets, grenade heavy armor, pistol ranged or screamers, dodge charger rushes, and save medkits for low HP or poison. Choose your route.",
      complete: true
    });
  }

  return null;
}

function getEnemyCue(state, progress) {
  const levelId = String(state.progression.currentLevelId);
  const enemy = state.combat.enemy;

  if (!enemy) return null;

  if (levelId === "1" && enemy.type === "fast") {
    if (enemy.hp < enemy.baseHp) {
      return buildCue({
        id: "fast-followup",
        text: "Good, it is stunned. One more clean cut before it gets its speed back.",
        requiredAction: "knife"
      });
    }

    return buildCue({
      id: "fast-intro",
      text: `Here comes the fast zombie. Use the knife; it is efficient and can stun this one. ${getCharacterTip(state)}`,
      requiredAction: "knife"
    });
  }

  if (levelId === "2" && enemy.type === "heavy") {
    return buildCue({
      id: "heavy-grenade",
      text: "Heavy zombie ahead. Do not waste the knife on armor; crack it open with a grenade.",
      requiredAction: "grenade"
    });
  }

  if (levelId === "2" && enemy.type === "spitter") {
    return buildCue({
      id: "spitter-pistol",
      text: "Spitter in the lane. Keep distance and use the pistol before acid turns the fight messy.",
      requiredAction: "pistol"
    });
  }

  if (levelId === "3" && enemy.type === "charger") {
    if (enemy.chargeReady) {
      return buildCue({
        id: "charger-dodge",
        text: "See that stance? The charger is lined up. Defend now and dodge the rush.",
        requiredAction: "dodge"
      });
    }

    if (progress.chargerDodgeAttempted) {
      return buildCue({
        id: "charger-finish",
        text: "Good read. The rush is spent; use the pistol and finish the charger.",
        requiredAction: "pistol"
      });
    }

    return buildCue({
      id: "charger-bait",
      text: "Charger lesson. Fire the pistol first; we want it to commit to the rush before you dodge.",
      requiredAction: "pistol"
    });
  }

  if (levelId === "3" && enemy.type === "screamer") {
    return buildCue({
      id: "screamer-pistol",
      text: "Screamer spotted. Delete it with the pistol before it calls another infected into the level.",
      requiredAction: "pistol"
    });
  }

  return null;
}

export function createTutorialGuide({ active = false } = {}) {
  const startsActive = Boolean(active);
  const progress = {
    chargerDodgeAttempted: false,
    healLessonSeen: false,
    finalCueVisible: false,
    guideDismissed: !startsActive
  };
  let activeRun = startsActive;

  function markCompleteForStorage() {
    completeQuiteTutorial();
    activeRun = false;
    progress.finalCueVisible = true;
  }

  return {
    isRunning() {
      return activeRun || progress.finalCueVisible;
    },

    skip() {
      stopQuiteTutorial();
      activeRun = false;
      progress.finalCueVisible = false;
      progress.guideDismissed = true;
    },

    recordAction(actionKey, engine) {
      if (!activeRun || !engine?.state) return;

      const state = engine.state;
      if (actionKey === "dodge" && String(state.progression.currentLevelId) === "3") {
        progress.chargerDodgeAttempted = true;
      }

      if (actionKey === "heal") {
        progress.healLessonSeen = true;
      }
    },

    getCue(engine) {
      if (!engine?.state) return null;
      const state = engine.state;
      const levelId = String(state.progression.currentLevelId);

      if (!TUTORIAL_LEVEL_IDS.has(levelId) || state.progression.gameOver || state.inventory.health <= 0) {
        if (levelId !== "3") {
          progress.finalCueVisible = false;
        }
        return null;
      }

      const clearCue = getLevelClearCue(state, progress);
      if (clearCue?.complete) {
        if (progress.guideDismissed) {
          progress.finalCueVisible = false;
          return null;
        }

        markCompleteForStorage();
        return clearCue;
      }

      if (!activeRun) {
        return progress.finalCueVisible ? clearCue : null;
      }

      if (clearCue) {
        return clearCue;
      }

      if (shouldTeachHeal(state)) {
        return buildCue({
          id: "heal-interrupt",
          text: "Your HP is low or status is ticking. Open inventory and use a medkit before the next hit gets expensive.",
          requiredAction: "heal",
          highlightHealth: true
        });
      }

      return getEnemyCue(state, progress);
    },

    canPerformAction(actionKey, engine) {
      const cue = this.getCue(engine);
      return !cue?.requiredAction || cue.requiredAction === actionKey;
    }
  };
}
