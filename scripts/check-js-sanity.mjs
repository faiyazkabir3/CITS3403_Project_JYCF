import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const issues = [];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function checkSyntax(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const isModule = /\b(import|export)\b/.test(source);

  try {
    if (!isModule) {
      new vm.Script(source, {
        filename: filePath,
      });
    }
  } catch (error) {
    const output = error instanceof Error ? error.stack || error.message : String(error);
    issues.push(`Syntax check failed: ${relative(filePath)}\n${output}`);
  }
}

function checkJsImportsAndAssets(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const importMatches = [...source.matchAll(/from\s+["'](.+?)["']/g)];

  for (const match of importMatches) {
    const specifier = match[1];

    if (!specifier.startsWith(".")) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), specifier);
    if (!fs.existsSync(resolvedPath)) {
      issues.push(`Missing import target: ${relative(filePath)} -> ${specifier}`);
    }
  }

  const staticMatches = [...source.matchAll(/["']\/static\/([^"']+)["']/g)];
  for (const match of staticMatches) {
    const assetPath = path.join(root, "static", ...match[1].split("/"));
    if (!fs.existsSync(assetPath)) {
      issues.push(`Missing static asset in JS: ${relative(filePath)} -> /static/${match[1]}`);
    }
  }
}

function checkTemplateAssets(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const filenameMatches = [...source.matchAll(/filename\s*=\s*["']([^"']+)["']/g)];

  for (const match of filenameMatches) {
    const assetPath = path.join(root, "static", ...match[1].split("/"));
    if (!fs.existsSync(assetPath)) {
      issues.push(`Missing static asset in template: ${relative(filePath)} -> ${match[1]}`);
    }
  }
}

function recordIssue(message) {
  issues.push(message);
}

function assertGameRule(condition, message) {
  if (!condition) {
    recordIssue(`Game content check failed: ${message}`);
  }
}

function collectStaticAssetPaths(value, paths = []) {
  if (typeof value === "string") {
    if (value.startsWith("/static/")) {
      paths.push(value);
    }
    return paths;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectStaticAssetPaths(entry, paths));
    return paths;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectStaticAssetPaths(entry, paths));
  }

  return paths;
}

function checkImportedStaticAssets(moduleName, value) {
  const assetPaths = collectStaticAssetPaths(value);

  assetPaths.forEach((assetPath) => {
    const localPath = path.join(root, ...assetPath.replace(/^\/+/, "").split("/"));
    if (!fs.existsSync(localPath)) {
      recordIssue(`Missing imported static asset in ${moduleName}: ${assetPath}`);
    }
  });
}

