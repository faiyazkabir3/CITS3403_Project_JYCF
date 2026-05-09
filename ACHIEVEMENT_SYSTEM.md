# Achievement System And Agent Clipboard

Updated: 8 May 2026

This document explains the current Route Zero achievement, tier badge, and agent clipboard presentation system.

## Overview

Achievements are persistent account milestones backed by gameplay save data. The database stores whether a base achievement has been unlocked, while the bronze/silver/gold tier shown in the UI is derived from the player's current stats.

The same achievement data feeds three surfaces:

- the Achievements page, which shows all achievement families, tier labels, progress, and badge art
- the public profile page, which can show earned achievement badges beside social/profile badges
- the main-menu clipboard, which shows only the top three earned tier badges

The agent clipboard also shows dossier-style profile fields:

- `AGE`: a seeded display value from `21` to `29`
- `HEIGHT`: a seeded display value from `5'5"` to `6'3"`
- `AGENT ID`: the registered user's database ID formatted like `#00001`; guests show `GUEST`
- `LICENCE NO.`: fixed display value `RZ-74291863`
- `BLOOD GROUP`: a seeded display value from `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, or `O-`

These dossier values are display-only and do not add database columns.

## Data Model

The achievement system uses existing tables:

- `save_data`: source of gameplay counters such as kills, damage, medkits, pistol shots, and current level
- `user_achievement`: stores the base achievement unlock record for a user
- `user`: source of the public account ID used by the clipboard as `AGENT ID`

There is no separate tier table. A user's tier is recalculated from current progress each time achievements are loaded.

Base unlocks are written by `unlock_achievements_for_user()` after save-game requests. Display data is built by `get_user_achievements()`.

## Achievement Families

| Achievement | Metric | Base unlock | Bronze | Silver | Gold |
|---|---:|---:|---:|---:|---:|
| First Blood | kills | 1 | 1 | 10 | 20 |
| No Mercy | kills | 10 | 10 | 20 | 30 |
| Survivor | level reached | 3 | 3 | 5 | 7 |
| Sharpshooter | damage dealt | 500 | 500 | 1000 | 1500 |
| Medic | medkits used | 5 | 5 | 10 | 15 |
| Untouchable | no-damage saved runs | 1 | 1 | 2 | 3 |

Sharpshooter keeps its extra unlock rule: the player must reach the damage target with 10 or fewer pistol shots. Its tier progress still displays against damage dealt.

Untouchable is derived from saved runs where `has_started_game` is true and `damage_taken` is zero. Duplicate database/fallback payloads are de-duplicated by character and update timestamp.

## Badge Assets

Badge PNG assets live in:

```text
static/images/badges/
```

The naming convention is:

```text
<achievement_family>_<tier>.png
```

Examples:

- `medic_bronze.png`
- `medic_silver.png`
- `medic_gold.png`

The current badge art is fictional Route Zero artwork inspired by military badge shapes, not official insignia. The source sheet is kept as:

```text
static/images/badges/route_zero_badge_sheet.png
```

## UI Rules

### Achievements page

Each achievement row shows:

- generated badge image
- achievement name
- current tier label, or `LOCKED`
- description
- unlock/progress text

Locked rows still show the next-tier badge image in grayscale so players can preview what they are chasing.

### Public profile

Achievement profile badges use the same badge image and append the earned tier label to the badge title. Existing non-achievement profile badges such as ranked/social/custom badges keep their text symbols.

### Main-menu clipboard

The clipboard shows the top three earned achievement badges only.

Ranking order:

1. higher tier first: gold, then silver, then bronze
2. higher current progress within the tier
3. achievement label as a stable final tie-breaker

If the user has not earned any tiered achievement badges, the clipboard displays three locked placeholders.

The old FBI seal is still used as a visual dossier stamp in the top-right of the clipboard header row.

## Testing Notes

Relevant automated coverage is in:

```text
tests/unit/test_helpers.py
tests/selenium/test_browser_flows.py
```

The intended coverage checks:

- achievement unlock logic handles regular and sharpshooter rules
- registered users can open the achievements page
- achievement progress stats such as kills and reloads render in the browser
- registered users can save profile/game progress without breaking the achievement flow

Run the optional JavaScript/template sanity check with:

```powershell
npm run check:js
```

Run the required Python and Selenium test suite with:

```powershell
python -m pytest
```

On this Mac, use the virtual environment interpreter if plain `python` is not on PATH:

```bash
.venv/bin/python -m pytest
```
