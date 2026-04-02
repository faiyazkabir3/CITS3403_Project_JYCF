// combatEngine.js
// A small, scalable turn-based combat core for your web UI.
// Start as one file; later split into modules (state.js, rng.js, combat.js, etc.).

// ---------- RNG (seedable for testability) ----------
function mulberry32(seed) {
  // Small, fast PRNG (good for games/tests; not for security).
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

// ---------- Game definitions (data-driven) ----------
const ENEMY_TYPES = {
  regular: { name: "Regular Zombie", maxHp: 50, dmg: [10, 25] },
  fast:    { name: "Fast Zombie",    maxHp: 30, dmg: [8, 18]  },
  heavy:   { name: "Heavy Zombie",   maxHp: 60, dmg: [12, 26] },
  spitter: { name: "Spitter Zombie", maxHp: 40, dmg: [7, 20]  }
};

const RULES = {
  zombieMissChance: 0.31,     // 31% miss
  dodgeSuccessChance: 0.40,   // 40% dodge
  knifeSelfDamage: 3,
  knifePercentOfBaseHp: 0.27,
  grenadeDamage: 87,
  pistolDamageNoLaser: [27, 33],
  pistolDamageLaser: [33, 41]
};

// ---------- State creation ----------
export function createNewGameState({ difficulty = "EASY", seed } = {}) {
  const rng = createRng(seed);

  // Difficulty hook: keep it simple now, scale later.
  const diff = difficulty.toUpperCase();
  const hp = diff === "HARD" ? 85 : 100;
  const med = diff === "HARD" ? 1 : 2;

  const state = {
    difficulty: diff,
    rngSeed: seed ?? Date.now(),

    inventory: {
      health: hp,
      medKits: med,
      grenades: 2,
      flashGrenades: 1
    },

    pistol: {
      magCapacity: 8,
      ammoInGun: 8,
      ammoInBag: 20,
      hasLaser: false
    },

    rifle: {
      hasRifle: false,
      magCapacity: 30,
      ammoInGun: 0,
      ammoInBag: 0
    },

    shield: {
      hasShield: true,
      equipped: true,
      deflect: [0.30, 0.40] // 30–40% block range
    },

    stats: {
      noiseLevel: 0,
      ambushRisk: 0
    },

    combat: {
      inCombat: false,
      enemy: null,
      pendingDodge: false
    }
  };

  return { state, rng };
}

// ---------- Utility helpers ----------
function clampHealth(s) {
  if (s.inventory.health > 100) s.inventory.health = 100;
  if (s.inventory.health < 0) s.inventory.health = 0;
}

function applyShieldedDamage(s, rawDamage, rng) {
  let dmg = rawDamage;

  if (s.shield.equipped) {
    const def = s.shield.deflect;
    const blockFrac = Array.isArray(def) ? rng.float(def[0], def[1]) : def;
    dmg = Math.floor(dmg * (1 - blockFrac));
  }

  s.inventory.health -= dmg;
  clampHealth(s);
  return dmg;
}

function isDead(s) {
  return s.inventory.health <= 0;
}

function spawnEnemy(s, rng) {
  // Later: scale by chapter, noise/ambush.
  const keys = Object.keys(ENEMY_TYPES);
  const typeKey = keys[rng.int(0, keys.length - 1)];
  const type = ENEMY_TYPES[typeKey];

  s.combat.enemy = {
    type: typeKey,
    name: type.name,
    hp: type.maxHp,
    baseHp: type.maxHp,
    dmg: type.dmg
  };
  s.combat.inCombat = true;
  s.combat.pendingDodge = false;

  return s.combat.enemy;
}

// ---------- Player action handlers (Command map) ----------
const ACTIONS = {
  pistol(s, rng, events) {
    if (s.pistol.ammoInGun <= 0) {
      events.push("No pistol ammo in the gun.");
      return false;
    }
    s.pistol.ammoInGun -= 1;

    const range = s.pistol.hasLaser ? RULES.pistolDamageLaser : RULES.pistolDamageNoLaser;
    const dmg = rng.int(range[0], range[1]);

    s.combat.enemy.hp -= dmg;
    s.stats.noiseLevel += 5;

    events.push(`You fire your pistol for ${dmg} damage.`);
    return true;
  },

  grenade(s, rng, events) {
    if (s.inventory.grenades <= 0) {
      events.push("You're out of grenades.");
      return false;
    }
    s.inventory.grenades -= 1;

    s.combat.enemy.hp -= RULES.grenadeDamage;
    s.stats.noiseLevel += 15;

    events.push(`BOOM! Grenade deals ${RULES.grenadeDamage} damage.`);
    return true;
  },

  knife(s, rng, events) {
    const baseHp = s.combat.enemy.baseHp;
    const dmg = Math.floor(baseHp * RULES.knifePercentOfBaseHp);

    s.combat.enemy.hp -= dmg;
    s.inventory.health -= RULES.knifeSelfDamage;
    clampHealth(s);

    events.push(`Knife strike deals ${dmg} damage (but you take ${RULES.knifeSelfDamage}).`);
    return true;
  },

  heal(s, rng, events) {
    if (s.inventory.medKits <= 0) {
      events.push("No med kits left.");
      return false;
    }
    s.inventory.medKits -= 1;
    s.inventory.health += 50;
    clampHealth(s);

    events.push(`You heal. HP is now ${s.inventory.health}.`);
    return true;
  },

  reloadPistol(s, rng, events) {
    const needed = s.pistol.magCapacity - s.pistol.ammoInGun;
    if (needed <= 0) {
      events.push("Pistol already full.");
      return false;
    }
    if (s.pistol.ammoInBag <= 0) {
      events.push("No pistol ammo in bag.");
      return false;
    }

    const take = Math.min(needed, s.pistol.ammoInBag);
    s.pistol.ammoInGun += take;
    s.pistol.ammoInBag -= take;

    events.push(`Reloaded pistol (+${take}). Ammo: ${s.pistol.ammoInGun}/${s.pistol.magCapacity}.`);
    return true;
  },

  dodge(s, rng, events) {
    // This sets a flag; resolution happens on enemy turn.
    s.combat.pendingDodge = true;
    events.push("You prepare to dodge the next attack...");
    return true;
  },

  toggleShield(s, rng, events) {
    if (!s.shield.hasShield) {
      events.push("No shield owned.");
      return false;
    }
    s.shield.equipped = !s.shield.equipped;
    events.push(`Shield ${s.shield.equipped ? "equipped" : "unequipped"}.`);
    return true;
  }
};

// ---------- Enemy turn ----------
function enemyTurn(s, rng, events) {
  if (!s.combat.inCombat || !s.combat.enemy) return;

  // If enemy already dead, skip.
  if (s.combat.enemy.hp <= 0) return;

  // Dodge attempt?
  if (s.combat.pendingDodge) {
    s.combat.pendingDodge = false;
    const dodged = rng.chance(RULES.dodgeSuccessChance);
    if (dodged) {
      events.push("You dodge successfully!");
      return;
    }
    events.push("Dodge failed!");
    // If dodge failed, continue to normal hit check.
  }

  // Miss chance
  if (rng.chance(RULES.zombieMissChance)) {
    events.push("The zombie misses!");
    return;
  }

  const [minD, maxD] = s.combat.enemy.dmg;
  const raw = rng.int(minD, maxD);
  const dealt = applyShieldedDamage(s, raw, rng);

  events.push(`Zombie hits for ${dealt} damage.`);
}

// ---------- Main dispatch ----------
export function createCombatEngine({ difficulty = "EASY", seed } = {}) {
  const { state, rng } = createNewGameState({ difficulty, seed });

  const engine = {
    state,
    rng,

    startCombat() {
      const events = [];
      const enemy = spawnEnemy(engine.state, engine.rng);
      events.push(`A ${enemy.name} appears! HP: ${enemy.hp}`);
      return events;
    },

    dispatch(actionKey) {
      const events = [];
      const s = engine.state;

      if (!s.combat.inCombat) {
        events.push("Not in combat. Start combat first.");
        return events;
      }

      const action = ACTIONS[actionKey];
      if (!action) {
        events.push(`Unknown action: ${actionKey}`);
        return events;
      }

      const valid = action(s, engine.rng, events);

      // Check player death from knife recoil etc.
      if (isDead(s)) {
        events.push("You died. Game over.");
        return events;
      }

      // If enemy died, end combat.
      if (s.combat.enemy.hp <= 0) {
        s.combat.inCombat = false;
        events.push("Enemy defeated!");
        return events;
      }

      // If valid action, enemy gets a turn (turn-based).
      if (valid) {
        enemyTurn(s, engine.rng, events);

        if (isDead(s)) {
          events.push("You died. Game over.");
        }
      }

      return events;
    }
  };

  return engine;
}