async function checkGameContentRules() {
  const levelsModule = await import(pathToFileURL(path.join(root, "static", "js", "levels.js")));
  const visualsModule = await import(pathToFileURL(path.join(root, "static", "js", "visuals.js")));
  const combatModule = await import(pathToFileURL(path.join(root, "static", "js", "combat-engine.js")));
  const { LEVELS } = levelsModule;
  const { createCombatEngine } = combatModule;

  ["6A", "6B", "6C", "6D"].forEach((levelId) => {
    assertGameRule(LEVELS[levelId]?.next === "7", `${levelId} should advance to Level 7`);
  });

  assertGameRule(LEVELS["7"]?.autoComplete === true, "Level 7 should auto-complete");
  assertGameRule(LEVELS["7"]?.manualContinueAfterClear === true, "Level 7 should require manual continue");
  assertGameRule(LEVELS["7"]?.next === "8", "Level 7 should advance to Level 8");
  assertGameRule(LEVELS["8"]?.enemySequence?.[0] === "nemesisT", "Level 8 should spawn Nemesis-T Type");
  assertGameRule(
    fs.existsSync(path.join(root, "static", "images", "badges", "nemesis_hunter.jpeg")),
    "Nemesis Hunter badge JPEG should exist"
  );

  checkImportedStaticAssets("visuals.js", {
    ENEMY_VISUALS: visualsModule.ENEMY_VISUALS,
    LEVEL_VISUALS: visualsModule.LEVEL_VISUALS,
    SPECIAL_VISUALS: visualsModule.SPECIAL_VISUALS,
    BOSS_SCENE_VISUALS: visualsModule.BOSS_SCENE_VISUALS,
    FX_VISUALS: visualsModule.FX_VISUALS,
    OVERLAY_VISUALS: visualsModule.OVERLAY_VISUALS
  });

  const cacheEngine = createCombatEngine({ seed: 1001, character: "leon" });
  cacheEngine.state.progression.currentLevelId = "7";
  cacheEngine.state.rifle.owned = false;
  cacheEngine.state.rifle.ammoInGun = 0;
  cacheEngine.state.rifle.ammoInBag = 0;
  cacheEngine.state.inventory.medKits = 1;
  cacheEngine.startLevel();

  assertGameRule(cacheEngine.state.progression.levelComplete, "Level 7 should complete as soon as it starts");
  assertGameRule(cacheEngine.state.rifle.owned, "Level 7 should unlock the rifle");
  assertGameRule(
    cacheEngine.state.rifle.ammoInGun + cacheEngine.state.rifle.ammoInBag === 10,
    "Level 7 should grant exactly 10 rifle rounds"
  );
  assertGameRule(cacheEngine.state.inventory.medKits === 4, "Level 7 should grant 3 extra medkits");
  assertGameRule(cacheEngine.state.analytics.nemesisKills === 0, "Nemesis kill analytics should initialize");

  const completedCacheSave = structuredClone(cacheEngine.state);
  const completedCacheResume = createCombatEngine({ savedState: completedCacheSave });
  const completedCacheResumeEvents = completedCacheResume.resumeFromSave();
  assertGameRule(
    completedCacheResume.state.progression.currentLevelId === "7",
    "Resuming completed Level 7 should stay on the cache level"
  );
  assertGameRule(
    completedCacheResume.state.progression.levelComplete,
    "Resuming completed Level 7 should keep the manual continue gate available"
  );
  assertGameRule(
    !completedCacheResume.state.combat.enemy,
    "Resuming completed Level 7 should not spawn a phantom enemy"
  );
  assertGameRule(
    completedCacheResumeEvents.some((event) => event.includes("Continue when ready")),
    "Resuming completed Level 7 should tell the player to continue"
  );
  assertGameRule(
    completedCacheResume.state.rifle.ammoInGun + completedCacheResume.state.rifle.ammoInBag === 10,
    "Resuming completed Level 7 should not duplicate cache rifle ammo"
  );
  completedCacheResume.advanceToNextLevel();
  assertGameRule(
    completedCacheResume.state.progression.currentLevelId === "8",
    "Manual continue after resumed Level 7 should start Level 8"
  );
  assertGameRule(
    completedCacheResume.state.combat.enemy?.type === "nemesisT",
    "Manual continue after resumed Level 7 should spawn Nemesis"
  );

  const strandedCacheEngine = createCombatEngine({ seed: 1002, character: "leon" });
  const strandedCacheSave = structuredClone(strandedCacheEngine.state);
  strandedCacheSave.progression.currentLevelId = "7";
  strandedCacheSave.progression.encounterOrder = [];
  strandedCacheSave.progression.currentEncounterIndex = 0;
  strandedCacheSave.progression.enemiesRemaining = 0;
  strandedCacheSave.progression.levelComplete = false;
  strandedCacheSave.progression.awaitingChoice = false;
  strandedCacheSave.progression.shopOpen = false;
  strandedCacheSave.progression.emergency = null;
  strandedCacheSave.combat.inCombat = false;
  strandedCacheSave.combat.enemy = null;
  strandedCacheSave.rifle.owned = false;
  strandedCacheSave.rifle.ammoInGun = 0;
  strandedCacheSave.rifle.ammoInBag = 0;
  strandedCacheSave.inventory.medKits = 1;

  const strandedCacheResume = createCombatEngine({ savedState: strandedCacheSave });
  strandedCacheResume.resumeFromSave();
  assertGameRule(
    strandedCacheResume.state.progression.currentLevelId === "7",
    "Resuming an incomplete no-enemy Level 7 save should remain on Level 7"
  );
  assertGameRule(
    strandedCacheResume.state.progression.levelComplete,
    "Resuming an incomplete no-enemy Level 7 save should repair the manual continue gate"
  );
  assertGameRule(
    !strandedCacheResume.state.combat.enemy && !strandedCacheResume.state.combat.inCombat,
    "Resuming an incomplete no-enemy Level 7 save should stay out of combat"
  );
  assertGameRule(
    strandedCacheResume.state.rifle.owned &&
      strandedCacheResume.state.rifle.ammoInGun + strandedCacheResume.state.rifle.ammoInBag === 10,
    "Repaired Level 7 resume should grant the cache rifle supplies"
  );
  assertGameRule(
    strandedCacheResume.state.inventory.medKits === 4,
    "Repaired Level 7 resume should grant the cache medkits"
  );
  strandedCacheResume.advanceToNextLevel();
  assertGameRule(
    strandedCacheResume.state.progression.currentLevelId === "8",
    "Manual continue after repaired Level 7 should start Level 8"
  );
  assertGameRule(
    strandedCacheResume.state.combat.enemy?.type === "nemesisT",
    "Manual continue after repaired Level 7 should spawn Nemesis"
  );

  cacheEngine.advanceToNextLevel();
  assertGameRule(cacheEngine.state.progression.currentLevelId === "8", "Continuing from Level 7 should start Level 8");
  assertGameRule(cacheEngine.state.combat.enemy?.type === "nemesisT", "Level 8 should create the Nemesis enemy");
  assertGameRule(cacheEngine.state.combat.enemy?.baseHp === 1000, "Nemesis should have 1000 HP");
}

const jsFiles = walk(path.join(root, "static", "js"), (filePath) => filePath.endsWith(".js"));
const templateFiles = walk(path.join(root, "templates"), (filePath) => filePath.endsWith(".html"));

for (const filePath of jsFiles) {
  checkSyntax(filePath);
  checkJsImportsAndAssets(filePath);
}

for (const filePath of templateFiles) {
  checkTemplateAssets(filePath);
}

await checkGameContentRules();

if (issues.length > 0) {
  console.error(issues.join("\n\n"));
  process.exit(1);
}

console.log(
  `JS sanity check passed for ${jsFiles.length} JS files and ${templateFiles.length} templates.`,
);
