// combat-engine.js
import { LEVELS } from "./levels.js";

// ---------- RNG ----------
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed = Date.now()) {
  const next = mulberry32(seed);
  return {
    next,
    chance(p) {
      return next() < p;
    },
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min, max) {
      return next() * (max - min) + min;
    }
  };
}

// ---------- Enemy data ----------
const ENEMY_TYPES = {
  regular: {
    name: "Regular Zombie",
    maxHp: 50,
    dmg: [10, 25],
    drops: {
      pistolAmmo: { chance: 0.25, amount: [2, 5] },
      medKit: { chance: 0.08, amount: [1, 1] }
    }
  },
  fast: {
    name: "Fast Zombie",
    maxHp: 30,
    dmg: [8, 18],
    drops: {
      pistolAmmo: { chance: 0.18, amount: [1, 4] },
      medKit: { chance: 0.05, amount: [1, 1] }
    }
  },
  heavy: {
    name: "Heavy Zombie",
    maxHp: 60,
    dmg: [12, 26],
    drops: {
      pistolAmmo: { chance: 0.45, amount: [4, 8] },
      medKit: { chance: 0.22, amount: [1, 1] },
      grenade: { chance: 0.18, amount: [1, 1] }
    }
  },
  spitter: {
    name: "Spitter Zombie",
    maxHp: 40,
    dmg: [7, 20],
    drops: {
      pistolAmmo: { chance: 0.32, amount: [3, 6] },
      medKit: { chance: 0.12, amount: [1, 1] }
    }
  }
};

// ---------- Rules ----------
const RULES = {
  zombieMissChance: 0.31,
  dodgeSuccessChance: 0.4,
  pistolDamageNoLaser: [27, 33],
  pistolDamageLaser: [33, 41],
  knifePercentOfBaseHp: 0.27,
  knifeSelfDamage: 3,
  grenadeDamage: 87
};

// ---------- State ----------
export function createNewGameState({ difficulty = "EASY", seed } = {}) {
  const rng = createRng(seed);
  const diff = difficulty.toUpperCase();

  const startingHealth = diff === "HARD" ? 85 : 100;
  const startingMedKits = diff === "HARD" ? 1 : 2;

  const state = {
    difficulty: diff,
    rngSeed: seed ?? Date.now(),

    inventory: {
      health: startingHealth,
      medKits: startingMedKits,
      grenades: 2
    },

    pistol: {
      magCapacity: 8,
      ammoInGun: 8,
      ammoInBag: 20,
      hasLaser: false
    },

    shield: {
      hasShield: true,
      equipped: true,
      deflect: [0.3, 0.4]
    },

    stats: {
      noiseLevel: 0,
      ambushRisk: 0
    },

    combat: {
      inCombat: false,
      enemy: null,
      pendingDodge: false
    },

    progression: {
      currentLevelId: "1",
      enemiesRemaining: 0,
      levelComplete: false,
      awaitingChoice: false,
      gameWon: false
    }
  };

  return { state, rng };
}

function applySavedProgress(state, saveData) {
  state.difficulty = String(saveData.difficulty || state.difficulty).toUpperCase();

  if (saveData.health !== undefined) state.inventory.health = Number(saveData.health);
  if (saveData.medkits !== undefined) state.inventory.medKits = Number(saveData.medkits);
  if (saveData.grenades !== undefined) state.inventory.grenades = Number(saveData.grenades);

  if (saveData.mag_capacity !== undefined) state.pistol.magCapacity = Number(saveData.mag_capacity);
  if (saveData.ammo_in_gun !== undefined) state.pistol.ammoInGun = Number(saveData.ammo_in_gun);
  if (saveData.ammo_in_bag !== undefined) state.pistol.ammoInBag = Number(saveData.ammo_in_bag);
  if (saveData.has_laser !== undefined) state.pistol.hasLaser = saveData.has_laser;

  if (saveData.has_shield !== undefined) state.shield.hasShield = saveData.has_shield;
  if (saveData.shield_on !== undefined) state.shield.equipped = saveData.shield_on;

  if (saveData.current_level_id) state.progression.currentLevelId = String(saveData.current_level_id);
  if (saveData.enemies_remaining !== undefined) {
    state.progression.enemiesRemaining = Number(saveData.enemies_remaining);
  }
  if (saveData.level_complete !== undefined) {
    state.progression.levelComplete = saveData.level_complete;
  }
  if (saveData.awaiting_choice !== undefined) {
    state.progression.awaitingChoice = saveData.awaiting_choice;
  }
  if (saveData.game_won !== undefined) {
    state.progression.gameWon = saveData.game_won;
  }

  state.combat.inCombat = false;
  state.combat.enemy = null;
  state.combat.pendingDodge = false;

  if (!state.shield.hasShield) {
    state.shield.equipped = false;
  }

  clampHealth(state);
}

