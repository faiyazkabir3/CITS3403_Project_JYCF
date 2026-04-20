import { createCombatEngine } from "./combat-engine.js";
import {
  ENEMY_VISUALS,
  FX_VISUALS,
  OVERLAY_VISUALS,
  SPECIAL_VISUALS,
  getPlayerVisual,
  getLevelVisual
} from "./visuals.js";

const STORAGE_KEY = "shadows_audio_settings";
const SAVE_BEEP_SOUND = "/static/audio/sfx/system/save_beep.mp3";
const ERROR_BEEP_SOUND = "/static/audio/sfx/system/error_beep.mp3";
const WARNING_BEEP_SOUND = "/static/audio/sfx/system/warning_beep.mp3";
const SUCCESS_SOUND = "/static/audio/sfx/system/success.mp3";
const FAIL_SOUND = "/static/audio/sfx/system/fail.mp3";
const BUTTON_CLICK_SOUND = "/static/audio/sfx/ui/button_click.mp3";
const PISTOL_SHOT_SOUND = "/static/audio/sfx/combat/pistol_shot.mp3";
const RIFLE_SHOT_SOUND = "/static/audio/sfx/combat/rifle_shot.mp3";
const RELOAD_SOUND = "/static/audio/sfx/combat/reload.mp3";
const GRENADE_SOUND = "/static/audio/sfx/combat/grenade_explode.mp3";
const KNIFE_SLASH_SOUND = "/static/audio/sfx/combat/knife_slash.mp3";
const KNIFE_STAB_SOUND = "/static/audio/sfx/combat/knife_stab.mp3";
const WHOOSH_SOUND = "/static/audio/sfx/combat/whoosh.mp3";
const SHIELD_SOUND = "/static/audio/sfx/system/shield.mp3";
const MEDKIT_SOUND = "/static/audio/sfx/system/medkit.mp3";
const HEAL_SOUND = "/static/audio/sfx/system/heal.mp3";
const saveBeepAudio = new Audio(SAVE_BEEP_SOUND);
const errorBeepAudio = new Audio(ERROR_BEEP_SOUND);
const warningBeepAudio = new Audio(WARNING_BEEP_SOUND);
const successAudio = new Audio(SUCCESS_SOUND);
const failAudio = new Audio(FAIL_SOUND);
const buttonClickAudio = new Audio(BUTTON_CLICK_SOUND);
const pistolShotAudio = new Audio(PISTOL_SHOT_SOUND);
const rifleShotAudio = new Audio(RIFLE_SHOT_SOUND);
const reloadAudio = new Audio(RELOAD_SOUND);
const grenadeAudio = new Audio(GRENADE_SOUND);
const knifeSlashAudio = new Audio(KNIFE_SLASH_SOUND);
const knifeStabAudio = new Audio(KNIFE_STAB_SOUND);
const whooshAudio = new Audio(WHOOSH_SOUND);
const shieldAudio = new Audio(SHIELD_SOUND);
const medkitAudio = new Audio(MEDKIT_SOUND);
const healAudio = new Audio(HEAL_SOUND);
const BATTLE_FX_DURATION_MS = 460;
saveBeepAudio.preload = "auto";
errorBeepAudio.preload = "auto";
warningBeepAudio.preload = "auto";
successAudio.preload = "auto";
failAudio.preload = "auto";
buttonClickAudio.preload = "auto";
pistolShotAudio.preload = "auto";
rifleShotAudio.preload = "auto";
reloadAudio.preload = "auto";
grenadeAudio.preload = "auto";
knifeSlashAudio.preload = "auto";
knifeStabAudio.preload = "auto";
whooshAudio.preload = "auto";
shieldAudio.preload = "auto";
medkitAudio.preload = "auto";
healAudio.preload = "auto";

function loadAudioSettings() {
  const defaultSettings = {
    musicVolume: 50,
    sfxVolume: 50,
    muted: false
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSettings;

    const parsed = JSON.parse(saved);
    return {
      musicVolume: Number(parsed.musicVolume) || 50,
      sfxVolume: Number(parsed.sfxVolume) || 50,
      muted: Boolean(parsed.muted)
    };
  } catch {
    return defaultSettings;
  }
}

function playSaveBeep() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  saveBeepAudio.pause();
  saveBeepAudio.currentTime = 0;
  saveBeepAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  saveBeepAudio.play().catch(() => {});
}

