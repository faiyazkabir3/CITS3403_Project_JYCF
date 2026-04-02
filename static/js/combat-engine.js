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
