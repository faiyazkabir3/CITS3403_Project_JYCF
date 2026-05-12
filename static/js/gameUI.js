import { createCombatEngine } from "./combat-engine.js";
import {
  BOSS_SCENE_VISUALS,
  ENEMY_VISUALS,
  FX_VISUALS,
  OVERLAY_VISUALS,
  SPECIAL_VISUALS,
  getPlayerVisual,
  getLevelVisual
} from "./visuals.js";
import { createTutorialGuide } from "./tutorialGuide.js";

import { t } from "./translation.js";

function getTranslatedField(object, field) {
  const key = object?.[`${field}Key`];
  return key ? t(key) : object?.[field] || "";
}

function translateEnemyName(enemyName) {
  const enemyMap = {
    "Fast Zombie": "enemy.fastZombie",
    "Heavy Zombie": "enemy.heavyZombie",
    "Spitter Zombie": "enemy.spitterZombie",
    "Charger Zombie": "enemy.chargerZombie",
    "Screamer Zombie": "enemy.screamerZombie",
    "Exploder Zombie": "enemy.exploderZombie",
    "Berserker Zombie": "enemy.berserkerZombie",
    "Nemesis-T Type": "enemy.nemesisTType"
  };

  return enemyMap[enemyName] ? t(enemyMap[enemyName]) : enemyName;
}

function translateShopItemName(itemName) {
  const itemMap = {
    "MEDKIT": "shop.item.medkit",
    "PISTOL MAG": "shop.item.pistolMag",
    "RIFLE": "shop.item.rifle",
    "RIFLE MAG": "shop.item.rifleMag",
    "ARMOUR": "shop.item.armour",
    "SHIELD REPAIR": "shop.item.shieldRepair",
    "AXE SHARPEN": "shop.item.axeSharpen"
  };

  return itemMap[itemName] ? t(itemMap[itemName]) : itemName;
}

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

  if (actionKey === "dodge" || actionKey === "holdCover") {
    if (
      text.includes("prepared to dodge") ||
      text.includes("dodged successfully") ||
      text.includes("tried to dodge, but failed") ||
      text.includes("stays tucked")
    ) {
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
    tags.push(getTranslatedField(currentLevel, "title").toUpperCase());
  }

  tags.push(t("battle.tag.level", {
    level: state.progression.currentLevelId
  }));

  tags.push(t("battle.tag.difficulty", {
    difficulty: state.difficulty
  }));

  if (engine.hasEmergency()) {
    tags.push(state.combat.qte?.active ? t("battle.tag.qte") : t("battle.tag.emergency"));
  }

  if (state.combat.coverTurns > 0) {
    tags.push(t("battle.tag.hidden"));
  }

  if (engine.isShopOpen()) {
    tags.push(t("battle.tag.shopOnline"));
  }

  if (engine.hasChoices()) {
    tags.push(t("battle.tag.routeSelect"));
  }

  if (state.progression.levelComplete && !state.combat.inCombat) {
    tags.push(t("battle.tag.areaSecured"));
  }

  if (state.status.poisonTurns > 0) {
    tags.push(t("battle.tag.poison", {
      turns: state.status.poisonTurns
    }));
  }

  if (state.status.corrosionTurns > 0) {
    tags.push(t("battle.tag.corrosion", {
      turns: state.status.corrosionTurns
    }));
  }

  return tags;
}