// ---------- Helpers ----------
function clampHealth(state) {
  if (state.inventory.health > 100) state.inventory.health = 100;
  if (state.inventory.health < 0) state.inventory.health = 0;
}

function applyShieldedDamage(state, rawDamage, rng) {
  let finalDamage = rawDamage;

  if (state.shield.equipped) {
    const deflect = state.shield.deflect;
    const blockFraction = Array.isArray(deflect)
      ? rng.float(deflect[0], deflect[1])
      : deflect;

    finalDamage = Math.floor(finalDamage * (1 - blockFraction));
  }

  state.inventory.health -= finalDamage;
  clampHealth(state);

  return finalDamage;
}

function isDead(state) {
  return state.inventory.health <= 0;
}

function getLevelById(levelId) {
  return LEVELS[levelId] || null;
}

function getCurrentLevelData(state) {
  return getLevelById(state.progression.currentLevelId);
}

function spawnEnemyForLevel(state, rng, level) {
  const pool = level.enemyPool;
  const typeKey = pool[rng.int(0, pool.length - 1)];
  const type = ENEMY_TYPES[typeKey];

  state.combat.enemy = {
    type: typeKey,
    name: type.name,
    hp: type.maxHp,
    baseHp: type.maxHp,
    dmg: type.dmg,
    drops: type.drops
  };

  state.combat.inCombat = true;
  state.combat.pendingDodge = false;

  return state.combat.enemy;
}

function applyRewards(state, rewards, events) {
  if (!rewards || rewards.length === 0) return;

  rewards.forEach((reward) => {
    if (reward.type === "pistolMagUpgrade") {
      state.pistol.magCapacity = reward.value;
      if (state.pistol.ammoInGun > state.pistol.magCapacity) {
        state.pistol.ammoInGun = state.pistol.magCapacity;
      }
      events.push(reward.text);
    }

    if (reward.type === "medKits") {
      state.inventory.medKits += reward.value;
      events.push(reward.text);
    }

    if (reward.type === "grenades") {
      state.inventory.grenades += reward.value;
      events.push(reward.text);
    }

    if (reward.type === "pistolAmmo") {
      state.pistol.ammoInBag += reward.value;
      events.push(reward.text);
    }

    if (reward.type === "pistolLaser") {
      state.pistol.hasLaser = true;
      events.push(reward.text);
    }
  });
}

function applyEnemyDrops(state, enemy, rng, events) {
  if (!enemy || !enemy.drops) return;

  const { drops } = enemy;

  if (drops.pistolAmmo && rng.chance(drops.pistolAmmo.chance)) {
    const amount = rng.int(drops.pistolAmmo.amount[0], drops.pistolAmmo.amount[1]);
    state.pistol.ammoInBag += amount;
    events.push(`You found ${amount} pistol ammo.`);
  }

  if (drops.medKit && rng.chance(drops.medKit.chance)) {
    const amount = rng.int(drops.medKit.amount[0], drops.medKit.amount[1]);
    state.inventory.medKits += amount;
    events.push(`You found ${amount} med kit.`);
  }

  if (drops.grenade && rng.chance(drops.grenade.chance)) {
    const amount = rng.int(drops.grenade.amount[0], drops.grenade.amount[1]);
    state.inventory.grenades += amount;
    events.push(`You found ${amount} grenade.`);
  }
}

