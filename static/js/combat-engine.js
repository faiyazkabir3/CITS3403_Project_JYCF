import { LEVELS } from "./levels.js";
import { getUnlockedAchievements } from "./progression.js";

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

const RULES = {
  zombieMissChance: 0.31,
  dodgeSuccessChance: 0.4,
  pistolDamageNoLaser: [27, 33],
  pistolDamageLaser: [33, 41],
  knifePercentOfBaseHp: 0.27,
  knifeSelfDamage: 3,
  grenadeDamage: 87
};

const CHARACTER_DEFS = {
  leon: {
    id: "leon",
    name: "LEON",
    perkName: "TACTICAL SPECIALIST",
    pistolBonus: 4,
    shieldBonus: 0.08,
    dodgeBonus: 0,
    medkitBonus: 0
  },
  quite: {
    id: "quite",
    name: "QUITE",
    perkName: "AGILE SURVIVOR",
    pistolBonus: 0,
    shieldBonus: 0,
    dodgeBonus: 0.18,
    medkitBonus: 15
  }
};

export function createNewGameState({ difficulty = "EASY", seed, character = "leon" } = {}) {
  const rng = createRng(seed);
  const diff = difficulty.toUpperCase();
  const chosenCharacter = CHARACTER_DEFS[character] || CHARACTER_DEFS.leon;

  const startingHealth = diff === "HARD" ? 85 : 100;
  const startingMedKits = diff === "HARD" ? 1 : 2;

  const state = {
    difficulty: diff,
    rngSeed: seed ?? Date.now(),

    player: {
      characterId: chosenCharacter.id,
      characterName: chosenCharacter.name,
      perkName: chosenCharacter.perkName
    },

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
      currentLevelId: "1",
      enemiesRemaining: 0,
      levelComplete: false,
      awaitingChoice: false,
      gameWon: false,
      gameOver: false
    }
  };

  state.analytics.achievementsUnlocked = getUnlockedAchievements(state);

  return { state, rng };
}

function deepClone(value) {
  return structuredClone(value);
}

function clampHealth(state) {
  if (state.inventory.health > 100) state.inventory.health = 100;
  if (state.inventory.health < 0) state.inventory.health = 0;
}

function getCharacterPerk(state) {
  return CHARACTER_DEFS[state.player.characterId] || CHARACTER_DEFS.leon;
}

function applyShieldedDamage(state, rawDamage, rng) {
  let finalDamage = rawDamage;

  if (state.shield.equipped) {
    const perk = getCharacterPerk(state);
    const deflect = state.shield.deflect;
    const baseBlock = Array.isArray(deflect)
      ? rng.float(deflect[0], deflect[1])
      : deflect;

    const totalBlock = Math.min(baseBlock + perk.shieldBonus, 0.8);
    finalDamage = Math.floor(finalDamage * (1 - totalBlock));
  }

  state.inventory.health -= finalDamage;
  state.analytics.damageTaken += finalDamage;
  clampHealth(state);

  return finalDamage;
}

function isDead(state) {
  return state.inventory.health <= 0;
}

function endGame(state) {
  state.inventory.health = 0;
  state.progression.gameOver = true;
  state.combat.inCombat = false;
  state.combat.pendingDodge = false;
  state.combat.enemy = null;
  refreshAchievements(state);
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
  const hero = state.player.characterName;

  if (drops.pistolAmmo && rng.chance(drops.pistolAmmo.chance)) {
    const amount = rng.int(drops.pistolAmmo.amount[0], drops.pistolAmmo.amount[1]);
    state.pistol.ammoInBag += amount;
    events.push(`${hero} found ${amount} pistol ammo.`);
  }

  if (drops.medKit && rng.chance(drops.medKit.chance)) {
    const amount = rng.int(drops.medKit.amount[0], drops.medKit.amount[1]);
    state.inventory.medKits += amount;
    events.push(`${hero} found ${amount} med kit.`);
  }

  if (drops.grenade && rng.chance(drops.grenade.chance)) {
    const amount = rng.int(drops.grenade.amount[0], drops.grenade.amount[1]);
    state.inventory.grenades += amount;
    events.push(`${hero} found ${amount} grenade.`);
  }
}

function refreshAchievements(state) {
  state.analytics.achievementsUnlocked = getUnlockedAchievements(state);
}

