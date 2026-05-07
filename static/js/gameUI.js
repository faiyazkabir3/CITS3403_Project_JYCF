import { createCombatEngine } from "./combat-engine.js";
import {
  ENEMY_VISUALS,
  FX_VISUALS,
  OVERLAY_VISUALS,
  SPECIAL_VISUALS,
  getPlayerVisual,
  getLevelVisual
} from "./visuals.js";
import { createTutorialGuide } from "./tutorialGuide.js";

const STORAGE_KEY = "shadows_audio_settings";
const SAVE_BEEP_SOUND = "/static/audio/sfx/system/save_beep.mp3";
const ERROR_BEEP_SOUND = "/static/audio/sfx/system/error_beep.mp3";
const WARNING_BEEP_SOUND = "/static/audio/sfx/system/warning_beep.mp3";
const SUCCESS_SOUND = "/static/audio/sfx/system/success.mp3";
const FAIL_SOUND = "/static/audio/sfx/system/fail.mp3";
const BUTTON_CLICK_SOUND = "/static/audio/sfx/ui/button_click.mp3";
const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
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
const UI_ICON_ROOT = "/static/images/ui";
const LOADOUT_ICON_SRC = {
  heart: `${UI_ICON_ROOT}/icon_heart.svg`,
  shield: `${UI_ICON_ROOT}/icon_shield.svg`,
  pistol: `${UI_ICON_ROOT}/icon_pistol.svg`,
  coin: `${UI_ICON_ROOT}/icon_coin.svg`,
  medkit: `${UI_ICON_ROOT}/icon_medkit.svg`,
  rifle: `${UI_ICON_ROOT}/icon_rifle.svg`,
  knife: `${UI_ICON_ROOT}/icon_knife.svg`,
  grenade: `${UI_ICON_ROOT}/icon_grenade.svg`,
  ammo: `${UI_ICON_ROOT}/icon_ammo.svg`,
  infinity: `${UI_ICON_ROOT}/icon_infinity.svg`,
  sidearm: `${UI_ICON_ROOT}/icon_sidearm.svg`,
  axe: `${UI_ICON_ROOT}/icon_axe.svg`
};
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

function getTextElements(target) {
  return (Array.isArray(target) ? target : [target]).filter(Boolean);
}

function setTextContent(elements, text) {
  elements.forEach((element) => {
    element.textContent = text;
  });
}

function createTextPlaybackController() {
  return {
    active: false,
    fastForwarding: false,
    skipRequested: false,

    start() {
      this.active = true;
      this.skipRequested = false;
      this.fastForwarding = false;
    },

    stop() {
      this.active = false;
      this.skipRequested = false;
      this.fastForwarding = false;
    },

    setFastForwarding(isFastForwarding) {
      if (!this.active) {
        this.fastForwarding = false;
        return;
      }

      this.fastForwarding = isFastForwarding;
    },

    requestSkip() {
      if (this.active) {
        this.skipRequested = true;
      }
    },

    getDelay(baseDelay) {
      return this.fastForwarding ? Math.max(1, baseDelay / 2) : baseDelay;
    }
  };
}

async function sleepWithPlayback(baseDelay, playbackController, isStale = () => false) {
  let remaining = baseDelay;

  while (remaining > 0) {
    if (isStale()) return "stale";
    if (playbackController?.skipRequested) return "skip";

    const delay = Math.min(playbackController?.getDelay(remaining) ?? remaining, 40);
    await sleep(delay);
    remaining -= playbackController?.fastForwarding ? delay * 2 : delay;
  }

  return "done";
}

