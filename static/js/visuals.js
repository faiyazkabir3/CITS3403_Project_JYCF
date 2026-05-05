const IMAGE_ROOT = "/static/images";

export const PLAYER_VISUALS = {
  leon: {
    image: `${IMAGE_ROOT}/players/leon_idle.png`
  },
  quite: {
    image: `${IMAGE_ROOT}/players/quite_right_idle.png`,
    actions: {
      pistol: `${IMAGE_ROOT}/players/quite_right_gun.png`,
      rifle: `${IMAGE_ROOT}/players/quite_right_gun.png`,
      reloadPistol: `${IMAGE_ROOT}/players/quite_right_reload.png`,
      reloadRifle: `${IMAGE_ROOT}/players/quite_right_reload.png`,
      knife: `${IMAGE_ROOT}/players/quite_right_knife.png`,
      grenade: `${IMAGE_ROOT}/players/quite_right_grenade.png`,
      dodge: `${IMAGE_ROOT}/players/quite_right_dodge.png`,
      heal: `${IMAGE_ROOT}/players/quite_right_heal.png`
    }
  }
};

export const SPECIAL_VISUALS = {
  shop: {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_shop_terminal.png`,
    theme: "shop"
  }
};

export const ENEMY_VISUALS = {
  fast: {
    image: `${IMAGE_ROOT}/enemies/enemy_fast.png`,
    impactClass: "impact-speed"
  },
  heavy: {
    image: `${IMAGE_ROOT}/enemies/enemy_heavy.png`,
    impactClass: "impact-heavy"
  },
  spitter: {
    image: `${IMAGE_ROOT}/enemies/enemy_spitter.png`,
    impactClass: "impact-toxic"
  },
  exploder: {
    image: `${IMAGE_ROOT}/enemies/enemy_exploder.png`,
    impactClass: "impact-volatile"
  },
  berserker: {
    image: `${IMAGE_ROOT}/enemies/enemy_berserker.png`,
    impactClass: "impact-rage"
  },
  screamer: {
    image: `${IMAGE_ROOT}/enemies/enemy_screamer.png`,
    impactClass: "impact-scream"
  },
  charger: {
    image: `${IMAGE_ROOT}/enemies/enemy_charger.png`,
    impactClass: "impact-charge"
  }
};

export const LEVEL_VISUALS = {
  "1": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_tutorial_station.png`,
    theme: "tutorial"
  },
  "2": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_tutorial_station.png`,
    theme: "tutorial"
  },
  "3": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_tutorial_station.png`,
    theme: "tutorial"
  },
  "4A": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_agile_route.png`,
    theme: "agile"
  },
  "5A": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_agile_route.png`,
    theme: "agile"
  },
  "6A": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_agile_route.png`,
    theme: "agile"
  },
  "4B": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_balanced_route.png`,
    theme: "balanced"
  },
  "5B": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_balanced_route.png`,
    theme: "balanced"
  },
  "6B": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_balanced_route.png`,
    theme: "balanced"
  },
  "4C": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_courage_route.png`,
    theme: "courage"
  },
  "5C": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_courage_route.png`,
    theme: "courage"
  },
  "6C": {
    backdrop: `${IMAGE_ROOT}/backdrops/bg_courage_route.png`,
    theme: "courage"
  }
};

export const FX_VISUALS = {
  muzzleFlash: `${IMAGE_ROOT}/fx/fx_muzzle_flash.png`,
  slashArc: `${IMAGE_ROOT}/fx/fx_slash_arc.png`,
  grenadeBlast: `${IMAGE_ROOT}/fx/fx_grenade_blast.png`,
  hitSplatter: `${IMAGE_ROOT}/fx/fx_hit_splatter.png`
};

export const OVERLAY_VISUALS = {
  scanline: `${IMAGE_ROOT}/ui/hud_scanline_overlay.png`,
  danger: `${IMAGE_ROOT}/ui/hud_danger_overlay.png`
};

export function getLevelVisual(levelId) {
  if (LEVEL_VISUALS[levelId]) {
    return LEVEL_VISUALS[levelId];
  }

  if (String(levelId).endsWith("A")) {
    return LEVEL_VISUALS["4A"];
  }

  if (String(levelId).endsWith("B")) {
    return LEVEL_VISUALS["4B"];
  }

  if (String(levelId).endsWith("C")) {
    return LEVEL_VISUALS["4C"];
  }

  return LEVEL_VISUALS["1"];
}

export function getPlayerVisual(characterId, actionKey = "") {
  const visual = PLAYER_VISUALS[characterId] || PLAYER_VISUALS.leon;
  const actionImage = visual.actions?.[actionKey];

  return {
    image: actionImage || visual.image
  };
}
