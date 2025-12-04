// missionGenerator.js
// Run with: node missionGenerator.js
'use strict';

// --- Types --------------------------------------------------------------

const MissionType = {
  DELIVERY: 'delivery',
  BOUNTY: 'bounty',
  ESCORT: 'escort',
  SCAN: 'scan',
  PATROL: 'patrol',
  SALVAGE: 'salvage',
  SPECIAL: 'special',
};

const defaultConfig = {
  missionTypes: {
    [MissionType.DELIVERY]: { baseWeight: 3 },
    [MissionType.BOUNTY]: { baseWeight: 2 },
    [MissionType.ESCORT]: { baseWeight: 1.5 },
    [MissionType.SCAN]: { baseWeight: 1.5 },
    [MissionType.PATROL]: { baseWeight: 1 },
    [MissionType.SALVAGE]: { baseWeight: 1 },
    [MissionType.SPECIAL]: { baseWeight: 0.25 },
  },
  creditBase: 1500,
  creditPerDifficulty: 900,
  minDifficulty: 1,
  maxDifficulty: 5,
};

// --- Helpers ------------------------------------------------------------

function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomChoice(list, rng = Math.random) {
  if (!list || !list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

function weightedChoice(weightMap, rng = Math.random) {
  let total = 0;
  for (const key in weightMap) {
    const w = weightMap[key];
    if (w > 0) total += w;
  }
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const key in weightMap) {
    const w = weightMap[key];
    if (w <= 0) continue;
    if (roll < w) return key;
    roll -= w;
  }
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateId(prefix = 'MIS') {
  const rand = Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, '0');
  return `${prefix}-${Date.now()}-${rand}`;
}

// --- Mission Generator --------------------------------------------------

class MissionGenerator {
  /**
   * @param {object} config
   *  - missionTypes: { [type]: { baseWeight } }
   *  - creditBase
   *  - creditPerDifficulty
   *  - minDifficulty
   *  - maxDifficulty
   *  - rng: optional seeded RNG function
   */
  constructor(config = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      missionTypes: {
        ...defaultConfig.missionTypes,
        ...(config.missionTypes || {}),
      },
    };
    this.rng = config.rng || Math.random;
  }

  /**
   * @param {object} context
   *  - currentSystemId: string
   *  - systems: [{ id, name }]
   *  - locations: [{ id, name, systemId, kind: 'planet'|'station'|'moon' }]
   *  - factions: [{ id, name }]
   *  - player: {
   *      speciesId,
   *      level,
   *      combatRating,
   *      cargoCapacity,
   *      playstyle: 'trader'|'bountyHunter'|'explorer'|'balanced',
   *      reputation: { [factionId]: number }
   *    }
   */
  generateMission(context) {
    const { player = {}, currentSystemId } = context;

    const difficulty = this._computeDifficulty(player);
    const type = this._pickMissionType(context, difficulty);
    const faction = this._pickFaction(context, type);
    const origin = this._pickOriginLocation(context, currentSystemId);
    const target = this._pickTargetLocation(context, origin);

    const base = {
      id: generateId(faction ? faction.id.toUpperCase() : 'MIS'),
      type,
      factionId: faction ? faction.id : null,
      originSystemId: origin ? origin.systemId : currentSystemId,
      originLocationId: origin ? origin.id : null,
      targetSystemId: target ? target.systemId : null,
      targetLocationId: target ? target.id : null,
      difficulty,
      rewards: this._computeRewards(difficulty, type, faction),
      tags: [],
    };

    switch (type) {
      case MissionType.DELIVERY:
        return this._buildDeliveryMission(base, context, player, origin, target);
      case MissionType.BOUNTY:
        return this._buildBountyMission(base, context, player, origin, target);
      case MissionType.ESCORT:
        return this._buildEscortMission(base, context, player, origin, target);
      case MissionType.SCAN:
        return this._buildScanMission(base, context, player, origin, target);
      case MissionType.PATROL:
        return this._buildPatrolMission(base, context, player, origin, target);
      case MissionType.SALVAGE:
        return this._buildSalvageMission(base, context, player, origin, target);
      case MissionType.SPECIAL:
      default:
        return this._buildSpecialMission(base, context, player, origin, target);
    }
  }

  // --- Difficulty & weighting ------------------------------------------

  _computeDifficulty(player) {
    const { minDifficulty, maxDifficulty } = this.config;
    const level = player.level || 1;
    const combat = player.combatRating || level;
    const avg = (level + combat) / 2;
    const rawTier = Math.log2(avg + 1); // low levels compress into low tiers
    const tier = clamp(Math.round(rawTier), minDifficulty, maxDifficulty);
    return tier;
  }

  _pickMissionType(context, difficulty) {
    const { missionTypes } = this.config;
    const { player = {} } = context;
    const style = player.playstyle || 'balanced';
    const cargo = player.cargoCapacity || 0;

    const weights = {};
    for (const type in missionTypes) {
      weights[type] = missionTypes[type].baseWeight;
    }

    // Adjust by playstyle
    if (style === 'trader') {
      weights[MissionType.DELIVERY] *= 1.8;
      weights[MissionType.SALVAGE] *= 1.4;
      weights[MissionType.BOUNTY] *= 0.7;
      weights[MissionType.PATROL] *= 0.8;
    } else if (style === 'bountyHunter') {
      weights[MissionType.BOUNTY] *= 2.0;
      weights[MissionType.ESCORT] *= 1.3;
      weights[MissionType.PATROL] *= 1.5;
      weights[MissionType.DELIVERY] *= 0.6;
    } else if (style === 'explorer') {
      weights[MissionType.SCAN] *= 2.0;
      weights[MissionType.SALVAGE] *= 1.5;
      weights[MissionType.BOUNTY] *= 0.9;
    }

    // Adjust by cargo capacity (no cargo → less delivery/salvage)
    if (cargo < 30) {
      weights[MissionType.DELIVERY] *= 0.4;
      weights[MissionType.SALVAGE] *= 0.6;
    }

    // Higher difficulty → more combat missions
    if (difficulty >= 4) {
      weights[MissionType.BOUNTY] *= 1.3;
      weights[MissionType.PATROL] *= 1.2;
    }

    return weightedChoice(weights, this.rng);
  }

  _pickFaction(context, missionType) {
    const { factions = [], player = {} } = context;
    if (!factions.length) return null;

    const rep = player.reputation || {};
    const weights = {};

    for (const f of factions) {
      const r = rep[f.id] ?? 0;
      const base = 1 + Math.max(0, r / 50); // more rep → more missions
      weights[f.id] = base;
    }

    const id = weightedChoice(weights, this.rng);
    return factions.find((f) => f.id === id) || randomChoice(factions, this.rng);
  }

  // --- Location selection -----------------------------------------------

  _pickOriginLocation(context, currentSystemId) {
    const { locations = [] } = context;
    if (!locations.length) return null;

    // Prefer something in current system
    const local = locations.filter((l) => l.systemId === currentSystemId);
    if (local.length) return randomChoice(local, this.rng);
    return randomChoice(locations, this.rng);
  }

  _pickTargetLocation(context, origin) {
    const { locations = [] } = context;
    if (!locations.length) return null;

    // Prefer different system
    const candidates = locations.filter(
      (l) => !origin || l.systemId !== origin.systemId || l.id !== origin.id
    );
    if (!candidates.length) return randomChoice(locations, this.rng);
    return randomChoice(candidates, this.rng);
  }

  // --- Rewards ----------------------------------------------------------

  _computeRewards(difficulty, missionType, faction) {
    const baseCredits =
      this.config.creditBase + this.config.creditPerDifficulty * difficulty;

    let multiplier = 1;
    switch (missionType) {
      case MissionType.BOUNTY:
        multiplier = 1.4;
        break;
      case MissionType.ESCORT:
        multiplier = 1.3;
        break;
      case MissionType.SCAN:
        multiplier = 1.1;
        break;
      case MissionType.PATROL:
        multiplier = 1.0;
        break;
      case MissionType.SALVAGE:
        multiplier = 1.2;
        break;
      case MissionType.SPECIAL:
        multiplier = 2.0;
        break;
      case MissionType.DELIVERY:
      default:
        multiplier = 1.0;
        break;
    }

    const credits = Math.round(baseCredits * multiplier * (0.8 + this.rng() * 0.4));

    const reputationDelta = {};
    if (faction) {
      reputationDelta[faction.id] = 2 + difficulty; // small bump
    }

    return {
      credits,
      reputation: reputationDelta,
      items: [], // you can fill this with item IDs in your content layer
    };
  }

  // --- Builders for each mission type ----------------------------------

  _buildDeliveryMission(base, context, player, origin, target) {
    const cargoCapacity = Math.max(player.cargoCapacity || 20, 10);
    const amount = randomInt(
      Math.floor(cargoCapacity * 0.25),
      Math.floor(cargoCapacity * 0.75),
      this.rng
    );
    const goodsNames = ['medical supplies', 'reactor cores', 'spare parts', 'data crates', 'food rations'];
    const good = randomChoice(goodsNames, this.rng);

    const originName = origin ? origin.name : 'this port';
    const targetName = target ? target.name : 'a nearby station';

    return {
      ...base,
      type: MissionType.DELIVERY,
      title: `Deliver ${amount}t of ${good} to ${targetName}`,
      description:
        `A local quartermaster needs ${amount} tons of ${good} delivered from ` +
        `${originName} to ${targetName}. Timely delivery is appreciated.`,
      cargo: {
        good,
        amount,
      },
      timeLimit: randomChoice([null, 1800, 2400], this.rng), // seconds or null for no limit
      tags: [...base.tags, 'trade', 'delivery'],
    };
  }

  _buildBountyMission(base, context, player, origin, target) {
    const targetNames = ['Raider Wing', 'Crimson Pirate', 'Rogue AI Frigate', 'Unregistered Gunship'];
    const targetName = randomChoice(targetNames, this.rng);

    const shipClasses = ['gunship', 'destroyer', 'fighter squadron', 'frigate'];
    const shipClass = randomChoice(shipClasses, this.rng);

    const targetSystemName = target ? target.systemId : base.targetSystemId;

    return {
      ...base,
      type: MissionType.BOUNTY,
      title: `Bounty: ${targetName}`,
      description:
        `A dangerous ${shipClass} known as "${targetName}" has been reported near system ` +
        `${targetSystemName}. Track them down and eliminate the threat.`,
      objective: {
        targetName,
        shipClass,
        requiredKills: 1,
      },
      tags: [...base.tags, 'combat', 'bounty'],
    };
  }

  _buildEscortMission(base, context, player, origin, target) {
    const clientNames = ['merchant convoy', 'research vessel', 'diplomatic courier', 'fuel tanker'];
    const client = randomChoice(clientNames, this.rng);

    const dep = origin ? origin.name : 'origin port';
    const arr = target ? target.name : 'destination';

    return {
      ...base,
      type: MissionType.ESCORT,
      title: `Escort ${client} to ${arr}`,
      description:
        `A ${client} needs protection from ${dep} to ${arr}. Keep the client alive until ` +
        `they dock safely at their destination.`,
      escort: {
        clientType: client,
        mustSurvive: true,
      },
      tags: [...base.tags, 'combat', 'escort'],
    };
  }

  _buildScanMission(base, context, player, origin, target) {
    const anomalyNames = ['gravitational anomaly', 'dark energy spike', 'unknown derelict', 'unstable wormhole echo'];
    const anomaly = randomChoice(anomalyNames, this.rng);

    const systemName = target ? target.systemId : base.targetSystemId;

    return {
      ...base,
      type: MissionType.SCAN,
      title: `Scan ${anomaly} in ${systemName}`,
      description:
        `Sensors detected a ${anomaly} in system ${systemName}. Travel there and perform a ` +
        `detailed scan using your ship's scanners.`,
      scan: {
        anomaly,
        requiredScans: 1,
      },
      tags: [...base.tags, 'exploration', 'scan'],
    };
  }

  _buildPatrolMission(base, context, player, origin, target) {
    const systemName = base.originSystemId;
    const waypointCount = randomInt(2, 4, this.rng);

    return {
      ...base,
      type: MissionType.PATROL,
      title: `Patrol system ${systemName}`,
      description:
        `Local authorities request a patrol of system ${systemName}. Visit all marked ` +
        `waypoints and neutralize any hostile ships you encounter.`,
      patrol: {
        waypoints: waypointCount,
      },
      tags: [...base.tags, 'combat', 'patrol'],
    };
  }

  _buildSalvageMission(base, context, player, origin, target) {
    const wreckNames = ['destroyed freighter', 'abandoned mining ship', 'derelict shuttle', 'lost courier'];
    const wreck = randomChoice(wreckNames, this.rng);
    const targetName = target ? target.name : 'the wreck site';

    return {
      ...base,
      type: MissionType.SALVAGE,
      title: `Salvage ${wreck} near ${targetName}`,
      description:
        `A ${wreck} has been located near ${targetName}. Recover valuable components ` +
        `and return them to the contractor.`,
      salvage: {
        minContainers: randomInt(1, 3, this.rng),
      },
      tags: [...base.tags, 'salvage', 'exploration'],
    };
  }

  _buildSpecialMission(base, context, player, origin, target) {
    const roles = ['Technicians', 'Humans', 'Jared'];
    const role = randomChoice(roles, this.rng);
    const targetName = target ? target.name : 'a remote station';

    return {
      ...base,
      type: MissionType.SPECIAL,
      title: `Experimental ${role} prototype test`,
      description:
        `${role} engineers request a combat test of a prototype system near ${targetName}. ` +
        `You will be given temporary access to advanced hardware. Complete all test objectives.`,
      special: {
        grantTemporaryOutfit: true,
        grantTemporaryShip: false,
      },
      tags: [...base.tags, 'special', 'unique'],
    };
  }
}