function playErrorBeep() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  errorBeepAudio.pause();
  errorBeepAudio.currentTime = 0;
  errorBeepAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  errorBeepAudio.play().catch(() => {});
}

function playWarningBeep() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  warningBeepAudio.pause();
  warningBeepAudio.currentTime = 0;
  warningBeepAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  warningBeepAudio.play().catch(() => {});
}

function playSuccessCue() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  successAudio.pause();
  successAudio.currentTime = 0;
  successAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  successAudio.play().catch(() => {});
}

function playFailCue() {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  failAudio.pause();
  failAudio.currentTime = 0;
  failAudio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  failAudio.play().catch(() => {});
}

function playSfxAudio(audio) {
  const settings = loadAudioSettings();

  if (settings.muted || settings.sfxVolume <= 0) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
  audio.play().catch(() => {});
}

function playCombatActionSfx(actionKey, events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const text = events.join(" ").toLowerCase();

  if (actionKey === "pistol" && (text.includes("pistol shot") || text.includes("fired the pistol"))) {
    playSfxAudio(pistolShotAudio);
    return;
  }

  if (actionKey === "rifle" && (text.includes("rifle shot") || text.includes("fired the rifle"))) {
    playSfxAudio(rifleShotAudio);
    return;
  }

  if ((actionKey === "reloadPistol" || actionKey === "reloadRifle") && text.includes("reloaded")) {
    playSfxAudio(reloadAudio);
    return;
  }

  if (actionKey === "grenade" && text.includes("threw a grenade")) {
    playSfxAudio(grenadeAudio);
    return;
  }

  if (actionKey === "knife") {
    if (text.includes("attacked with the knife and dealt")) {
      playSfxAudio(knifeStabAudio);
      return;
    }

    if (text.includes("lunges with the knife")) {
      playSfxAudio(knifeSlashAudio);
      return;
    }
  }

  if (actionKey === "dodge") {
    if (text.includes("prepared to dodge") || text.includes("dodged successfully") || text.includes("tried to dodge, but failed")) {
      playSfxAudio(whooshAudio);
      return;
    }
  }

  if (actionKey === "toggleShield" && (text.includes("equipped the shield") || text.includes("unequipped the shield"))) {
    playSfxAudio(shieldAudio);
    return;
  }

  if (actionKey === "heal" && text.includes("used a med kit")) {
    playSfxAudio(medkitAudio);
    window.setTimeout(() => {
      playSfxAudio(healAudio);
    }, 500);
  }
}

function playDerivedCombatSfx(events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const text = events.join(" ").toLowerCase();

  if (
    text.includes("fires the parry sidearm") ||
    text.includes("whips out the parry sidearm") ||
    text.includes("snaps the parry sidearm")
  ) {
    playSfxAudio(pistolShotAudio);
  }

  if (text.includes("tears free with the rescue axe")) {
    playSfxAudio(knifeSlashAudio);
  }
}

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

const ACTION_GROUP_IDS = ["main-actions", "attack-actions", "inventory-actions", "stats-actions"];

