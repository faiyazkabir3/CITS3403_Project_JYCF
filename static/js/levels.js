export const LEVELS = {
  "1": {
    id: "1",
    title: "First Cut",
    titleKey: "levels.1.title.firstCut",
    description: "A fast infected darts between abandoned carriages and tests your reflexes.",
    descriptionKey: "levels.1.description.aFastInfectedDartsBetweenAbandoned",
    introText: "Tutorial 1: fast targets hate close pressure. Knife strikes land cleanly while grenades feel clumsy.",
    introTextKey: "levels.1.introText",
    enemySequence: ["fast"],
    enemyCount: 1,
    shopAfterClear: true,
    completeText: "You steady your breathing and find the first survivor cache.",
    completeTextKey: "levels.1.completeText",
    next: "2"
  },

  "2": {
    id: "2",
    title: "Armour Lesson",
    titleKey: "levels.2.title.armourLesson",
    description: "One plated brute blocks the hall while a ranged mutant spits from the backline.",
    descriptionKey: "levels.2.description.onePlatedBruteBlocksTheHall",
    introText: "Tutorial 2: heavy targets shrug off knives, and spitters punish careless close combat.",
    introTextKey: "levels.2.introText",
    enemySequence: ["heavy", "spitter"],
    enemyCount: 2,
    shopAfterClear: true,
    completeText: "The corridor opens into a supply bay with just enough time to regroup.",
    completeTextKey: "levels.2.completeText",
    next: "3"
  },

  "3": {
    id: "3",
    title: "Skill Check",
    titleKey: "levels.3.title.skillCheck",
    description: "A charger lines up its rush while a screamer prepares to call the whole station down on you.",
    descriptionKey: "levels.3.description.aChargerLinesUpItsRush",
    introText: "Tutorial 3: dodging matters. The charger rewards patience, and the screamer must be removed quickly.",
    introTextKey: "levels.3.introText",
    enemySequence: ["charger", "screamer"],
    enemyCount: 2,
    shopAfterClear: true,
    completeText: "Three route beacons flicker to life. Your next decision shapes the build for the run.",
    completeTextKey: "levels.3.completeText",
    choices: [
      {
        id: "4A",
        label: "4A - AGILE PATH",
        labelKey: "levels.4A.label.4aAGILEPATH",
        description: "Emergency events, evasive fights, and larger agility gains.",
        descriptionKey: "levels.4A.description.emergencyEventsEvasiveFightsAndLarger"
      },
      {
        id: "4C",
        label: "4C - COURAGE PATH",
        labelKey: "levels.4C.label.4cCOURAGEPATH",
        description: "Longer fights, heavier enemies, and more coins for the shop.",
        descriptionKey: "levels.4C.description.longerFightsHeavierEnemiesAndMore"
      }
    ]
  },

  "4A": {
    id: "4A",
    title: "Signal Sprint",
    titleKey: "levels.4A.title.signalSprint",
    description: "A broken maintenance rail flickers back to life while infected flood the side lanes toward your beacon.",
    descriptionKey: "levels.4A.description.aBrokenMaintenanceRailFlickersBack",
    introText: "Agile route: react fast, delete priority threats, and turn emergency pressure into permanent speed.",
    introTextKey: "levels.4A.introText",
    enemySequence: ["screamer", "fast", "charger"],
    enemyCount: 3,
    shopAfterClear: true,
    rewards: [
      {
        type: "pistolLaser",
        text: "You restore a relay sight module and fit it onto the pistol. Laser pistol unlocked.",
        textKey: "levels.4A.text.youRestoreARelaySightModule"
      },
      {
        type: "stats",
        agility: 4,
        courage: 0,
        text: "You clear the beacon line at full speed. Agility +4.",
        textKey: "levels.4A.text.youClearTheBeaconLineAt"
      }
    ],
    emergency: {
      chance: 1,
      title: "Seal the Relay Gate",
      titleKey: "levels.4A.title.sealTheRelayGate",
      prompt: "A relay gate is stuck half-open. Press X or click before the horde floods the maintenance rail.",
      key: "X",
      required: 8,
      timeLimitMs: 5800,
      successText: "You slam the relay gate shut and buy yourself a clean firing lane.",
      failText: "The gate seals too late. You still push through, but the surge clips you on the way in.",
      reward: {
        agility: 2,
        coins: 2
      },
      failReward: {
        agility: 1
      },
      failDamage: 8
    },
    completeText: "The route beacon steadies, and a battered service terminal blinks beside a narrow refuge.",
    completeTextKey: "levels.unknown.completeText.theRouteBeaconSteadiesAndA",
    choices: [
      {
        id: "5A",
        label: "5A - AGILE PUSH",
        labelKey: "levels.5A.label.5aAGILEPUSH",
        description: "Stay fast and risky with another mobility-heavy route.",
        descriptionKey: "levels.5A.description.stayFastAndRiskyWithAnother"
      },
      {
        id: "5B",
        label: "5B - MIDLINE SHIFT",
        labelKey: "levels.5B.label.5bMIDLINESHIFT",
        description: "Take the balanced route and split your gains.",
        descriptionKey: "levels.5B.description.takeTheBalancedRouteAndSplit"
      },
      {
        id: "5C",
        label: "5C - COURAGE SWING",
        labelKey: "levels.5C.label.5cCOURAGESWING",
        description: "Turn into the tougher route for more pressure and economy.",
        descriptionKey: "levels.5C.description.turnIntoTheTougherRouteFor"
      }
    ]
  },

  "5A": {
    id: "5A",
    title: "Glass Catwalk",
    titleKey: "levels.5A.title.glassCatwalk",
    description: "A shattered upper walkway forces you across exposed glass and broken guard rails under constant pressure.",
    descriptionKey: "levels.5A.description.aShatteredUpperWalkwayForcesYou",
    introText: "Agile route: speed matters, but so does target order. One bad turn here turns momentum into a fall.",
    introTextKey: "levels.5A.introText",
    enemySequence: ["charger", "spitter", "exploder", "fast"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "quiteParryPistol",
        text: "Quite finds a compact parry sidearm in a broken checkpoint locker. It holds 10 shots and cannot be reloaded.",
        textKey: "levels.5A.text.quiteFindsACompactParrySidearm"
      },
      {
        type: "stats",
        agility: 6,
        courage: 0,
        text: "You cross the catwalk without losing rhythm. Agility +6.",
        textKey: "levels.5A.text.youCrossTheCatwalkWithoutLosing"
      }
    ],
    emergency: {
      chance: 1,
      title: "Catch the Handrail",
      titleKey: "levels.5A.title.catchTheHandrail",
      prompt: "The catwalk gives way beneath you. Press C or click to catch the handrail before you drop.",
      key: "C",
      required: 9,
      timeLimitMs: 6000,
      successText: "You catch the rail, swing back up, and carry the momentum into the fight.",
      failText: "You recover late and hit the next exchange already shaken.",
      reward: {
        agility: 3
      },
      failReward: {
        agility: 1
      },
      failDamage: 10
    },
    completeText: "You clear the broken span and reach the last stairwell above the dead platform lights.",
    completeTextKey: "levels.unknown.completeText.youClearTheBrokenSpanAnd",
    next: "6A"
  },

  "6A": {
    id: "6A",
    title: "Blackout Relay",
    titleKey: "levels.6A.title.blackoutRelay",
    description: "The extraction relay is dead, the lights are out, and every second you spend exposed draws another shape through the dark.",
    descriptionKey: "levels.6A.description.theExtractionRelayIsDeadThe",
    introText: "Agile finale: hit 70 agility, keep your nerves, and turn the blackout into an advantage before the last sprint.",
    introTextKey: "levels.6A.introText",
    enemySequence: ["fast", "screamer", "charger", "berserker"],
    enemyCount: 4,
    emergency: {
      chance: 1,
      title: "Prime the Override",
      titleKey: "levels.6A.title.primeTheOverride",
      prompt: "The extraction relay needs a live override. Press Z or click to prime it before the chamber fully blacks out.",
      key: "Z",
      required: 10,
      timeLimitMs: 6200,
      successText: "You prime the override in time and feel the whole route snap into focus.",
      failText: "The override catches late. The chamber goes dark and you enter the fight under pressure.",
      reward: {
        agility: 5
      },
      failReward: {
        agility: 2
      },
      failDamage: 12
    },
    completeText: "You restore the relay, outrun the blackout, and hit extraction ahead of the swarm.",
    completeTextKey: "levels.6A.completeText"
  },

  "4B": {
    id: "4B",
    title: "Middle Track",
    titleKey: "levels.4B.title.middleTrack",
    description: "A supply platform offers cleaner sight lines but mixes every threat type together.",
    descriptionKey: "levels.4B.description.aSupplyPlatformOffersCleanerSight",
    introText: "Balanced route: no gimmick saves you here. Adapt weapon choice to each enemy.",
    introTextKey: "levels.4B.introText",
    enemySequence: ["heavy", "spitter", "exploder"],
    enemyCount: 3,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 2,
        courage: 2,
        text: "You keep both discipline and speed under pressure. Agility +2, Courage +2.",
        textKey: "levels.4B.text.youKeepBothDisciplineAndSpeed"
      }
    ],
    completeText: "The center route stays brutal, but your toolkit grows more reliable.",
    completeTextKey: "levels.4B.completeText",
    next: "5B"
  },

  "5B": {
    id: "5B",
    title: "Crossfire Junction",
    titleKey: "levels.5B.title.crossfireJunction",
    description: "A ruined command node forces you to answer ranged threats and charging attacks at the same time.",
    descriptionKey: "levels.5B.description.aRuinedCommandNodeForcesYou",
    introText: "Balanced route: keep enough coins for the shop, because attrition matters now.",
    introTextKey: "levels.5B.introText",
    enemySequence: ["charger", "spitter", "heavy", "screamer"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 2,
        courage: 2,
        text: "A controlled clear hardens both instincts. Agility +2, Courage +2.",
        textKey: "levels.5B.text.aControlledClearHardensBothInstincts"
      }
    ],
    completeText: "You cut power to the junction and push into the final station block.",
    completeTextKey: "levels.5B.completeText",
    next: "6B"
  },

  "6B": {
    id: "6B",
    title: "Split Verdict",
    titleKey: "levels.6B.title.splitVerdict",
    description: "The balanced route ends with every lesson layered into one prolonged fight.",
    descriptionKey: "levels.6B.description.theBalancedRouteEndsWithEvery",
    introText: "No single weapon solves this room for you.",
    introTextKey: "levels.6B.introText",
    enemySequence: ["heavy", "exploder", "berserker", "charger"],
    enemyCount: 4,
    completeText: "You survive the balanced route with a build that can flex both ways.",
    completeTextKey: "levels.6B.completeText"
  },

  "4C": {
    id: "4C",
    title: "Breach Wall",
    titleKey: "levels.4C.title.breachWall",
    description: "A barricade is buckling under the weight of the infected, but the supply cache behind it could fund the rest of the run.",
    descriptionKey: "levels.4C.description.aBarricadeIsBucklingUnderThe",
    introText: "Courage route: absorb the pressure, keep the wall standing, and turn the early haul into shop power.",
    introTextKey: "levels.4C.introText",
    enemySequence: ["heavy", "exploder", "heavy", "screamer"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 6,
        text: "The breach cache holds a bigger stack of antique coins than expected.",
        textKey: "levels.4C.text.theBreachCacheHoldsABigger"
      },
      {
        type: "stats",
        agility: 0,
        courage: 4,
        text: "You hold the wall through the impact and harden your resolve. Courage +4.",
        textKey: "levels.4C.text.youHoldTheWallThroughThe"
      }
    ],
    completeText: "The barricade finally settles, and the defended supply point is yours to strip clean.",
    completeTextKey: "levels.4C.completeText",
    choices: [
      {
        id: "5B",
        label: "5B - MIDLINE SHIFT",
        labelKey: "levels.5B.label.5bMIDLINESHIFT",
        description: "Take the balanced route and smooth out your build.",
        descriptionKey: "levels.5B.description.takeTheBalancedRouteAndSmooth"
      },
      {
        id: "5C",
        label: "5C - COURAGE SWING",
        labelKey: "levels.5C.label.5cCOURAGESWING",
        description: "Stay on the endurance line for more pressure and coins.",
        descriptionKey: "levels.5C.description.stayOnTheEnduranceLineFor"
      },
      {
        id: "5D",
        label: "5D - SALVAGE PRESS",
        labelKey: "levels.5D.label.5dSALVAGEPRESS",
        description: "Push into a brutal salvage corridor built around melee pressure and Leon's new relic path.",
        descriptionKey: "levels.5D.description.pushIntoABrutalSalvageCorridor"
      }
    ]
  },

  "5C": {
    id: "5C",
    title: "Furnace Hold",
    titleKey: "levels.5C.title.furnaceHold",
    description: "An engine-room choke point turns into a brutal siege where every block and every clean hit has to count.",
    descriptionKey: "levels.5C.description.anEngineRoomChokePointTurns",
    introText: "Courage route: this is where Leon's shield, armour, and crit scaling are supposed to matter.",
    introTextKey: "levels.5C.introText",
    enemySequence: ["heavy", "berserker", "charger", "exploder", "heavy"],
    enemyCount: 5,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 0,
        courage: 6,
        text: "You anchor the furnace line and refuse to give ground. Courage +6.",
        textKey: "levels.5C.text.youAnchorTheFurnaceLineAnd"
      }
    ],
    completeText: "The engine room falls quiet at last, with only heat shimmer and shield-ring left behind.",
    completeTextKey: "levels.5C.completeText",
    next: "6C"
  },

  "5D": {
    id: "5D",
    title: "Salvage Press",
    titleKey: "levels.5D.title.salvagePress",
    description: "A collapsing salvage line grinds shut around you while heavier infected force every retreat into dead steel.",
    descriptionKey: "levels.5D.description.aCollapsingSalvageLineGrindsShut",
    introText: "Courage route: this branch is about surviving the crush, then turning Leon's rescue tool into a real endgame edge.",
    introTextKey: "levels.5D.introText",
    enemySequence: ["charger", "heavy", "fast", "berserker"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 3,
        text: "The salvage bins still hide a few antique coins worth taking.",
        textKey: "levels.5D.text.theSalvageBinsStillHideA"
      },
      {
        type: "stats",
        agility: 0,
        courage: 4,
        text: "You keep the press moving under impossible pressure. Courage +4.",
        textKey: "levels.5D.text.youKeepThePressMovingUnder"
      },
      {
        type: "leonRescueAxe",
        text: "Leon tears a rescue axe from the salvage rack. It can wrench him free when the dead get too close.",
        textKey: "levels.5D.text.leonTearsARescueAxeFrom"
      }
    ],
    emergency: {
      chance: 1,
      title: "Brace the Bulkhead",
      titleKey: "levels.5D.title.braceTheBulkhead",
      prompt: "A salvage bulkhead starts to fold inward. Press F or click to hold it long enough to slip through.",
      key: "F",
      required: 8,
      timeLimitMs: 5800,
      successText: "You brace the bulkhead just long enough to keep the route open.",
      failText: "The bulkhead buckles early and clips you on the squeeze through.",
      reward: {
        courage: 2,
        coins: 2
      },
      failReward: {
        courage: 1
      },
      failDamage: 10
    },
    completeText: "The salvage line sputters out behind you, leaving only a red-lit gate block ahead.",
    completeTextKey: "levels.unknown.completeText.theSalvageLineSputtersOutBehind",
    next: "6D"
  },

  "6C": {
    id: "6C",
    title: "Last Bastion",
    titleKey: "levels.6C.title.lastBastion",
    description: "The final extraction holdout forces you to answer a full siege package with no wasted actions and no panic.",
    descriptionKey: "levels.6C.description.theFinalExtractionHoldoutForcesYou",
    introText: "Courage finale: identify the priority target fast, weather the burst, and let the build you funded carry you home.",
    introTextKey: "levels.6C.introText",
    enemySequence: ["heavy", "screamer", "berserker", "heavy", "charger"],
    enemyCount: 5,
    completeText: "You survive the holdout, drag yourself through extraction, and leave the station impossible to shake.",
    completeTextKey: "levels.6C.completeText"
  },

  "6D": {
    id: "6D",
    title: "Lockjaw Gate",
    titleKey: "levels.6D.title.lockjawGate",
    description: "The last Courage endpoint pins you between a jammed blast gate and repeated impact waves that want to drag you under.",
    descriptionKey: "levels.6D.description.theLastCourageEndpointPinsYou",
    introText: "Courage finale: hold the line, keep the gate sequence alive, and let Leon's rescue axe turn close calls into openings.",
    introTextKey: "levels.6D.introText",
    enemySequence: ["charger", "heavy", "berserker", "heavy", "charger"],
    enemyCount: 5,
    emergencySequence: {
      sequenceTitle: "Ram Gate Lockdown",
      steps: [
        {
          title: "CUT THE CHAIN",
          titleKey: "levels.6D.title.cutTHECHAIN",
          prompt: "The locking chain catches on the floor track. Press X or click to hack it loose before the next impact.",
          key: "X",
          required: 7,
          timeLimitMs: 5500
        },
        {
          title: "CRANK THE GATE",
          titleKey: "levels.6D.title.crankTHEGATE",
          prompt: "The gate motor fights you all the way. Press V or click to force the last crank into place.",
          key: "V",
          required: 9,
          timeLimitMs: 6000
        }
      ],
      successText: "The gate finally locks down and buys you one clean stand before the last rush.",
      failText: "The lockdown sequence stutters and the impact wave catches you half-covered.",
      reward: {
        courage: 3,
        coins: 2
      },
      failReward: {
        courage: 1
      },
      failDamage: 12
    },
    completeText: "You hold Lockjaw Gate, survive the final crush, and force the last route open by sheer stubbornness.",
    completeTextKey: "levels.unknown.completeText.youHoldLockjawGateSurviveThe"
  }
};