// --- Exports ------------------------------------------------------------

module.exports = {
  MissionGenerator,
  MissionType,
};

// --- Demo (CLI) ---------------------------------------------------------
// Basic smoke test: `node missionGenerator.js`
if (require.main === module) {
  const generator = new MissionGenerator();

  const context = {
    currentSystemId: 'Sol',
    systems: [{ id: 'Sol', name: 'Sol' }, { id: 'Vega', name: 'Vega' }, { id: 'JaredPrime', name: 'Jared Prime' }],
    locations: [
      { id: 'Earth', name: 'Earth', systemId: 'Sol', kind: 'planet' },
      { id: 'Luna', name: 'Luna Shipyards', systemId: 'Sol', kind: 'moon' },
      { id: 'VegaStation', name: 'Vega Station', systemId: 'Vega', kind: 'station' },
      { id: 'JaredOrbital', name: 'Jared Orbital', systemId: 'JaredPrime', kind: 'station' },
    ],
    factions: [
      { id: 'humans', name: 'Human Directorate' },
      { id: 'jared', name: 'Jared Clans' },
      { id: 'tech', name: 'Technicians Collective' },
    ],
    player: {
      speciesId: 'humans',
      level: 6,
      combatRating: 8,
      cargoCapacity: 60,
      playstyle: 'balanced', // 'trader' | 'bountyHunter' | 'explorer'
      reputation: {
        humans: 30,
        jared: 5,
        tech: 15,
      },
    },
  };

  for (let i = 0; i < 5; i++) {
    const mission = generator.generateMission(context);
    console.log(`\n=== Mission ${i + 1} ===`);
    console.dir(mission, { depth: null });
  }
}
