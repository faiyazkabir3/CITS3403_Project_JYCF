const SAVE_KEY = "zombie_game_latest_save_v1";

export const ACHIEVEMENTS = [
  {
    id: "first_kill",
    name: "FIRST KILL",
    description: "Kill 1 zombie.",
    check: (state) => state.analytics.enemiesKilled >= 1
  },
  {
    id: "pistol_expert",
    name: "PISTOL EXPERT",
    description: "Fire 20 pistol shots across your run.",
    check: (state) => state.analytics.pistolShotsFired >= 20
  },
  {
    id: "grenadier",
    name: "GRENADIER",
    description: "Use 5 grenades across your run.",
    check: (state) => state.analytics.grenadesUsed >= 5
  },
  {
    id: "survivor",
    name: "SURVIVOR",
    description: "Reach Level 2 or higher.",
    check: (state) =>
      Number(state.progression.currentLevelId) >= 2 || state.progression.gameWon
  },
  {
    id: "leon_specialist",
    name: "LEON SPECIALIST",
    description: "As Leon, kill 20 zombies and fire 25 pistol shots.",
    check: (state) =>
      state.player.characterId === "leon" &&
      state.analytics.enemiesKilled >= 20 &&
      state.analytics.pistolShotsFired >= 25
  },
  {
    id: "quite_specialist",
    name: "QUITE SPECIALIST",
    description: "As Quite, kill 20 zombies and use 3 medkits.",
    check: (state) =>
      state.player.characterId === "quite" &&
      state.analytics.enemiesKilled >= 20 &&
      state.analytics.medKitsUsed >= 3
  }
];

export function buildSaveData(engine) {
  return {
    savedAt: new Date().toISOString(),
    state: structuredClone(engine.state)
  };
}

export function saveGame(engine) {
  const payload = buildSaveData(engine);
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload;
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse save file:", error);
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function getSavePreviewText() {
  const data = loadGame();
  if (!data || !data.state) {
    return "NO SAVE DATA FOUND";
  }

  const state = data.state;
  const savedTime = new Date(data.savedAt).toLocaleString();

  return [
    `CHARACTER: ${state.player.characterName}`,
    `DIFFICULTY: ${state.difficulty}`,
    `LEVEL: ${state.progression.currentLevelId}`,
    `HP: ${state.inventory.health}`,
    `PISTOL: ${state.pistol.ammoInGun}/${state.pistol.magCapacity}`,
    `BAG AMMO: ${state.pistol.ammoInBag}`,
    `GRENADES: ${state.inventory.grenades}`,
    `MEDKITS: ${state.inventory.medKits}`,
    `STATUS: ${state.progression.gameOver ? "DEAD" : "ALIVE"}`,
    `SAVED: ${savedTime}`
  ].join("\n");
}

export function getAchievementStatus(state) {
  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    unlocked: achievement.check(state)
  }));
}

export function getUnlockedAchievements(state) {
  return getAchievementStatus(state)
    .filter((item) => item.unlocked)
    .map((item) => item.name);
}

export function getAchievementHtmlFromSavedData() {
  const saved = loadGame();

  if (!saved || !saved.state) {
    return `
      <div class="achievement-card">
        <div class="achievement-title">NO SAVE DATA</div>
        <div class="achievement-desc">Start a game first to track achievements.</div>
      </div>
    `;
  }

  const statuses = getAchievementStatus(saved.state);

  return statuses
    .map((item) => {
      return `
        <div class="achievement-card ${item.unlocked ? "unlocked" : "locked"}">
          <div class="achievement-title">
            ${item.unlocked ? "UNLOCKED" : "LOCKED"} — ${item.name}
          </div>
          <div class="achievement-desc">${item.description}</div>
        </div>
      `;
    })
    .join("");
}