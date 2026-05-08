# Combat Engine Documentation

Updated: 8 May 2026

This document describes the implementation in `static/js/combat-engine.js` and the surrounding save/UI integration. If this file and the code ever disagree, the code is the source of truth.

## 1. Purpose and Responsibilities

The combat engine is the gameplay state machine for the playable run. It is responsible for:

- creating a fresh run state from difficulty, character, and RNG seed
- restoring a saved run state and normalizing missing fields
- resolving player actions into combat outcomes
- running enemy turns, status ticks, and special enemy behavior
- handling level completion, route choice, shop access, and emergency events
- returning narrative event strings for the UI to animate and log

The engine does not touch the DOM directly and does not perform network requests. `gameUI.js` handles rendering, while the Flask persistence routes now live in the `main` Blueprint in `routes.py` and use shared setup/helpers from `app.py`.

## 2. File Structure

`static/js/combat-engine.js` is organized in this order:

1. `LEVELS` import from `static/js/levels.js`
2. RNG helpers: `mulberry32()` and `createRng()`
3. Static configuration tables:
   `RULES`, `EFFECTIVENESS`, `CHARACTER_DEFS`, `ENEMY_TYPES`, `SHOP_ITEMS`
4. State construction: `createNewGameState()`
5. Private helpers for normalization, damage, rewards, progression, and special rules
6. `ACTIONS`, the action dispatch table used by player inputs
7. `enemyTurn()`, the enemy-side turn resolver
8. `createCombatEngine()`, the public engine factory

## 3. Core Data Tables

### 3.1 `RULES`

`RULES` is the global balance table. It holds shared constants such as:

- baseline enemy miss chance
- baseline and charger-boosted dodge chance values
- pistol, rifle, grenade, and knife base values
- Quite sidearm and Leon axe damage values
- exploder backlash damage
- poison and corrosion tick values
- fallback emergency failure damage

If a number should affect all runs rather than one character, enemy, or level, it usually belongs here.

### 3.2 `EFFECTIVENESS`

`EFFECTIVENESS` maps the matchup tier labels used by enemies:

- `best`: `1.5x` damage, `0%` miss chance
- `good`: `1.0x` damage, `0%` miss chance
- `worst`: `0.5x` damage, `60%` miss chance

Every enemy weapon profile points to one of these labels.

### 3.3 `CHARACTER_DEFS`

`CHARACTER_DEFS` defines the per-character passive package:

- UI identity fields: `id`, `name`, `perkName`
- offensive and support modifiers: `pistolBonus`, `dodgeBonus`, `medkitBonus`
- starting stat curve: `startingAgility`, `startingCourage`
- defensive identity: `armourBonus`, `hasShield`, `startsShieldEquipped`

The engine currently supports `leon` and `quite`.

### 3.4 `ENEMY_TYPES`

`ENEMY_TYPES` is the enemy template table. Each entry provides:

- display identity: `name`
- base health and damage range
- coin drop range
- weapon matchup profile per weapon key
- optional special fields such as `bulletDodgeChance`, `lightDamageResistance`, `poisonTurns`, `corrosionTurns`, `rageThreshold`, `rageBonus`, `summonAfterTurns`, and `summonType`

`buildEnemy()` clones one of these templates into a live enemy object and adds runtime-only fields such as:

- `turnsAlive`
- `rageActive`
- `summonedReinforcement`
- `chargeReady`
- `successfulDodges`
- `stunnedTurns`

### 3.5 `SHOP_ITEMS`

`SHOP_ITEMS` is a behavior table rather than a plain data table. Each item contains:

- `id`, `label`, `cost`, `description`
- optional `isVisible(state)`
- `canBuy(state)`
- `buy(state)`
- `canSell(state)`
- `sell(state)`

This keeps buy/sell rules close to the item definition and makes the shop APIs mostly table-driven.

## 4. Engine State Model

`createNewGameState()` builds a single mutable `state` object with these top-level sections:

```js
{
  difficulty,
  rngSeed,
  player,
  inventory,
  pistol,
  rifle,
  shield,
  armour,
  relics,
  stats,
  status,
  analytics,
  combat,
  progression
}
```

### 4.1 `player`

Identity and current character metadata:

- `characterId`
- `characterName`
- `perkName`

### 4.2 `inventory`

Shared survival resources:

- `maxHealth`
- `health`
- `medKits`
- `grenades`
- `coins`

### 4.3 Weapon state

`pistol` contains:

- `magCapacity`
- `ammoInGun`
- `ammoInBag`
- `hasLaser`

`rifle` contains:

- `owned`
- `magCapacity`
- `ammoInGun`
- `ammoInBag`

`relics` contains:

- `quiteSidearm { owned, ammo, maxAmmo }`
- `leonAxe { owned, sharpenCharges, maxSharpenCharges }`

### 4.4 Defensive state

`shield` contains:

- `hasShield`
- `equipped`
- `durability`
- `maxDurability`
- `deflect`

`armour` contains:

- `level`
- `damageReduction`

### 4.5 Stats and status

`stats` contains:

- `agility`
- `courage`

`status` contains:

- `poisonTurns`
- `corrosionTurns`

### 4.6 `analytics`

This is the run telemetry bucket. It tracks counts such as shots fired, grenades used, reloads, dodges prepared, emergency results, coins earned, and saves made.

New tracked fields include:

- `sidearmShotsFired`
- `axeReactions`
- `axeSharpenChargesSpent`
- `emergencySequenceClears`

Important note:

- `refreshAchievements()` currently resets `analytics.achievementsUnlocked` to an empty array. Achievement logic is still a placeholder.

### 4.7 `combat`

This is the live encounter state:

- `inCombat`
- `enemy`
- `pendingDodge`
- `guardStacks`
- `pendingDefeatContext`

`pendingDefeatContext` records the weapon that landed the killing blow, which is needed for exploder backlash logic.

### 4.8 `progression`

This is the non-combat run state:

- `currentLevelId`
- `enemiesRemaining`
- `encounterOrder`
- `currentEncounterIndex`
- `roundsSinceShop`
- `currentChoiceOptions`
- `levelComplete`
- `awaitingChoice`
- `shopOpen`
- `emergency`
- `gameWon`
- `gameOver`

## 5. State Creation and Save Normalization

### 5.1 New runs

`createNewGameState()`:

- uppercases the difficulty
- pulls the selected character package from `CHARACTER_DEFS`
- sets difficulty-based health, medkit, and grenade starters
- initializes all runtime buckets
- seeds the RNG through `createRng()`

### 5.2 Saved runs

`createCombatEngine()` accepts `savedState`. When provided, it:

1. creates a fresh base state using the saved difficulty, seed, and character
2. deep-clones the provided save
3. merges the saved top-level structure into the new state
4. runs `normalizeStateShape(state)`
5. calls `refreshAchievements(state)`

`normalizeStateShape()` is the compatibility shim for old or partial saves. It backfills missing nested fields, enforces Quite's lack of shield access, reconstructs choice options if necessary, and clamps health.

Important implementation note:

- the saved run stores `rngSeed`, but it does not store the current RNG cursor position. Reloading preserves gameplay state but does not guarantee the same future random sequence as an uninterrupted run.
- relic state and active emergency-sequence step are preserved inside `run_state_json`

## 6. Level Start and Encounter Setup

### 6.1 `startCurrentLevel(events)`

This private helper is the real level bootstrapper used by `startLevel()`, `advanceToNextLevel()`, and `choosePath()`.

It performs these steps:

1. fetch the active level from `LEVELS`
2. clear intermission flags such as `levelComplete`, `awaitingChoice`, `shopOpen`, and `emergency`
3. build `encounterOrder` from `level.enemySequence` or `level.enemyPool`
4. reset per-level and per-encounter combat flags
5. push intro event strings
6. call `maybeSetEmergency()`
7. if no emergency is created, spawn the first enemy with `spawnCurrentEnemy()`

### 6.2 Encounter order

`createEncounterOrder(level, rng)` works like this:

- if `enemySequence` exists, the order is fixed
- otherwise, it rolls from `enemyPool` `enemyCount` times

In the current build, the documented levels mostly use fixed `enemySequence` values.

### 6.3 Enemy spawn

`spawnCurrentEnemy()` creates the live enemy from `encounterOrder[currentEncounterIndex]`, resets combat flags that should not carry across enemies, and updates `enemiesRemaining`.

Notably, spawning a new enemy resets:

- `pendingDodge`
- `guardStacks`
- `pendingDefeatContext`

## 7. Combat Resolution Pipeline

### 7.1 Player action entry

`dispatch(actionKey)` is the only public combat mutator for standard actions.

It validates this order:

1. player not already dead or game over
2. no active emergency event
3. active combat and a live enemy exist
4. `actionKey` maps to an entry in `ACTIONS`

Then it runs the action handler and follows this flow:

1. execute the action
2. if the player died from self-damage or backlash, end the run
3. if the enemy died immediately, call `handleEnemyDefeat()`
4. if the action counted as a valid move, run `enemyTurn()`
5. if the enemy dies during dodge counterplay or other enemy-turn side effects, call `handleEnemyDefeat()`
6. if the player dies during the enemy turn, end the run

