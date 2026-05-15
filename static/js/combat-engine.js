import { LEVELS } from "./levels.js";

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

const RULES = {
  zombieMissChance: 0.2,
  dodgeBaseChance: 0.28,
  dodgeSpecialistBonus: 0.37,
  pistolDamageNoLaser: [27, 33],
  pistolDamageLaser: [33, 41],
  quiteSidearmDamage: [28, 34],
  rifleDamage: [33, 39],
  knifePercentOfBaseHp: 0.34,
  fastZombieKnifeBonusDamage: 4,
  knifeSelfDamage: 3,
  leonAxeTriggerChance: 0.33,
  leonAxeSelfDamage: 4,
  leonAxeDamage: [15, 22],
  leonAxeSharpenedDamage: [23, 30],
  grenadeBaseDamage: 58,
  chargerImpactDamage: 33,
  exploderCloseBlast: 14,
  exploderGrenadeBlast: 28,
  poisonDamage: 4,
  corrosionShieldDamage: 10,
  emergencyFailChipDamage: 8,
  nemesisRushDamage: [34, 42],
  nemesisGrabChance: 0.65,
  nemesisGrabFailDamage: 22,
  nemesisGrabCounterDamage: 24
};

const EFFECTIVENESS = {
  best: {
    multiplier: 1.5,
    missChance: 0
  },
  good: {
    multiplier: 1,
    missChance: 0
  },
  worst: {
    multiplier: 0.5,
    missChance: 0.6
  }
};

const CHARACTER_DEFS = {
  leon: {
    id: "leon",
    name: "LEON",
    perkName: "TACTICAL SPECIALIST",
    pistolBonus: 2,
    dodgeBonus: 0,
    medkitBonus: 0,
    startingAgility: 20,
    startingCourage: 50,
    armourBonus: 0.06,
    hasShield: true,
    startsShieldEquipped: true
  },
  quite: {
    id: "quite",
    name: "QUITE",
    perkName: "AGILE SURVIVOR",
    pistolBonus: 0,
    dodgeBonus: 0.08,
    medkitBonus: 15,
    startingAgility: 50,
    startingCourage: 20,
    armourBonus: 0,
    hasShield: false,
    startsShieldEquipped: false
  }
};

const ENEMY_TYPES = {
  fast: {
    name: "Fast Zombie",
    maxHp: 39,
    dmg: [8, 16],
    coins: [1, 1],
    weaponProfile: {
      pistol: "good",
      rifle: "good",
      knife: "best",
      grenade: "worst"
    },
    bulletDodgeChance: 0.2
  },
  heavy: {
    name: "Heavy Zombie",
    maxHp: 70,
    dmg: [14, 24],
    coins: [2, 2],
    weaponProfile: {
      pistol: "good",
      rifle: "best",
      knife: "worst",
      grenade: "best"
    },
    lightDamageResistance: 0.5
  },
  spitter: {
    name: "Spitter Zombie",
    maxHp: 40,
    dmg: [8, 15],
    coins: [2, 2],
    weaponProfile: {
      pistol: "best",
      rifle: "best",
      knife: "worst",
      grenade: "good"
    },
    poisonTurns: 2,
    corrosionTurns: 2
  },
  exploder: {
    name: "Exploder Zombie",
    maxHp: 55,
    dmg: [9, 18],
    coins: [3, 3],
    weaponProfile: {
      pistol: "best",
      rifle: "good",
      knife: "worst",
      grenade: "worst"
    }
  },
  berserker: {
    name: "Berserker Zombie",
    maxHp: 120,
    dmg: [14, 22],
    coins: [4, 4],
    weaponProfile: {
      pistol: "good",
      rifle: "good",
      knife: "worst",
      grenade: "good"
    },
    rageThreshold: 0.5,
    rageBonus: [6, 8]
  },
  screamer: {
    name: "Screamer Zombie",
    maxHp: 34,
    dmg: [5, 11],
    coins: [2, 2],
    weaponProfile: {
      pistol: "best",
      rifle: "best",
      knife: "good",
      grenade: "worst"
    },
    summonAfterTurns: 2,
    summonType: "fast"
  },
  charger: {
    name: "Charger Zombie",
    maxHp: 45,
    dmg: [RULES.chargerImpactDamage, RULES.chargerImpactDamage],
    coins: [3, 3],
    weaponProfile: {
      pistol: "good",
      rifle: "good",
      knife: "good",
      grenade: "worst"
    }
  },
  nemesisT: {
    name: "Nemesis-T Type",
    maxHp: 1000,
    dmg: [18, 26],
    coins: [0, 0],
    weaponProfile: {
      pistol: "good",
      rifle: "best",
      knife: "worst",
      grenade: "good"
    },
    lightDamageResistance: 0.12,
    boss: true,
    bossStunThresholds: [150, 50],
    bossStunTurns: 1,
    bossGrabChance: RULES.nemesisGrabChance
  }
};

const SHOP_ITEMS = [
  {
    id: "medkit",
    label: "MEDKIT",
    cost: 4,
    description: "Restore 50 HP. Quite heals 15 extra.",
    canBuy() {
      return true;
    },
    buy(state) {
      state.inventory.medKits += 1;
    },
    canSell(state) {
      return state.inventory.medKits > 0;
    },
    sell(state) {
      state.inventory.medKits -= 1;
    }
  },
  {
    id: "pistolAmmo",
    label: "PISTOL MAG",
    cost: 3,
    description: "Adds one pistol magazine worth of reserve ammo.",
    canBuy() {
      return true;
    },
    buy(state) {
      state.pistol.ammoInBag += state.pistol.magCapacity;
    },
    canSell(state) {
      return state.pistol.ammoInBag >= state.pistol.magCapacity;
    },
    sell(state) {
      state.pistol.ammoInBag -= state.pistol.magCapacity;
    }
  },
  {
    id: "rifle",
    label: "RIFLE",
    cost: 20,
    description: "Unlock a hard-hitting rifle for armoured and ranged enemies.",
    canBuy(state) {
      return !state.rifle.owned;
    },
    buy(state) {
      state.rifle.owned = true;
      state.rifle.ammoInGun = state.rifle.magCapacity;
    },
    canSell(state) {
      return state.rifle.owned;
    },
    sell(state) {
      state.rifle.owned = false;
      state.rifle.ammoInGun = 0;
      state.rifle.ammoInBag = 0;
    }
  },
  {
    id: "rifleAmmo",
    label: "RIFLE MAG",
    cost: 6,
    description: "Adds one rifle magazine worth of reserve ammo.",
    canBuy(state) {
      return state.rifle.owned;
    },
    buy(state) {
      state.rifle.ammoInBag += state.rifle.magCapacity;
    },
    canSell(state) {
      return state.rifle.ammoInBag >= state.rifle.magCapacity;
    },
    sell(state) {
      state.rifle.ammoInBag -= state.rifle.magCapacity;
    }
  },
  {
    id: "armour",
    label: "ARMOUR",
    cost: 12,
    description: "Permanent armour plating that reduces incoming damage.",
    canBuy(state) {
      return state.armour.level < 2;
    },
    buy(state) {
      state.armour.level += 1;
      state.armour.damageReduction = Math.min(state.armour.level * 0.08, 0.16);
    },
    canSell(state) {
      return state.armour.level > 0;
    },
    sell(state) {
      state.armour.level -= 1;
      state.armour.damageReduction = Math.max(state.armour.level * 0.08, 0);
    }
  },
  {
    id: "shieldRepair",
    label: "SHIELD REPAIR",
    cost: 2,
    description: "Leon only. Restore 40 shield durability.",
    canBuy(state) {
      return (
        state.player.characterId === "leon" &&
        state.shield.hasShield &&
        state.shield.durability < state.shield.maxDurability
      );
    },
    buy(state) {
      state.shield.durability = Math.min(state.shield.durability + 40, state.shield.maxDurability);
      if (state.shield.durability > 0) {
        state.shield.equipped = true;
      }
    },
    canSell() {
      return false;
    },
    sell() {}
  },
  {
    id: "axeSharpen",
    label: "AXE SHARPEN",
    cost: 4,
    description: "Leon only. Adds 2 rescue axe sharpen charges, up to 6.",
    isVisible(state) {
      return state.player.characterId === "leon" && state.relics.leonAxe.owned;
    },
    canBuy(state) {
      return (
        state.player.characterId === "leon" &&
        state.relics.leonAxe.owned &&
        state.relics.leonAxe.sharpenCharges < state.relics.leonAxe.maxSharpenCharges
      );
    },
    buy(state) {
      state.relics.leonAxe.sharpenCharges = Math.min(
        state.relics.leonAxe.sharpenCharges + 2,
        state.relics.leonAxe.maxSharpenCharges
      );
    },
    canSell() {
      return false;
    },
    sell() {}
  }
];

function getSellValue(cost) {
  return Math.max(1, Math.round(cost * 0.6));
}

function getTotalWeaponAmmo(weapon) {
  return (weapon.ammoInGun || 0) + (weapon.ammoInBag || 0);
}

