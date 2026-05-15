export const LEVELS = {
  "1": {
    id: "1",
    title: "First Cut",
    description: "A fast infected darts between abandoned carriages and tests your reflexes.",
    introText: "Tutorial 1: fast targets hate close pressure. Knife strikes land cleanly while grenades feel clumsy.",
    enemySequence: ["fast"],
    enemyCount: 1,
    shopAfterClear: true,
    completeText: "You steady your breathing and find the first survivor cache.",
    next: "2"
  },

  "2": {
    id: "2",
    title: "Armour Lesson",
    description: "One plated brute blocks the hall while a ranged mutant spits from the backline.",
    introText: "Tutorial 2: heavy targets shrug off knives, and spitters punish careless close combat.",
    enemySequence: ["heavy", "spitter"],
    enemyCount: 2,
    shopAfterClear: true,
    completeText: "The corridor opens into a supply bay with just enough time to regroup.",
    next: "3"
  },

  "3": {
    id: "3",
    title: "Skill Check",
    description: "A charger lines up its rush while a screamer prepares to call the whole station down on you.",
    introText: "Tutorial 3: dodging matters. The charger rewards patience, and the screamer must be removed quickly.",
    enemySequence: ["charger", "screamer"],
    enemyCount: 2,
    shopAfterClear: true,
    completeText: "Three route beacons flicker to life. Your next decision shapes the build for the run.",
    choices: [
      {
        id: "4A",
        label: "4A - AGILE PATH",
        description: "Emergency events, evasive fights, and larger agility gains."
      },
      {
        id: "4C",
        label: "4C - COURAGE PATH",
        description: "Longer fights, heavier enemies, and more coins for the shop."
      }
    ]
  },

  "4A": {
    id: "4A",
    title: "Signal Sprint",
    description: "A broken maintenance rail flickers back to life while infected flood the side lanes toward your beacon.",
    introText: "Agile route: react fast, delete priority threats, and turn emergency pressure into permanent speed.",
    enemySequence: ["screamer", "fast", "charger"],
    enemyCount: 3,
    shopAfterClear: true,
    rewards: [
      {
        type: "pistolLaser",
        text: "You restore a relay sight module and fit it onto the pistol. Laser pistol unlocked."
      },
      {
        type: "stats",
        agility: 4,
        courage: 0,
        text: "You clear the beacon line at full speed. Agility +4."
      }
    ],
    emergency: {
      chance: 1,
      title: "Seal the Relay Gate",
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
    choices: [
      {
        id: "5A",
        label: "5A - AGILE PUSH",
        description: "Stay fast and risky with another mobility-heavy route."
      },
      {
        id: "5B",
        label: "5B - MIDLINE SHIFT",
        description: "Take the balanced route and split your gains."
      },
      {
        id: "5C",
        label: "5C - COURAGE SWING",
        description: "Turn into the tougher route for more pressure and economy."
      }
    ]
  },

  "5A": {
    id: "5A",
    title: "Glass Catwalk",
    description: "A shattered upper walkway forces you across exposed glass and broken guard rails under constant pressure.",
    introText: "Agile route: speed matters, but so does target order. One bad turn here turns momentum into a fall.",
    enemySequence: ["charger", "spitter", "exploder", "fast"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "quiteParryPistol",
        text: "Quite finds a compact parry sidearm in a broken checkpoint locker. It holds 10 shots and cannot be reloaded."
      },
      {
        type: "stats",
        agility: 6,
        courage: 0,
        text: "You cross the catwalk without losing rhythm. Agility +6."
      }
    ],
    emergency: {
      chance: 1,
      title: "Catch the Handrail",
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
    next: "6A"
  },

  "6A": {
    id: "6A",
    title: "Blackout Relay",
    description: "The extraction relay is dead, the lights are out, and every second you spend exposed draws another shape through the dark.",
    introText: "Agile finale: hit 70 agility, keep your nerves, and turn the blackout into an advantage before the last sprint.",
    enemySequence: ["fast", "screamer", "charger", "berserker"],
    enemyCount: 4,
    emergency: {
      chance: 1,
      title: "Prime the Override",
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
    completeText: "You restore the relay, outrun the blackout, and find the quarantine route still sealed ahead.",
    next: "7"
  },

  "4B": {
    id: "4B",
    title: "Middle Track",
    description: "A supply platform offers cleaner sight lines but mixes every threat type together.",
    introText: "Balanced route: no gimmick saves you here. Adapt weapon choice to each enemy.",
    enemySequence: ["heavy", "spitter", "exploder"],
    enemyCount: 3,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 2,
        courage: 2,
        text: "You keep both discipline and speed under pressure. Agility +2, Courage +2."
      }
    ],
    completeText: "The center route stays brutal, but your toolkit grows more reliable.",
    next: "5B"
  },

  "5B": {
    id: "5B",
    title: "Crossfire Junction",
    description: "A ruined command node forces you to answer ranged threats and charging attacks at the same time.",
    introText: "Balanced route: keep enough coins for the shop, because attrition matters now.",
    enemySequence: ["charger", "spitter", "heavy", "screamer"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 2,
        courage: 2,
        text: "A controlled clear hardens both instincts. Agility +2, Courage +2."
      }
    ],
    completeText: "You cut power to the junction and push into the final station block.",
    next: "6B"
  },

  "6B": {
    id: "6B",
    title: "Split Verdict",
    description: "The balanced route ends with every lesson layered into one prolonged fight.",
    introText: "No single weapon solves this room for you.",
    enemySequence: ["heavy", "exploder", "berserker", "charger"],
    enemyCount: 4,
    completeText: "You survive the balanced route with a build that can flex both ways, then catch the quarantine gate cycling open.",
    next: "7"
  },

  "4C": {
    id: "4C",
    title: "Breach Wall",
    description: "A barricade is buckling under the weight of the infected, but the supply cache behind it could fund the rest of the run.",
    introText: "Courage route: absorb the pressure, keep the wall standing, and turn the early haul into shop power.",
    enemySequence: ["heavy", "exploder", "heavy", "screamer"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 6,
        text: "The breach cache holds a bigger stack of antique coins than expected."
      },
      {
        type: "stats",
        agility: 0,
        courage: 4,
        text: "You hold the wall through the impact and harden your resolve. Courage +4."
      }
    ],
    completeText: "The barricade finally settles, and the defended supply point is yours to strip clean.",
    choices: [
      {
        id: "5B",
        label: "5B - MIDLINE SHIFT",
        description: "Take the balanced route and smooth out your build."
      },
      {
        id: "5C",
        label: "5C - COURAGE SWING",
        description: "Stay on the endurance line for more pressure and coins."
      },
      {
        id: "5D",
        label: "5D - SALVAGE PRESS",
        description: "Push into a brutal salvage corridor built around melee pressure and Leon's new relic path."
      }
    ]
  },

  "5C": {
    id: "5C",
    title: "Furnace Hold",
    description: "An engine-room choke point turns into a brutal siege where every block and every clean hit has to count.",
    introText: "Courage route: this is where Leon's shield, armour, and crit scaling are supposed to matter.",
    enemySequence: ["heavy", "berserker", "charger", "exploder", "heavy"],
    enemyCount: 5,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 0,
        courage: 6,
        text: "You anchor the furnace line and refuse to give ground. Courage +6."
      }
    ],
    completeText: "The engine room falls quiet at last, with only heat shimmer and shield-ring left behind.",
    next: "6C"
  },

  "5D": {
    id: "5D",
    title: "Salvage Press",
    description: "A collapsing salvage line grinds shut around you while heavier infected force every retreat into dead steel.",
    introText: "Courage route: this branch is about surviving the crush, then turning Leon's rescue tool into a real endgame edge.",
    enemySequence: ["charger", "heavy", "fast", "berserker"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 3,
        text: "The salvage bins still hide a few antique coins worth taking."
      },
      {
        type: "stats",
        agility: 0,
        courage: 4,
        text: "You keep the press moving under impossible pressure. Courage +4."
      },
      {
        type: "leonRescueAxe",
        text: "Leon tears a rescue axe from the salvage rack. It can wrench him free when the dead get too close."
      }
    ],
    emergency: {
      chance: 1,
      title: "Brace the Bulkhead",
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
    next: "6D"
  },

  "6C": {
    id: "6C",
    title: "Last Bastion",
    description: "The final extraction holdout forces you to answer a full siege package with no wasted actions and no panic.",
    introText: "Courage finale: identify the priority target fast, weather the burst, and let the build you funded carry you home.",
    enemySequence: ["heavy", "screamer", "berserker", "heavy", "charger"],
    enemyCount: 5,
    completeText: "You survive the holdout and reach a quarantine cache stamped with biohazard warnings.",
    next: "7"
  },

  "6D": {
    id: "6D",
    title: "Lockjaw Gate",
    description: "The last Courage endpoint pins you between a jammed blast gate and repeated impact waves that want to drag you under.",
    introText: "Courage finale: hold the line, keep the gate sequence alive, and let Leon's rescue axe turn close calls into openings.",
    enemySequence: ["charger", "heavy", "berserker", "heavy", "charger"],
    enemyCount: 5,
    emergencySequence: {
      sequenceTitle: "Ram Gate Lockdown",
      steps: [
        {
          title: "CUT THE CHAIN",
          prompt: "The locking chain catches on the floor track. Press X or click to hack it loose before the next impact.",
          key: "X",
          required: 7,
          timeLimitMs: 5500
        },
        {
          title: "CRANK THE GATE",
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
    completeText: "You hold Lockjaw Gate, survive the final crush, and force the quarantine route open by sheer stubbornness.",
    next: "7"
  },

  "7": {
    id: "7",
    title: "Quarantine Cache",
    description: "A sealed emergency locker waits outside the bio-research facility gate.",
    introText: "Bonus level: the cache unlocks with a tired hydraulic cough. You grab rifle ammunition and medkits before the final breach.",
    enemySequence: [],
    enemyCount: 0,
    autoComplete: true,
    manualContinueAfterClear: true,
    rewards: [
      {
        type: "supplies",
        rifle: true,
        rifleAmmo: 10,
        medKits: 3,
        text: "The quarantine cache grants rifle access, 10 rifle rounds, and 3 medkits."
      }
    ],
    completeText: "The locker slams shut behind you. Only the bio-research facility gate remains.",
    next: "8"
  },

  "8": {
    id: "8",
    title: "Nemesis-T Type",
    description: "A biohazardous research lab stretches beyond the quarantine gate, all warning lights and cracked containment glass.",
    introText: "The operator forces open the quarantine gate into a bio-research facility. Sirens flood the lab, glass containment tanks split, and something enormous answers from the dark.",
    enemySequence: ["nemesisT"],
    enemyCount: 1,
    completeText: "Nemesis-T Type collapses under the lab strobes. The facility falls silent, and the mission is finally over."
  }
};
