export const FACTIONS = [
  {
    id: "uk",
    name: "United Kingdom",
    shortName: "UK",
    doctrine: "Radar, navy, commandos, resilient combined arms.",
    style: "Controls enemy tempo, blocks aircraft well, and wins with tough midrange units.",
    colors: ["#1f4e79", "#b7c6d8"]
  },
  {
    id: "germany",
    name: "Germany",
    shortName: "Germany",
    doctrine: "Blitzkrieg armor, dive bombers, flak, and fast operational pressure.",
    style: "Starts fast, exhausts supply aggressively, and punishes slow defensive decks.",
    art: "/assets/factions/germany.png",
    colors: ["#343434", "#b7a27a"]
  },
  {
    id: "france",
    name: "France",
    shortName: "France",
    doctrine: "Fortifications, field guns, cavalry tanks, and resistance networks.",
    style: "Builds a hard defensive line, trades profitably, then counters with resistance units.",
    colors: ["#254f8d", "#d7d9d6"]
  },
  {
    id: "italy",
    name: "Italy",
    shortName: "Italy",
    doctrine: "Mediterranean raids, mountain troops, cruisers, and risky tempo.",
    style: "Uses cheap mobile units and combat tricks to slip damage past larger armies.",
    colors: ["#2f6f4f", "#c9b879"]
  },
  {
    id: "russia",
    name: "Russia",
    shortName: "Russia",
    doctrine: "Deep battle, mass infantry, rockets, winter pressure, and Guards formations.",
    style: "Trades units freely, creates bodies, and turns the late game into a grinding front.",
    colors: ["#7c1d1d", "#d5c7a1"]
  },
  {
    id: "japan",
    name: "Japan",
    shortName: "Japan",
    doctrine: "Carrier air power, island garrisons, night torpedoes, and infiltration.",
    style: "Combines evasive threats with decisive air and naval strikes.",
    colors: ["#8f2f28", "#d8c49a"]
  },
  {
    id: "usa",
    name: "United States",
    shortName: "USA",
    doctrine: "Industry, logistics, air superiority, amphibious landings, and heavy ships.",
    style: "Ramps supply and cards, then overwhelms the board with efficient combined arms.",
    colors: ["#244b7a", "#c8ad68"]
  },
  {
    id: "australia",
    name: "Australia",
    shortName: "Australia",
    doctrine: "ANZAC patrols, desert endurance, jungle fighting, and coastwatcher intelligence.",
    style: "Excels at ambush defense, attrition, and hard-to-block infantry pressure.",
    art: "/assets/factions/australia.png",
    colors: ["#315b45", "#d2b16d"]
  }
];

export const KEYWORDS = {
  Airborne: "Can only be blocked by Airborne or AA units.",
  AA: "Can block Airborne units.",
  Ambush: "Deals combat damage before units without Ambush.",
  Armor: "Prevents 1 damage each time this unit would take damage.",
  Blitz: "Can attack on the turn it deploys.",
  Breakthrough: "Excess combat damage to a blocker hits the enemy HQ.",
  Entrenched: "Does not exhaust when attacking.",
  Garrison: "Cannot attack.",
  Infiltrate: "Cannot be blocked by units with 4 or more attack."
};