function getShopResourceLine(item, state) {
  if (item.id === "medkit") {
    return `Current: ${state.inventory.medKits} medkit${state.inventory.medKits === 1 ? "" : "s"}.`;
  }

  if (item.id === "pistolAmmo") {
    return (
      `Current: ${getTotalWeaponAmmo(state.pistol)} pistol ammo ` +
      `(${state.pistol.ammoInGun}/${state.pistol.magCapacity} loaded, ${state.pistol.ammoInBag} reserve).`
    );
  }

  if (item.id === "rifle") {
    return state.rifle.owned
      ? `Current: rifle owned with ${getTotalWeaponAmmo(state.rifle)} total ammo.`
      : "Current: no rifle owned.";
  }

  if (item.id === "rifleAmmo") {
    return state.rifle.owned
      ? (
          `Current: ${getTotalWeaponAmmo(state.rifle)} rifle ammo ` +
          `(${state.rifle.ammoInGun}/${state.rifle.magCapacity} loaded, ${state.rifle.ammoInBag} reserve).`
        )
      : "Current: buy the rifle before stocking rifle mags.";
  }

  return "";
}

export function createNewGameState({ difficulty = "EASY", seed, character = "leon" } = {}) {
  const rng = createRng(seed);
  const diff = difficulty.toUpperCase();
  const chosenCharacter = CHARACTER_DEFS[character] || CHARACTER_DEFS.leon;

  const startingHealth = diff === "HARD" ? 90 : 100;
  const startingMedKits = diff === "HARD" ? 1 : 2;
  const startingGrenades = diff === "HARD" ? 1 : 2;

  const state = {
    difficulty: diff,
    rngSeed: seed ?? Date.now(),

    player: {
      characterId: chosenCharacter.id,
      characterName: chosenCharacter.name,
      perkName: chosenCharacter.perkName
    },

    inventory: {
      maxHealth: 100,
      health: startingHealth,
      medKits: startingMedKits,
      grenades: startingGrenades,
      coins: 0
    },

    pistol: {
      magCapacity: 8,
      ammoInGun: 8,
      ammoInBag: 16,
      hasLaser: false
    },

    rifle: {
      owned: false,
      magCapacity: 6,
      ammoInGun: 0,
      ammoInBag: 0
    },

    shield: {
      hasShield: chosenCharacter.hasShield,
      equipped: chosenCharacter.startsShieldEquipped,
      durability: chosenCharacter.hasShield ? 100 : 0,
      maxDurability: 100,
      deflect: [0.18, 0.28]
    },

    armour: {
      level: 0,
      damageReduction: 0
    },

    relics: {
      quiteSidearm: {
        owned: false,
        ammo: 0,
        maxAmmo: 10
      },
      leonAxe: {
        owned: false,
        sharpenCharges: 0,
        maxSharpenCharges: 6
      }
    },

    stats: {
      agility: chosenCharacter.startingAgility,
      courage: chosenCharacter.startingCourage
    },

    status: {
      poisonTurns: 0,
      corrosionTurns: 0
    },

    analytics: {
      pistolShotsFired: 0,
      rifleShotsFired: 0,
      grenadesUsed: 0,
      medKitsUsed: 0,
      reloads: 0,
      knivesUsed: 0,
      sidearmShotsFired: 0,
      axeReactions: 0,
      axeSharpenChargesSpent: 0,
      enemiesKilled: 0,
      nemesisKills: 0,
      damageDealt: 0,
      damageTaken: 0,
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
      pendingDodge: false,
      guardStacks: 0,
      pendingDefeatContext: null,
      coverTurns: 0,
      qte: null
    },

    progression: {
      currentLevelId: "1",
      enemiesRemaining: 0,
      encounterOrder: [],
      currentEncounterIndex: 0,
      roundsSinceShop: 0,
      currentChoiceOptions: [],
      levelComplete: false,
      awaitingChoice: false,
      shopOpen: false,
      emergency: null,
      gameWon: false,
      gameOver: false
    }
  };

  refreshAchievements(state);
  return { state, rng };
}

function deepClone(value) {
  return structuredClone(value);
}

function clampHealth(state) {
  if (state.inventory.health > state.inventory.maxHealth) {
    state.inventory.health = state.inventory.maxHealth;
  }

  if (state.inventory.health < 0) {
    state.inventory.health = 0;
  }
}

function normalizeEmergencyState(emergency) {
  if (!emergency?.active) return emergency;

  const normalized = {
    ...emergency
  };

  if (Array.isArray(normalized.steps) && normalized.steps.length > 0) {
    normalized.kind = "sequence";
    normalized.stepIndex = Math.min(
      Math.max(Number(normalized.stepIndex) || 0, 0),
      normalized.steps.length - 1
    );
    normalized.stepCount = normalized.steps.length;

    const currentStep = normalized.steps[normalized.stepIndex];
    if (currentStep) {
      normalized.title = currentStep.title;
      normalized.prompt = currentStep.prompt;
      normalized.key = currentStep.key;
      normalized.required = currentStep.required;
      normalized.timeLimitMs = currentStep.timeLimitMs;
    }

    normalized.sequenceTitle ||= normalized.title || "Emergency Sequence";
    return normalized;
  }

  normalized.kind ||= "single";
  return normalized;
}

function getCharacterPerk(state) {
  return CHARACTER_DEFS[state.player.characterId] || CHARACTER_DEFS.leon;
}

function levelHasChoices(level) {
  return Boolean(
    (Array.isArray(level?.choices) && level.choices.length > 0) ||
    (Array.isArray(level?.choicePool) && level.choicePool.length > 0)
  );
}

function repairProgressionState(state) {
  const currentLevel = getCurrentLevelData(state);

  if (!currentLevel) {
    return;
  }

  const hasChoices = levelHasChoices(currentLevel);
  const hasNextLevel = Boolean(currentLevel.next);

  if (state.combat.inCombat && state.combat.enemy) {
    state.progression.levelComplete = false;
    state.progression.awaitingChoice = false;
    state.progression.shopOpen = false;
    state.progression.emergency = null;
    state.progression.gameWon = false;
  }

  if (state.progression.emergency?.active) {
    state.progression.levelComplete = false;
    state.progression.awaitingChoice = false;
    state.progression.shopOpen = false;
    state.progression.gameWon = false;
  }

  if (hasChoices && state.progression.levelComplete && !state.progression.awaitingChoice) {
    state.progression.awaitingChoice = true;
  }

  if (!hasChoices) {
    state.progression.awaitingChoice = false;
    state.progression.currentChoiceOptions = [];
  }

  if (state.progression.awaitingChoice) {
    state.progression.levelComplete = true;
    state.progression.gameWon = false;
    state.combat.inCombat = false;
    state.combat.enemy = null;

    if (state.progression.currentChoiceOptions.length === 0) {
      state.progression.currentChoiceOptions = pickChoiceOptions(currentLevel, createRng(state.rngSeed));
    }
  }

  if (hasChoices || hasNextLevel) {
    state.progression.gameWon = false;
  }

  if (state.progression.levelComplete) {
    state.progression.enemiesRemaining = 0;
  } else if (state.progression.encounterOrder.length > 0) {
    state.progression.enemiesRemaining = Math.max(
      state.progression.encounterOrder.length - state.progression.currentEncounterIndex,
      state.combat.enemy ? 1 : 0
    );
  }

  if (
    !hasChoices &&
    !hasNextLevel &&
    state.progression.levelComplete &&
    !state.progression.shopOpen &&
    !state.progression.emergency?.active
  ) {
    state.progression.gameWon = true;
  }

  if (state.progression.gameWon) {
    state.progression.levelComplete = true;
    state.progression.awaitingChoice = false;
    state.progression.shopOpen = false;
    state.progression.emergency = null;
    state.combat.inCombat = false;
    state.combat.enemy = null;
    state.combat.qte = null;
    state.combat.coverTurns = 0;
    state.progression.enemiesRemaining = 0;
  }
}