async function typeWriter(target, text, speed = 24, isStale = () => false, playbackController = null) {
  const elements = (Array.isArray(target) ? target : [target]).filter(Boolean);
  if (elements.length === 0) return;

  setTextContent(elements, "");

  for (let i = 0; i < text.length; i += 1) {
    if (isStale()) return "stale";
    if (playbackController?.skipRequested) {
      setTextContent(elements, text);
      return "skip";
    }

    setTextContent(elements, `${elements[0].textContent}${text[i]}`);

    const sleepResult = await sleepWithPlayback(speed, playbackController, isStale);
    if (sleepResult !== "done") {
      if (sleepResult === "skip") {
        setTextContent(elements, text);
      }
      return sleepResult;
    }
  }

  return "done";
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

async function playEventSequence(
  element,
  events,
  speed = 24,
  pause = 460,
  isStale = () => false,
  playbackController = null
) {
  if (!events || events.length === 0) return;

  const elements = getTextElements(element);

  for (let index = 0; index < events.length; index += 1) {
    if (isStale()) return;
    const eventText = events[index];
    const typeResult = await typeWriter(elements, eventText, speed, isStale, playbackController);
    if (isStale()) return;
    appendCombatLog(eventText);

    if (typeResult === "skip" || playbackController?.skipRequested) {
      for (let remainingIndex = index + 1; remainingIndex < events.length; remainingIndex += 1) {
        const remainingText = events[remainingIndex];
        setTextContent(elements, remainingText);
        appendCombatLog(remainingText);
      }

      if (playbackController) {
        playbackController.skipRequested = false;
      }

      return;
    }

    const pauseResult = await sleepWithPlayback(pause, playbackController, isStale);
    if (pauseResult === "skip") {
      for (let remainingIndex = index + 1; remainingIndex < events.length; remainingIndex += 1) {
        const remainingText = events[remainingIndex];
        setTextContent(elements, remainingText);
        appendCombatLog(remainingText);
      }

      if (playbackController) {
        playbackController.skipRequested = false;
      }

      return;
    }
  }
}

function isGameOver(engine) {
  return engine.state.progression.gameOver || engine.state.inventory.health <= 0;
}

const ACTION_GROUP_IDS = ["main-actions", "attack-actions", "inventory-actions", "stats-actions"];
const ACTIVE_WEAPON_ACTIONS = {
  pistol: "pistol",
  reloadPistol: "pistol",
  rifle: "rifle",
  reloadRifle: "rifle",
  knife: "knife",
  grenade: "grenade"
};
const ACTION_PANEL_TITLES = {
  "main-actions": "ACTIONS",
  "attack-actions": "ACTIONS",
  "inventory-actions": "ACTIONS",
  "stats-actions": "PLAYER ITEMS"
};

function showActionGroup(groupId) {
  const title = document.getElementById("action-panel-title");

  ACTION_GROUP_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = id === groupId ? "" : "none";
    }
  });

  if (title) {
    title.textContent = ACTION_PANEL_TITLES[groupId] || "ACTIONS";
  }
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

function getHealthState(inventory) {
  const ratio = inventory.maxHealth > 0 ? inventory.health / inventory.maxHealth : 0;

  if (ratio <= 0.15) {
    return "critical";
  }

  if (ratio <= 0.3) {
    return "low";
  }

  return "normal";
}

function getShieldStatusText(state) {
  if (!state.shield.hasShield || state.shield.maxDurability <= 0) {
    return "NONE";
  }

  return `${state.shield.equipped ? "ON" : "OFF"} ${state.shield.durability}/${state.shield.maxDurability}`;
}

function createPlayerStatItem(label, value) {
  const item = document.createElement("div");
  item.className = "player-stat-item";

  const itemLabel = document.createElement("span");
  itemLabel.className = "player-stat-label";
  itemLabel.textContent = label;

  const itemValue = document.createElement("strong");
  itemValue.className = "player-stat-value";
  itemValue.textContent = value;

  item.append(itemLabel, itemValue);
  return item;
}

function createLoadoutChip({
  weaponKey,
  icon,
  counterIcon,
  value,
  active = false,
  low = false,
  empty = false,
  tutorialHighlighted = false,
  ariaLabel
}) {
  const chip = document.createElement("div");
  chip.className = "battle-loadout-chip";
  chip.dataset.weapon = weaponKey;
  chip.dataset.active = active ? "true" : "false";
  chip.dataset.low = low ? "true" : "false";
  chip.dataset.empty = empty ? "true" : "false";
  chip.dataset.tutorialHighlight = tutorialHighlighted ? "true" : "false";
  chip.setAttribute("aria-label", ariaLabel);
  chip.title = ariaLabel;

  const weaponIcon = document.createElement("img");
  weaponIcon.className = "battle-loadout-icon";
  weaponIcon.src = icon;
  weaponIcon.alt = "";
  weaponIcon.setAttribute("aria-hidden", "true");

  const countWrap = document.createElement("span");
  countWrap.className = "battle-loadout-count";

  if (counterIcon) {
    const countIcon = document.createElement("img");
    countIcon.className = "battle-loadout-count-icon";
    countIcon.src = counterIcon;
    countIcon.alt = "";
    countIcon.setAttribute("aria-hidden", "true");
    countWrap.append(countIcon);
  }

  const countValue = document.createElement("strong");
  countValue.className = "battle-loadout-count-value";
  countValue.textContent = value;

  countWrap.append(countValue);
  chip.append(weaponIcon, countWrap);
  return chip;
}