const commonCards = [
  {
    id: "common-supply-line",
    name: "Supply Line",
    type: "supply",
    cost: 0,
    text: "Play one Supply Line each turn. It increases your maximum supply by 1.",
    copies: 15
  },
  {
    id: "common-artillery-barrage",
    name: "Artillery Barrage",
    type: "tactic",
    cost: 3,
    target: "enemyUnitOrHQ",
    text: "Deal 3 damage to an enemy unit or HQ.",
    effects: [{ type: "damage", amount: 3, target: "selected" }],
    copies: 1
  },
  {
    id: "common-field-hospital",
    name: "Field Hospital",
    type: "tactic",
    cost: 2,
    target: "friendlyUnitOrHQ",
    text: "Heal 4 damage from your HQ or one friendly unit.",
    effects: [{ type: "heal", amount: 4, target: "selected" }],
    copies: 1
  },
  {
    id: "common-recon-flight",
    name: "Recon Flight",
    type: "tactic",
    cost: 2,
    text: "Draw 2 cards.",
    effects: [{ type: "draw", amount: 2 }],
    copies: 1
  },
  {
    id: "common-entrenching-orders",
    name: "Entrenching Orders",
    type: "tactic",
    cost: 1,
    target: "friendlyUnit",
    text: "A friendly unit gets +0/+3 and Ambush until end of turn.",
    effects: [{ type: "buff", attack: 0, defense: 3, keywords: ["Ambush"], target: "selected" }],
    copies: 1
  },
  {
    id: "common-logistics-convoy",
    name: "Logistics Convoy",
    type: "tactic",
    cost: 1,
    text: "Gain 2 temporary supply this turn. Draw 1 card.",
    effects: [{ type: "supplyBurst", amount: 2 }, { type: "draw", amount: 1 }],
    copies: 1
  }
];

const tokenCards = [
  {
    id: "token-conscript",
    name: "Conscript Squad",
    type: "unit",
    cost: 0,
    attack: 1,
    defense: 1,
    tags: ["Infantry"],
    keywords: [],
    text: "Token infantry.",
    token: true
  },
  {
    id: "token-resistance-volunteer",
    name: "Resistance Volunteer",
    type: "unit",
    cost: 0,
    attack: 1,
    defense: 1,
    tags: ["Infantry", "Resistance"],
    keywords: ["Infiltrate"],
    text: "Infiltrate.",
    token: true
  }
];