function normalizeStateShape(state) {
  const perk = getCharacterPerk(state);

  state.inventory ||= {};
  state.inventory.maxHealth ??= 100;
  state.inventory.health ??= state.inventory.maxHealth;
  state.inventory.medKits ??= 0;
  state.inventory.grenades ??= 0;
  state.inventory.coins ??= 0;

  state.pistol ||= {};
  state.pistol.magCapacity ??= 8;
  state.pistol.ammoInGun ??= state.pistol.magCapacity;
  state.pistol.ammoInBag ??= 0;
  state.pistol.hasLaser ??= false;

  state.rifle ||= {};
  state.rifle.owned ??= false;
  state.rifle.magCapacity ??= 6;
  state.rifle.ammoInGun ??= 0;
  state.rifle.ammoInBag ??= 0;

  state.shield ||= {};
  state.shield.hasShield ??= perk.hasShield;
  state.shield.equipped ??= perk.startsShieldEquipped;
  state.shield.durability ??= state.shield.hasShield ? 100 : 0;
  state.shield.maxDurability ??= 100;
  state.shield.deflect ??= [0.18, 0.28];

  state.armour ||= {};
  state.armour.level ??= 0;
  state.armour.damageReduction ??= state.armour.level * 0.08;

  state.relics ||= {};
  state.relics.quiteSidearm ||= {};
  state.relics.quiteSidearm.owned ??= false;
  state.relics.quiteSidearm.ammo ??= 0;
  state.relics.quiteSidearm.maxAmmo ??= 10;
  state.relics.leonAxe ||= {};
  state.relics.leonAxe.owned ??= false;
  state.relics.leonAxe.sharpenCharges ??= 0;
  state.relics.leonAxe.maxSharpenCharges ??= 6;

  state.stats ||= {};
  state.stats.agility ??= perk.startingAgility;
  state.stats.courage ??= perk.startingCourage;

  state.status ||= {};
  state.status.poisonTurns ??= 0;
  state.status.corrosionTurns ??= 0;

  state.analytics ||= {};
  state.analytics.pistolShotsFired ??= 0;
  state.analytics.rifleShotsFired ??= 0;
  state.analytics.grenadesUsed ??= 0;
  state.analytics.medKitsUsed ??= 0;
  state.analytics.reloads ??= 0;
  state.analytics.knivesUsed ??= 0;
  state.analytics.sidearmShotsFired ??= 0;
  state.analytics.axeReactions ??= 0;
  state.analytics.axeSharpenChargesSpent ??= 0;
  state.analytics.enemiesKilled ??= 0;
  state.analytics.nemesisKills ??= 0;
  state.analytics.damageDealt ??= 0;
  state.analytics.damageTaken ??= 0;
  state.analytics.dodgesPrepared ??= 0;
  state.analytics.emergencySuccesses ??= 0;
  state.analytics.emergencyFailures ??= 0;
  state.analytics.emergencySequenceClears ??= 0;
  state.analytics.coinsEarned ??= 0;
  state.analytics.savesMade ??= 0;
  state.analytics.achievementsUnlocked ??= [];

  state.combat ||= {};
  state.combat.inCombat ??= false;
  state.combat.enemy ??= null;
  state.combat.pendingDodge ??= false;
  state.combat.guardStacks ??= 0;
  state.combat.pendingDefeatContext ??= null;
  state.combat.coverTurns ??= 0;
  state.combat.qte ??= null;

  if (state.combat.enemy && !ENEMY_TYPES[state.combat.enemy.type]) {
    state.combat.enemy = null;
    state.combat.inCombat = false;
  }

  if (state.combat.enemy?.type === "nemesisT") {
    state.combat.enemy.isBoss = true;
    state.combat.enemy.bossActionStep ??= 0;
    state.combat.enemy.bossStunThresholds ??= [150, 50];
    state.combat.enemy.triggeredStunThresholds ??= [];
    state.combat.enemy.bossStunTurns ??= 1;
    state.combat.enemy.bossGrabChance ??= RULES.nemesisGrabChance;
  }

  if (state.combat.qte?.active) {
    state.progression.emergency = null;
    state.combat.inCombat = Boolean(state.combat.enemy);
  }

  state.progression ||= {};
  state.progression.currentLevelId ??= "1";
  state.progression.enemiesRemaining ??= 0;
  state.progression.encounterOrder ??= [];
  state.progression.currentEncounterIndex ??= 0;
  state.progression.roundsSinceShop ??= 0;
  state.progression.currentChoiceOptions ??= [];
  state.progression.levelComplete ??= false;
  state.progression.awaitingChoice ??= false;
  state.progression.shopOpen ??= false;
  state.progression.emergency ??= null;
  state.progression.gameWon ??= false;
  state.progression.gameOver ??= false;

  if (state.player.characterId === "quite") {
    state.shield.hasShield = false;
    state.shield.equipped = false;
    state.shield.durability = 0;
  }

  if (state.progression.emergency?.active) {
    state.progression.emergency = normalizeEmergencyState(state.progression.emergency);
  }

  repairProgressionState(state);

  clampHealth(state);
}

function isDead(state) {
  return state.inventory.health <= 0;
}

function endGame(state) {
  state.inventory.health = 0;
  state.progression.gameOver = true;
  state.combat.inCombat = false;
  state.combat.pendingDodge = false;
  state.combat.coverTurns = 0;
  state.combat.qte = null;
  state.combat.enemy = null;
  state.progression.shopOpen = false;
  state.progression.emergency = null;
  refreshAchievements(state);
}

function getLevelById(levelId) {
  return LEVELS[levelId] || null;
}

function getCurrentLevelData(state) {
  return getLevelById(state.progression.currentLevelId);
}

function getDodgeChance(state) {
  const perk = getCharacterPerk(state);
  return Math.min(RULES.dodgeBaseChance + perk.dodgeBonus + state.stats.agility / 500, 0.8);
}

function getCritChance(state) {
  if (state.player.characterId !== "leon") return 0;
  return Math.min(state.stats.courage / 500 + state.combat.guardStacks * 0.05, 0.45);
}

function getPassiveArmourReduction(state) {
  const perk = getCharacterPerk(state);
  return Math.min(perk.armourBonus + state.armour.damageReduction, 0.3);
}

function createEncounterOrder(level, rng) {
  if (level.enemySequence && level.enemySequence.length > 0) {
    return [...level.enemySequence];
  }

  if (level.enemyPool && level.enemyPool.length > 0) {
    return Array.from({ length: level.enemyCount }, () => {
      const index = rng.int(0, level.enemyPool.length - 1);
      return level.enemyPool[index];
    });
  }

  return [];
}

function pickChoiceOptions(level, rng) {
  if (level.choices && level.choices.length > 0) {
    return deepClone(level.choices);
  }

  if (!level.choicePool || level.choicePool.length === 0) {
    return [];
  }

  const pool = deepClone(level.choicePool);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, level.choiceCount || pool.length);
}

function buildEnemy(typeKey) {
  const type = ENEMY_TYPES[typeKey];

  return {
    type: typeKey,
    name: type.name,
    hp: type.maxHp,
    baseHp: type.maxHp,
    dmg: [...type.dmg],
    coins: [...type.coins],
    weaponProfile: { ...type.weaponProfile },
    bulletDodgeChance: type.bulletDodgeChance || 0,
    lightDamageResistance: type.lightDamageResistance || 1,
    poisonTurns: type.poisonTurns || 0,
    corrosionTurns: type.corrosionTurns || 0,
    rageThreshold: type.rageThreshold || null,
    rageBonus: type.rageBonus ? [...type.rageBonus] : null,
    summonAfterTurns: type.summonAfterTurns || null,
    summonType: type.summonType || null,
    isBoss: Boolean(type.boss),
    bossActionStep: 0,
    bossStunThresholds: type.bossStunThresholds ? [...type.bossStunThresholds] : [],
    triggeredStunThresholds: [],
    bossStunTurns: type.bossStunTurns || 0,
    bossGrabChance: type.bossGrabChance || 0,
    turnsAlive: 0,
    rageActive: false,
    summonedReinforcement: false,
    chargeReady: false,
    successfulDodges: 0,
    stunnedTurns: 0
  };
}

function createSingleEmergencyState(emergency) {
  return normalizeEmergencyState({
    ...deepClone(emergency),
    active: true,
    kind: "single"
  });
}

function createSequenceEmergencyState(sequence, stepIndex = 0) {
  return normalizeEmergencyState({
    ...deepClone(sequence),
    active: true,
    kind: "sequence",
    stepIndex
  });
}

function spawnCurrentEnemy(state, rng, level, events = []) {
  const encounterType = state.progression.encounterOrder[state.progression.currentEncounterIndex];

  if (!encounterType) {
    state.combat.enemy = null;
    state.combat.inCombat = false;
    return null;
  }

  const enemy = buildEnemy(encounterType);
  state.combat.enemy = enemy;
  state.combat.inCombat = true;
  state.combat.pendingDodge = false;
  state.combat.pendingDefeatContext = null;
  state.combat.guardStacks = 0;
  state.combat.coverTurns = 0;
  state.combat.qte = null;
  state.progression.enemiesRemaining =
    state.progression.encounterOrder.length - state.progression.currentEncounterIndex;

  if (events) {
    events.push(`A ${enemy.name} appeared. Enemy HP: ${enemy.hp}.`);
  }

  return enemy;
}

function applyRewards(state, rewards, events) {
  if (!rewards || rewards.length === 0) return;

  rewards.forEach((reward) => {
    if (reward.type === "coins") {
      awardCoins(state, reward.value, events);
      if (reward.text) {
        events.push(reward.text);
      }
      return;
    }

    if (reward.type === "stats") {
      if (reward.text) {
        events.push(reward.text);
      }
      awardStats(state, reward.agility || 0, reward.courage || 0, events);
      return;
    }

    if (reward.type === "pistolLaser") {
      state.pistol.hasLaser = true;
      events.push(reward.text);
      return;
    }

    if (reward.type === "quiteParryPistol") {
      if (state.player.characterId === "quite") {
        state.relics.quiteSidearm.owned = true;
        state.relics.quiteSidearm.ammo = state.relics.quiteSidearm.maxAmmo;
        if (reward.text) {
          events.push(reward.text);
        }
      }
      return;
    }

    if (reward.type === "leonRescueAxe") {
      if (state.player.characterId === "leon") {
        state.relics.leonAxe.owned = true;
        if (reward.text) {
          events.push(reward.text);
        }
      }
      return;
    }

    if (reward.type === "supplies") {
      if (reward.text) {
        events.push(reward.text);
      }

      if (reward.rifle) {
        const unlockedNow = !state.rifle.owned;
        state.rifle.owned = true;

        if (reward.rifleAmmo) {
          state.rifle.ammoInBag += reward.rifleAmmo;
        }

        if (unlockedNow && state.rifle.ammoInGun <= 0 && state.rifle.ammoInBag > 0) {
          const loaded = Math.min(state.rifle.magCapacity, state.rifle.ammoInBag);
          state.rifle.ammoInGun += loaded;
          state.rifle.ammoInBag -= loaded;
        }
      } else if (reward.rifleAmmo) {
        state.rifle.ammoInBag += reward.rifleAmmo;
      }

      if (reward.medKits) {
        state.inventory.medKits += reward.medKits;
      }

      events.push(
        `Supplies now: ${state.rifle.ammoInGun}/${state.rifle.magCapacity} rifle loaded, ${state.rifle.ammoInBag} reserve, ${state.inventory.medKits} medkit${state.inventory.medKits === 1 ? "" : "s"}.`
      );
    }
  });
}