function showActionGroup(groupId) {
  ACTION_GROUP_IDS.forEach((id) => {
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

function showStatsActions() {
  showActionGroup("stats-actions");
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function setBarFill(element, ratio) {
  if (!element) return;
  element.style.width = `${clampPercent(ratio * 100)}%`;
}

function renderTagList(container, tags, className) {
  if (!container) return;

  container.replaceChildren();
  tags.forEach((text) => {
    const tag = document.createElement("span");
    tag.className = className;
    tag.textContent = text;
    container.appendChild(tag);
  });
}

function ensureBattleAssetBinding(imageEl, fallbackEl) {
  if (!imageEl || imageEl.dataset.bound === "true") return;

  imageEl.dataset.bound = "true";
  imageEl.addEventListener("load", () => {
    imageEl.hidden = false;
    if (fallbackEl) {
      fallbackEl.hidden = true;
    }
  });

  imageEl.addEventListener("error", () => {
    imageEl.hidden = true;
    if (fallbackEl) {
      fallbackEl.hidden = false;
    }
  });
}

function setBattleAsset(imageEl, fallbackEl, src, alt, fallbackText) {
  if (!imageEl || !fallbackEl) return;

  ensureBattleAssetBinding(imageEl, fallbackEl);
  fallbackEl.textContent = fallbackText;
  imageEl.alt = alt;

  if (!src) {
    imageEl.removeAttribute("src");
    imageEl.hidden = true;
    fallbackEl.hidden = false;
    return;
  }

  if (imageEl.dataset.currentSrc !== src) {
    imageEl.dataset.currentSrc = src;
    imageEl.hidden = true;
    fallbackEl.hidden = false;
    imageEl.src = src;
  } else if (imageEl.complete && imageEl.naturalWidth > 0) {
    imageEl.hidden = false;
    fallbackEl.hidden = true;
  }
}

function renderBattleFxImage(imageEl, src) {
  if (!imageEl) return;

  if (!src) {
    imageEl.hidden = true;
    imageEl.removeAttribute("src");
    imageEl.removeAttribute("data-current-src");
    return;
  }

  if (imageEl.dataset.currentSrc !== src) {
    imageEl.dataset.currentSrc = src;
    imageEl.src = src;
  }

  imageEl.alt = "";
  imageEl.hidden = false;
}

function getCurrentWeaponLabel(state, lastActionKey) {
  switch (lastActionKey) {
    case "rifle":
    case "reloadRifle":
      return state.rifle.owned ? "RIFLE" : "PISTOL";
    case "knife":
      return "KNIFE";
    case "grenade":
      return "GRENADE";
    case "heal":
      return "MEDKIT";
    case "toggleShield":
      return "SHIELD";
    default:
      return "PISTOL";
  }
}

function getBattleMode(engine) {
  if (isGameOver(engine)) return "loss";
  if (engine.hasEmergency()) return "emergency";
  if (engine.isShopOpen()) return "shop";
  if (engine.hasChoices()) return "choice";
  if (engine.state.progression.levelComplete && !engine.state.combat.inCombat) return "clear";
  if (engine.state.combat.inCombat) return "combat";
  return "idle";
}

function getBattleTags(engine, currentLevel) {
  const state = engine.state;
  const tags = [];

  if (currentLevel?.title) {
    tags.push(currentLevel.title.toUpperCase());
  }

  tags.push(`LEVEL ${state.progression.currentLevelId}`);
  tags.push(`DIFF ${state.difficulty}`);

  if (engine.hasEmergency()) {
    tags.push("EMERGENCY");
  }

  if (engine.isShopOpen()) {
    tags.push("SHOP ONLINE");
  }

  if (engine.hasChoices()) {
    tags.push("ROUTE SELECT");
  }

  if (state.progression.levelComplete && !state.combat.inCombat) {
    tags.push("AREA SECURED");
  }

  if (state.status.poisonTurns > 0) {
    tags.push(`POISON ${state.status.poisonTurns}`);
  }

  if (state.status.corrosionTurns > 0) {
    tags.push(`CORROSION ${state.status.corrosionTurns}`);
  }

  return tags;
}

function getEnemyTags(enemy) {
  if (!enemy) {
    return ["NO TARGET"];
  }

  const tags = [enemy.type.toUpperCase()];

  if (enemy.rageActive) {
    tags.push("RAGING");
  }

  if (enemy.stunnedTurns > 0) {
    tags.push(`STUNNED ${enemy.stunnedTurns}`);
  }

  if (enemy.chargeReady) {
    tags.push("CHARGING");
  }

  if (enemy.poisonTurns > 0) {
    tags.push(`ACID ${enemy.poisonTurns}`);
  }

  if (enemy.corrosionTurns > 0) {
    tags.push(`CORROSIVE ${enemy.corrosionTurns}`);
  }

  if (enemy.summonAfterTurns && !enemy.summonedReinforcement) {
    tags.push("CALLING");
  }

  return tags;
}

function inferBattleFx(actionKey, events) {
  const text = Array.isArray(events) ? events.join(" ").toLowerCase() : "";
  const effect = {
    actionFxSrc: "",
    effect: "",
    impactFxSrc: "",
    impact: false
  };

  switch (actionKey) {
    case "pistol":
    case "rifle":
      effect.actionFxSrc = FX_VISUALS.muzzleFlash;
      effect.effect = "shot";
      break;
    case "knife":
      effect.actionFxSrc = FX_VISUALS.slashArc;
      effect.effect = "slash";
      break;
    case "grenade":
      effect.actionFxSrc = FX_VISUALS.grenadeBlast;
      effect.effect = "grenade";
      break;
    case "heal":
      effect.effect = "heal";
      break;
    case "reloadPistol":
    case "reloadRifle":
      effect.effect = "reload";
      break;
    case "dodge":
      effect.effect = "dodge";
      break;
    case "toggleShield":
      effect.effect = "shield";
      break;
    default:
      break;
  }

  const enemyDamaged =
    text.includes("dealt") ||
    text.includes("critical hit") ||
    text.includes("threw a grenade") ||
    text.includes("blast damage") ||
    text.includes("tears free with the rescue axe") ||
    text.includes("fires the parry sidearm");

  if (enemyDamaged) {
    effect.impact = true;
    effect.impactFxSrc = FX_VISUALS.hitSplatter;
  }

  return effect;
}

function renderBattleScene(engine, battleSceneState) {
  const state = engine.state;
  const currentLevel = engine.getCurrentLevel();
  const enemy = state.combat.enemy;
  const battleMode = getBattleMode(engine);
  const levelVisual = getLevelVisual(state.progression.currentLevelId);
  const activeVisual = battleMode === "shop" ? SPECIAL_VISUALS.shop : levelVisual;
  const playerPoseKey = battleSceneState.effect ? battleSceneState.lastActionKey : "";
  const playerVisual = getPlayerVisual(state.player.characterId, playerPoseKey);
  const enemyVisual = enemy ? ENEMY_VISUALS[enemy.type] : null;

  const stage = $("#battle-stage");
  const backdrop = $("#battle-backdrop");
  const overlay = $("#battle-overlay");
  const playerActor = $("#battle-player");
  const enemyActor = $("#battle-enemy");
  const playerImage = $("#battle-player-image");
  const enemyImage = $("#battle-enemy-image");
  const playerFallback = $("#battle-player-fallback");
  const enemyFallback = $("#battle-enemy-fallback");
  const actionFxImage = $("#battle-action-fx-image");
  const impactFxImage = $("#battle-impact-fx-image");
  const playerName = $("#battle-player-name");
  const playerMeta = $("#battle-player-meta");
  const playerWeapon = $("#battle-player-weapon");
  const playerHealthFill = $("#battle-player-health-fill");
  const playerShieldFill = $("#battle-player-shield-fill");
  const enemyName = $("#battle-enemy-name");
  const enemyMeta = $("#battle-enemy-meta");
  const enemyHealthFill = $("#battle-enemy-health-fill");
  const enemyTags = $("#battle-enemy-tags");
  const battleTags = $("#battle-tags");

  if (!stage || !backdrop || !overlay) return;

  stage.dataset.theme = activeVisual.theme;
  stage.dataset.mode = battleMode;
  stage.dataset.effect = battleSceneState.effect || "idle";
  stage.dataset.impact = battleSceneState.impact ? "hit" : "idle";

  backdrop.style.setProperty("--battle-backdrop-image", `url("${activeVisual.backdrop}")`);
  overlay.style.setProperty("--battle-overlay-image", `url("${OVERLAY_VISUALS.scanline}")`);
  overlay.style.setProperty(
    "--battle-danger-image",
    engine.hasEmergency() ? `url("${OVERLAY_VISUALS.danger}")` : "none"
  );

  if (playerActor) {
    playerActor.className = "battle-actor battle-player";
  }

  if (enemyActor) {
    enemyActor.className = ["battle-actor", "battle-enemy", enemyVisual?.impactClass || ""]
      .filter(Boolean)
      .join(" ");
  }

  setBattleAsset(
    playerImage,
    playerFallback,
    playerVisual.image,
    `${state.player.characterName} portrait`,
    state.player.characterName
  );

  setBattleAsset(
    enemyImage,
    enemyFallback,
    enemyVisual?.image || "",
    enemy ? `${enemy.name} portrait` : "No threat",
    enemy ? enemy.name.toUpperCase() : "NO CONTACT"
  );

  renderBattleFxImage(actionFxImage, battleSceneState.actionFxSrc || "");
  renderBattleFxImage(impactFxImage, battleSceneState.impactFxSrc || "");

  if (playerName) {
    playerName.textContent = state.player.characterName;
  }

  if (playerMeta) {
    const shieldText = state.shield.hasShield
      ? `SHIELD ${state.shield.equipped ? "ON" : "OFF"} ${state.shield.durability}/${state.shield.maxDurability}`
      : "SHIELD NONE";
    playerMeta.textContent = `HP ${state.inventory.health}/${state.inventory.maxHealth} | ${shieldText}`;
  }

  if (playerWeapon) {
    playerWeapon.textContent = `WEAPON: ${getCurrentWeaponLabel(state, battleSceneState.lastActionKey)}`;
  }

  setBarFill(playerHealthFill, state.inventory.health / state.inventory.maxHealth);
  setBarFill(
    playerShieldFill,
    state.shield.hasShield && state.shield.maxDurability > 0
      ? state.shield.durability / state.shield.maxDurability
      : 0
  );

  if (enemyName) {
    enemyName.textContent = enemy ? enemy.name.toUpperCase() : "NO CONTACT";
  }

  if (enemyMeta) {
    if (enemy) {
      const enemyStatus = enemy.rageActive
        ? "RAGING"
        : enemy.stunnedTurns > 0
          ? `STUNNED ${enemy.stunnedTurns}`
          : enemy.chargeReady
            ? "CHARGING"
            : "HOSTILE";
      enemyMeta.textContent = `HP ${Math.max(enemy.hp, 0)}/${enemy.baseHp} | ${enemyStatus}`;
    } else {
      enemyMeta.textContent = "SCAN ONLINE";
    }
  }

  setBarFill(enemyHealthFill, enemy ? enemy.hp / enemy.baseHp : 0);
  renderTagList(enemyTags, getEnemyTags(enemy), "battle-enemy-tag");
  renderTagList(battleTags, getBattleTags(engine, currentLevel), "battle-tag");
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

    if (state.relics?.quiteSidearm?.owned) {
      lines.push(`PARRY SIDEARM: ${state.relics.quiteSidearm.ammo}/${state.relics.quiteSidearm.maxAmmo}`);
    }

    if (state.rifle.owned) {
      lines.push(`RIFLE: ${state.rifle.ammoInGun}/${state.rifle.magCapacity} | BAG ${state.rifle.ammoInBag}`);
    }

    if (state.relics?.leonAxe?.owned) {
      lines.push(`AXE SHARPEN: ${state.relics.leonAxe.sharpenCharges}/${state.relics.leonAxe.maxSharpenCharges}`);
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

function canContinueToNextLevel(engine) {
  return (
    !isGameOver(engine) &&
    engine.state.progression.levelComplete &&
    !engine.state.progression.gameWon &&
    !engine.hasEmergency() &&
    !engine.isShopOpen() &&
    !engine.hasChoices()
  );
}

function renderContinueBox(engine, locked, onContinue) {
  const continueBox = $("#continue-box");
  const continueBtn = $("#continue-level-btn");
  if (!continueBox || !continueBtn) return;

  if (!canContinueToNextLevel(engine)) {
    continueBox.style.display = "none";
    return;
  }

  continueBox.style.display = "block";
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
    kills: state.analytics.enemiesKilled,
    damage_dealt: state.analytics.damageDealt,
    damage_taken: state.analytics.damageTaken,
    pistol_shots: state.analytics.pistolShotsFired,
    grenades_used: state.analytics.grenadesUsed,
    medkits_used: state.analytics.medKitsUsed,
    reloads: state.analytics.reloads,
    knife_uses: state.analytics.knivesUsed,
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

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      ok: response.ok,
      message: response.ok ? "Game saved." : "Save failed."
    };
  }

  const result = await response.json();
  if (!response.ok && result.ok !== true) {
    result.ok = false;
  }

  return result;
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
  const battleSceneState = {
    lastActionKey: "idle",
    effect: "",
    impact: false,
    actionFxSrc: "",
    impactFxSrc: "",
    timerId: null
  };
  const emergencySession = {
    active: false,
    signature: null,
    deadline: 0,
    progress: 0,
    required: 0,
    key: "X",
    timerId: null
  };

  function clearBattleFx() {
    if (battleSceneState.timerId) {
      window.clearTimeout(battleSceneState.timerId);
    }

    battleSceneState.effect = "";
    battleSceneState.impact = false;
    battleSceneState.actionFxSrc = "";
    battleSceneState.impactFxSrc = "";
    battleSceneState.timerId = null;
  }

  function triggerBattleFx(actionKey, events) {
    if (
      ["pistol", "rifle", "knife", "grenade", "reloadPistol", "reloadRifle", "heal", "dodge", "toggleShield"].includes(
        actionKey
      )
    ) {
      battleSceneState.lastActionKey = actionKey;
    }

    const effect = inferBattleFx(actionKey, events);
    if (!effect.effect && !effect.impact && !effect.actionFxSrc && !effect.impactFxSrc) {
      return;
    }

    if (battleSceneState.timerId) {
      window.clearTimeout(battleSceneState.timerId);
    }

    battleSceneState.effect = effect.effect;
    battleSceneState.impact = effect.impact;
    battleSceneState.actionFxSrc = effect.actionFxSrc;
    battleSceneState.impactFxSrc = effect.impactFxSrc;
    renderAll();

    battleSceneState.timerId = window.setTimeout(() => {
      clearBattleFx();
      renderAll();
    }, BATTLE_FX_DURATION_MS);
  }

  function clearEmergencySession() {
    if (emergencySession.timerId) {
      window.clearInterval(emergencySession.timerId);
    }

    warningBeepAudio.pause();
    warningBeepAudio.currentTime = 0;

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
    const events = engine.resolveEmergency(success, progress);

    if (success && engine.hasEmergency()) {
      playSaveBeep();
    } else if (success) {
      playSuccessCue();
    } else {
      playFailCue();
    }

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
    const signature = `${engine.state.progression.currentLevelId}:${emergency.stepIndex || 0}:${emergency.title}:${emergency.prompt}`;
    if (emergencySession.signature !== signature) {
      clearEmergencySession();
      emergencySession.signature = signature;
      emergencySession.progress = 0;
      emergencySession.required = emergency.required;
      emergencySession.key = String(emergency.key || "X").toUpperCase();
      emergencySession.deadline = 0;
      if ((emergency.stepIndex || 0) === 0) {
        playWarningBeep();
      }
    }

    if (!isAnimatingEvents && !emergencySession.active && !locked) {
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
    emergencyTitle.textContent =
      emergency.stepCount > 1 ? emergency.sequenceTitle || emergency.title : emergency.title;
    emergencyPrompt.textContent =
      emergency.stepCount > 1 ? `${emergency.title}: ${emergency.prompt}` : emergency.prompt;
    emergencyKey.textContent = emergencySession.key;
    emergencyTimer.textContent = `${(remainingMs / 1000).toFixed(1)}s`;
    emergencyProgress.textContent =
      emergency.stepCount > 1
        ? `STEP ${(emergency.stepIndex || 0) + 1}/${emergency.stepCount} | ${emergencySession.progress}/${emergencySession.required}`
        : `${emergencySession.progress}/${emergencySession.required}`;

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
    renderBattleScene(engine, battleSceneState);
    renderWeaponVisibility(engine);
    renderChoiceBox(engine, handlePathChoice, interactionLocked);
    renderShopBox(engine, interactionLocked, handleShopBuy, handleShopSell, handleShopContinue);
    renderContinueBox(engine, interactionLocked, handleContinueLevel);
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
    playCombatActionSfx(actionKey, events);
    playDerivedCombatSfx(events);
    triggerBattleFx(actionKey, events);
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

  async function handleContinueLevel() {
    if (isInteractionLocked() || !canContinueToNextLevel(engine)) return;

    locked = true;
    renderAll();
    const nextLevelEvents = engine.advanceToNextLevel();
    await runAndRender(nextLevelEvents);
    await postLevelFlow();
    locked = false;
    renderAll();
  }

  function registerEmergencyPress() {
    if (isInteractionLocked() || !engine.hasEmergency() || !emergencySession.active) return;

    playSfxAudio(buttonClickAudio);
    emergencySession.progress += 1;
    renderEmergencyBox();

    if (emergencySession.progress >= emergencySession.required) {
      handleEmergencyResolution(true);
    }
  }

  function handleEmergencyKeydown(event) {
    if (!engine.hasEmergency() || !emergencySession.active) return;
    if (event.repeat) return;
    if (event.key.toUpperCase() !== emergencySession.key) return;

    event.preventDefault();
    registerEmergencyPress();
  }

  const attackBtn = $("#attack-btn");
  const defendBtn = $("#defend-btn");
  const inventoryBtn = $("#inventory-btn");
  const saveBtn = $("#save-btn");
  const statsBtn = $("#stats-btn");
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
  const statsBackBtn = $("#stats-back-btn");

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

        if (result.ok) {
          playSaveBeep();
        } else {
          playErrorBeep();
        }

        appendCombatLog(message);
        if (storyText) {
          storyText.textContent = message;
        }
      } catch (error) {
        console.error("Save failed:", error);
        playErrorBeep();
        appendCombatLog("Save failed.");
        if (storyText) {
          storyText.textContent = "Save failed.";
        }
      }
    });
  }

  if (statsBtn) {
    statsBtn.addEventListener("click", () => {
      showStatsActions();
      renderAll();
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

  if (statsBackBtn) {
    statsBackBtn.addEventListener("click", () => {
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