function getEnemyTags(enemy) {
  if (!enemy) {
    return [t("battle.tag.noTarget")];
  }

  const tags = [enemy.type.toUpperCase()];

  if (enemy.rageActive) {
    tags.push(t("battle.tag.raging"));
  }

  if (enemy.stunnedTurns > 0) {
    tags.push(t("battle.tag.stunned", {
      turns: enemy.stunnedTurns
    }));
  }

  if (enemy.chargeReady) {
    tags.push(t("battle.tag.charging"));
  }

  if (enemy.type === "nemesisT") {
    tags.push(t("battle.tag.boss"));

    if (enemy.bossActionStep === 2) {
      tags.push(t("battle.tag.rushReady"));
    } else if (enemy.bossActionStep === 1) {
      tags.push(t("battle.tag.pressure"));
    }
  }

  if (enemy.poisonTurns > 0) {
    tags.push(t("battle.tag.acid", {
      turns: enemy.poisonTurns
    }));
  }

  if (enemy.corrosionTurns > 0) {
    tags.push(t("battle.tag.corrosive", {
      turns: enemy.corrosionTurns
    }));
  }

  if (enemy.summonAfterTurns && !enemy.summonedReinforcement) {
    tags.push(t("battle.tag.calling"));
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
    case "holdCover":
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
  const combatQte = state.combat.qte?.active ? state.combat.qte : null;
  const bossScene =
    combatQte?.scene === "boss-grab"
      ? "boss-grab"
      : enemy?.type === "nemesisT" && state.combat.coverTurns > 0
        ? "boss-hide"
        : enemy?.type === "nemesisT" && enemy.stunnedTurns > 0
          ? "boss-stunned"
          : "default";
  const bossSceneBackdrop =
    bossScene === "boss-grab"
      ? BOSS_SCENE_VISUALS.grab
      : bossScene === "boss-hide"
        ? BOSS_SCENE_VISUALS.hide
        : bossScene === "boss-stunned"
          ? BOSS_SCENE_VISUALS.stunned
          : "";
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
  stage.dataset.scene = bossScene;
  stage.dataset.effect = battleSceneState.effect || "idle";
  stage.dataset.impact = battleSceneState.impact ? "hit" : "idle";

  backdrop.style.setProperty("--battle-backdrop-image", `url("${bossSceneBackdrop || activeVisual.backdrop}")`);
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

  const translatedEnemyName = enemy ? translateEnemyName(enemy.name) : "";

  setBattleAsset(
    enemyImage,
    enemyFallback,
    enemyVisual?.image || "",
    enemy
      ? t("battle.enemyPortrait", { enemy: translatedEnemyName })
      : t("battle.noThreat"),
    enemy
      ? translatedEnemyName.toUpperCase()
      : t("battle.noContact")
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
    enemyName.textContent = enemy
      ? translateEnemyName(enemy.name).toUpperCase()
      : t("battle.noContact");
  }

  if (enemyMeta) {
    if (enemy) {
      const enemyStatus = enemy.rageActive
        ? t("battle.status.raging")
        : enemy.stunnedTurns > 0
          ? t("battle.status.stunned", { turns: enemy.stunnedTurns })
          : enemy.chargeReady
            ? t("battle.status.charging")
            : enemy.type === "nemesisT" && enemy.bossActionStep === 2
              ? t("battle.status.rushing")
              : enemy.type === "nemesisT" && enemy.bossActionStep === 1
                ? t("battle.status.pressuring")
                : t("battle.status.hostile");

      enemyMeta.textContent = `HP ${Math.max(enemy.hp, 0)}/${enemy.baseHp} | ${enemyStatus}`;
    } else {
      enemyMeta.textContent = t("battle.scanOnline");
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
    topLeft.textContent = `LEVEL ${currentLevel.id} - ${getTranslatedField(currentLevel, "title")}`;
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
      <span class="choice-title">${getTranslatedField(choice, "label")}</span>
      <span class="choice-desc">${getTranslatedField(choice, "description")}</span>
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
    nemesis_kills: state.analytics.nemesisKills,
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
      ["pistol", "rifle", "knife", "grenade", "reloadPistol", "reloadRifle", "heal", "dodge", "holdCover", "toggleShield"].includes(
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

  function translateEventForDisplay(eventText) {
    if (typeof eventText !== "string") {
     return eventText;
    }

    const currentLevel = engine.getCurrentLevel();

    if (currentLevel) {
      const translatedTitle = getTranslatedField(currentLevel, "title");

      if (eventText === `LEVEL ${currentLevel.id}: ${currentLevel.title}`) {
        return `LEVEL ${currentLevel.id}: ${translatedTitle}`;
      }

      const levelFields = ["description", "introText", "completeText"];

      for (const field of levelFields) {
        if (eventText === currentLevel[field]) {
          return getTranslatedField(currentLevel, field);
        }
      }

      const rewards = currentLevel.rewards || [];
      for (const reward of rewards) {
        if (eventText === reward.text) {
          return getTranslatedField(reward, "text");
        }
      }
    }

    let match = eventText.match(/^A (.+) appeared\. Enemy HP: (\d+)\.$/);
    if (match) {
      return t("combat.enemyAppeared", {
        enemy: translateEnemyName(match[1]),
        hp: match[2]
      });
    }

    match = eventText.match(/^(.+) cleared Level (.+)\.$/);
    if (match) {
      return t("combat.levelCleared", {
        character: match[1],
        level: match[2]
      });
    }

    match = eventText.match(/^(.+) collected (\d+) antique coin\.$/);
    if (match) {
      return t("combat.coinCollected", {
        character: match[1],
        amount: match[2]
      });
    }

    match = eventText.match(/^(.+) collected (\d+) antique coins\.$/);
    if (match) {
      return t("combat.coinsCollected", {
        character: match[1],
        amount: match[2]
      });
    }

    match = eventText.match(/^(.+) killed (.+)\.$/);
    if (match) {
      return t("combat.enemyKilled", {
        character: match[1],
        enemy: translateEnemyName(match[2])
      });
    }

    match = eventText.match(/^(.+) attacked with the knife and dealt (\d+) damage\.$/);
    if (match) {
      return t("combat.knifeAttack", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^(.+) fired the pistol and dealt (\d+) damage\.$/);
    if (match) {
      return t("combat.pistolAttack", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^(.+) fired the rifle and dealt (\d+) damage\.$/);
    if (match) {
      return t("combat.rifleAttack", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^(.+) threw a grenade and dealt (\d+) damage\.$/);
    if (match) {
      return t("combat.grenadeAttack", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^The (.+) hit (.+) for (\d+) damage\.$/);
    if (match) {
      return t("combat.enemyHitPlayer", {
        enemy: translateEnemyName(match[1]),
        character: match[2],
        damage: match[3]
      });
    }

    match = eventText.match(/^The (.+) is stunned by the close-range hit\.$/);
    if (match) {
      return t("combat.enemyStunnedClose", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^The (.+) is stunned and cannot act this turn\.$/);
    if (match) {
      return t("combat.enemyStunnedCannotAct", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^The (.+) missed (.+)\.$/);
    if (match) {
      return t("combat.enemyMissedPlayer", {
        enemy: translateEnemyName(match[1]),
        character: match[2]
      });
    }

    if (eventText === "Game saved successfully.") {
      return t("combat.saveSuccess");
    }

    if (eventText === "Save failed.") {
      return t("combat.saveFailed");
    }

    match = eventText.match(/^Starting stats: AGI (\d+) \| COUR (\d+)\.$/);
    if (match) {
      return t("combat.startingStats", {
        agility: match[1],
        courage: match[2]
      });
    }

    match = eventText.match(/^Current stats: AGI (\d+) \| COUR (\d+)\.$/);
    if (match) {
      return t("combat.currentStats", {
        agility: match[1],
        courage: match[2]
      });
    }

    match = eventText.match(/^(\d+) enemies remain in this level\.$/);
    if (match) {
      return t("combat.enemiesRemain", {
        count: match[1]
      });
    }

    match = eventText.match(/^(\d+) enemy remains in this level\.$/);
    if (match) {
      return t("combat.enemyRemain", {
        count: match[1]
      });
    }

    match = eventText.match(/^(.+) threw a grenade, but it fails to connect effectively\.$/);
    if (match) {
      return t("combat.grenadeMiss", {
        character: match[1]
      });
    }

    match = eventText.match(/^The (.+) plants its feet and lines up a rush\.$/);
    if (match) {
      return t("combat.chargerRushReady", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^The (.+) slips away from the pistol shot\.$/);
    if (match) {
      return t("combat.enemyDodgedShot", {
        enemy: translateEnemyName(match[1])
      });
    }

    if (eventText === "A shop terminal is available before you move on.") {
      return t("combat.shopAvailable");
    }

    if (eventText === "You step away from the shop terminal.") {
      return t("combat.shopClosed");
    }

    match = eventText.match(/^(.+) collected antique coins of (\d+)\.$/);
    if (match) {
      return t("combat.coinsCollected", {
        character: match[1],
        amount: match[2]
      });
    }

    match = eventText.match(/^(.+) bought (.+) for (\d+) coins\.$/);
    if (match) {
      return t("combat.boughtItem", {
        character: match[1],
        item: translateShopItemName(match[2]),
        cost: match[3]
      });
    }

    match = eventText.match(/^A (.+) is still in front of you\. Enemy HP: (\d+)\.$/);
    if (match) {
      return t("combat.enemyStillInFront", {
        enemy: translateEnemyName(match[1]),
        hp: match[2]
      });
    }

    match = eventText.match(/^(.+) resumed the saved game\.$/);
    if (match) {
      return t("combat.resumedSavedGame", {
        character: match[1]
      });
    }

    match = eventText.match(/^Enemies left in this level: (\d+)\.$/);
    if (match) {
      return t("combat.enemiesLeft", {
        count: match[1]
      });
    }

    match = eventText.match(/^Intermission status: SHOP (OPEN|CLOSED)\.$/);
    if (match) {
      return t("combat.intermissionStatus", {
        status: match[1]
      });
    }

    match = eventText.match(/^(.+) still needs to choose a route\.$/);
    if (match) {
      return t("combat.stillNeedsRoute", {
        character: match[1]
      });
    }

    match = eventText.match(/^(.+) lunges with the knife, but the attack fails to connect well\.$/);
    if (match) {
      return t("combat.knifeMiss", {
        character: match[1]
      });
    }

    match = eventText.match(/^(.+) took (\d+) damage in close combat\.$/);
    if (match) {
      return t("combat.closeCombatDamage", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^(.+) has no pistol ammo in the gun\.$/);
    if (match) {
      return t("combat.noPistolAmmoGun", { character: match[1] });
    }

    match = eventText.match(/^(.+) runs out of pistol ammo before the burst is complete\.$/);
    if (match) {
      return t("combat.pistolBurstAmmoEmpty", { character: match[1] });
    }

    match = eventText.match(/^(.+)'s pistol shot is a poor matchup and fails to land cleanly\.$/);
    if (match) {
      return t("combat.pistolPoorMatch", { character: match[1] });
    }

    if (eventText === "Quick and Swift triggers. Quite fires twice this turn.") {
      return t("combat.quickAndSwift");
    }

    match = eventText.match(/^(.+) does not own a rifle yet\.$/);
    if (match) {
      return t("combat.noRifleOwned", { character: match[1] });
    }

    match = eventText.match(/^(.+) has no rifle ammo in the magazine\.$/);
    if (match) {
      return t("combat.noRifleAmmoMagazine", { character: match[1] });
    }

    match = eventText.match(/^The (.+) jukes away from the rifle shot\.$/);
    if (match) {
      return t("combat.rifleDodgedShot", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^(.+)'s rifle shot lands poorly against this target\.$/);
    if (match) {
      return t("combat.riflePoorMatch", { character: match[1] });
    }

    match = eventText.match(/^(.+) fired the rifle for (\d+) damage(?: \(CRIT!\))?\.$/);
    if (match) {
      return t("combat.rifleAttackAlt", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^(.+) has no grenades left\.$/);
    if (match) return t("combat.noGrenades", { character: match[1] });

    match = eventText.match(/^(.+) has no med kits left\.$/);
    if (match) return t("combat.noMedkits", { character: match[1] });

    match = eventText.match(/^(.+) used a med kit and recovered to (\d+) HP\.$/);
    if (match) {
      return t("combat.usedMedkitRecovered", {
        character: match[1],
        hp: match[2]
      });
    }

    if (eventText === "Poison and corrosion are cleared.") {
      return t("combat.statusCleared");
    }

    match = eventText.match(/^(.+)'s pistol is already full\.$/);
    if (match) return t("combat.pistolAlreadyFull", { character: match[1] });

    match = eventText.match(/^(.+) has no pistol ammo left in the bag\.$/);
    if (match) return t("combat.noPistolAmmoBag", { character: match[1] });

    match = eventText.match(/^(.+) reloaded the pistol to (\d+)\/(\d+)\.$/);
    if (match) {
      return t("combat.reloadedPistol", {
        character: match[1],
        loaded: match[2],
        capacity: match[3]
      });
    }

    match = eventText.match(/^(.+)'s rifle is already full\.$/);
    if (match) return t("combat.rifleAlreadyFull", { character: match[1] });

    match = eventText.match(/^(.+) has no rifle ammo left in reserve\.$/);
    if (match) return t("combat.noRifleAmmoReserve", { character: match[1] });

    match = eventText.match(/^(.+) reloaded the rifle to (\d+)\/(\d+)\.$/);
    if (match) {
      return t("combat.reloadedRifle", {
        character: match[1],
        loaded: match[2],
        capacity: match[3]
      });
    }

    match = eventText.match(/^(.+) has no cover to hold right now\.$/);
    if (match) return t("combat.noCover", { character: match[1] });

    match = eventText.match(/^(.+) stays tucked behind the lab pillar and catches one clean breath\.$/);
    if (match) return t("combat.holdLabCover", { character: match[1] });

    match = eventText.match(/^(.+) has no shield available\.$/);
    if (match) return t("combat.noShield", { character: match[1] });

    if (eventText === "The shield is broken and must be repaired in the shop.") {
      return t("combat.shieldBrokenShop");
    }

    match = eventText.match(/^(.+) equipped the shield\.$/);
    if (match) return t("combat.equippedShield", { character: match[1] });

    match = eventText.match(/^(.+) unequipped the shield\.$/);
    if (match) return t("combat.unequippedShield", { character: match[1] });

    if (eventText === "Acid splashes across your gear. Poison and corrosion start ticking.") {
      return t("combat.acidDebuff");
    }

    match = eventText.match(/^(.+) suffers (\d+) poison damage\.$/);
    if (match) {
      return t("combat.poisonDamage", {
        character: match[1],
        damage: match[2]
      });
    }

    match = eventText.match(/^Acid corrodes the shield for (\d+) durability\.$/);
    if (match) {
      return t("combat.acidCorrodesShield", {
        amount: match[1]
      });
    }

    if (eventText === "The shield frame gives out completely.") {
      return t("combat.shieldFrameBreaks");
    }

    match = eventText.match(/^(.+)'s armour sizzles for (\d+) extra damage\.$/);
    if (match) {
      return t("combat.armourSizzles", {
        character: match[1],
        damage: match[2]
      });
    }

    if (eventText === "Leon's shield breaks and needs repairs at the shop.") {
      return t("combat.leonShieldBreaks");
    }

    match = eventText.match(/^The (.+) screams for help\. Another zombie rushes into the level\.$/);
    if (match) {
      return t("combat.screamerCallsHelp", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^The (.+) becomes enraged and starts moving even faster\.$/);
    if (match) {
      return t("combat.berserkerRage", {
        enemy: translateEnemyName(match[1])
      });
    }

    match = eventText.match(/^The (.+) crashes past you and is stunned for (\d+) turn\.$/);
    if (match) {
      return t("combat.chargerStunnedAfterDodge", {
        enemy: translateEnemyName(match[1]),
        turns: match[2]
      });
    }

    match = eventText.match(/^The (.+) crashes past you and is stunned for (\d+) turns\.$/);
    if (match) {
      return t("combat.chargerStunnedAfterDodges", {
        enemy: translateEnemyName(match[1]),
        turns: match[2]
      });
    }

    if (eventText === "A second clean dodge will leave the charger wide open.") {
      return t("combat.secondDodgeHint");
    }

    match = eventText.match(/^The (.+) slams into (.+) for (\d+) damage and sends them skidding back\.$/);
    if (match) {
      return t("combat.chargerSlam", {
        enemy: translateEnemyName(match[1]),
        character: match[2],
        damage: match[3]
      });
    }

    if (eventText === "The shop is not available right now.") {
      return t("combat.shopUnavailable");
    }

    if (eventText === "That item is not in the shop.") {
      return t("combat.itemNotInShop");
    }

    match = eventText.match(/^(.+) cannot buy (.+) right now\.$/);
    if (match) {
      return t("combat.cannotBuyItem", {
        character: match[1],
      item: translateShopItemName(match[2]),
      });
    }

    match = eventText.match(/^(.+) needs (\d+) coins for (.+)\.$/);
    if (match) {
      return t("combat.needsCoins", {
        character: match[1],
        item: translateShopItemName(match[2]),
        cost: match[3]
      });
    }

    match = eventText.match(/^(.+) sold (.+) for (\d+) coins\.$/);
    if (match) {
      return t("combat.soldItem", {
        character: match[1],
        item: translateShopItemName(match[2]),
        value: match[3]
      });
    }

    match = eventText.match(/^(.+) has nothing valid to sell there\.$/);
    if (match) {
      return t("combat.nothingToSell", {
        character: match[1]
      });
    }

    if (eventText === "The shop is already closed.") {
      return t("combat.shopAlreadyClosed");
    }

    if (eventText === "You can shop before committing to the next route.") {
      return t("combat.canShopBeforeRoute");
    }

    match = eventText.match(/^Perk: (.+)$/);
    if (match) {
      return t("combat.perk", {
        perk: match[1]
      });
    }

    match = eventText.match(/^(.+) entered the mission\.$/);
    if (match) {
      return t("combat.enteredMission", {
        character: match[1]
      });
    }

    return eventText;
  }

  function translateEmergencyText(text) {
    const emergencyTextKeys = {
      "Seal the Relay Gate": "levels.4A.title.sealTheRelayGate",
      "A relay gate is stuck half-open. Press X or click before the horde floods the maintenance rail.": "emergency.sealRelayGatePrompt"
    };

    const key = emergencyTextKeys[text];
    return key ? t(key) : text;
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
    const coverActive = engine.state.combat.coverTurns > 0;
    const lockedOut = dead || interactionLocked || emergencyActive || shopOpen || waitingForChoice;

    const buttonStates = [
      ["attack-btn", dead || lockedOut || !inCombat || coverActive],
      ["defend-btn", dead || lockedOut || !inCombat],
      ["inventory-btn", dead || lockedOut],
      ["save-btn", interactionLocked || emergencyActive || coverActive],
      ["stats-btn", lockedOut || coverActive],
      ["pistol-btn", dead || interactionLocked || !inCombat || coverActive],
      ["rifle-btn", dead || interactionLocked || !inCombat || !engine.state.rifle.owned || coverActive],
      ["knife-btn", dead || interactionLocked || !inCombat || coverActive],
      ["grenade-btn", dead || interactionLocked || !inCombat || coverActive],
      ["attack-back-btn", dead || interactionLocked || emergencyActive],
      ["reload-btn", dead || interactionLocked || emergencyActive],
      ["reload-rifle-btn", dead || interactionLocked || emergencyActive || !engine.state.rifle.owned],
      ["medkit-btn", dead || interactionLocked || emergencyActive],
      ["shield-btn", dead || interactionLocked || emergencyActive || coverActive || !engine.state.shield.hasShield],
      ["inventory-back-btn", dead || interactionLocked || emergencyActive],
      ["stats-back-btn", dead || interactionLocked || emergencyActive]
    ];

    buttonStates.forEach(([id, disabled]) => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = disabled;
      }
    });

    const defendButton = document.getElementById("defend-btn");
    if (defendButton) {
      defendButton.textContent = coverActive ? "HOLD COVER" : "DEFEND";
    }

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

    const emergencyDisplayTitle = translateEmergencyText(
      emergency.stepCount > 1 ? emergency.sequenceTitle || emergency.title : emergency.title
    );

    const emergencyDisplayPrompt = translateEmergencyText(emergency.prompt);

    emergencyTitle.textContent = emergencyDisplayTitle;
    emergencyPrompt.textContent =
      emergency.stepCount > 1
        ? `${translateEmergencyText(emergency.title)}: ${emergencyDisplayPrompt}`
        : emergencyDisplayPrompt;
    emergencyKey.textContent = emergencySession.key;
    emergencyTimer.textContent = `${(remainingMs / 1000).toFixed(1)}s`;

    emergencyProgress.textContent =
      emergency.stepCount > 1
        ? t("emergency.stepProgress", {
            step: (emergency.stepIndex || 0) + 1,
            total: emergency.stepCount,
            progress: emergencySession.progress,
            required: emergencySession.required
          })
        : `${emergencySession.progress}/${emergencySession.required}`;

    if (emergencyActionBtn) {
      emergencyActionBtn.disabled = locked || !emergencySession.active;
      emergencyActionBtn.textContent = emergency.actionLabel || t("emergency.mash");
    }

    if (emergencyFailBtn) {
      emergencyFailBtn.disabled = locked || !emergencySession.active;
      emergencyFailBtn.textContent = emergency.abortLabel || t("emergency.abort");
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

    const displayEvents = events.map(translateEventForDisplay);
    
    await playEventSequence(
      [storyText, shopStoryText],
      displayEvents,
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

    if (
      engine.state.progression.levelComplete &&
      !engine.state.progression.gameWon &&
      !engine.getCurrentLevel()?.manualContinueAfterClear
    ) {
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
      await handleAction(engine.state.combat.coverTurns > 0 ? "holdCover" : "dodge");
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
        const displayMessage = translateEventForDisplay(message);

        if (result.ok) {
          playSaveBeep();
        } else {
          playErrorBeep();
        }

        appendCombatLog(displayMessage);
        setStoryText(displayMessage);
      } catch (error) {
        console.error("Save failed:", error);
        playErrorBeep();
        const displayMessage = translateEventForDisplay("Save failed.");
        appendCombatLog(displayMessage);
        setStoryText(displayMessage);
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

