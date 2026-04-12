# Level Design and Combat Documentation

Updated: 12 April 2026

This document reflects the current implemented build in this repository. If this file and the game code ever disagree, the JavaScript and Flask code are the source of truth.

## 1. Design Goals

The current run structure is built around a short tutorial arc that teaches the combat system, then branches into route-based progression that pushes the player toward agility, courage, or a mixed build.

Key design goals:

- Teach weapon matchups early instead of relying on hidden rules.
- Make Dodge a real tactical choice instead of a low-value filler action.
- Space out the shop so coin spending matters.
- Give Quite and Leon clearly different combat identities.
- Make enemy order, route choice, and emergency events feel like part of progression, not separate systems.

## 2. Current Run Flow

1. The player chooses a character and difficulty.
2. A run starts on Level 1 with fixed starter resources.
3. Each level runs through a fixed enemy sequence.
4. Some agility-oriented levels can trigger an emergency event before combat.
5. After a full level clear, the run may award stats, coins, upgrades, a shop, or a branch choice.
6. The shop appears after every two cleared levels, not after every level.
7. Full run state is saved so combat state, route state, shop availability, and progression survive reloads.

## 3. Starting State

### 3.1 Difficulty Loadouts

| Difficulty | HP | Medkits | Grenades |
| --- | ---: | ---: | ---: |
| Easy | 100 | 2 | 2 |
| Hard | 90 | 1 | 1 |

### 3.2 Shared Equipment Defaults

| System | Value |
| --- | --- |
| Pistol magazine | 8 |
| Pistol reserve ammo | 16 |
| Rifle magazine | 6 |
| Rifle ownership at start | Locked |
| Coins at start | 0 |
| Max HP | 100 |

## 4. Character Documentation

### 4.1 Quite

Role: agile survivor with strong dodge value and pistol tempo.

| Stat | Value |
| --- | ---: |
| Starting agility | 50 |
| Starting courage | 20 |
| Passive dodge bonus | 8% |
| Passive medkit bonus | +15 healing |
| Passive pistol bonus | 0 |
| Shield access | No |

Implemented behavior:

- A successful dodge can trigger a quick pistol counter-shot if ammo is available.
- At 70 agility or higher, Quite unlocks `Quick and Swift`, firing two pistol shots with one pistol action.
- Quite is the best fit for the agility route and emergency-heavy levels.

### 4.2 Leon

Role: tactical specialist with shield play, armour reduction, and crit scaling.

| Stat | Value |
| --- | ---: |
| Starting agility | 20 |
| Starting courage | 50 |
| Passive pistol bonus | +2 base damage |
| Passive armour bonus | 6% damage reduction |
| Shield access | Yes |
| Starting shield durability | 100 |

Implemented behavior:

- Leon starts with a shield equipped.
- Guarding damage with the shield builds `guardStacks`.
- Leon crit chance is tied to courage and recent shield blocks.
- Crits apply to pistol and rifle attacks and double the final weapon damage.

## 5. Core Combat Rules

### 5.1 Weapon Effectiveness Tiers

Each enemy defines a matchup profile per weapon:

| Tier | Damage Multiplier | Miss Chance |
| --- | ---: | ---: |
| Best | 1.5x | 0% |
| Good | 1.0x | 0% |
| Worst | 0.5x | 60% |

### 5.2 Base Weapon Values

| Weapon | Base Value |
| --- | --- |
| Pistol | 27-33 damage |
| Laser pistol | 33-41 damage |
| Rifle | 33-39 damage |
| Grenade | 58 base damage |
| Knife | 34% of target base HP |

### 5.3 Dodge, Crit, and Armour Formulas

Current implemented formulas:

- Base dodge chance = `28%`
- Final dodge chance = `28% + character dodge bonus + agility / 500`, capped at `80%`
- If the active enemy is a Charger and the player chose Dodge, that dodge gets an extra `37%` success chance, capped at `95%`
- Leon crit chance = `courage / 500 + 5% per guard stack`, capped at `45%`
- Passive armour reduction = `character armour bonus + bought armour reduction`, capped at `30%`

### 5.4 Knife Rules

The knife is now intentionally stronger in the right matchup.

- Knife self-damage is normally `3 HP`.
- If the knife lands in a `best` matchup, it deals no self-damage.
- A `best` knife hit also stuns the enemy for `1` full enemy turn.
- A stunned enemy does not attack that turn.
- Heavy zombies are intentionally poor knife targets.

### 5.5 Shield Rules

Leon only.