function awardCoins(state, amount, events) {
  state.inventory.coins += amount;
  state.analytics.coinsEarned += amount;
  events.push(`${state.player.characterName} collected ${amount} antique coin${amount === 1 ? "" : "s"}.`);
}

function awardStats(state, agility = 0, courage = 0, events = null) {
  if (agility > 0) {
    state.stats.agility += agility;
  }

  if (courage > 0) {
    state.stats.courage += courage;
  }

  if (events && (agility > 0 || courage > 0)) {
    events.push(`Current stats: AGI ${state.stats.agility} | COUR ${state.stats.courage}.`);
  }
}

function refreshAchievements(state) {
  state.analytics.achievementsUnlocked = state.analytics.nemesisKills > 0
    ? ["Nemesis Hunter"]
    : [];
}

function applyRewardBundle(state, reward, events) {
  if (!reward) return;

  if (reward.coins) {
    awardCoins(state, reward.coins, events);
  }

  if (reward.agility || reward.courage) {
    awardStats(state, reward.agility || 0, reward.courage || 0, events);
  }
}

function isNemesisEnemy(enemy) {
  return enemy?.type === "nemesisT";
}

function maybeTriggerThresholdStun(enemy, events) {
  if (!enemy?.bossStunThresholds?.length || enemy.hp <= 0) return;

  enemy.triggeredStunThresholds ||= [];

  enemy.bossStunThresholds.forEach((threshold) => {
    if (enemy.hp <= threshold && !enemy.triggeredStunThresholds.includes(threshold)) {
      enemy.triggeredStunThresholds.push(threshold);
      enemy.stunnedTurns = Math.max(enemy.stunnedTurns || 0, enemy.bossStunTurns || 1);
      enemy.bossActionStep = 0;
      events.push(`${enemy.name} buckles at ${threshold} HP and is stunned for one turn.`);
    }
  });
}

function dealSpecialEnemyDamage(state, damage, events = null) {
  state.combat.enemy.hp -= damage;
  state.analytics.damageDealt += damage;

  if (events) {
    maybeTriggerThresholdStun(state.combat.enemy, events);
  }
}

function getEnemyEffectiveness(enemy, weaponKey) {
  const rating = enemy.weaponProfile?.[weaponKey] || "good";
  return {
    rating,
    ...EFFECTIVENESS[rating]
  };
}

function maybeTriggerBerserkerRage(enemy, events) {
  if (!enemy.rageThreshold || enemy.rageActive) return;

  if (enemy.hp > 0 && enemy.hp <= enemy.baseHp * enemy.rageThreshold) {
    enemy.rageActive = true;
    events.push(`The ${enemy.name} becomes enraged and starts moving even faster.`);
  }
}

function resolveWeaponHit(state, rng, weaponKey, baseDamage) {
  const enemy = state.combat.enemy;
  const effect = getEnemyEffectiveness(enemy, weaponKey);

  if (effect.missChance > 0 && rng.chance(effect.missChance)) {
    return {
      hit: false,
      reason: "poorMatch"
    };
  }

  if ((weaponKey === "pistol" || weaponKey === "rifle") && enemy.bulletDodgeChance > 0) {
    if (rng.chance(enemy.bulletDodgeChance)) {
      return {
        hit: false,
        reason: "targetDodged"
      };
    }
  }

  let damage = baseDamage * effect.multiplier;

  if (weaponKey === "knife" && enemy.lightDamageResistance < 1) {
    damage *= enemy.lightDamageResistance;
  }

  if (weaponKey === "knife" && enemy.type === "fast") {
    damage += RULES.fastZombieKnifeBonusDamage;
  }

  let crit = false;
  if (
    (weaponKey === "pistol" || weaponKey === "rifle") &&
    state.player.characterId === "leon" &&
    rng.chance(getCritChance(state))
  ) {
    damage *= 2;
    crit = true;
  }

  damage = Math.max(1, Math.floor(damage));
  enemy.hp -= damage;
  state.analytics.damageDealt += damage;

  return {
    hit: true,
    damage,
    crit,
    rating: effect.rating
  };
}

function getPistolDamageRange(state) {
  return state.pistol.hasLaser ? RULES.pistolDamageLaser : RULES.pistolDamageNoLaser;
}

function getPreparedDodgeChance(state, enemy) {
  let chance = getDodgeChance(state);

  if (enemy?.type === "charger") {
    chance += RULES.dodgeSpecialistBonus;
  }

  return Math.min(chance, 0.95);
}

function isCoverAction(actionKey) {
  return ["heal", "reloadPistol", "reloadRifle", "holdCover"].includes(actionKey);
}

function applyDamage(state, rawDamage, rng, events, options = {}) {
  const {
    ignoreArmour = false,
    ignoreShield = false
  } = options;

  let finalDamage = rawDamage;

  if (!ignoreArmour) {
    const reduction = getPassiveArmourReduction(state);
    finalDamage = Math.max(1, Math.floor(finalDamage * (1 - reduction)));
  }

  const shieldReady =
    !ignoreShield &&
    state.shield.hasShield &&
    state.shield.equipped &&
    state.shield.durability > 0;

  if (shieldReady) {
    const deflect = state.shield.deflect;
    const baseBlock = Array.isArray(deflect)
      ? rng.float(deflect[0], deflect[1])
      : deflect;
    const courageBoost = state.stats.courage / 500;
    const totalBlock = Math.min(baseBlock + courageBoost, 0.75);
    finalDamage = Math.max(0, Math.floor(finalDamage * (1 - totalBlock)));

    state.shield.durability = Math.max(0, state.shield.durability - Math.max(6, Math.floor(rawDamage * 0.35)));

    if (state.player.characterId === "leon") {
      state.combat.guardStacks = Math.min(state.combat.guardStacks + 1, 5);
    }

    if (state.shield.durability <= 0) {
      state.shield.equipped = false;
      events.push("Leon's shield breaks and needs repairs at the shop.");
    }
  }

  state.inventory.health -= finalDamage;
  state.analytics.damageTaken += finalDamage;
  clampHealth(state);

  return finalDamage;
}

function performQuiteQuickShot(state, rng, events) {
  if (state.player.characterId !== "quite") return;

  if (state.relics.quiteSidearm.owned && state.relics.quiteSidearm.ammo > 0) {
    state.relics.quiteSidearm.ammo -= 1;
    state.analytics.sidearmShotsFired += 1;

    const outcome = resolveWeaponHit(
      state,
      rng,
      "pistol",
      rng.int(RULES.quiteSidearmDamage[0], RULES.quiteSidearmDamage[1])
    );

    if (!outcome.hit) {
      if (outcome.reason === "targetDodged") {
        events.push("Quite whips out the parry sidearm, but the target slips away from the snap shot.");
      } else {
        events.push("Quite snaps the parry sidearm into line, but the rushed shot glances wide.");
      }
      return;
    }

    events.push(
      `Quite dodges and fires the parry sidearm for ${outcome.damage} damage${outcome.crit ? " (CRIT!)" : ""}.`
    );

    maybeTriggerThresholdStun(state.combat.enemy, events);
    maybeTriggerBerserkerRage(state.combat.enemy, events);

    if (state.combat.enemy.hp <= 0) {
      state.combat.pendingDefeatContext = {
        weaponKey: "pistol"
      };
    }
    return;
  }

  if (state.pistol.ammoInGun <= 0) {
    events.push("Quite slips clear but has no ammo for her quick counter.");
    return;
  }

  const [minDamage, maxDamage] = getPistolDamageRange(state);
  state.pistol.ammoInGun -= 1;
  state.analytics.pistolShotsFired += 1;

  const outcome = resolveWeaponHit(state, rng, "pistol", rng.int(minDamage, maxDamage));
  if (!outcome.hit) {
    if (outcome.reason === "targetDodged") {
      events.push("Quite snaps off a quick pistol shot, but the fast target slips aside.");
    } else {
      events.push("Quite squeezes off a quick counter-shot, but it glances wide.");
    }
    return;
  }

  events.push(
    `Quite dodges and answers with a quick pistol shot for ${outcome.damage} damage${outcome.crit ? " (CRIT!)" : ""}.`
  );

  maybeTriggerThresholdStun(state.combat.enemy, events);
  maybeTriggerBerserkerRage(state.combat.enemy, events);

  if (state.combat.enemy.hp <= 0) {
    state.combat.pendingDefeatContext = {
      weaponKey: "pistol"
    };
  }
}

function resolvePendingDodge(state, rng, events) {
  if (!state.combat.pendingDodge) return false;

  const hero = state.player.characterName;
  const enemy = state.combat.enemy;
  state.combat.pendingDodge = false;

  if (rng.chance(getPreparedDodgeChance(state, enemy))) {
    events.push(`${hero} dodged successfully.`);
    performQuiteQuickShot(state, rng, events);
    return true;
  }

  events.push(`${hero} tried to dodge, but failed.`);
  return false;
}