const ACTIONS = {
  pistol(state, rng, events) {
    const hero = state.player.characterName;
    const perk = getCharacterPerk(state);

    if (state.pistol.ammoInGun <= 0) {
      events.push(`${hero} has no pistol ammo in the gun.`);
      return false;
    }

    state.pistol.ammoInGun -= 1;
    state.analytics.pistolShotsFired += 1;

    const range = state.pistol.hasLaser
      ? RULES.pistolDamageLaser
      : RULES.pistolDamageNoLaser;

    const damage = rng.int(range[0], range[1]) + perk.pistolBonus;
    state.combat.enemy.hp -= damage;

    events.push(`${hero} fired the pistol and dealt ${damage} damage.`);
    refreshAchievements(state);
    return true;
  },

  knife(state, rng, events) {
    const hero = state.player.characterName;
    const damage = Math.floor(state.combat.enemy.baseHp * RULES.knifePercentOfBaseHp);

    state.combat.enemy.hp -= damage;
    state.inventory.health -= RULES.knifeSelfDamage;
    state.analytics.knivesUsed += 1;
    clampHealth(state);

    events.push(`${hero} attacked with the knife and dealt ${damage} damage.`);
    events.push(`${hero} took ${RULES.knifeSelfDamage} damage in close combat.`);
    refreshAchievements(state);
    return true;
  },

  grenade(state, rng, events) {
    const hero = state.player.characterName;

    if (state.inventory.grenades <= 0) {
      events.push(`${hero} has no grenades left.`);
      return false;
    }

    state.inventory.grenades -= 1;
    state.analytics.grenadesUsed += 1;

    state.combat.enemy.hp -= RULES.grenadeDamage;

    events.push(`${hero} threw a grenade and dealt ${RULES.grenadeDamage} damage.`);
    refreshAchievements(state);
    return true;
  },

  heal(state, rng, events) {
    const hero = state.player.characterName;
    const perk = getCharacterPerk(state);

    if (state.inventory.medKits <= 0) {
      events.push(`${hero} has no med kits left.`);
      return false;
    }

    state.inventory.medKits -= 1;
    state.analytics.medKitsUsed += 1;

    const healAmount = 50 + perk.medkitBonus;
    state.inventory.health += healAmount;
    clampHealth(state);

    events.push(`${hero} used a med kit.`);
    events.push(`${hero}'s HP is now ${state.inventory.health}.`);
    refreshAchievements(state);
    return true;
  },

  reloadPistol(state, rng, events) {
    const hero = state.player.characterName;
    const needed = state.pistol.magCapacity - state.pistol.ammoInGun;

    if (needed <= 0) {
      events.push(`${hero}'s pistol is already full.`);
      return false;
    }

    if (state.pistol.ammoInBag <= 0) {
      events.push(`${hero} has no pistol ammo left in the bag.`);
      return false;
    }

    const taken = Math.min(needed, state.pistol.ammoInBag);
    state.pistol.ammoInGun += taken;
    state.pistol.ammoInBag -= taken;
    state.analytics.reloads += 1;

    events.push(`${hero} reloaded the pistol.`);
    events.push(`Ammo is now ${state.pistol.ammoInGun}/${state.pistol.magCapacity}.`);
    refreshAchievements(state);
    return true;
  },

  dodge(state, rng, events) {
    const hero = state.player.characterName;
    state.combat.pendingDodge = true;
    state.analytics.dodgesPrepared += 1;
    events.push(`${hero} prepared to dodge the next attack.`);
    refreshAchievements(state);
    return true;
  },

  toggleShield(state, rng, events) {
    const hero = state.player.characterName;

    if (!state.shield.hasShield) {
      events.push(`${hero} has no shield available.`);
      return false;
    }

    state.shield.equipped = !state.shield.equipped;
    events.push(`${hero} ${state.shield.equipped ? "equipped" : "unequipped"} the shield.`);
    return true;
  }
};

function enemyTurn(state, rng, events) {
  if (!state.combat.inCombat || !state.combat.enemy) return;
  if (state.combat.enemy.hp <= 0) return;

  const hero = state.player.characterName;
  const perk = getCharacterPerk(state);

  if (state.combat.pendingDodge) {
    state.combat.pendingDodge = false;

    const dodgeChance = RULES.dodgeSuccessChance + perk.dodgeBonus;

    if (rng.chance(dodgeChance)) {
      events.push(`${hero} dodged successfully.`);
      return;
    }

    events.push(`${hero} tried to dodge, but failed.`);
  }

  if (rng.chance(RULES.zombieMissChance)) {
    events.push(`The ${state.combat.enemy.name} missed ${hero}.`);
    return;
  }

  const [minDamage, maxDamage] = state.combat.enemy.dmg;
  const rawDamage = rng.int(minDamage, maxDamage);
  const dealtDamage = applyShieldedDamage(state, rawDamage, rng);

  events.push(`The ${state.combat.enemy.name} hit ${hero} for ${dealtDamage} damage.`);
}