- Shield block uses a random `18%` to `28%` base deflect roll.
- Courage adds additional shield block scaling.
- Total block is capped at `75%`.
- When the shield blocks damage, it loses durability based on the incoming hit.
- If durability reaches `0`, the shield is forced off and must be repaired in the shop.

### 5.6 Status Effects

Spitters apply two layered effects:

- Poison: `4` HP damage per status tick for up to `2` turns
- Corrosion: `10` shield durability damage per tick, or `2` direct HP damage if no working shield is available

Medkits clear both poison and corrosion when used.

### 5.7 Healing and Reloading

- Medkit heal = `50 HP + character medkit bonus`
- Pistol reload fills from reserve ammo up to an 8-round magazine
- Rifle reload fills from reserve ammo up to a 6-round magazine
- Rifle attack and rifle reload UI stay hidden until the rifle is unlocked

## 6. Enemy Catalogue

### 6.1 Fast Zombie

| Field | Value |
| --- | --- |
| HP | 39 |
| Damage | 8-16 |
| Coins | 1 |
| Matchups | Knife best, Pistol good, Rifle good, Grenade worst |

Special behavior:

- 20% chance to dodge pistol and rifle attacks

Design purpose:

- Teaches that the knife has a high-value use case
- Punishes careless bullet reliance

### 6.2 Heavy Zombie

| Field | Value |
| --- | --- |
| HP | 70 |
| Damage | 14-24 |
| Coins | 2 |
| Matchups | Rifle best, Grenade best, Pistol good, Knife worst |

Special behavior:

- Has light-damage resistance, making knife pressure much less effective

Design purpose:

- Forces the player to respect weapon matchups

### 6.3 Spitter Zombie

| Field | Value |
| --- | --- |
| HP | 40 |
| Damage | 8-15 |
| Coins | 2 |
| Matchups | Pistol best, Rifle best, Grenade good, Knife worst |

Special behavior:

- Applies poison and corrosion for 2 turns

Design purpose:

- Priority ranged threat
- Punishes close-range autopilot

### 6.4 Exploder Zombie

| Field | Value |
| --- | --- |
| HP | 55 |
| Damage | 9-18 |
| Coins | 3 |
| Matchups | Pistol best, Rifle good, Knife worst, Grenade worst |

Special behavior:

- If killed by knife, deals `14` backlash damage
- If killed by grenade, deals `28` backlash damage

Design purpose:

- Creates kill-spacing and finish-method decisions

### 6.5 Berserker Zombie

| Field | Value |
| --- | --- |
| HP | 120 |
| Damage | 14-22 before rage |
| Coins | 4 |
| Matchups | Pistol good, Rifle good, Grenade good, Knife worst |

Special behavior:

- Enrages at 50% HP or lower
- Gains bonus damage and becomes more reliable once enraged

Design purpose:

- Rewards burst damage and clean execution

### 6.6 Screamer Zombie

| Field | Value |
| --- | --- |
| HP | 34 |
| Damage | 5-11 |
| Coins | 2 |
| Matchups | Pistol best, Rifle best, Knife good, Grenade worst |

Special behavior:

- If it survives long enough, it summons a Fast Zombie reinforcement

Design purpose:

- Hard priority target

### 6.7 Charger Zombie

| Field | Value |
| --- | --- |
| HP | 45 |
| Damage | 33 impact damage |
| Coins | 3 |
| Matchups | Pistol good, Rifle good, Knife good, Grenade worst |

Special behavior:

- First turn: telegraphs the rush
- Next turn: charges
- Two successful prepared dodges against the Charger stun it for 1-2 turns

Design purpose:

- Makes Dodge a core combat skill check

## 7. Level and Route Structure

### 7.1 Tutorial Arc

| Level | Title | Enemies | Purpose |
| --- | --- | --- | --- |
| 1 | First Cut | Fast | Introduces strong knife matchup and weak grenade matchup |
| 2 | Armour Lesson | Heavy, Spitter | Introduces armour-breaking priorities and ranged threat management |
| 3 | Skill Check | Charger, Screamer | Introduces dodge timing and urgency targeting |

Important current rule:

- After Level 3, the player only sees `4A` and `4C`
- `4B` still exists in data, but it is not currently presented from the Level 3 branch choice

### 7.2 Level 4 Branches

#### 4A - Emergency Tunnel

- Enemy sequence: `Fast, Charger, Spitter`
- Base reward: `Agility +3`
- Emergency chance: always triggers
- Emergency input: `X` key or click
- Emergency requirement: `8` inputs in `11` seconds
- Emergency success: `Agility +2`, `2 coins`
- Emergency fail: `Agility +1`, `8 damage`