function applySpitterDebuff(state, events) {
  state.status.poisonTurns = Math.max(state.status.poisonTurns, 2);
  state.status.corrosionTurns = Math.max(state.status.corrosionTurns, 2);
  events.push("Acid splashes across your gear. Poison and corrosion start ticking.");
}

function applyStatusTick(state, events) {
  const hero = state.player.characterName;

  if (state.status.poisonTurns > 0) {
    state.status.poisonTurns -= 1;
    state.inventory.health -= RULES.poisonDamage;
    state.analytics.damageTaken += RULES.poisonDamage;
    clampHealth(state);
    events.push(`${hero} suffers ${RULES.poisonDamage} poison damage.`);
  }

  if (state.status.corrosionTurns > 0) {
    state.status.corrosionTurns -= 1;

    if (state.shield.hasShield && state.shield.durability > 0) {
      state.shield.durability = Math.max(0, state.shield.durability - RULES.corrosionShieldDamage);
      events.push(`Acid corrodes the shield for ${RULES.corrosionShieldDamage} durability.`);

      if (state.shield.durability <= 0) {
        state.shield.equipped = false;
        events.push("The shield frame gives out completely.");
      }
    } else {
      state.inventory.health -= 2;
      state.analytics.damageTaken += 2;
      clampHealth(state);
      events.push(`${hero}'s armour sizzles for 2 extra damage.`);
    }
  }
}

function addScreamerReinforcement(state, events) {
  const enemy = state.combat.enemy;
  if (!enemy || enemy.type !== "screamer" || enemy.summonedReinforcement || !enemy.summonType) return;

  enemy.summonedReinforcement = true;
  state.progression.encounterOrder.push(enemy.summonType);
  state.progression.enemiesRemaining =
    state.progression.encounterOrder.length - state.progression.currentEncounterIndex;
  events.push(`The ${enemy.name} screams for help. Another zombie rushes into the level.`);
}

function maybeTriggerLeonAxeReaction(state, rng, events, enemyType, incomingDamage) {
  if (
    state.player.characterId !== "leon" ||
    !state.relics.leonAxe.owned ||
    enemyType === "spitter" ||
    incomingDamage <= 0 ||
    isDead(state)
  ) {
    return;
  }

  if (!rng.chance(RULES.leonAxeTriggerChance)) {
    return;
  }

  const sharpened = state.relics.leonAxe.sharpenCharges > 0;
  if (sharpened) {
    state.relics.leonAxe.sharpenCharges -= 1;
    state.analytics.axeSharpenChargesSpent += 1;
  }

  const [minDamage, maxDamage] = sharpened
    ? RULES.leonAxeSharpenedDamage
    : RULES.leonAxeDamage;
  const axeDamage = rng.int(minDamage, maxDamage);
  const selfDamage = applyDamage(state, RULES.leonAxeSelfDamage, rng, events, {
    ignoreArmour: true,
    ignoreShield: true
  });

  state.analytics.axeReactions += 1;
  dealSpecialEnemyDamage(state, axeDamage, events);
  events.push(
    `Leon tears free with the rescue axe, loses ${selfDamage} HP, and deals ${axeDamage} damage${sharpened ? " with a sharpened edge" : ""}.`
  );

  maybeTriggerBerserkerRage(state.combat.enemy, events);

  if (state.combat.enemy.hp <= 0) {
    state.combat.pendingDefeatContext = {
      weaponKey: "axe"
    };
  }
}

function maybeSetEmergency(state, rng, level, events) {
  if (level.emergencySequence) {
    const sequenceChance = level.emergencySequence.chance ?? 1;
    if (!rng.chance(sequenceChance)) {
      return false;
    }

    state.progression.emergency = createSequenceEmergencyState(level.emergencySequence, 0);
  } else if (level.emergency) {
    const chance = level.emergency.chance ?? 1;
    if (!rng.chance(chance)) return false;

    state.progression.emergency = createSingleEmergencyState(level.emergency);
  } else {
    return false;
  }

  state.combat.inCombat = false;
  state.combat.enemy = null;
  events.push(`${state.progression.emergency.title}: ${state.progression.emergency.prompt}`);
  return true;
}

function createNemesisGrabQte(phase = "escape") {
  const isCounter = phase === "counter";

  return {
    active: true,
    kind: "combat",
    combatKind: "nemesisGrab",
    phase,
    scene: "boss-grab",
    title: isCounter ? "QUICK ATTACK" : "NEMESIS GRAB",
    prompt: isCounter
      ? "Nemesis reels back. Mash V or click to drive a quick counterattack into its exposed core."
      : "Nemesis has you in its grip. Mash G or click to break free before it crushes you.",
    key: isCounter ? "V" : "G",
    required: isCounter ? 7 : 10,
    timeLimitMs: isCounter ? 4300 : 5200,
    actionLabel: "MASH KEY / CLICK",
    abortLabel: "FAIL CHECK"
  };
}

