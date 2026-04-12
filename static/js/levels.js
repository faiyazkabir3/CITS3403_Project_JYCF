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
    title: "Emergency Tunnel",
    description: "Sirens flash over a cracked maintenance tunnel while fast infected keep pouring through.",
    introText: "Agile route: emergency events can appear here. Spam the shown key fast enough to gain extra agility.",
    enemySequence: ["fast", "charger", "spitter"],
    enemyCount: 3,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 3,
        courage: 0,
        text: "The frantic escape sharpens your timing. Agility +3."
      }
    ],
    emergency: {
      chance: 1,
      title: "Emergency Event",
      prompt: "A side gate jams shut. Press X or click the button before the horde reaches you.",
      key: "X",
      required: 8,
      timeLimitMs: 11000,
      successText: "You force the gate shut and buy yourself a clean angle on the next wave.",
      failText: "The gate gives late. You survive, but the horde clips you on the way through.",
      reward: {
        agility: 2,
        coins: 2
      },
      failReward: {
        agility: 1
      },
      failDamage: 8
    },
    completeText: "You outrun the surge and reach a narrow refuge with a battered service terminal.",
    choiceCount: 2,
    choicePool: [
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
    title: "Quickstep Trial",
    description: "The route narrows into a blur of rushing threats and unstable fuel drums.",
    introText: "Agile route: quick, accurate turns matter more than raw durability here.",
    enemySequence: ["fast", "charger", "exploder", "spitter"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "stats",
        agility: 5,
        courage: 0,
        text: "Clearing the tunnel at full speed unlocks a burst of confidence. Agility +5."
      }
    ],
    emergency: {
      chance: 0.7,
      title: "Emergency Event",
      prompt: "The floor collapses behind you. Press X or click to scramble clear in time.",
      key: "X",
      required: 9,
      timeLimitMs: 12000,
      successText: "You clear the collapse and turn the momentum into a faster first shot.",
      failText: "You climb out late and hit the next fight already rattled.",
      reward: {
        agility: 2
      },
      failReward: {
        agility: 1
      },
      failDamage: 10
    },
    completeText: "You escape the cave-in and find the final stairwell above the platform fire.",
    next: "6A"
  },

  "6A": {
    id: "6A",
    title: "Swift Finale",
    description: "The last agile route chamber throws relentless motion at you with almost no room to rest.",
    introText: "Everything here is built to punish hesitation.",
    enemySequence: ["fast", "charger", "berserker"],
    enemyCount: 3,
    completeText: "You survive the agile route and leave the station quicker than anything hunting you."
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
        type: "pistolLaser",
        text: "You salvage a laser sight from an emergency locker. Pistol damage is improved."
      },
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
    completeText: "You survive the balanced route with a build that can flex both ways."
  },

  "4C": {
    id: "4C",
    title: "Fortified Line",
    description: "The courage route is slower, louder, and full of targets worth more coins.",
    introText: "Courage route: expect more zombies, more punishment, and more shop money if you endure it.",
    enemySequence: ["heavy", "exploder", "heavy", "fast"],
    enemyCount: 4,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 4,
        text: "The barricade stash yields extra antique coins."
      },
      {
        type: "stats",
        agility: 0,
        courage: 3,
        text: "Holding the line builds resolve. Courage +3."
      }
    ],
    completeText: "The heavy route hurts, but the haul is real.",
    choiceCount: 2,
    choicePool: [
      {
        id: "5A",
        label: "5A - AGILE PUSH",
        description: "Swing hard into the faster route and chase agility."
      },
      {
        id: "5B",
        label: "5B - MIDLINE SHIFT",
        description: "Take the balanced route and smooth out your build."
      },
      {
        id: "5C",
        label: "5C - COURAGE SWING",
        description: "Stay on the endurance line for more pressure and coins."
      }
    ]
  },

  "5C": {
    id: "5C",
    title: "Stand Firm",
    description: "A reinforced platform becomes a war of endurance against the toughest infected in the station.",
    introText: "Courage route: this fight is built for shield durability, crit chains, and coin farming.",
    enemySequence: ["heavy", "berserker", "exploder", "charger", "spitter"],
    enemyCount: 5,
    shopAfterClear: true,
    rewards: [
      {
        type: "coins",
        value: 6,
        text: "A crashed convoy adds more antique coins to your pack."
      },
      {
        type: "stats",
        agility: 0,
        courage: 5,
        text: "You refuse to break under pressure. Courage +5."
      }
    ],
    completeText: "The roar finally dies down and leaves only the ringing in your shield arm.",
    next: "6C"
  },

  "6C": {
    id: "6C",
    title: "Iron Exit",
    description: "The final courage route chamber dumps the station's hardest bodies into one last brawl.",
    introText: "Tank too much and you fold. Spend your economy well and you outlast the swarm.",
    enemySequence: ["heavy", "exploder", "berserker", "screamer", "charger"],
    enemyCount: 5,
    completeText: "You survive the courage route and leave richer, scarred, and impossible to shake."
  }
};