function buildPlayerLoadout(state, activeWeaponKey, tutorialLoadoutHighlights = []) {
  const tutorialHighlights = new Set(tutorialLoadoutHighlights);
  const chips = [
    {
      weaponKey: "pistol",
      icon: LOADOUT_ICON_SRC.pistol,
      counterIcon: LOADOUT_ICON_SRC.ammo,
      value: `${state.pistol.ammoInGun}/${state.pistol.magCapacity}`,
      low: state.pistol.ammoInGun > 0 && state.pistol.ammoInGun <= 3,
      empty: state.pistol.ammoInGun <= 0,
      ariaLabel: `Pistol ammo ${state.pistol.ammoInGun} of ${state.pistol.magCapacity}`
    },
    {
      weaponKey: "coins",
      icon: LOADOUT_ICON_SRC.coin,
      value: `${state.inventory.coins}`,
      ariaLabel: `Coins ${state.inventory.coins}`
    },
    {
      weaponKey: "medkit",
      icon: LOADOUT_ICON_SRC.medkit,
      value: `${state.inventory.medKits}`,
      empty: state.inventory.medKits <= 0,
      ariaLabel: `Medkits remaining ${state.inventory.medKits}`
    }
  ];

  if (state.rifle.owned) {
    chips.push({
      weaponKey: "rifle",
      icon: LOADOUT_ICON_SRC.rifle,
      counterIcon: LOADOUT_ICON_SRC.ammo,
      value: `${state.rifle.ammoInGun}/${state.rifle.magCapacity}`,
      low: state.rifle.ammoInGun > 0 && state.rifle.ammoInGun <= 3,
      empty: state.rifle.ammoInGun <= 0,
      ariaLabel: `Rifle ammo ${state.rifle.ammoInGun} of ${state.rifle.magCapacity}`
    });
  }

  chips.push(
    {
      weaponKey: "knife",
      icon: LOADOUT_ICON_SRC.knife,
      counterIcon: LOADOUT_ICON_SRC.infinity,
      value: "\u221E",
      ariaLabel: "Knife ready with infinite use"
    },
    {
      weaponKey: "grenade",
      icon: LOADOUT_ICON_SRC.grenade,
      counterIcon: LOADOUT_ICON_SRC.ammo,
      value: `${state.inventory.grenades}`,
      empty: state.inventory.grenades <= 0,
      ariaLabel: `Grenades remaining ${state.inventory.grenades}`
    }
  );

  if (state.relics?.quiteSidearm?.owned) {
    chips.push({
      weaponKey: "sidearm",
      icon: LOADOUT_ICON_SRC.sidearm,
      counterIcon: LOADOUT_ICON_SRC.ammo,
      value: `${state.relics.quiteSidearm.ammo}/${state.relics.quiteSidearm.maxAmmo}`,
      low: state.relics.quiteSidearm.ammo > 0 && state.relics.quiteSidearm.ammo <= 3,
      empty: state.relics.quiteSidearm.ammo <= 0,
      ariaLabel: `Parry sidearm ammo ${state.relics.quiteSidearm.ammo} of ${state.relics.quiteSidearm.maxAmmo}`
    });
  }

  if (state.relics?.leonAxe?.owned) {
    chips.push({
      weaponKey: "axe",
      icon: LOADOUT_ICON_SRC.axe,
      counterIcon: LOADOUT_ICON_SRC.ammo,
      value: `${state.relics.leonAxe.sharpenCharges}/${state.relics.leonAxe.maxSharpenCharges}`,
      empty: state.relics.leonAxe.sharpenCharges <= 0,
      ariaLabel: `Axe sharpen charges ${state.relics.leonAxe.sharpenCharges} of ${state.relics.leonAxe.maxSharpenCharges}`
    });
  }

  return chips.map((chip) => ({
    ...chip,
    active: chip.weaponKey === activeWeaponKey,
    tutorialHighlighted: tutorialHighlights.has(chip.weaponKey)
  }));
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
    const requestedSrc = imageEl.dataset.requestedSrc || "";

    if (requestedSrc && imageEl.dataset.retrySrc !== requestedSrc) {
      imageEl.dataset.retrySrc = requestedSrc;
      const separator = requestedSrc.includes("?") ? "&" : "?";
      imageEl.src = `${requestedSrc}${separator}retry=${Date.now()}`;
      return;
    }

    delete imageEl.dataset.currentSrc;
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
    delete imageEl.dataset.requestedSrc;
    delete imageEl.dataset.currentSrc;
    delete imageEl.dataset.retrySrc;
    imageEl.hidden = true;
    fallbackEl.hidden = false;
    return;
  }

  if (imageEl.dataset.requestedSrc !== src) {
    imageEl.dataset.requestedSrc = src;
    imageEl.dataset.currentSrc = src;
    delete imageEl.dataset.retrySrc;
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

function renderBattleScene(engine, battleSceneState, tutorialCue = null) {
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
  const playerResources = $("#battle-player-resources");
  const playerHealthRow = $("#battle-player-health-row");
  const playerShieldRow = $("#battle-player-shield-row");
  const playerHealthText = $("#battle-player-health-text");
  const playerShieldText = $("#battle-player-shield-text");
  const playerLoadout = $("#battle-player-loadout");
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

  if (playerResources) {
    const healthState = getHealthState(state.inventory);
    playerResources.dataset.healthState = healthState;
  }

  if (playerHealthRow) {
    playerHealthRow.dataset.low = getHealthState(state.inventory) === "normal" ? "false" : "true";
  }

  if (playerHealthText) {
    playerHealthText.textContent = `${state.inventory.health}/${state.inventory.maxHealth}`;
  }

  if (playerShieldRow) {
    playerShieldRow.dataset.empty =
      !state.shield.hasShield || state.shield.maxDurability <= 0 || state.shield.durability <= 0 ? "true" : "false";
  }

  if (playerShieldText) {
    playerShieldText.textContent = getShieldStatusText(state);
  }

  if (playerLoadout) {
    playerLoadout.replaceChildren();

    buildPlayerLoadout(state, battleSceneState.activeWeaponKey, tutorialCue?.loadoutHighlights || []).forEach((chipConfig) => {
      playerLoadout.appendChild(createLoadoutChip(chipConfig));
    });
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

  const topLeft = $(".top-left");
  if (topLeft && currentLevel) {
    topLeft.textContent = `LEVEL ${currentLevel.id} - ${currentLevel.title}`;
  }

  const statusText = [
    state.status.poisonTurns > 0 ? `POISON ${state.status.poisonTurns}` : null,
    state.status.corrosionTurns > 0 ? `CORROSION ${state.status.corrosionTurns}` : null
  ]
    .filter(Boolean)
    .join(" / ") || "CLEAR";

  const statsGrid = $("#player-stats-grid");
  if (statsGrid) {
    const items = [
      ["PERK", state.player.perkName],
      ["COINS", `${state.inventory.coins}`],
      ["MEDKITS", `${state.inventory.medKits}`],
      ["PISTOL BAG", `${state.pistol.ammoInBag}`]
    ];

    if (state.rifle.owned) {
      items.push(["RIFLE BAG", `${state.rifle.ammoInBag}`]);
    }

    items.push(
      ["AGI / COUR", `${state.stats.agility} / ${state.stats.courage}`],
      ["DODGE / CRIT", `${formatPercent(derived.dodgeChance)} / ${formatPercent(derived.critChance)}`],
      ["ARMOUR CUT", `${formatPercent(derived.armourReduction)}`],
      ["STATUS", isGameOver(engine) ? "DEAD" : statusText]
    );

    statsGrid.replaceChildren(...items.map(([label, value]) => createPlayerStatItem(label, value)));
  }
}

function renderWeaponVisibility(engine) {
  const rifleOwned = engine.state.rifle.owned;
  const shieldOwned = engine.state.shield.hasShield;
  const rifleBtn = $("#rifle-btn");
  const reloadRifleBtn = $("#reload-rifle-btn");
  const pistolBtn = $("#pistol-btn");
  const reloadBtn = $("#reload-btn");
  const medkitBtn = $("#medkit-btn");
  const shieldBtn = $("#shield-btn");

  if (rifleBtn) {
    rifleBtn.style.display = rifleOwned ? "" : "none";
  }

  if (pistolBtn) {
    pistolBtn.style.gridColumn = rifleOwned ? "" : "1 / -1";
  }

  if (reloadRifleBtn) {
    reloadRifleBtn.style.display = rifleOwned ? "" : "none";
  }

  if (reloadBtn) {
    reloadBtn.style.gridColumn = rifleOwned ? "" : "1 / -1";
  }

  if (shieldBtn) {
    shieldBtn.style.display = shieldOwned ? "" : "none";
  }

  if (medkitBtn) {
    medkitBtn.style.gridColumn = shieldOwned ? "" : "1 / -1";
  }
}

const TUTORIAL_ACTION_BUTTON_IDS = [
  "attack-btn",
  "defend-btn",
  "inventory-btn",
  "stats-btn",
  "save-btn",
  "pistol-btn",
  "rifle-btn",
  "knife-btn",
  "grenade-btn",
  "attack-back-btn",
  "reload-btn",
  "reload-rifle-btn",
  "medkit-btn",
  "shield-btn",
  "inventory-back-btn",
  "stats-back-btn"
];

const ACTION_GROUP_BACK_BUTTONS = {
  "attack-actions": "attack-back-btn",
  "inventory-actions": "inventory-back-btn",
  "stats-actions": "stats-back-btn"
};

function getVisibleActionGroupId() {
  return ACTION_GROUP_IDS.find((id) => {
    const element = document.getElementById(id);
    return element && window.getComputedStyle(element).display !== "none";
  }) || "main-actions";
}

function getAllowedTutorialButtonIds(tutorialCue) {
  if (!tutorialCue?.requiredAction) return null;

  const visibleGroupId = getVisibleActionGroupId();

  if (visibleGroupId === "main-actions") {
    if (tutorialCue.requiredGroup === "attack") return new Set(["attack-btn"]);
    if (tutorialCue.requiredGroup === "inventory") return new Set(["inventory-btn"]);
    return new Set([tutorialCue.requiredButtonId].filter(Boolean));
  }

  if (visibleGroupId === `${tutorialCue.requiredGroup}-actions`) {
    return new Set([tutorialCue.requiredButtonId].filter(Boolean));
  }

  return new Set([ACTION_GROUP_BACK_BUTTONS[visibleGroupId]].filter(Boolean));
}

function applyTutorialActionState(tutorialCue) {
  const highlightedButtons = new Set(tutorialCue?.buttonHighlights || []);
  const allowedButtons = getAllowedTutorialButtonIds(tutorialCue);

  TUTORIAL_ACTION_BUTTON_IDS.forEach((id) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.classList.toggle("is-tutorial-highlighted", highlightedButtons.has(id));

    if (allowedButtons && !allowedButtons.has(id)) {
      button.disabled = true;
    }
  });

  const healthRow = $("#battle-player-health-row");
  if (healthRow) {
    healthRow.dataset.tutorialHighlight = tutorialCue?.highlightHealth ? "true" : "false";
  }
}

function renderTutorialGuide(tutorialCue, onSkip) {
  const guide = $("#tutorial-guide");
  const guideText = $("#tutorial-guide-text");
  const skipButton = $("#tutorial-guide-skip-btn");

  if (!guide || !guideText) return;

  if (!tutorialCue) {
    guide.hidden = true;
    guide.dataset.cue = "";
    guideText.textContent = "";
    return;
  }

  guide.hidden = false;
  guide.dataset.cue = tutorialCue.id;
  guide.dataset.complete = tutorialCue.complete ? "true" : "false";
  guideText.textContent = tutorialCue.text;

  if (skipButton) {
    skipButton.onclick = () => {
      onSkip();
    };
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
  const inventorySummary = $("#shop-inventory-summary");
  const continueBtn = $("#shop-continue-btn");
  if (!shopBox || !buyButtons || !sellButtons || !continueBtn) return;

  const gameMain = shopBox.closest(".game-main");

  if (!engine.isShopOpen() || isGameOver(engine)) {
    gameMain?.classList.remove("shop-open");
    shopBox.style.display = "none";
    buyButtons.innerHTML = "";
    sellButtons.innerHTML = "";
    if (inventorySummary) {
      inventorySummary.innerHTML = "";
    }
    return;
  }

  const coins = engine.state.inventory.coins;
  const { inventory, pistol, rifle } = engine.state;
  const pistolTotalAmmo = pistol.ammoInGun + pistol.ammoInBag;
  const rifleTotalAmmo = rifle.ammoInGun + rifle.ammoInBag;
  gameMain?.classList.add("shop-open");
  shopBox.style.display = "flex";
  buyButtons.innerHTML = "";
  sellButtons.innerHTML = "";

  if (inventorySummary) {
    inventorySummary.innerHTML = `
      <span>Total pistol ammo with you: ${pistolTotalAmmo}</span>
      <span>Total rifle ammo with you: ${rifle.owned ? rifleTotalAmmo : "no rifle"}</span>
      <span>Grenades with you: ${inventory.grenades}</span>
      <span>Medkits with you: ${inventory.medKits}</span>
    `;
  }

  engine.getShopInventory().forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-btn";
    button.disabled = locked || item.disabled || coins < item.cost;
    button.innerHTML = `
      <span class="choice-title">${item.label} - ${item.cost}C</span>
      <span class="choice-desc">${item.description}</span>
      ${item.resourceLine ? `<span class="choice-desc shop-resource-line">${item.resourceLine}</span>` : ""}
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

function getCsrfToken() {
  return csrfTokenMeta?.content || "";
}

async function saveGameToBackend(engine) {
  const payload = buildSavePayload(engine);
  const csrfToken = getCsrfToken();
  const response = await fetch("/save-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {})
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
  savedState = null,
  tutorialGuideActive = false
} = {}) {
  const engine = createCombatEngine({
    difficulty: difficultyText,
    character: selectedCharacter,
    savedState
  });
  const tutorialGuide = createTutorialGuide({
    active: tutorialGuideActive && !savedState
  });

  const storyText = $("#story-text");
  const shopStoryText = $("#shop-story-text");
  const storySkipBtn = $("#story-skip-btn");
  const shopStorySkipBtn = $("#shop-story-skip-btn");
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
  const textPlaybackController = createTextPlaybackController();
  const battleSceneState = {
    lastActionKey: "idle",
    activeWeaponKey: "pistol",
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

  function updateActiveWeapon(actionKey) {
    const activeWeaponKey = ACTIVE_WEAPON_ACTIONS[actionKey];

    if (activeWeaponKey) {
      battleSceneState.activeWeaponKey = activeWeaponKey;
    }
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

  function setStoryText(text) {
    if (storyText) {
      storyText.textContent = text;
    }

    if (shopStoryText) {
      shopStoryText.textContent = text;
    }
  }

  function updateMissionSkipControls() {
    [storySkipBtn, shopStorySkipBtn].forEach((button) => {
      if (!button) return;

      button.disabled = !isAnimatingEvents;
      button.classList.toggle("is-fast-forwarding", textPlaybackController.fastForwarding);
    });
  }

  function areMainActionsLocked() {
    return (
      isGameOver(engine) ||
      isInteractionLocked() ||
      engine.hasEmergency() ||
      engine.isShopOpen() ||
      engine.hasChoices()
    );
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
      ["stats-btn", lockedOut],
      ["pistol-btn", dead || interactionLocked || !inCombat],
      ["rifle-btn", dead || interactionLocked || !inCombat || !engine.state.rifle.owned],
      ["knife-btn", dead || interactionLocked || !inCombat],
      ["grenade-btn", dead || interactionLocked || !inCombat],
      ["attack-back-btn", dead || interactionLocked || emergencyActive],
      ["reload-btn", dead || interactionLocked || emergencyActive],
      ["reload-rifle-btn", dead || interactionLocked || emergencyActive || !engine.state.rifle.owned],
      ["medkit-btn", dead || interactionLocked || emergencyActive],
      ["shield-btn", dead || interactionLocked || emergencyActive || !engine.state.shield.hasShield],
      ["inventory-back-btn", dead || interactionLocked || emergencyActive],
      ["stats-back-btn", dead || interactionLocked || emergencyActive]
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
    const bothShopAndChoicesOpen = engine.isShopOpen() && engine.hasChoices();
    const gameMain = document.querySelector(".game-main");
    const tutorialCue = tutorialGuide.getCue(engine);

    if (gameMain) {
      gameMain.classList.toggle("shop-choice-scroll", bothShopAndChoicesOpen);
    }

    renderStats(engine);
    renderBattleScene(engine, battleSceneState, tutorialCue);
    renderWeaponVisibility(engine);
    renderChoiceBox(engine, handlePathChoice, interactionLocked);
    renderShopBox(engine, interactionLocked, handleShopBuy, handleShopSell, handleShopContinue);
    renderContinueBox(engine, interactionLocked, handleContinueLevel);
    renderEmergencyBox();
    updateActionAvailability();
    applyTutorialActionState(tutorialCue);
    renderTutorialGuide(tutorialCue, () => {
      tutorialGuide.skip();
      renderAll();
    });
    updateMissionSkipControls();
  }

  async function runAndRender(events) {
    const renderId = ++storyRenderId;
    isAnimatingEvents = true;
    textPlaybackController.start();
    renderAll();
    await playEventSequence(
      [storyText, shopStoryText],
      events,
      24,
      460,
      () => renderId !== storyRenderId,
      textPlaybackController
    );

    if (renderId !== storyRenderId) {
      return;
    }

    isAnimatingEvents = false;
    textPlaybackController.stop();
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
    if (!tutorialGuide.canPerformAction(actionKey, engine)) {
      renderAll();
      return;
    }

    locked = true;
    updateActiveWeapon(actionKey);
    renderAll();
    const events = engine.dispatch(actionKey);
    tutorialGuide.recordAction(actionKey, engine);
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

  function bindMissionSkipButton(button) {
    if (!button) return;

    let pointerStartedAt = 0;
    let pointerActive = false;
    let suppressNextClick = false;

    const stopFastForwarding = () => {
      if (!pointerActive) return;

      pointerActive = false;
      if (performance.now() - pointerStartedAt > 180) {
        suppressNextClick = true;
      }

      textPlaybackController.setFastForwarding(false);
      updateMissionSkipControls();
    };

    button.addEventListener("pointerdown", (event) => {
      if (button.disabled) return;

      pointerStartedAt = performance.now();
      pointerActive = true;
      textPlaybackController.setFastForwarding(true);
      updateMissionSkipControls();

      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; the button still works without it.
      }
    });

    button.addEventListener("pointerup", stopFastForwarding);
    button.addEventListener("pointercancel", stopFastForwarding);
    button.addEventListener("pointerleave", stopFastForwarding);

    button.addEventListener("click", () => {
      if (button.disabled) return;

      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      textPlaybackController.requestSkip();
      updateMissionSkipControls();
    });
  }

  function isEditableTarget(target) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable
    );
  }

  const shiftSkipState = {
    active: false,
    startedAt: 0
  };

  function handleMissionSkipKeydown(event) {
    if (event.code !== "ShiftLeft") return;
    if (event.repeat || isEditableTarget(event.target) || !textPlaybackController.active) return;

    event.preventDefault();
    shiftSkipState.active = true;
    shiftSkipState.startedAt = performance.now();
    textPlaybackController.setFastForwarding(true);
    updateMissionSkipControls();
  }

  function handleMissionSkipKeyup(event) {
    if (event.code !== "ShiftLeft" || !shiftSkipState.active) return;

    event.preventDefault();
    shiftSkipState.active = false;
    textPlaybackController.setFastForwarding(false);

    if (textPlaybackController.active && performance.now() - shiftSkipState.startedAt <= 180) {
      textPlaybackController.requestSkip();
    }

    updateMissionSkipControls();
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

  bindMissionSkipButton(storySkipBtn);
  bindMissionSkipButton(shopStorySkipBtn);

  if (attackBtn) {
    attackBtn.addEventListener("click", () => {
      if (areMainActionsLocked()) return;
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
      if (areMainActionsLocked()) return;
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
        setStoryText(message);
      } catch (error) {
        console.error("Save failed:", error);
        playErrorBeep();
        appendCombatLog("Save failed.");
        setStoryText("Save failed.");
      }
    });
  }

  if (statsBtn) {
    statsBtn.addEventListener("click", () => {
      if (areMainActionsLocked()) return;
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
  window.addEventListener("keydown", handleMissionSkipKeydown);
  window.addEventListener("keyup", handleMissionSkipKeyup);

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