// ---------- Actions ----------
const ACTIONS = {
  pistol(state, rng, events) {
    if (state.pistol.ammoInGun <= 0) {
      events.push("No pistol ammo in the gun.");
      return false;
    }

    state.pistol.ammoInGun -= 1;

    const range = state.pistol.hasLaser
      ? RULES.pistolDamageLaser
      : RULES.pistolDamageNoLaser;

    const damage = rng.int(range[0], range[1]);

    state.combat.enemy.hp -= damage;
    state.stats.noiseLevel += 5;

    events.push(`You fire your pistol for ${damage} damage.`);
    return true;
  },

  knife(state, rng, events) {
    const damage = Math.floor(state.combat.enemy.baseHp * RULES.knifePercentOfBaseHp);
    state.combat.enemy.hp -= damage;
    state.inventory.health -= RULES.knifeSelfDamage;
    clampHealth(state);

    events.push(
      `You slash with your knife for ${damage} damage, but take ${RULES.knifeSelfDamage} damage in close combat.`
    );
    return true;
  },

  grenade(state, rng, events) {
    if (state.inventory.grenades <= 0) {
      events.push("No grenades left.");
      return false;
    }

    state.inventory.grenades -= 1;
    state.combat.enemy.hp -= RULES.grenadeDamage;
    state.stats.noiseLevel += 15;

    events.push(`BOOM! Your grenade deals ${RULES.grenadeDamage} damage.`);
    return true;
  },

  heal(state, rng, events) {
    if (state.inventory.medKits <= 0) {
      events.push("No med kits left.");
      return false;
    }

    state.inventory.medKits -= 1;
    state.inventory.health += 50;
    clampHealth(state);

    events.push(`You use a med kit. HP is now ${state.inventory.health}.`);
    return true;
  },

  reloadPistol(state, rng, events) {
    const needed = state.pistol.magCapacity - state.pistol.ammoInGun;

    if (needed <= 0) {
      events.push("Pistol already full.");
      return false;
    }

    if (state.pistol.ammoInBag <= 0) {
      events.push("No pistol ammo left in bag.");
      return false;
    }

    const taken = Math.min(needed, state.pistol.ammoInBag);
    state.pistol.ammoInGun += taken;
    state.pistol.ammoInBag -= taken;

    events.push(
      `You reload your pistol. Ammo: ${state.pistol.ammoInGun}/${state.pistol.magCapacity}.`
    );
    return true;
  },

  dodge(state, rng, events) {
    state.combat.pendingDodge = true;
    events.push("You prepare to dodge the next attack...");
    return true;
  },

  toggleShield(state, rng, events) {
    if (!state.shield.hasShield) {
      events.push("No shield available.");
      return false;
    }

    state.shield.equipped = !state.shield.equipped;
    events.push(`Shield ${state.shield.equipped ? "equipped" : "unequipped"}.`);
    return true;
  }
};

// ---------- Enemy turn ----------
function enemyTurn(state, rng, events) {
  if (!state.combat.inCombat || !state.combat.enemy) return;
  if (state.combat.enemy.hp <= 0) return;

  if (state.combat.pendingDodge) {
    state.combat.pendingDodge = false;

    if (rng.chance(RULES.dodgeSuccessChance)) {
      events.push("You dodge successfully!");
      return;
    }

    events.push("Dodge failed!");
  }

  if (rng.chance(RULES.zombieMissChance)) {
    events.push("The zombie misses!");
    return;
  }

  const [minDamage, maxDamage] = state.combat.enemy.dmg;
  const rawDamage = rng.int(minDamage, maxDamage);
  const dealtDamage = applyShieldedDamage(state, rawDamage, rng);

  events.push(`Zombie hits for ${dealtDamage} damage.`);
}