Actions that return `false` are treated as invalid or non-committing and do not trigger an enemy turn.

### 7.2 Hit resolution

`resolveWeaponHit()` handles all weapon attacks. Its order is:

1. look up the enemy's matchup tier for the weapon
2. roll the matchup miss chance if the tier is poor
3. for pistol and rifle only, roll enemy bullet dodge if present
4. multiply base damage by matchup multiplier
5. apply `lightDamageResistance` for knife attacks when relevant
6. roll Leon crits for pistol and rifle
7. floor the damage, enforce a minimum of 1, and subtract enemy HP

The returned result object includes:

- `hit`
- `damage`
- `crit`
- `rating`
- `reason` when the hit failed

### 7.3 Incoming damage resolution

`applyDamage()` handles damage dealt to the player. Its order is:

1. apply passive armour reduction unless `ignoreArmour` is true
2. apply shield block unless `ignoreShield` is true and the shield is available
3. reduce shield durability based on raw incoming damage
4. add Leon `guardStacks` when the shield successfully participates
5. break and unequip the shield at zero durability
6. subtract the final damage from health
7. record `analytics.damageTaken`
8. clamp health to valid bounds

The function returns the final damage actually taken.

### 7.4 Dodge pipeline

Prepared dodges are stateful.

- `ACTIONS.dodge` sets `combat.pendingDodge = true`
- `resolvePendingDodge()` consumes that flag during the next enemy attack attempt
- a successful dodge cancels the hit
- Quite may immediately fire a quick pistol counter-shot, or her parry sidearm if she has found it and still has sidearm ammo
- chargers track successful dodges separately and can be stunned after two clean prepared dodges

### 7.5 Status tick timing

`applyStatusTick()` runs after the enemy finishes its action branch, not at the start of the player's turn.

That means poison and corrosion tick:

- after a stun turn
- after a charger telegraph turn
- after a dodged enemy attack
- after a successful enemy hit
- after an enemy miss

## 8. Player Action Reference

### 8.1 `pistol`

Behavior:

- consumes one bullet per shot
- uses the laser or non-laser pistol range
- adds the character's `pistolBonus`
- for Quite at `70+` agility, fires twice through `Quick and Swift`
- sets `pendingDefeatContext` to `pistol` on kill

### 8.2 `rifle`

Behavior:

- only available when `state.rifle.owned` is true
- consumes one rifle bullet
- uses `RULES.rifleDamage`
- sets `pendingDefeatContext` to `rifle` on kill

### 8.3 `knife`

Behavior:

- base damage is `floor(enemy.baseHp * RULES.knifePercentOfBaseHp)`
- can still fail through bad matchup logic
- increments `analytics.knivesUsed`
- deals self-damage unless the hit was both successful and a `best` matchup
- a successful `best` knife hit stuns the enemy for one turn and clears charger rush setup
- sets `pendingDefeatContext` to `knife` on kill

### 8.4 `grenade`

Behavior:

- requires at least one grenade in inventory
- uses fixed base grenade damage with weapon-effectiveness rules
- increments `analytics.grenadesUsed`
- sets `pendingDefeatContext` to `grenade` on kill

### 8.5 `heal`

Behavior:

- requires a medkit
- restores `50 + medkitBonus`
- clears poison and corrosion
- clamps to `maxHealth`

### 8.6 `reloadPistol`

Behavior:

- fills the pistol magazine from reserve ammo
- does nothing if the magazine is already full or reserve is empty
- increments `analytics.reloads`

### 8.7 `reloadRifle`

Behavior:

- requires rifle ownership
- fills the rifle magazine from reserve ammo
- increments `analytics.reloads`

### 8.8 `dodge`

Behavior:

- does not immediately avoid damage
- arms the next enemy attack check
- increments `analytics.dodgesPrepared`

### 8.9 `toggleShield`

Behavior:

- only available if the character has a shield
- cannot re-equip a broken shield
- toggles `shield.equipped`

## 9. Enemy Turn Logic

`enemyTurn()` is the only enemy-side turn resolver.

Its high-level order is:

1. bail out if combat is inactive or the enemy is already dead
2. increment `enemy.turnsAlive`
3. resolve stun if present
4. resolve screamer reinforcement timing
5. resolve charger special flow if the enemy is a charger
6. otherwise attempt a normal enemy attack
7. apply spitter debuffs on hit when relevant
8. apply poison and corrosion ticks

### 9.1 Fast Zombie

Special rule:

- has a `20%` chance to dodge pistol and rifle shots through `bulletDodgeChance`

### 9.2 Heavy Zombie

Special rule:

- reduces knife damage through `lightDamageResistance`

### 9.3 Spitter Zombie

Special rule:

- on a successful hit, applies poison and corrosion through `applySpitterDebuff()`

### 9.4 Exploder Zombie

Special rule:

- its special effect happens on death, not during its own turn
- grenade kills cause stronger backlash than knife kills

### 9.5 Berserker Zombie

Special rules:

- `maybeTriggerBerserkerRage()` activates once HP falls below the configured threshold
- while enraged, the berserker becomes more accurate
- while enraged, its damage gains an extra random bonus from `rageBonus`

### 9.6 Screamer Zombie

Special rule:

- after surviving long enough, it appends a new enemy type to `progression.encounterOrder`
- the added reinforcement becomes a later encounter in the same level rather than a simultaneous second enemy

### 9.7 Charger Zombie

Special flow:

1. first turn telegraphs with `chargeReady = true`
2. next turn attempts the rush
3. if the player prepared a dodge, `resolvePendingDodge()` checks the boosted charger dodge chance
4. each successful prepared dodge increments `successfulDodges`
5. after two successful prepared dodges, the charger is stunned for `1-2` turns
6. a failed dodge or no dodge resets the streak and applies fixed impact damage

## 10. Kill Resolution and Level Completion

### 10.1 `handleEnemyDefeat(events)`

When an enemy dies, this helper:

1. increments `currentEncounterIndex`
2. increments `analytics.enemiesKilled`
3. awards a random coin roll from the enemy template
4. checks exploder backlash using `pendingDefeatContext`
5. ends the game if backlash kills the player
6. clears live combat state
7. spawns the next enemy if encounters remain
8. otherwise marks the level complete and starts intermission handling

### 10.2 Intermission handling after a clear

After the final enemy in a level:

- poison and corrosion are cleared
- `levelComplete` becomes true
- `roundsSinceShop` increments
- level completion text is emitted
- rewards from `level.rewards` are applied
- branch choices are generated through `pickChoiceOptions()`
- the shop opens if:
  - `level.shopAfterClear` is true
  - at least two levels have passed since the previous shop
  - the run can still continue through a next level or route choice
- the run is marked won if the branch ends and there is no next level

## 11. Route Choice, Shop, and Emergency Systems

### 11.1 Route choice

`pickChoiceOptions(level, rng)` behaves like this:

- if the level defines explicit `choices`, they are returned directly
- if the level defines `choicePool`, the pool is shuffled and truncated to `choiceCount`

Public route APIs:

- `hasChoices()`
- `getAvailableChoices()`
- `choosePath(nextLevelId)`

`choosePath()` validates against `progression.currentChoiceOptions`, not directly against the full level data. That keeps the player locked to the exact random subset they were shown.

### 11.2 Shop system

Public shop APIs:

- `isShopOpen()`
- `getShopInventory()`
- `getSellInventory()`
- `buy(itemId)`
- `sell(itemId)`
- `closeShop()`

Implementation details:

- the engine stores only the `shopOpen` flag, not a separate shop object
- buy availability and optional item visibility are computed live from `SHOP_ITEMS`
- sell inventory is generated from items whose `canSell(state)` returns true
- buy and sell methods return event arrays just like combat actions
- `advanceToNextLevel()` refuses to continue while the shop is still open

### 11.3 Emergency events

Emergency data comes from `level.emergency`.

Some levels can now use `level.emergencySequence`, which is a multi-step variant with:

- `sequenceTitle`
- `steps[]`
- shared `successText`, `failText`, `reward`, `failReward`, and `failDamage`

`maybeSetEmergency()`:

- checks the configured emergency or sequence chance
- clones the active emergency payload into `progression.emergency`
- marks it as active
- clears any live combat spawn for the moment
- emits the current emergency title and prompt

Public emergency APIs:

- `hasEmergency()`
- `getEmergency()`
- `resolveEmergency(success, progress = 0)`

`resolveEmergency()`:

- resolves the current step
- for a single-step emergency, behaves as before
- for an emergency sequence, either advances to the next step or resolves the whole sequence
- records success or failure analytics only when the whole emergency is cleared or failed
- applies failure chip damage with `ignoreShield: true`
- ends the run if that damage kills the player
- spawns the first enemy for the level only after the emergency is fully finished

The UI owns timer, keypress tracking, and click counting. The engine only resolves the outcome.

## 12. Public API Surface

All mutating methods return an array of event strings unless noted otherwise.