const ACTIONS = {
  pistol(state, rng, events) {
    const hero = state.player.characterName;
    const [minDamage, maxDamage] = getPistolDamageRange(state);
    const shotsToFire = state.player.characterId === "quite" && state.stats.agility >= 70 ? 2 : 1;

    if (state.pistol.ammoInGun <= 0) {
      events.push(`${hero} has no pistol ammo in the gun.`);
      return false;
    }

    if (shotsToFire === 2) {
      events.push("Quick and Swift triggers. Quite fires twice this turn.");
    }

    let firedAnyShot = false;

    for (let index = 0; index < shotsToFire; index += 1) {
      if (state.pistol.ammoInGun <= 0) {
        events.push(`${hero} runs out of pistol ammo before the burst is complete.`);
        break;
      }

      state.pistol.ammoInGun -= 1;
      state.analytics.pistolShotsFired += 1;
      firedAnyShot = true;

      const baseDamage = rng.int(minDamage, maxDamage) + getCharacterPerk(state).pistolBonus;
      const outcome = resolveWeaponHit(state, rng, "pistol", baseDamage);

      if (!outcome.hit) {
        if (outcome.reason === "targetDodged") {
          events.push(`The ${state.combat.enemy.name} slips away from the pistol shot.`);
        } else {
          events.push(`${hero}'s pistol shot is a poor matchup and fails to land cleanly.`);
        }
        continue;
      }

      events.push(
        `${hero} fired the pistol and dealt ${outcome.damage} damage${outcome.crit ? " (CRIT!)" : ""}.`
      );
      maybeTriggerThresholdStun(state.combat.enemy, events);
      maybeTriggerBerserkerRage(state.combat.enemy, events);

      if (state.combat.enemy.hp <= 0) {
        state.combat.pendingDefeatContext = { weaponKey: "pistol" };
        break;
      }
    }

    refreshAchievements(state);
    return firedAnyShot;
  },

  rifle(state, rng, events) {
    const hero = state.player.characterName;

    if (!state.rifle.owned) {
      events.push(`${hero} does not own a rifle yet.`);
      return false;
    }

    if (state.rifle.ammoInGun <= 0) {
      events.push(`${hero} has no rifle ammo in the magazine.`);
      return false;
    }

    state.rifle.ammoInGun -= 1;
    state.analytics.rifleShotsFired += 1;

    const baseDamage = rng.int(RULES.rifleDamage[0], RULES.rifleDamage[1]);
    const outcome = resolveWeaponHit(state, rng, "rifle", baseDamage);

    if (!outcome.hit) {
      if (outcome.reason === "targetDodged") {
        events.push(`The ${state.combat.enemy.name} jukes away from the rifle shot.`);
      } else {
        events.push(`${hero}'s rifle shot lands poorly against this target.`);
      }
      return true;
    }

    events.push(`${hero} fired the rifle for ${outcome.damage} damage${outcome.crit ? " (CRIT!)" : ""}.`);
    maybeTriggerThresholdStun(state.combat.enemy, events);
    maybeTriggerBerserkerRage(state.combat.enemy, events);

    if (state.combat.enemy.hp <= 0) {
      state.combat.pendingDefeatContext = { weaponKey: "rifle" };
    }

    refreshAchievements(state);
    return true;
  },

  knife(state, rng, events) {
    const hero = state.player.characterName;
    const damage = Math.floor(state.combat.enemy.baseHp * RULES.knifePercentOfBaseHp);
    const outcome = resolveWeaponHit(state, rng, "knife", damage);
    const bestKnifeCase = outcome.hit && outcome.rating === "best";

    state.analytics.knivesUsed += 1;

    if (!outcome.hit) {
      events.push(`${hero} lunges with the knife, but the attack fails to connect well.`);
    } else {
      events.push(`${hero} attacked with the knife and dealt ${outcome.damage} damage.`);
      maybeTriggerThresholdStun(state.combat.enemy, events);
      if (bestKnifeCase) {
        state.combat.enemy.stunnedTurns = Math.max(state.combat.enemy.stunnedTurns || 0, 1);
        state.combat.enemy.chargeReady = false;
        events.push(`The ${state.combat.enemy.name} is stunned by the close-range hit.`);
      }
      maybeTriggerBerserkerRage(state.combat.enemy, events);
    }

    if (!bestKnifeCase) {
      state.inventory.health -= RULES.knifeSelfDamage;
      state.analytics.damageTaken += RULES.knifeSelfDamage;
      clampHealth(state);
      events.push(`${hero} took ${RULES.knifeSelfDamage} damage in close combat.`);
    }

    if (state.combat.enemy.hp <= 0) {
      state.combat.pendingDefeatContext = { weaponKey: "knife" };
    }

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

    const outcome = resolveWeaponHit(state, rng, "grenade", RULES.grenadeBaseDamage);
    if (!outcome.hit) {
      events.push(`${hero} threw a grenade, but it fails to connect effectively.`);
      refreshAchievements(state);
      return true;
    }

    events.push(`${hero} threw a grenade and dealt ${outcome.damage} damage.`);
    maybeTriggerThresholdStun(state.combat.enemy, events);
    maybeTriggerBerserkerRage(state.combat.enemy, events);

    if (state.combat.enemy.hp <= 0) {
      state.combat.pendingDefeatContext = { weaponKey: "grenade" };
    }

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

    state.inventory.health += 50 + perk.medkitBonus;
    state.status.poisonTurns = 0;
    state.status.corrosionTurns = 0;
    clampHealth(state);

    events.push(`${hero} used a med kit and recovered to ${state.inventory.health} HP.`);
    events.push("Poison and corrosion are cleared.");
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

    events.push(`${hero} reloaded the pistol to ${state.pistol.ammoInGun}/${state.pistol.magCapacity}.`);
    refreshAchievements(state);
    return true;
  },

  reloadRifle(state, rng, events) {
    const hero = state.player.characterName;

    if (!state.rifle.owned) {
      events.push(`${hero} does not own a rifle yet.`);
      return false;
    }

    const needed = state.rifle.magCapacity - state.rifle.ammoInGun;
    if (needed <= 0) {
      events.push(`${hero}'s rifle is already full.`);
      return false;
    }

    if (state.rifle.ammoInBag <= 0) {
      events.push(`${hero} has no rifle ammo left in reserve.`);
      return false;
    }

    const taken = Math.min(needed, state.rifle.ammoInBag);
    state.rifle.ammoInGun += taken;
    state.rifle.ammoInBag -= taken;
    state.analytics.reloads += 1;

    events.push(`${hero} reloaded the rifle to ${state.rifle.ammoInGun}/${state.rifle.magCapacity}.`);
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

  holdCover(state, rng, events) {
    const hero = state.player.characterName;

    if (state.combat.coverTurns <= 0) {
      events.push(`${hero} has no cover to hold right now.`);
      return false;
    }

    events.push(`${hero} stays tucked behind the lab pillar and catches one clean breath.`);
    refreshAchievements(state);
    return true;
  },

  toggleShield(state, rng, events) {
    const hero = state.player.characterName;

    if (!state.shield.hasShield) {
      events.push(`${hero} has no shield available.`);
      return false;
    }

    if (state.shield.durability <= 0) {
      events.push("The shield is broken and must be repaired in the shop.");
      return false;
    }

    state.shield.equipped = !state.shield.equipped;
    events.push(`${hero} ${state.shield.equipped ? "equipped" : "unequipped"} the shield.`);
    return true;
  }
};

function consumeBossCoverTurn(state, events) {
  if (state.combat.coverTurns <= 0) return false;

  state.combat.coverTurns -= 1;
  state.combat.pendingDodge = false;
  events.push("Nemesis stalks past the lab pillar while you stay hidden. The safe turn is spent.");
  applyStatusTick(state, events);
  return true;
}

function resolveNemesisNormalAttack(state, rng, events) {
  const hero = state.player.characterName;
  const enemy = state.combat.enemy;
  const dodged = resolvePendingDodge(state, rng, events);

  if (state.combat.enemy?.hp <= 0) {
    return;
  }

  if (dodged) {
    events.push("Nemesis overextends, but the opening is too brief to hide.");
    applyStatusTick(state, events);
    return;
  }

  if (rng.chance(0.1)) {
    events.push(`${enemy.name} swings through a lab console and misses ${hero}.`);
    applyStatusTick(state, events);
    return;
  }

  const rawDamage = rng.int(enemy.dmg[0], enemy.dmg[1]);
  const damage = applyDamage(state, rawDamage, rng, events);
  events.push(`${enemy.name} hammers ${hero} for ${damage} damage.`);
  maybeTriggerLeonAxeReaction(state, rng, events, enemy.type, damage);
  if (state.combat.enemy?.hp <= 0 || isDead(state)) {
    return;
  }
  applyStatusTick(state, events);
}

function resolveNemesisRush(state, rng, events) {
  const hero = state.player.characterName;
  const enemy = state.combat.enemy;
  const dodged = resolvePendingDodge(state, rng, events);

  if (state.combat.enemy?.hp <= 0) {
    return;
  }

  enemy.bossActionStep = 0;

  if (dodged) {
    state.combat.coverTurns = 1;
    events.push(`${hero} dives behind a bio-lab pillar as ${enemy.name} crashes through the lane.`);
    events.push("You have one hidden turn: heal, reload, or hold cover.");
    applyStatusTick(state, events);
    return;
  }

  const rawDamage = rng.int(RULES.nemesisRushDamage[0], RULES.nemesisRushDamage[1]);
  const damage = applyDamage(state, rawDamage, rng, events);
  events.push(`${enemy.name} rushes ${hero} for ${damage} damage.`);
  maybeTriggerLeonAxeReaction(state, rng, events, enemy.type, damage);

  if (state.combat.enemy?.hp <= 0 || isDead(state)) {
    return;
  }

  if (rng.chance(enemy.bossGrabChance || RULES.nemesisGrabChance)) {
    state.combat.qte = createNemesisGrabQte("escape");
    events.push(`${enemy.name} grabs ${hero}. Break free before it crushes you.`);
    return;
  }

  applyStatusTick(state, events);
}

function enemyTurn(state, rng, events) {
  if (!state.combat.inCombat || !state.combat.enemy) return;
  if (state.combat.enemy.hp <= 0) return;

  const hero = state.player.characterName;
  const enemy = state.combat.enemy;
  enemy.turnsAlive += 1;

  if (isNemesisEnemy(enemy) && consumeBossCoverTurn(state, events)) {
    return;
  }

  if (enemy.stunnedTurns > 0) {
    enemy.stunnedTurns -= 1;
    enemy.chargeReady = false;
    events.push(`The ${enemy.name} is stunned and cannot act this turn.`);
    applyStatusTick(state, events);
    return;
  }

  if (isNemesisEnemy(enemy)) {
    if (enemy.bossActionStep === 0) {
      enemy.bossActionStep = 1;
      resolveNemesisNormalAttack(state, rng, events);
      return;
    }

    if (enemy.bossActionStep === 1) {
      enemy.bossActionStep = 2;
      state.combat.pendingDodge = false;
      events.push(`${enemy.name} lowers its shoulder and lines up a brutal rush.`);
      events.push("Prepare to dodge on your next turn, then use the pillar cover to heal or reload.");
      applyStatusTick(state, events);
      return;
    }

    resolveNemesisRush(state, rng, events);
    return;
  }

  if (enemy.type === "screamer" && !enemy.summonedReinforcement) {
    if (enemy.turnsAlive >= (enemy.summonAfterTurns || 2)) {
      addScreamerReinforcement(state, events);
    }
  }

  if (enemy.type === "charger") {
    if (!enemy.chargeReady) {
      enemy.chargeReady = true;
      events.push(`The ${enemy.name} plants its feet and lines up a rush.`);
      applyStatusTick(state, events);
      return;
    }

    enemy.chargeReady = false;
    const dodged = resolvePendingDodge(state, rng, events);

    if (state.combat.enemy?.hp <= 0) {
      return;
    }

    if (dodged) {
      enemy.successfulDodges += 1;

      if (enemy.successfulDodges >= 2) {
        enemy.stunnedTurns = rng.int(1, 2);
        enemy.successfulDodges = 0;
        events.push(`The ${enemy.name} crashes past you and is stunned for ${enemy.stunnedTurns} turn${enemy.stunnedTurns === 1 ? "" : "s"}.`);
      } else {
        events.push("A second clean dodge will leave the charger wide open.");
      }

      applyStatusTick(state, events);
      return;
    }

    enemy.successfulDodges = 0;
    const damage = applyDamage(state, RULES.chargerImpactDamage, rng, events);
    events.push(`The ${enemy.name} slams into ${hero} for ${damage} damage and sends them skidding back.`);
    maybeTriggerLeonAxeReaction(state, rng, events, enemy.type, damage);
    if (state.combat.enemy?.hp <= 0 || isDead(state)) {
      return;
    }
    applyStatusTick(state, events);
    return;
  }

  const dodged = resolvePendingDodge(state, rng, events);
  if (state.combat.enemy?.hp <= 0) {
    return;
  }

  if (dodged) {
    applyStatusTick(state, events);
    return;
  }

  let missChance = RULES.zombieMissChance;
  if (enemy.type === "berserker" && enemy.rageActive) {
    missChance = 0.1;
  }

  if (rng.chance(missChance)) {
    events.push(`The ${enemy.name} missed ${hero}.`);
    applyStatusTick(state, events);
    return;
  }

  let rawDamage = rng.int(enemy.dmg[0], enemy.dmg[1]);
  if (enemy.type === "berserker" && enemy.rageActive && enemy.rageBonus) {
    rawDamage += rng.int(enemy.rageBonus[0], enemy.rageBonus[1]);
  }

  const damage = applyDamage(state, rawDamage, rng, events);
  events.push(`The ${enemy.name} hit ${hero} for ${damage} damage.`);
  maybeTriggerLeonAxeReaction(state, rng, events, enemy.type, damage);

  if (state.combat.enemy?.hp <= 0 || isDead(state)) {
    return;
  }

  if (enemy.type === "spitter") {
    applySpitterDebuff(state, events);
  }

  applyStatusTick(state, events);
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
    normalizeStateShape(state);
    refreshAchievements(state);
  }

  function completeCurrentLevel(events) {
    const hero = state.player.characterName;
    const level = getCurrentLevelData(state);

    state.status.poisonTurns = 0;
    state.status.corrosionTurns = 0;
    state.combat.pendingDodge = false;
    state.combat.coverTurns = 0;
    state.combat.qte = null;
    state.combat.enemy = null;
    state.combat.inCombat = false;
    state.progression.enemiesRemaining = 0;
    state.progression.levelComplete = true;
    state.progression.roundsSinceShop += 1;
    events.push(`${hero} cleared Level ${level.id}.`);
    events.push(level.completeText);

    applyRewards(state, level.rewards, events);

    const choiceOptions = pickChoiceOptions(level, rng);
    if (choiceOptions.length > 0) {
      state.progression.currentChoiceOptions = choiceOptions;
      state.progression.awaitingChoice = true;
      events.push(`${hero} must choose the next route.`);
    } else {
      state.progression.currentChoiceOptions = [];
    }

    if (
      level.shopAfterClear &&
      state.progression.roundsSinceShop >= 2 &&
      (choiceOptions.length > 0 || level.next)
    ) {
      state.progression.shopOpen = true;
      state.progression.roundsSinceShop = 0;
      events.push("A shop terminal is available before you move on.");
    }

    if (choiceOptions.length > 0) {
      if (state.progression.shopOpen) {
        events.push("You can shop before committing to the next route.");
      }
    } else if (!level.next) {
      state.progression.gameWon = true;
      events.push(`${hero} completed this branch of the mission.`);
    }

    refreshAchievements(state);
    return events;
  }

  function handleEnemyDefeat(events) {
    const hero = state.player.characterName;
    const defeatedEnemy = { ...state.combat.enemy };
    const coinReward = rng.int(defeatedEnemy.coins[0], defeatedEnemy.coins[1]);

    state.progression.currentEncounterIndex += 1;
    state.analytics.enemiesKilled += 1;
    if (defeatedEnemy.type === "nemesisT") {
      state.analytics.nemesisKills += 1;
    }
    events.push(`${hero} killed ${defeatedEnemy.name}.`);
    if (coinReward > 0) {
      awardCoins(state, coinReward, events);
    }

    if (defeatedEnemy.type === "exploder") {
      const defeatWeapon = state.combat.pendingDefeatContext?.weaponKey || "pistol";
      if (defeatWeapon === "grenade") {
        const backlash = applyDamage(state, RULES.exploderGrenadeBlast, rng, events, {
          ignoreShield: true,
          ignoreArmour: true
        });
        events.push(`The grenade chain reaction backfires for ${backlash} damage.`);
      } else if (defeatWeapon === "knife" || defeatWeapon === "axe") {
        const backlash = applyDamage(state, RULES.exploderCloseBlast, rng, events, {
          ignoreShield: true,
          ignoreArmour: true
        });
        events.push(`The exploder goes off at point-blank range for ${backlash} damage.`);
      }
    }

    if (isDead(state)) {
      endGame(state);
      events.push(`${hero} died in the aftermath. Game over.`);
      return events;
    }

    state.combat.pendingDodge = false;
    state.combat.enemy = null;
    state.combat.inCombat = false;
    state.combat.guardStacks = 0;
    state.combat.pendingDefeatContext = null;
    state.combat.coverTurns = 0;
    state.combat.qte = null;
    state.progression.enemiesRemaining =
      state.progression.encounterOrder.length - state.progression.currentEncounterIndex;

    if (state.progression.currentEncounterIndex < state.progression.encounterOrder.length) {
      events.push(`${state.progression.enemiesRemaining} enemies remain in this level.`);
      spawnCurrentEnemy(state, rng, getCurrentLevelData(state), events);
      refreshAchievements(state);
      return events;
    }

    return completeCurrentLevel(events);
  }

  function resolveCombatQte(success, progress = 0) {
    const events = [];
    const qte = state.combat.qte;
    const hero = state.player.characterName;
    const enemy = state.combat.enemy;

    if (!qte?.active) {
      events.push("No combat quick-time event is active.");
      return events;
    }

    if (!enemy || qte.combatKind !== "nemesisGrab") {
      state.combat.qte = null;
      events.push("The combat quick-time event fizzles out.");
      return events;
    }

    if (!success) {
      state.combat.qte = null;

      if (qte.phase === "counter") {
        events.push(`${hero} breaks free but misses the quick counterattack.`);
      } else {
        const damage = applyDamage(state, RULES.nemesisGrabFailDamage, rng, events, {
          ignoreShield: true
        });
        events.push(`${enemy.name} crushes ${hero} for ${damage} damage before throwing them clear.`);
      }

      if (progress > 0) {
        events.push(`Progress reached: ${progress}.`);
      }

      if (isDead(state)) {
        endGame(state);
        events.push(`${hero} died in Nemesis' grip. Game over.`);
      }

      refreshAchievements(state);
      return events;
    }

    if (qte.phase === "escape") {
      state.combat.qte = createNemesisGrabQte("counter");
      events.push(`${hero} breaks Nemesis' grip and finds a narrow opening.`);
      events.push(state.combat.qte.prompt);
      refreshAchievements(state);
      return events;
    }

    state.combat.qte = null;
    enemy.hp -= RULES.nemesisGrabCounterDamage;
    state.analytics.damageDealt += RULES.nemesisGrabCounterDamage;
    events.push(`${hero} lands a quick counterattack for ${RULES.nemesisGrabCounterDamage} damage.`);
    maybeTriggerThresholdStun(enemy, events);

    if (enemy.hp <= 0) {
      state.combat.pendingDefeatContext = {
        weaponKey: "counter"
      };
      return handleEnemyDefeat(events);
    }

    refreshAchievements(state);
    return events;
  }

  function startCurrentLevel(events) {
    const level = getCurrentLevelData(state);

    if (!level) {
      state.progression.gameWon = true;
      events.push(`${state.player.characterName} completed all available levels.`);
      return events;
    }

    state.progression.levelComplete = false;
    state.progression.awaitingChoice = false;
    state.progression.shopOpen = false;
    state.progression.emergency = null;
    state.progression.gameWon = false;
    state.progression.currentChoiceOptions = [];
    state.progression.encounterOrder = createEncounterOrder(level, rng);
    state.progression.currentEncounterIndex = 0;
    state.progression.enemiesRemaining = state.progression.encounterOrder.length;
    state.combat.pendingDodge = false;
    state.combat.guardStacks = 0;
    state.combat.pendingDefeatContext = null;
    state.combat.coverTurns = 0;
    state.combat.qte = null;

    if (state.progression.currentLevelId === "1") {
      events.push(`${state.player.characterName} entered the mission.`);
      events.push(`Perk: ${state.player.perkName}`);
      events.push(`Starting stats: AGI ${state.stats.agility} | COUR ${state.stats.courage}.`);
    }

    events.push(`LEVEL ${level.id}: ${level.title}`);
    events.push(level.description);
    events.push(level.introText);

    if (level.autoComplete && state.progression.encounterOrder.length === 0) {
      completeCurrentLevel(events);
    } else if (!maybeSetEmergency(state, rng, level, events)) {
      spawnCurrentEnemy(state, rng, level, events);
    }

    refreshAchievements(state);
    return events;
  }

  const engine = {
    state,
    rng,

    getCurrentLevel() {
      return getCurrentLevelData(state);
    },

    getDerivedStats() {
      return {
        dodgeChance: getDodgeChance(state),
        critChance: getCritChance(state),
        armourReduction: getPassiveArmourReduction(state),
        quickAndSwiftUnlocked: state.player.characterId === "quite" && state.stats.agility >= 70
      };
    },

    hasChoices() {
      return state.progression.awaitingChoice;
    },

    getAvailableChoices() {
      return state.progression.currentChoiceOptions || [];
    },

    isShopOpen() {
      return Boolean(state.progression.shopOpen);
    },

    getShopInventory() {
      return SHOP_ITEMS
        .filter((item) => !item.isVisible || item.isVisible(state))
        .map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          resourceLine: getShopResourceLine(item, state),
          cost: item.cost,
          sellValue: getSellValue(item.cost),
          disabled: !item.canBuy(state)
        }));
    },

    getSellInventory() {
      return SHOP_ITEMS
        .filter((item) => item.canSell(state))
        .map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          value: getSellValue(item.cost)
        }));
    },

    buy(itemId) {
      const events = [];
      const hero = state.player.characterName;

      if (!state.progression.shopOpen) {
        events.push("The shop is not available right now.");
        return events;
      }

      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      if (!item) {
        events.push("That item is not in the shop.");
        return events;
      }

      if (item.isVisible && !item.isVisible(state)) {
        events.push("That item is not in the shop.");
        return events;
      }

      if (!item.canBuy(state)) {
        events.push(`${hero} cannot buy ${item.label} right now.`);
        return events;
      }

      if (state.inventory.coins < item.cost) {
        events.push(`${hero} needs ${item.cost} coins for ${item.label}.`);
        return events;
      }

      state.inventory.coins -= item.cost;
      item.buy(state);
      events.push(`${hero} bought ${item.label} for ${item.cost} coins.`);
      refreshAchievements(state);
      return events;
    },

    sell(itemId) {
      const events = [];
      const hero = state.player.characterName;

      if (!state.progression.shopOpen) {
        events.push("The shop is not available right now.");
        return events;
      }

      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      if (!item || !item.canSell(state)) {
        events.push(`${hero} has nothing valid to sell there.`);
        return events;
      }

      const value = getSellValue(item.cost);
      item.sell(state);
      state.inventory.coins += value;
      events.push(`${hero} sold ${item.label} for ${value} coins.`);
      refreshAchievements(state);
      return events;
    },

    closeShop() {
      const events = [];

      if (!state.progression.shopOpen) {
        events.push("The shop is already closed.");
        return events;
      }

      state.progression.shopOpen = false;
      events.push("You step away from the shop terminal.");
      refreshAchievements(state);
      return events;
    },

    hasEmergency() {
      return Boolean(state.progression.emergency?.active || state.combat.qte?.active);
    },

    getEmergency() {
      return state.combat.qte?.active ? state.combat.qte : state.progression.emergency;
    },

    resolveEmergency(success, progress = 0) {
      if (state.combat.qte?.active) {
        return resolveCombatQte(success, progress);
      }

      const events = [];
      const emergency = state.progression.emergency;
      const hero = state.player.characterName;

      if (!emergency?.active) {
        events.push("No emergency event is active.");
        return events;
      }

      if (!success) {
        state.progression.emergency = null;
        state.analytics.emergencyFailures += 1;
        events.push(emergency.failText);
        applyRewardBundle(state, emergency.failReward, events);

        const chipDamage = emergency.failDamage ?? RULES.emergencyFailChipDamage;
        const damage = applyDamage(state, chipDamage, rng, events, {
          ignoreShield: true
        });
        events.push(`${hero} loses ${damage} HP during the scramble.`);
      } else if (emergency.kind === "sequence" && Array.isArray(emergency.steps)) {
        const nextStepIndex = (emergency.stepIndex || 0) + 1;

        if (nextStepIndex < emergency.steps.length) {
          const nextStep = emergency.steps[nextStepIndex];
          state.progression.emergency = createSequenceEmergencyState(emergency, nextStepIndex);
          events.push(`Step ${nextStepIndex}/${emergency.steps.length} cleared.`);
          events.push(`${nextStep.title}: ${nextStep.prompt}`);
        } else {
          state.progression.emergency = null;
          state.analytics.emergencySuccesses += 1;
          state.analytics.emergencySequenceClears += 1;
          events.push(emergency.successText);
          applyRewardBundle(state, emergency.reward, events);
        }
      } else {
        state.progression.emergency = null;
        state.analytics.emergencySuccesses += 1;
        events.push(emergency.successText);
        applyRewardBundle(state, emergency.reward, events);
      }

      if (isDead(state)) {
        endGame(state);
        events.push(`${hero} died during the emergency. Game over.`);
        return events;
      }

      if (!state.progression.emergency?.active && !state.combat.enemy && !state.progression.levelComplete) {
        spawnCurrentEnemy(state, rng, getCurrentLevelData(state), events);
      }

      if (!success && progress > 0) {
        events.push(`Progress reached: ${progress}.`);
      }

      refreshAchievements(state);
      return events;
    },

    isGameOver() {
      return state.progression.gameOver || state.inventory.health <= 0;
    },

    resumeFromSave() {
      const events = [];
      const hero = state.player.characterName;

      normalizeStateShape(state);
      const level = getCurrentLevelData(state);

      if (state.progression.gameOver || state.inventory.health <= 0) {
        endGame(state);
        events.push(`${hero} is dead. Start a new game to play again.`);
        return events;
      }

      if (state.progression.gameWon) {
        events.push(`${hero} has already completed this run.`);
        return events;
      }

      if (!level) {
        state.progression.gameWon = true;
        events.push(`${hero} completed all available levels.`);
        return events;
      }

      if (state.progression.emergency?.active) {
        events.push(`${hero} resumed the saved game.`);
        events.push(`LEVEL ${level.id}: ${level.title}`);
        events.push(`${state.progression.emergency.title}: ${state.progression.emergency.prompt}`);
        return events;
      }

      if (state.combat.qte?.active) {
        events.push(`${hero} resumed the saved game.`);
        events.push(`LEVEL ${level.id}: ${level.title}`);
        events.push(`${state.combat.qte.title}: ${state.combat.qte.prompt}`);
        return events;
      }

      if (state.progression.shopOpen || state.progression.awaitingChoice) {
        events.push(`${hero} resumed the saved game.`);
        events.push(`LEVEL ${level.id}: ${level.title}`);
        events.push(`Intermission status: SHOP ${state.progression.shopOpen ? "OPEN" : "CLOSED"}.`);
        if (state.progression.awaitingChoice) {
          if (!state.progression.currentChoiceOptions || state.progression.currentChoiceOptions.length === 0) {
            state.progression.currentChoiceOptions = pickChoiceOptions(level, rng);
          }
          events.push(`${hero} still needs to choose a route.`);
        }
        return events;
      }

      if (state.combat.inCombat && state.combat.enemy) {
        events.push(`${hero} resumed the saved game.`);
        events.push(`LEVEL ${level.id}: ${level.title}`);
        events.push(`A ${state.combat.enemy.name} is still in front of you. Enemy HP: ${state.combat.enemy.hp}.`);
        return events;
      }

      if (
        level.autoComplete &&
        !state.progression.levelComplete &&
        !state.combat.enemy &&
        !state.progression.emergency?.active &&
        !state.progression.shopOpen &&
        !state.progression.awaitingChoice &&
        createEncounterOrder(level, rng).length === 0
      ) {
        events.push(`${hero} resumed the saved game.`);
        return startCurrentLevel(events);
      }

      if (state.progression.levelComplete) {
        if (level.manualContinueAfterClear && level.next) {
          events.push(`${hero} resumed the saved game.`);
          events.push(`LEVEL ${level.id}: ${level.title}`);
          events.push(`Level ${level.id} is clear. Continue when ready.`);
          return events;
        }

        return engine.advanceToNextLevel();
      }

      if (!state.progression.encounterOrder || state.progression.encounterOrder.length === 0) {
        state.progression.encounterOrder = createEncounterOrder(level, rng);
      }

      if (state.progression.currentEncounterIndex >= state.progression.encounterOrder.length) {
        state.progression.currentEncounterIndex = 0;
      }

      spawnCurrentEnemy(state, rng, level, events);
      events.push(`${hero} resumed the saved game.`);
      events.push(`LEVEL ${level.id}: ${level.title}`);
      events.push(`Enemies left in this level: ${state.progression.enemiesRemaining}.`);
      refreshAchievements(state);
      return events;
    },

    startLevel() {
      const events = [];

      if (state.progression.gameOver) {
        events.push(`${state.player.characterName} is dead. Start a new game to play again.`);
        return events;
      }

      return startCurrentLevel(events);
    },

    dispatch(actionKey) {
      const events = [];
      const hero = state.player.characterName;

      if (state.progression.gameOver || state.inventory.health <= 0) {
        endGame(state);
        events.push(`${hero} is dead and cannot perform any more actions.`);
        return events;
      }

      if (state.progression.emergency?.active || state.combat.qte?.active) {
        events.push("Resolve the quick-time event first.");
        return events;
      }

      if (!state.combat.inCombat || !state.combat.enemy) {
        events.push(`${hero} is not in combat right now.`);
        return events;
      }

      const action = ACTIONS[actionKey];
      if (!action) {
        events.push(`Unknown action: ${actionKey}`);
        return events;
      }

      if (state.combat.coverTurns > 0 && !isCoverAction(actionKey)) {
        events.push("You are hidden for one turn. Heal, reload, or hold cover before Nemesis finds you again.");
        return events;
      }

      const validMove = action(state, rng, events);

      if (isDead(state)) {
        endGame(state);
        events.push(`${hero} died. Game over.`);
        return events;
      }

      if (state.combat.enemy && state.combat.enemy.hp <= 0) {
        return handleEnemyDefeat(events);
      }

      if (validMove) {
        enemyTurn(state, rng, events);

        if (state.combat.enemy && state.combat.enemy.hp <= 0) {
          return handleEnemyDefeat(events);
        }

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

      if (state.progression.shopOpen) {
        events.push("Finish shopping first.");
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
      return startCurrentLevel(events);
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

      const validChoices = (state.progression.currentChoiceOptions || []).map((choice) => choice.id);

      if (!validChoices.includes(nextLevelId)) {
        events.push("That path choice is invalid.");
        return events;
      }

      state.progression.awaitingChoice = false;
      state.progression.shopOpen = false;
      state.progression.currentChoiceOptions = [];
      state.progression.currentLevelId = nextLevelId;
      return startCurrentLevel(events);
    }
  };

  return engine;
}