// ---------- Engine ----------
export function createCombatEngine({ difficulty = "EASY", seed } = {}) {
  const { state, rng } = createNewGameState({ difficulty, seed });

  const engine = {
    state,
    rng,

    getCurrentLevel() {
      return getCurrentLevelData(state);
    },

    hasChoices() {
      return state.progression.awaitingChoice;
    },

    getAvailableChoices() {
      const level = getCurrentLevelData(state);
      if (!level || !level.choices) return [];
      return level.choices;
    },

    startLevel() {
      const events = [];
      const level = getCurrentLevelData(state);

      if (!level) {
        state.progression.gameWon = true;
        events.push("You completed all available levels.");
        events.push("For now, this is the end of the mission.");
        return events;
      }

      state.progression.levelComplete = false;
      state.progression.awaitingChoice = false;
      state.progression.enemiesRemaining = level.enemyCount;

      events.push(`LEVEL ${level.id}: ${level.title}`);
      events.push(level.description);
      events.push(level.introText);

      const enemy = spawnEnemyForLevel(state, rng, level);
      events.push(`A ${enemy.name} appears! HP: ${enemy.hp}`);

      return events;
    },

    dispatch(actionKey) {
      const events = [];

      if (!state.combat.inCombat) {
        events.push("Not in combat right now.");
        return events;
      }

      const action = ACTIONS[actionKey];
      if (!action) {
        events.push(`Unknown action: ${actionKey}`);
        return events;
      }

      const validMove = action(state, rng, events);

      if (isDead(state)) {
        events.push("You died. Game over.");
        return events;
      }

      if (state.combat.enemy && state.combat.enemy.hp <= 0) {
        const defeatedEnemy = { ...state.combat.enemy };

        state.progression.enemiesRemaining -= 1;

        events.push("Enemy defeated!");
        applyEnemyDrops(state, defeatedEnemy, rng, events);

        if (state.progression.enemiesRemaining > 0) {
          const level = getCurrentLevelData(state);
          const nextEnemy = spawnEnemyForLevel(state, rng, level);

          events.push(
            `${state.progression.enemiesRemaining} enemy/enemies remaining in this level.`
          );
          events.push(`A ${nextEnemy.name} appears! HP: ${nextEnemy.hp}`);
          return events;
        }

        state.combat.inCombat = false;
        state.progression.levelComplete = true;

        const level = getCurrentLevelData(state);

        events.push(`Level ${level.id} complete!`);
        events.push(level.completeText);

        applyRewards(state, level.rewards, events);

        if (level.choices && level.choices.length > 0) {
          state.progression.awaitingChoice = true;
          events.push("Choose your next route.");
        } else if (!level.next) {
          state.progression.gameWon = true;
          events.push("You have completed this branch of the mission.");
        }

        return events;
      }

      if (validMove) {
        enemyTurn(state, rng, events);

        if (isDead(state)) {
          events.push("You died. Game over.");
        }
      }

      return events;
    },

    loadFromSave(saveData) {
      const events = [];

      applySavedProgress(state, saveData);

      const level = getCurrentLevelData(state);

      if (!level) {
        state.progression.gameWon = true;
        events.push("Saved progress loaded.");
        events.push("No further level data found.");
        return events;
      }

      events.push(`Saved progress loaded. Difficulty: ${state.difficulty}.`);
      events.push(`LEVEL ${level.id}: ${level.title}`);

      if (state.progression.gameWon) {
        events.push("This run is already complete.");
        return events;
      }

      if (state.progression.awaitingChoice) {
        events.push(level.completeText);
        events.push("Choose your next route.");
        return events;
      }

      if (state.progression.levelComplete) {
        events.push("Continuing to the next area...");
        return events.concat(engine.advanceToNextLevel());
      }

      if (state.progression.enemiesRemaining <= 0) {
        state.progression.enemiesRemaining = level.enemyCount;
      }

      const enemy = spawnEnemyForLevel(state, rng, level);
      events.push(`A ${enemy.name} appears! HP: ${enemy.hp}`);

      return events;
    },

    advanceToNextLevel() {
      const events = [];

      if (!state.progression.levelComplete) {
        events.push("Current level is not complete yet.");
        return events;
      }

      if (state.progression.awaitingChoice) {
        events.push("You must choose a route first.");
        return events;
      }

      const currentLevel = getCurrentLevelData(state);
      if (!currentLevel || !currentLevel.next) {
        state.progression.gameWon = true;
        events.push("No further level available.");
        return events;
      }

      state.progression.currentLevelId = currentLevel.next;
      return engine.startLevel();
    },

    choosePath(nextLevelId) {
      const events = [];

      if (!state.progression.awaitingChoice) {
        events.push("No path choice is available right now.");
        return events;
      }

      const currentLevel = getCurrentLevelData(state);
      const validChoices = currentLevel?.choices?.map((choice) => choice.id) || [];

      if (!validChoices.includes(nextLevelId)) {
        events.push("Invalid path choice.");
        return events;
      }

      state.progression.awaitingChoice = false;
      state.progression.currentLevelId = nextLevelId;

      return engine.startLevel();
    }
  };

  return engine;
}