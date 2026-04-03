// levels.js
export const LEVELS = {
  "1": {
    id: "1",
    title: "Shadows of the Metro",
    description: "A desolate metro station stretches before you.",
    introText: "A muffled growl echoes from a nearby staff room.",
    enemyPool: ["regular"],
    enemyCount: 1,
    rewards: [],
    completeText: "You clear the area and move deeper into the station.",
    next: "2"
  },

  "2": {
    id: "2",
    title: "Horde on the Stairs",
    description: "A staircase is choked with the undead.",
    introText: "The way forward is blocked by multiple zombies.",
    enemyPool: ["regular", "fast"],
    enemyCount: 2,
    rewards: [],
    completeText: "You survive the staircase ambush.",
    next: "3"
  },

  "3": {
    id: "3",
    title: "Key Among Corpses",
    description: "A reinforced door blocks your progress.",
    introText: "You hear snarling behind the guard area.",
    enemyPool: ["regular", "fast", "heavy"],
    enemyCount: 3,
    rewards: [
      {
        type: "pistolMagUpgrade",
        value: 12,
        text: "You found an extended pistol magazine. Capacity increased to 12."
      }
    ],
    completeText: "A split in the ruined floor ahead forces you to choose your route.",
    choices: [
      {
        id: "4A",
        label: "4A - BLOODLUST",
        description: "More zombies, more resources."
      },
      {
        id: "4B",
        label: "4B - GREED",
        description: "A route that may contain explosive supplies."
      },
      {
        id: "4C",
        label: "4C - COWARDICE",
        description: "Fewer zombies and a safer path out."
      }
    ]
  },

  "4A": {
    id: "4A",
    title: "Blood Corridor",
    description: "You choose the loud route through the infested blood corridor.",
    introText: "Shapes crawl in the dark. This path will cost bullets.",
    enemyPool: ["regular", "fast", "heavy"],
    enemyCount: 4,
    rewards: [
      {
        type: "medKits",
        value: 1,
        text: "You scavenge a med kit from the aftermath."
      },
      {
        type: "pistolAmmo",
        value: 8,
        text: "You collect extra pistol ammo from fallen gear."
      }
    ],
    completeText: "You survive the swarm and push toward the next chamber.",
    next: "5A"
  },

  "4B": {
    id: "4B",
    title: "Grenade Cache",
    description: "You head toward a damaged military cache room.",
    introText: "You spot warning paint and shattered crates ahead.",
    enemyPool: ["regular", "fast"],
    enemyCount: 2,
    rewards: [
      {
        type: "grenades",
        value: 2,
        text: "You find a grenade stash inside the broken cache."
      }
    ],
    completeText: "You secure the cache and force the next door open.",
    next: "5B"
  },

  "4C": {
    id: "4C",
    title: "Coward's Passage",
    description: "You slip into a narrow side route to avoid the worst of the horde.",
    introText: "It is quieter here, but the air feels suffocating.",
    enemyPool: ["regular"],
    enemyCount: 1,
    rewards: [
      {
        type: "medKits",
        value: 1,
        text: "You find a small emergency med pouch tucked into the wall."
      }
    ],
    completeText: "You take the safer route and advance without drawing a large horde.",
    next: "5C"
  },

  "5A": {
    id: "5A",
    title: "Furnace Hall",
    description: "Heat and smoke choke the corridor as tougher infected close in.",
    introText: "You hear armored footsteps and panicked breathing in the vents.",
    enemyPool: ["fast", "heavy", "spitter"],
    enemyCount: 4,
    rewards: [
      {
        type: "grenades",
        value: 1,
        text: "You recover a grenade from a ruined tactical bag."
      }
    ],
    completeText: "The furnace hall falls silent after a brutal exchange.",
    next: "6A"
  },

  "5B": {
    id: "5B",
    title: "Blast Junction",
    description: "A junction full of ruptured tanks and unstable debris blocks the way.",
    introText: "A thin laser attachment glints under a dead soldier's arm.",
    enemyPool: ["fast", "spitter"],
    enemyCount: 3,
    rewards: [
      {
        type: "pistolLaser",
        text: "You attach a laser sight to your pistol. Damage is improved."
      }
    ],
    completeText: "You cross the junction with improved firepower.",
    next: "6B"
  },

  "5C": {
    id: "5C",
    title: "Service Crawlspace",
    description: "The path narrows into a maintenance crawlspace with only a few threats.",
    introText: "The scraping above you never really stops.",
    enemyPool: ["regular", "fast"],
    enemyCount: 2,
    rewards: [
      {
        type: "pistolAmmo",
        value: 6,
        text: "You recover loose pistol rounds from a maintenance locker."
      }
    ],
    completeText: "You squeeze out of the crawlspace and see the exit route ahead.",
    next: "6C"
  },

  "6A": {
    id: "6A",
    title: "Last Stand Platform",
    description: "The platform ahead floods with infected from every direction.",
    introText: "This is the price of taking the violent route.",
    enemyPool: ["heavy", "spitter", "regular"],
    enemyCount: 5,
    rewards: [],
    completeText: "You hold your ground and survive the final wave of this route."
  },

  "6B": {
    id: "6B",
    title: "Demolition Exit",
    description: "You force your way through a demolition access lane toward the upper floor.",
    introText: "The walls tremble as unstable explosives crack nearby.",
    enemyPool: ["heavy", "spitter"],
    enemyCount: 4,
    rewards: [],
    completeText: "You blast your way through and secure the exit to the next sector."
  },

  "6C": {
    id: "6C",
    title: "Quiet Escape",
    description: "The final corridor is mostly empty, but the silence feels wrong.",
    introText: "Only a few infected remain between you and the next floor.",
    enemyPool: ["regular", "fast"],
    enemyCount: 2,
    rewards: [],
    completeText: "You slip past the last threats and reach the next sector alive."
  }
};