const factionCards = {
  uk: [
    {
      id: "uk-home-guard",
      name: "Home Guard Platoon",
      type: "unit",
      cost: 1,
      attack: 1,
      defense: 4,
      tags: ["Infantry"],
      keywords: ["Garrison"],
      text: "Garrison. On deployment, heal your HQ for 2.",
      effects: [{ type: "healHQ", amount: 2 }],
      copies: 3
    },
    {
      id: "uk-spitfire-wing",
      name: "RAF Spitfire Wing",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 2,
      tags: ["Aircraft"],
      keywords: ["Airborne", "AA"],
      target: "enemyUnitOrHQ",
      text: "Airborne, AA. On deployment, deal 1 damage to an enemy unit or HQ.",
      effects: [{ type: "damage", amount: 1, target: "selected" }],
      copies: 3
    },
    {
      id: "uk-matilda-ii",
      name: "Matilda II Infantry Tank",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 5,
      tags: ["Tank"],
      keywords: ["Armor"],
      text: "Armor.",
      copies: 3
    },
    {
      id: "uk-destroyer-escort",
      name: "Royal Navy Destroyer",
      type: "unit",
      cost: 4,
      attack: 3,
      defense: 4,
      tags: ["Naval"],
      keywords: ["AA"],
      text: "AA. On deployment, draw 1 card.",
      effects: [{ type: "draw", amount: 1 }],
      copies: 2
    },
    {
      id: "uk-radar-chain",
      name: "Chain Home Radar",
      type: "operation",
      cost: 2,
      text: "Enemy Airborne units get -1 attack.",
      passive: { enemyStatPenalty: { keyword: "Airborne", attack: -1, defense: 0 } },
      copies: 2
    },
    {
      id: "uk-commando-raid",
      name: "Commando Raid",
      type: "tactic",
      cost: 2,
      target: "enemyUnit",
      text: "Exhaust an enemy unit. Draw 1 card.",
      effects: [{ type: "exhaust", target: "selected" }, { type: "draw", amount: 1 }],
      copies: 2
    },
    {
      id: "uk-desert-rats",
      name: "Desert Rats",
      type: "unit",
      cost: 4,
      attack: 3,
      defense: 3,
      tags: ["Infantry", "Desert"],
      keywords: ["Ambush", "Entrenched"],
      text: "Ambush, Entrenched.",
      copies: 3
    },
    {
      id: "uk-churchills-resolve",
      name: "Churchill's Resolve",
      type: "tactic",
      cost: 3,
      target: "friendlyUnit",
      text: "Heal your HQ for 4. A friendly unit gets +1/+1 until end of turn.",
      effects: [{ type: "healHQ", amount: 4 }, { type: "buff", attack: 1, defense: 1, target: "selected" }],
      copies: 2
    }
  ],
  germany: [
    {
      id: "de-panzer-spearhead",
      name: "Panzer III Spearhead",
      type: "unit",
      cost: 2,
      attack: 3,
      defense: 2,
      tags: ["Tank"],
      keywords: ["Blitz"],
      text: "Blitz.",
      copies: 3
    },
    {
      id: "de-stuka-wing",
      name: "Stuka Dive Bombers",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 1,
      tags: ["Aircraft"],
      keywords: ["Airborne", "Blitz"],
      target: "enemyUnitOrHQ",
      text: "Airborne, Blitz. On deployment, deal 2 damage to an enemy unit or HQ.",
      effects: [{ type: "damage", amount: 2, target: "selected" }],
      copies: 3
    },
    {
      id: "de-flak-88",
      name: "88mm Flak Battery",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 4,
      tags: ["Artillery"],
      keywords: ["AA", "Ambush"],
      text: "AA, Ambush.",
      copies: 3
    },
    {
      id: "de-u-boat-wolfpack",
      name: "U-Boat Wolfpack",
      type: "tactic",
      cost: 3,
      text: "Deal 3 damage to the enemy HQ. Draw 1 card.",
      effects: [{ type: "damageEnemyHQ", amount: 3 }, { type: "draw", amount: 1 }],
      copies: 2
    },
    {
      id: "de-fallschirmjager",
      name: "Fallschirmjager Drop",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Airborne"],
      keywords: ["Airborne", "Blitz"],
      text: "Airborne, Blitz.",
      copies: 2
    },
    {
      id: "de-tiger-tank",
      name: "Tiger Heavy Tank",
      type: "unit",
      cost: 6,
      attack: 5,
      defense: 6,
      tags: ["Tank"],
      keywords: ["Armor", "Breakthrough"],
      text: "Armor, Breakthrough.",
      copies: 2
    },
    {
      id: "de-blitzkrieg-orders",
      name: "Blitzkrieg Orders",
      type: "tactic",
      cost: 2,
      text: "Friendly units get +1/+0 and Blitz until end of turn.",
      effects: [{ type: "buffAll", side: "friendly", attack: 1, defense: 0, keywords: ["Blitz"] }],
      copies: 3
    },
    {
      id: "de-enigma-intercept",
      name: "Enigma Intercept",
      type: "tactic",
      cost: 2,
      text: "Draw 2 cards. Deal 1 damage to the enemy HQ.",
      effects: [{ type: "draw", amount: 2 }, { type: "damageEnemyHQ", amount: 1 }],
      copies: 2
    }
  ],
  france: [
    {
      id: "fr-maginot-fort",
      name: "Maginot Fortification",
      type: "unit",
      cost: 2,
      attack: 0,
      defense: 7,
      tags: ["Fortification"],
      keywords: ["Garrison", "AA"],
      text: "Garrison, AA.",
      copies: 3
    },
    {
      id: "fr-foreign-legion",
      name: "Foreign Legion Company",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 3,
      tags: ["Infantry"],
      keywords: ["Ambush"],
      text: "Ambush.",
      copies: 3
    },
    {
      id: "fr-somua-s35",
      name: "Somua S35 Cavalry Tank",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 4,
      tags: ["Tank"],
      keywords: ["Armor"],
      text: "Armor.",
      copies: 3
    },
    {
      id: "fr-free-french-column",
      name: "Free French Column",
      type: "unit",
      cost: 4,
      attack: 2,
      defense: 3,
      tags: ["Infantry", "Resistance"],
      keywords: [],
      text: "On deployment, create a 1/1 Resistance Volunteer with Infiltrate.",
      effects: [{ type: "createToken", cardId: "token-resistance-volunteer" }],
      copies: 2
    },
    {
      id: "fr-maquis-cell",
      name: "Maquis Resistance Cell",
      type: "unit",
      cost: 2,
      attack: 1,
      defense: 2,
      tags: ["Infantry", "Resistance"],
      keywords: ["Infiltrate"],
      text: "Infiltrate. When this unit is destroyed, draw 1 card.",
      onDeath: [{ type: "draw", amount: 1 }],
      copies: 2
    },
    {
      id: "fr-field-gun-75",
      name: "75mm Field Gun",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 3,
      tags: ["Artillery"],
      keywords: ["AA", "Garrison"],
      target: "enemyUnit",
      text: "AA, Garrison. On deployment, deal 2 damage to an enemy unit.",
      effects: [{ type: "damage", amount: 2, target: "selected" }],
      copies: 2
    },
    {
      id: "fr-defensive-doctrine",
      name: "Defensive Doctrine",
      type: "operation",
      cost: 2,
      text: "Friendly units get +0/+1.",
      passive: { statBonus: { attack: 0, defense: 1 } },
      copies: 3
    },
    {
      id: "fr-sabotage-rails",
      name: "Sabotage Rail Lines",
      type: "tactic",
      cost: 2,
      target: "enemyUnit",
      text: "Exhaust an enemy unit and deal 2 damage to it.",
      effects: [{ type: "exhaust", target: "selected" }, { type: "damage", amount: 2, target: "selected" }],
      copies: 2
    }
  ],
  italy: [
    {
      id: "it-bersaglieri",
      name: "Bersaglieri Motorcyclists",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 1,
      tags: ["Infantry", "Motorized"],
      keywords: ["Blitz", "Infiltrate"],
      text: "Blitz, Infiltrate.",
      copies: 3
    },
    {
      id: "it-m13-40",
      name: "M13/40 Tank Company",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 3,
      tags: ["Tank"],
      keywords: ["Armor"],
      text: "Armor.",
      copies: 3
    },
    {
      id: "it-folgore",
      name: "Folgore Paratroopers",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Airborne"],
      keywords: ["Airborne", "Ambush"],
      text: "Airborne, Ambush.",
      copies: 3
    },
    {
      id: "it-regia-cruiser",
      name: "Regia Marina Cruiser",
      type: "unit",
      cost: 4,
      attack: 4,
      defense: 3,
      tags: ["Naval"],
      keywords: ["AA"],
      text: "AA. When this damages enemy HQ, draw 1 card.",
      onHitHQ: [{ type: "draw", amount: 1 }],
      copies: 2
    },
    {
      id: "it-alpini",
      name: "Alpini Mountain Troops",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 4,
      tags: ["Infantry", "Mountain"],
      keywords: ["Ambush"],
      text: "Ambush.",
      copies: 2
    },
    {
      id: "it-decima-mas",
      name: "Decima MAS Raiders",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Naval"],
      keywords: ["Infiltrate"],
      text: "Infiltrate. When this damages enemy HQ, deal 1 extra damage to it.",
      onHitHQ: [{ type: "damageEnemyHQ", amount: 1 }],
      copies: 2
    },
    {
      id: "it-desert-ambush",
      name: "Desert Ambush",
      type: "tactic",
      cost: 1,
      target: "friendlyUnit",
      text: "A friendly unit gets +2/+0 and Ambush until end of turn.",
      effects: [{ type: "buff", attack: 2, defense: 0, keywords: ["Ambush"], target: "selected" }],
      copies: 3
    },
    {
      id: "it-mediterranean-gambit",
      name: "Mediterranean Gambit",
      type: "operation",
      cost: 2,
      text: "At the start of your turn, gain 1 temporary supply and your HQ takes 1 damage.",
      startOfTurn: [{ type: "supplyBurst", amount: 1 }, { type: "damageSelfHQ", amount: 1 }],
      copies: 2
    }
  ],
  russia: [
    {
      id: "ru-rifle-division",
      name: "Rifle Division",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 3,
      tags: ["Infantry"],
      keywords: [],
      text: "When this unit is destroyed, create a 1/1 Conscript Squad.",
      onDeath: [{ type: "createToken", cardId: "token-conscript" }],
      copies: 3
    },
    {
      id: "ru-t34-brigade",
      name: "T-34 Tank Brigade",
      type: "unit",
      cost: 4,
      attack: 4,
      defense: 4,
      tags: ["Tank"],
      keywords: ["Armor", "Breakthrough"],
      text: "Armor, Breakthrough.",
      copies: 3
    },
    {
      id: "ru-katyusha",
      name: "Katyusha Rocket Battery",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 3,
      tags: ["Artillery"],
      keywords: ["Garrison"],
      target: "enemyUnitOrHQ",
      text: "Garrison. On deployment, deal 2 damage to an enemy unit or HQ.",
      effects: [{ type: "damage", amount: 2, target: "selected" }],
      copies: 3
    },
    {
      id: "ru-guards-shock",
      name: "Guards Shock Army",
      type: "unit",
      cost: 5,
      attack: 5,
      defense: 5,
      tags: ["Infantry"],
      keywords: ["Breakthrough"],
      text: "Breakthrough.",
      copies: 2
    },
    {
      id: "ru-partisans",
      name: "Partisan Detachment",
      type: "unit",
      cost: 2,
      attack: 1,
      defense: 2,
      tags: ["Infantry", "Resistance"],
      keywords: ["Infiltrate"],
      target: "enemyUnit",
      text: "Infiltrate. On deployment, exhaust an enemy unit.",
      effects: [{ type: "exhaust", target: "selected" }],
      copies: 2
    },
    {
      id: "ru-il2",
      name: "IL-2 Shturmovik",
      type: "unit",
      cost: 4,
      attack: 3,
      defense: 3,
      tags: ["Aircraft"],
      keywords: ["Airborne", "Armor"],
      text: "Airborne, Armor. When this attacks, deal 1 damage to enemy HQ.",
      onAttack: [{ type: "damageEnemyHQ", amount: 1 }],
      copies: 2
    },
    {
      id: "ru-not-one-step",
      name: "Not One Step Back",
      type: "tactic",
      cost: 1,
      target: "friendlyUnit",
      text: "A friendly unit gets +0/+4 and Ambush until end of turn.",
      effects: [{ type: "buff", attack: 0, defense: 4, keywords: ["Ambush"], target: "selected" }],
      copies: 3
    },
    {
      id: "ru-winter-offensive",
      name: "Winter Offensive",
      type: "operation",
      cost: 3,
      text: "Enemy units get -1 attack.",
      passive: { enemyStatPenalty: { attack: -1, defense: 0 } },
      copies: 2
    }
  ],
  japan: [
    {
      id: "jp-zero-fighter",
      name: "Zero Fighter Squadron",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 2,
      tags: ["Aircraft"],
      keywords: ["Airborne", "Blitz"],
      text: "Airborne, Blitz.",
      copies: 3
    },
    {
      id: "jp-snlf-marines",
      name: "SNLF Marines",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Naval"],
      keywords: ["Blitz"],
      text: "Blitz. When this damages enemy HQ, draw 1 card.",
      onHitHQ: [{ type: "draw", amount: 1 }],
      copies: 3
    },
    {
      id: "jp-ha-go-scouts",
      name: "Type 95 Ha-Go Scouts",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 1,
      tags: ["Tank", "Scout"],
      keywords: ["Blitz", "Infiltrate"],
      text: "Blitz, Infiltrate.",
      copies: 3
    },
    {
      id: "jp-yamato",
      name: "Yamato Battleship",
      type: "unit",
      cost: 7,
      attack: 6,
      defense: 7,
      tags: ["Naval"],
      keywords: ["Armor", "Breakthrough"],
      text: "Armor, Breakthrough.",
      copies: 2
    },
    {
      id: "jp-island-garrison",
      name: "Island Garrison",
      type: "unit",
      cost: 2,
      attack: 1,
      defense: 5,
      tags: ["Infantry", "Fortification"],
      keywords: ["Garrison", "AA"],
      text: "Garrison, AA.",
      copies: 2
    },
    {
      id: "jp-night-torpedo",
      name: "Night Torpedo Run",
      type: "tactic",
      cost: 3,
      target: "exhaustedEnemyUnitOrHQ",
      text: "Deal 4 damage to an exhausted enemy unit or the enemy HQ.",
      effects: [{ type: "damage", amount: 4, target: "selected" }],
      copies: 2
    },
    {
      id: "jp-carrier-strike",
      name: "Carrier Strike Group",
      type: "operation",
      cost: 3,
      text: "Friendly Airborne units get +1 attack.",
      passive: { statBonus: { keyword: "Airborne", attack: 1, defense: 0 } },
      copies: 3
    },
    {
      id: "jp-jungle-infiltrators",
      name: "Jungle Infiltrators",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 2,
      tags: ["Infantry"],
      keywords: ["Infiltrate", "Ambush"],
      text: "Infiltrate, Ambush.",
      copies: 2
    }
  ],
  usa: [
    {
      id: "us-sherman-platoon",
      name: "Sherman Tank Platoon",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 4,
      tags: ["Tank"],
      keywords: ["Armor"],
      text: "Armor.",
      copies: 3
    },
    {
      id: "us-p51-mustang",
      name: "P-51 Mustang Escort",
      type: "unit",
      cost: 4,
      attack: 3,
      defense: 3,
      tags: ["Aircraft"],
      keywords: ["Airborne", "AA"],
      text: "Airborne, AA.",
      copies: 3
    },
    {
      id: "us-marines-landing",
      name: "Marines Landing Team",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 3,
      tags: ["Infantry", "Naval"],
      keywords: ["Blitz"],
      text: "Blitz.",
      copies: 3
    },
    {
      id: "us-iowa-battleship",
      name: "Iowa Battleship",
      type: "unit",
      cost: 6,
      attack: 5,
      defense: 6,
      tags: ["Naval"],
      keywords: ["Armor", "Breakthrough"],
      text: "Armor, Breakthrough.",
      copies: 2
    },
    {
      id: "us-liberty-convoy",
      name: "Liberty Ship Convoy",
      type: "operation",
      cost: 3,
      text: "At the start of your turn, gain 1 temporary supply.",
      startOfTurn: [{ type: "supplyBurst", amount: 1 }],
      copies: 2
    },
    {
      id: "us-industrial-mobilization",
      name: "Industrial Mobilization",
      type: "tactic",
      cost: 3,
      text: "Gain 2 temporary supply this turn. Draw 2 cards.",
      effects: [{ type: "supplyBurst", amount: 2 }, { type: "draw", amount: 2 }],
      copies: 2
    },
    {
      id: "us-paratroopers",
      name: "Paratrooper Stick",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Airborne"],
      keywords: ["Airborne", "Blitz"],
      text: "Airborne, Blitz.",
      copies: 3
    },
    {
      id: "us-b17-formation",
      name: "B-17 Bomber Formation",
      type: "unit",
      cost: 5,
      attack: 4,
      defense: 4,
      tags: ["Aircraft"],
      keywords: ["Airborne"],
      text: "Airborne. When this attacks, deal 1 damage to enemy HQ.",
      onAttack: [{ type: "damageEnemyHQ", amount: 1 }],
      copies: 2
    }
  ],
  australia: [
    {
      id: "au-kokoda-infantry",
      name: "Kokoda Track Infantry",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 4,
      tags: ["Infantry", "Jungle"],
      keywords: ["Ambush"],
      text: "Ambush.",
      copies: 3
    },
    {
      id: "au-rats-tobruk",
      name: "Rats of Tobruk",
      type: "unit",
      cost: 3,
      attack: 2,
      defense: 5,
      tags: ["Infantry", "Desert"],
      keywords: ["Garrison"],
      text: "Garrison. When this blocks, deal 1 damage to the attacker before combat.",
      onBlockDamage: 1,
      copies: 3
    },
    {
      id: "au-matilda-frog",
      name: "Matilda Frog Tank",
      type: "unit",
      cost: 4,
      attack: 3,
      defense: 4,
      tags: ["Tank"],
      keywords: ["Armor", "Breakthrough"],
      text: "Armor, Breakthrough.",
      copies: 3
    },
    {
      id: "au-raaf-kittyhawk",
      name: "RAAF Kittyhawk Squadron",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 2,
      tags: ["Aircraft"],
      keywords: ["Airborne", "AA"],
      text: "Airborne, AA.",
      copies: 2
    },
    {
      id: "au-coastwatcher",
      name: "Coastwatcher Network",
      type: "operation",
      cost: 3,
      text: "At the start of your turn, draw 1 card and heal your HQ for 1.",
      startOfTurn: [{ type: "draw", amount: 1 }, { type: "healHQ", amount: 1 }],
      copies: 2
    },
    {
      id: "au-anzac-patrol",
      name: "ANZAC Patrol",
      type: "unit",
      cost: 2,
      attack: 2,
      defense: 2,
      tags: ["Infantry", "Scout"],
      keywords: ["Ambush", "Infiltrate"],
      text: "Ambush, Infiltrate.",
      copies: 2
    },
    {
      id: "au-jungle-warfare",
      name: "Jungle Warfare",
      type: "tactic",
      cost: 1,
      target: "friendlyUnit",
      text: "A friendly unit gets +1/+2 and Infiltrate until end of turn.",
      effects: [{ type: "buff", attack: 1, defense: 2, keywords: ["Infiltrate"], target: "selected" }],
      copies: 3
    },
    {
      id: "au-desert-patrol",
      name: "Long Range Desert Patrol",
      type: "unit",
      cost: 3,
      attack: 3,
      defense: 2,
      tags: ["Infantry", "Desert", "Scout"],
      keywords: ["Blitz", "Infiltrate"],
      text: "Blitz, Infiltrate.",
      copies: 2
    }
  ]
};

export const ALL_CARDS = [...commonCards, ...tokenCards, ...Object.values(factionCards).flat()];
const cardMap = new Map(ALL_CARDS.map((card) => [card.id, card]));

export function getCard(cardId) {
  const card = cardMap.get(cardId);
  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }
  return card;
}

export function getFaction(factionId) {
  return FACTIONS.find((faction) => faction.id === factionId);
}

export function getFactionCards(factionId) {
  if (!factionCards[factionId]) {
    throw new Error(`Unknown faction: ${factionId}`);
  }
  return factionCards[factionId];
}

export function getDeckList(factionId) {
  if (!factionCards[factionId]) {
    throw new Error(`Unknown faction: ${factionId}`);
  }

  const cards = [
    ...commonCards,
    ...factionCards[factionId]
  ];

  return cards.flatMap((card) => Array.from({ length: card.copies ?? 1 }, () => card.id));
}

export function getCatalog() {
  return {
    factions: FACTIONS,
    keywords: KEYWORDS,
    cards: ALL_CARDS
  };
}