| Member | Type | Purpose |
| --- | --- | --- |
| `state` | object | Live mutable run state |
| `rng` | object | RNG wrapper with `next`, `chance`, `int`, `float` |
| `getCurrentLevel()` | function | Returns the current level object from `LEVELS` |
| `getDerivedStats()` | function | Returns computed dodge, crit, armour, and Quite burst unlock status |
| `hasChoices()` | function | True when a branch choice is pending |
| `getAvailableChoices()` | function | Returns the currently offered route options |
| `isShopOpen()` | function | True when the intermission shop is active |
| `getShopInventory()` | function | Returns buy-side shop entries with disabled state |
| `getSellInventory()` | function | Returns sellable inventory entries |
| `buy(itemId)` | function | Attempts a shop purchase |
| `sell(itemId)` | function | Attempts a shop sale |
| `closeShop()` | function | Ends the current shop session |
| `hasEmergency()` | function | True when an emergency event is active |
| `getEmergency()` | function | Returns the active emergency payload |
| `resolveEmergency(success, progress)` | function | Resolves the active emergency |
| `isGameOver()` | function | Returns the current game-over state |
| `resumeFromSave()` | function | Reconstructs the correct resume flow from saved state |
| `startLevel()` | function | Starts the current level for a fresh run |
| `dispatch(actionKey)` | function | Resolves one player action and, when valid, the enemy response |
| `advanceToNextLevel()` | function | Moves to the linear next level after a completed level |
| `choosePath(nextLevelId)` | function | Commits a pending branch choice and starts that level |

## 13. Save, Resume, and UI Integration

### 13.1 UI contract

`gameUI.js` treats the engine as a stateful service object.

The UI:

- creates the engine through `createCombatEngine()`
- calls `startLevel()` for new runs or `resumeFromSave()` for loaded runs
- calls `dispatch()` for player actions
- calls shop and emergency APIs during intermission and QTE flows
- renders `engine.state` and `engine.getDerivedStats()`
- animates returned event strings into the story panel and combat log

### 13.2 Save contract

`gameUI.js` persists the run by sending `structuredClone(engine.state)` as `run_state` to `/save-game`.

Flask persistence layer:

- `routes.py` owns the `/save-game` and `/load-game` Blueprint routes
- `app.py` owns shared app setup, database setup, and persistence helpers
- the save route serializes the `run_state` payload to JSON
- the load route serves it back through `/load-game`

This means save/load now preserves far more than the legacy flat fields, including:

- live enemy data
- route choices shown to the player
- shop availability
- emergency state
- emergency-sequence step state
- relic state
- stats, economy, and equipment state

### 13.3 Resume behavior

`resumeFromSave()` has several specialized branches:

- dead run: end immediately
- already won run: return a completed-run message
- active emergency: resume into the emergency prompt
- shop or route-choice intermission: resume into intermission
- active combat with an enemy: resume the current fight
- completed level: immediately move forward through `advanceToNextLevel()`
- otherwise: reconstruct encounter order if necessary and spawn the current enemy

## 14. Extending the Engine Safely

### 14.1 Adding a new enemy type

Update these places:

- `ENEMY_TYPES` entry
- `levels.js` references
- `enemyTurn()` or helpers if the enemy needs custom turn logic
- documentation files

### 14.2 Adding a new player action

Update these places:

- `ACTIONS`
- `gameUI.js` button wiring and availability logic
- `templates/play.html` if the action needs a new control
- stats rendering if the action introduces new tracked resources

### 14.3 Adding a new persistent state field

Update these places:

- `createNewGameState()`
- `normalizeStateShape()`
- `gameUI.js` save payload builder if the field also needs flat legacy mirrors
- Flask persistence code in `routes.py`/`app.py` if a new database column or derived preview field is needed

### 14.4 Changing route or shop rules

Update these places:

- `levels.js` for content data
- `handleEnemyDefeat()` for cadence logic
- shop APIs if buy/sell rules change structurally

### 14.5 Adding relic-style passive systems

Update these places:

- `createNewGameState()` and `normalizeStateShape()` for persistent state
- reward application so levels can award the relic
- the combat hook where the relic should trigger
- `gameUI.js` stats rendering and any related audio cues

## 15. Known Caveats

- `refreshAchievements()` is still a placeholder and currently wipes achievement data.
- Save files preserve `rngSeed` but not RNG progression, so resumed runs are state-correct rather than sequence-identical.
- Level `4B` exists in `levels.js`, but Level 3 currently only exposes `4A` and `4C`.
- The engine returns plain text event strings. Moving to structured combat events would require a contract change in `gameUI.js`.