export function createCombatEngine({ difficulty = "EASY", seed, character = "leon", savedState = null } = {}) {
  const baseSeed = savedState?.rngSeed ?? seed;
  const { state, rng } = createNewGameState({
    difficulty: savedState?.difficulty ?? difficulty,
    seed: baseSeed,
    character: savedState?.player?.characterId ?? character
  });

  if (savedState) {
    const restoredState = deepClone(savedState);
    Object.assign(state, restoredState);
    refreshAchievements(state);
  }

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

    isGameOver() {
      return state.progression.gameOver || state.inventory.health <= 0;
    },

    startLevel() {
      const events = [];
      const level = getCurrentLevelData(state);

      if (state.progression.gameOver) {
        events.push(`${state.player.characterName} is dead. Start a new game to play again.`);
        return events;
      }

      if (!level) {
        state.progression.gameWon = true;
        refreshAchievements(state);
        events.push(`${state.player.characterName} completed all available levels.`);
        events.push("For now, this is the end of the mission.");
        return events;
      }

      state.progression.levelComplete = false;
      state.progression.awaitingChoice = false;
      state.progression.enemiesRemaining = level.enemyCount;

      if (state.progression.currentLevelId === "1") {
        events.push(`${state.player.characterName} entered the mission.`);
        events.push(`Perk: ${state.player.perkName}`);
      }

      events.push(`LEVEL ${level.id}: ${level.title}`);
      events.push(level.description);
      events.push(level.introText);

      const enemy = spawnEnemyForLevel(state, rng, level);
      events.push(`A ${enemy.name} appeared. Enemy HP: ${enemy.hp}`);

      refreshAchievements(state);
      return events;
    },

    dispatch(actionKey) {
      const events = [];
      const hero = state.player.characterName;

      if (state.progression.gameOver || state.inventory.health <= 0) {
        endGame(state);
        events.push(`${hero} is dead and cannot perform any more actions.`);
        return events;
      }

      if (!state.combat.inCombat) {
        events.push(`${hero} is not in combat right now.`);
        return events;
      }

      const action = ACTIONS[actionKey];
      if (!action) {
        events.push(`Unknown action: ${actionKey}`);
        return events;
      }

      const validMove = action(state, rng, events);

      if (isDead(state)) {
        endGame(state);
        events.push(`${hero} died. Game over.`);
        return events;
      }

      if (state.combat.enemy && state.combat.enemy.hp <= 0) {
        const defeatedEnemy = { ...state.combat.enemy };

        state.progression.enemiesRemaining -= 1;
        state.analytics.enemiesKilled += 1;

        events.push(`${hero} killed ${defeatedEnemy.name}.`);
        applyEnemyDrops(state, defeatedEnemy, rng, events);

        if (state.progression.enemiesRemaining > 0) {
          const level = getCurrentLevelData(state);
          const nextEnemy = spawnEnemyForLevel(state, rng, level);

          events.push(`${state.progression.enemiesRemaining} enemies remain in this level.`);
          events.push(`A ${nextEnemy.name} appeared. Enemy HP: ${nextEnemy.hp}`);
          refreshAchievements(state);
          return events;
        }

        state.combat.inCombat = false;
        state.combat.enemy = null;
        state.progression.levelComplete = true;

        const level = getCurrentLevelData(state);

        events.push(`${hero} cleared Level ${level.id}.`);
        events.push(level.completeText);

        applyRewards(state, level.rewards, events);

        if (level.choices && level.choices.length > 0) {
          state.progression.awaitingChoice = true;
          events.push(`${hero} must choose the next route.`);
        } else if (!level.next) {
          state.progression.gameWon = true;
          events.push(`${hero} completed this branch of the mission.`);
        }

        refreshAchievements(state);
        return events;
      }

      if (validMove) {
        enemyTurn(state, rng, events);

        if (isDead(state)) {
          endGame(state);
          events.push(`${hero} died. Game over.`);
        }
      }

      refreshAchievements(state);
      return events;
    },

    advanceToNextLevel() {
      const events = [];
      const hero = state.player.characterName;

      if (state.progression.gameOver) {
        events.push(`${hero} cannot continue because the run is over.`);
        return events;
      }

      if (!state.progression.levelComplete) {
        events.push("The current level is not complete yet.");
        return events;
      }

      if (state.progression.awaitingChoice) {
        events.push(`${hero} must choose a route first.`);
        return events;
      }

      const currentLevel = getCurrentLevelData(state);
      if (!currentLevel || !currentLevel.next) {
        state.progression.gameWon = true;
        refreshAchievements(state);
        events.push("No further level is available.");
        return events;
      }

      state.progression.currentLevelId = currentLevel.next;
      refreshAchievements(state);
      return engine.startLevel();
    },

    choosePath(nextLevelId) {
      const events = [];
      const hero = state.player.characterName;

      if (state.progression.gameOver) {
        events.push(`${hero} cannot choose a new path because the run is over.`);
        return events;
      }

      if (!state.progression.awaitingChoice) {
        events.push("No path choice is available right now.");
        return events;
      }

      const currentLevel = getCurrentLevelData(state);
      const validChoices = currentLevel?.choices?.map((choice) => choice.id) || [];

      if (!validChoices.includes(nextLevelId)) {
        events.push("That path choice is invalid.");
        return events;
      }

      state.progression.awaitingChoice = false;
      state.progression.currentLevelId = nextLevelId;
      refreshAchievements(state);

      return engine.startLevel();
    }
  };

  return engine;
}