#### 4C - Fortified Line

- Enemy sequence: `Heavy, Exploder, Heavy, Fast`
- Base reward: `4 coins`, `Courage +3`
- Route identity: slower, heavier, more economy-focused

#### 4B - Reserve Route

- Enemy sequence: `Heavy, Spitter, Exploder`
- Rewards include laser pistol unlock plus `Agility +2` and `Courage +2`
- This content still exists in the project but is not currently surfaced from Level 3

### 7.3 Randomized Level 5 Choice Rule

After clearing `4A` or `4C`, the game randomly offers exactly `2` route options from:

- `5A`
- `5B`
- `5C`

Possible offered pairs:

- `5A` and `5B`
- `5B` and `5C`
- `5A` and `5C`

This is the current implemented route-choice behavior.

### 7.4 Level 5 Branches

#### 5A - Quickstep Trial

- Enemy sequence: `Fast, Charger, Exploder, Spitter`
- Base reward: `Agility +5`
- Emergency chance: `70%`
- Emergency requirement: `9` inputs in `12` seconds
- Emergency success: `Agility +2`
- Emergency fail: `Agility +1`, `10 damage`

#### 5B - Crossfire Junction

- Enemy sequence: `Charger, Spitter, Heavy, Screamer`
- Base reward: `Agility +2`, `Courage +2`
- Route identity: balanced attrition route

#### 5C - Stand Firm

- Enemy sequence: `Heavy, Berserker, Exploder, Charger, Spitter`
- Base reward: `6 coins`, `Courage +5`
- Route identity: endurance and economy route

### 7.5 Final Branch Levels

| Level | Title | Enemies |
| --- | --- | --- |
| 6A | Swift Finale | Fast, Charger, Berserker |
| 6B | Split Verdict | Heavy, Exploder, Berserker, Charger |
| 6C | Iron Exit | Heavy, Exploder, Berserker, Screamer, Charger |

## 8. Emergency Event Rules

The emergency event system is currently tuned for fairness and readability.

- Emergency events pause combat setup until they resolve
- The QTE timer starts after the intro text finishes typing
- The player can respond by pressing the shown key or by clicking the emergency button
- Abort remains available if the player wants to fail immediately and move on

This prevents the timer from burning while the story text is still animating.

## 9. Shop and Economy

### 9.1 Shop Cadence

The shop now appears after every two cleared levels if progression continues.

Current rhythm in a normal run:

- After Level 2
- After Level 4A or 4C
- No extra shop is guaranteed after that before the branch finale

### 9.2 Shop Inventory

| Item | Cost | Effect |
| --- | ---: | --- |
| Medkit | 4 | Adds one medkit |
| Pistol Mag | 3 | Adds one full pistol magazine to reserve ammo |
| Rifle | 20 | Unlocks the rifle and loads its first magazine |
| Rifle Mag | 6 | Adds one full rifle magazine to reserve ammo |
| Armour | 12 | Adds permanent armour plating, up to level 2 |
| Shield Repair | 2 | Leon only, restores 40 shield durability |

Additional economy rules:

- Enemy coin drops are now the consistent universal reward layer
- Sell value is `60%` of item cost, rounded to the nearest whole coin, minimum `1`
- Rifle UI remains hidden until rifle ownership becomes true, which keeps the action panel cleaner early

## 10. UI and Readability Notes

Current presentation rules:

- Story text animates more slowly than before for readability
- Event playback uses a brief pause between lines to reduce log whiplash
- When an enemy dies and more enemies remain, the game now shows the remaining-count line and then the next enemy spawn line, so the newest threat is the final visible message
- Rifle stats and rifle reload controls are hidden until the rifle is unlocked

## 11. Save and Persistence

The backend now stores a richer run snapshot rather than only the old flat combat fields.

Implemented persistence notes:

- `save_data` includes `run_state_json`
- Flask saves the serialized run state payload when available
- Load preview can pull route, stat, and economy information from the saved run state
- Shop state, route choice state, enemy progression state, and emergency state can survive reloads

## 12. Implementation Notes

The current implementation intentionally favors clarity over total route breadth.

Important notes:

- `4B` is present in data and can still be reused later
- Level 3 currently branches only to `4A` and `4C`
- Level 5 route presentation is randomized as a pair, not shown as all three options
- The shared Markdown in this repository should now be treated as the maintainable design record instead of temporary Word copies
