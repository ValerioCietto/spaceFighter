// Command to launch: `npx serve .` (module consumed by game.html via <script type="module">)
// Humans

// starfighter perseus
// icarus
// hermes berseker
// theseus gunship
// diamond fortress athena
// sniper artemis
// mercury
// spinal weapon platform ares
// apollo drone carrier
// demeter toad
// hestia big cargo
// capital zeus

// jared

// zhuque
// razor
// longma three eyes
// huli jing three eyes spike hybrid
// xuanwu gold guard
// * kui ox cargo small
// * fenghuang cargo big
// * taotie
// * baihu dreadnought drone carrier
// * qilin dreadnought reaper 
// capital sun tzu queen

// technician

// hard shell
// spike razor
// spike razor upgraded
// * capital hivemind
const ENEMY_TYPES = [{
    name: "jared_basic",
    threatLevel: 1,
    spaceships: ["jared_zuque", "jared_three_eyes", "jared_three_eyes_spike_hybrid"]
  },
  {
    name: "jared_raider",
    threatLevel: 2,
    spaceships: ["jared_zuque", "jared_three_eyes", "jared_three_eyes_spike_hybrid"]
  },
  {
    name: "jared_elite",
    threatLevel: 3,
    spaceships: ["jared_zuque", "jared_three_eyes", "jared_three_eyes_spike_hybrid", "jared_baihu", "jared_qilin"]
  },
  {
    name: "jared_capital",
    threatLevel: 4,
    spaceships: ["jared_sun_tzu_queen"]
  },
  {
    name: "human_basic",
    threatLevel: 1,
    spaceships: ["human_perseus", "human_icarus", "human_hermes"]
  },{
    name: "human_raider",
    threatLevel: 2,
    spaceships: ["human_mercury", "human_icarus", "human_hermes", "human_gunship"]
  },
  {
    name: "human_elite",
    threatLevel: 3,
    spaceships: ["human_icarus", "human_hermes", "human_gunship", "human_artemis", "human_ares"]
  },
  {
    name: "human_capital",
    threatLevel: 4,
    spaceships: ["human_zeus"]
  },
  {
    name: "technician_basic",
    threatLevel: 1,
    spaceships: ["technician_hard_shell_v1", "technician_hard_shell_double_closed", "technician_spike_razor"]
  },
  {
    name: "technician_elite",
    threatLevel: 3,
    spaceships: ["technician_hard_shell_double_closed", "technician_spike_razor", "technician_spike_razor_upgraded"]
  },
  {
    name: "technician_capital",
    threatLevel: 4,
    spaceships: ["technician_hivemind"]
  }
];



const SHIPS = {
  // Humans
  human_perseus: {
    cost: 10000,
    shield: 100,
    hull: 50,
    speed: 150,
    acceleration: 180,
    turningSpeedRad: (Math.PI * 1.25) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 10,
    engineFlareLength: 26,
    energyMax: 100,
    energyRegen: 10,
    image: "human_perseus2.png",
    shieldDiameterPx: 33,
    shieldRegen:1,
    CPU: 10,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0, y: -5 }],
    weaponGunCoords: [{type: "gun", x: 0, y: 0 }],
    outfitSpace: 10,
  },

  human_demeter: {
    cost: 15000,
    shield: 300,
    hull: 240,
    speed: 95,
    acceleration: 150,
    turningSpeedRad: (Math.PI * 0.95) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 12,
    engineFlareLength: 20,
    energyMax: 140,
    energyRegen: 12,
    image: "human_demeter1.png",
    shieldDiameterPx: 50,
    shieldRegen:3,
    firerateMult: 0.80,
    CPU:25,
    shipCenter: { x: 0.5, y: 0.50 },
    engineCoords: [{ x: -15, y: -5 },{ x: 15, y: -5 }],
    weaponGunCoords: [{type: "turret", x: 0, y: 0 }],
    outfitSpace: 30,
  },

  human_mercury: {
    cost: 18000,
    shield: 75,
    hull: 70,
    speed: 275,
    acceleration: 195,
    turningSpeedRad: (Math.PI * 1.85) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 10,
    engineFlareLength: 35,
    energyMax: 160,
    energyRegen: 14,
    image: "human_mercury1.png",
    shieldDiameterPx: 35,
    shieldRegen:1.5,
    firerateMult: 0.5,
    CPU:8,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0, y: 0 }],
    weaponGunCoords: [{type: "gun", x: 0, y: 0 }],
    outfitSpace: 8,
  },

  human_icarus: {
    cost: 25000,
    shield: 150,
    hull: 120,
    speed: 200,
    acceleration: 140,
    turningSpeedRad: (Math.PI * 1.55) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 8,
    engineFlareLength: 30,
    energyMax: 190,
    energyRegen: 16,
    image: "human_icarus1.png",
    shieldDiameterPx: 36,
    shieldRegen:1.25,
    firerateMult: 0.90,
    damageMult:1.25,
    CPU:12,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0, y: 0 }],
    weaponGunCoords: [{type: "gun", x: 0, y: -3 },{type: "gun", x: 0, y: 3 }],
    outfitSpace: 15,
  },

  human_hermes: {
    cost: 30000,
    shield: 250,
    hull: 125,
    speed: 150,
    acceleration: 130,
    turningSpeedRad: (Math.PI * 1.45) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 14,
    engineFlareLength: 30,
    energyMax: 230,
    energyRegen: 22,
    image: "human_hermes1.png",
    shieldDiameterPx: 44,
    shieldRegen:3,
    damageMult:1.25,
    firerateMult:1.25,
    CPU:15,
    shipCenter: { x: 0.5, y: 0.5 }, // normalized (0..1) relative to sprite
    engineCoords: [ { x: 0, y: 0 }],
    weaponGunCoords: [{type: "gun", x: 0, y: -10 },{type: "gun", x: 0, y: 10 }],
    outfitSpace: 25,
  },

  human_gunship: {
    cost: 40000,
    shield: 300,
    hull: 250,
    speed: 105,
    acceleration: 90,
    turningSpeedRad: (Math.PI * 0.85) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 6,
    engineFlareLength: 20,
    energyMax: 320,
    energyRegen: 38,
    image: "human_gunship1.png",
    shieldDiameterPx: 45,
    shieldRegen:2,
    firerateMult: 1.5,
    damageMult: 1.1,
    CPU:30,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: -14, y: -20 }, { x: 0, y: -12 }, { x: 14, y: -20 }],
    weaponGunCoords: [{type: "gun", x: 0, y: -15 },{type: "gun", x: 0, y: 0 }, {type: "gun", x: 0, y: 15 }],
    outfitSpace: 40,
  },

  human_artemis: {
    cost: 45000,
    shield: 450,
    hull: 250,
    speed: 240,
    acceleration: 80,
    turningSpeedRad: (Math.PI * 0.25) * 1.2,
    image: "human_artemis1.png",
    engineFlareType: "triangular",
    engineFlareWidth: 15,
    engineFlareLength: 42,
    shieldDiameterPx: 44,
    energyMax: 300,
    energyRegen: 30,
    shieldRegen:3,
    damageMult: 2.0,
    firerateMult: 0.6,
    CPU:50,
    shipCenter: { x: 0.5, y: 0.5 }, // normalized (0..1) relative to sprite
    engineCoords: [{ x: 0, y: 20 }],
    weaponGunCoords: [{type: "gun", x: 10, y: 0 },{type: "gun", x: 14, y: 0 }, {type: "gun", x: 18, y: 0 }],
    outfitSpace: 60,
  },

  human_athena: {
    cost: 45000,
    shield: 450,
    hull: 250,
    speed: 240,
    acceleration: 80,
    turningSpeedRad: (Math.PI * 0.25) * 1.2,
    image: "human_athena1.png",
    engineFlareType: "triangular",
    engineFlareWidth: 15,
    engineFlareLength: 42,
    shieldDiameterPx: 44,
    energyMax: 300,
    energyRegen: 30,
    shieldRegen:3,
    damageMult: 2.0,
    firerateMult: 0.6,
    CPU:50,
    shipCenter: { x: 0.5, y: 0.5 }, // normalized (0..1) relative to sprite
    engineCoords: [{ x: 0, y: 20 }],
    weaponGunCoords: [{type: "gun", x: 10, y: 0 },{type: "gun", x: 14, y: 0 }, {type: "gun", x: 18, y: 0 }],
    outfitSpace: 60,
  },

  human_ares: {
    cost: 60000,
    shield: 350,
    hull: 190,
    shieldRegen: 5,
    speed: 220,
    acceleration: 220,
    turningSpeedRad: (Math.PI * 1.40) * 1.2,
    damageMult: 1.5,
    firerateMult: 1.0,
    CPU: 40,
    image: "human_ares1.png",
    engineFlareType: "triangular",
    engineFlareWidth: 20,
    engineFlareLength: 45,
    energyMax: 520,
    energyRegen: 80,
    shieldDiameterPx: 70,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: -21, y: 6 }, { x: 21, y: 6 }],
    weaponGunCoords: [{type: "gun", x: 0, y: -18 }, {type: "gun", x: 0, y: 18 }, {type: "turret", x: 0, y:-18}, {type: "turret", x: 0, y:18 }, {type: "spinal", x: 10, y:0}],
    outfitSpace: 110,
  },

  // has 4 gun weapon slots and 3 turret slots
  human_zeus: {
    cost: 100000,
    shield: 500,
    hull: 300,
    speed: 170,
    acceleration: 105,
    turningSpeedRad: (Math.PI * 0.75) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 15,
    engineFlareLength: 60,
    energyMax: 900,
    energyRegen: 80,
    image: "human_zeus1.png",
    shieldDiameterPx: 100,
    shieldRegen:10,
    damageMult: 2.0,
    firerateMult: 1.1,
    CPU:100,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: -30, y: 30 }, { x: 30, y: 30 },{ x: -15, y: 20 }, { x: 15, y: 20 }],
    weaponGunCoords: [{type: "gun", x: 18, y: -15 }, {type: "gun", x: 18, y: 15 }, {type: "gun", x: 22, y: -8 }, {type: "gun", x: 22, y: 8 }, {type: "turret", x: 0, y:-20}, {type: "turret", x: 0, y:0 }, {type: "turret", x: 0, y:20 }, {type: "spinal", x: -10, y:0}],
    outfitSpace: 150,
  },

  // Jared
  jared_zuque: {
    cost: 9400,
    shield: 70,
    hull: 80,
    speed: 145,
    acceleration: 115,
    turningSpeedRad: (Math.PI * 1.15) * 1.2,
    engineFlareType: "sphere",
    engineFlareWidth: 18,
    engineFlareLength: 44,
    image: "jared_zuque1.png",
    shieldDiameterPx: 34,
    firerateMult:1.05,
    energyMax: 100,
    energyRegen: 10,
    CPU:9,
    shipCenter: { x: 0.5, y: 0.52 },
    engineCoords: [{ x: 0.18, y: 0.50 }],
    weaponGunCoords: [{ x: 0.82, y: 0.50 }],
  },

  jared_three_eyes: {
    cost: 44000,
    shield: 160, 
    hull: 140,
    speed: 155,
    acceleration: 130,
    turningSpeedRad: (Math.PI * 1.35) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 16,
    engineFlareLength: 50,
    image: "jared_three_eyes.png",
    shieldDiameterPx: 45,
    firetateMult:1.2,
    energyMax: 140,
    energyRegen: 12,
    CPU:12,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.20, y: 0.50 }],
    weaponGunCoords: [{ x: 0.83, y: 0.46 }, { x: 0.83, y: 0.54 }],
  },

  jared_three_eyes_spike_hybrid: {
    cost: 49000,
    shield: 200,
    hull: 220,
    speed: 165,
    acceleration: 145,
    turningSpeedRad: (Math.PI * 1.45) * 1.2,
    engineFlareType: "flagellum",
    engineFlareWidth: 14,
    engineFlareLength: 47,
    image: "jared_three_eyes_spike_hybrid.png",
    shieldDiameterPx: 50,
    firerateMult: 1.4,
    energyMax: 160,
    energyRegen: 14,
    CPU:18,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.19, y: 0.50 }],
    weaponGunCoords: [{ x: 0.84, y: 0.48 }, { x: 0.84, y: 0.52 }],
  },

  // Technicians
  technician_spike_razor_upgraded: {
    cost:80000,
    shield: 250,
    hull: 320,
    speed: 170,
    acceleration: 150,
    turningSpeedRad: (Math.PI * 1.65) * 1.2,
    engineFlareType: "fire",
    engineFlareWidth: 14,
    engineFlareLength: 62,
    image: "technician_spike_razor_upgraded.png",
    shieldDiameterPx: 84,
    CPU:36,
    energyMax: 320,
    energyRegen: 38,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.18, y: 0.48 }, { x: 0.18, y: 0.52 }],
    weaponGunCoords: [{ x: 0.86, y: 0.40 }, { x: 0.86, y: 0.60 }],
  },

  technician_spike_razor: {
    cost:20000,
    shield: 150,
    hull: 120,
    speed: 160,
    acceleration: 135,
    turningSpeedRad: (Math.PI * 1.55) * 1.2,
    engineFlareType: "triangular",
    engineFlareWidth: 14,
    engineFlareLength: 54,
    image: "technician_spike_razor.png",
    shieldDiameterPx: 86,
    CPU:40,
    energyMax: 320,
    energyRegen: 38,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.19, y: 0.50 }],
    weaponGunCoords: [{ x: 0.85, y: 0.44 }, { x: 0.85, y: 0.56 }],
  },

  technician_hard_shell_double_closed: {
    cost:30000,
    speed: 110,
    shield: 150,
    hull: 120,
    acceleration: 120,
    turningSpeedRad: (Math.PI * 0.80) * 1.2,
    engineFlareType: "sphere",
    engineFlareWidth: 26,
    engineFlareLength: 40,
    energyMax: 300,
    energyRegen: 28,
    image: "technician_hard_shell_double_closed.png",
    shieldDiameterPx: 140,
    CPU:50,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.82, y: 0.46 }, { x: 0.82, y: 0.54 }],
  },

  technician_hard_shell_v1: {
    speed: 115,
    acceleration: 110,
    turningSpeedRad: (Math.PI * 0.85) * 1.2,
    engineFlareType: "sphere",
    engineFlareWidth: 28,
    engineFlareLength: 42,
    image: "technician_hard_shell_v1.png",
    shieldDiameterPx: 138,
    CPU:45,
    energyMax: 280,
    energyRegen: 26,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.13, y: 0.55 }],
    weaponGunCoords: [{ x: 0.84, y: 0.50 }],
  },
};

const DEFAULT_STATS = SHIPS.human_perseus;

/**
 * shipName must be snake_case (optionally with ".png").
 * Examples:
 * - "human_zeus"
 * - "human_zeus.png"
 */
function getStats(shipName) {
  const raw = String(shipName || "").trim();
  const key = raw.replace(/\.png$/i, "");

  // enforce snake_case only
  const isSnakeCase = /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(key);

  if (!isSnakeCase) {
    console.warn(
      `[ship-stat-provider] Non snake_case shipName '${raw}'. Using DEFAULT_STATS. Expected snake_case like 'human_zeus' or 'human_zeus.png'.`
    );
    return structuredClone(DEFAULT_STATS);
  }

  const stats = SHIPS[key];
  if (!stats) {
    console.warn(
      `[ship-stat-provider] Unknown ship '${key}'. Using DEFAULT_STATS.`
    );
    return structuredClone(DEFAULT_STATS);
  }

  return structuredClone(stats);
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Impossibile salvare lo stato:", e);
  }
}

function setActiveShip(state, shipId) {
  const p = state?.player;
  if (!p) return;

  p.currentSpaceshipId = Number(shipId);   // <-- THIS is what applyActiveShip uses
  applyActiveShip(state);                  // updates currentShipImg from shipStats.image
  saveState(state);
}

function getActiveShipInstance(state) {
  const p = state?.player;
  const owned = Array.isArray(p?.ownedSpaceships) ? p.ownedSpaceships : [];
  const id = Number(p?.currentSpaceshipId ?? 0);
  return owned.find(s => Number(s?.id) === id) || null;
}

function applyActiveShip(state) {
  console.log("Applying active ship instance...");
  const p = state?.player;
  if (!p) return false;

  const inst = getActiveShipInstance(state);
  if (!inst) {
    // fallback to old flow
    if (p.shipName) applyShip(p.shipName);
    return false;
  }

  // merge template + instance overrides
  const base = getStats(inst.templateName) || {};
  const overrides = inst.shipStats || {};
  const stats = { ...base, ...overrides };

  // normalize
  stats.shield = Number(stats.shield) || 0;
  stats.hull = Number(stats.hull) || 0;

  stats.shieldMax = Number(stats.shieldMax);
  if (!Number.isFinite(stats.shieldMax) || stats.shieldMax <= 0) stats.shieldMax = stats.shield;

  stats.hullMax = Number(stats.hullMax);
  if (!Number.isFinite(stats.hullMax) || stats.hullMax <= 0) stats.hullMax = stats.hull || 1;

  stats.energyMax = Number(stats.energyMax);
  if (!Number.isFinite(stats.energyMax) || stats.energyMax <= 0) stats.energyMax = 0;

  stats.energyRegen = Number(stats.energyRegen);
  if (!Number.isFinite(stats.energyRegen) || stats.energyRegen < 0) stats.energyRegen = 0;

  stats.energy = Number(stats.energy);
  if (!Number.isFinite(stats.energy)) stats.energy = stats.energyMax;

  stats.shield = Math.min(stats.shield, stats.shieldMax);
  stats.hull = Math.min(stats.hull, stats.hullMax);
  stats.energy = Math.max(0, Math.min(stats.energy, stats.energyMax));

  // commit
  p.shipStats = stats;
  p.shipName = inst.templateName; 

  const imgFile = stats.image ? String(stats.image) : "";
  if (imgFile) {
    currentShipImg = loadShipImage(imgFile);
  }

  return true;
}

const shipImages = new Map();
let shipImgReady = false;
function loadShipImage(filename) {
  shipImgReady = false;

  // cached
  if (shipImages.has(filename)) {
    shipImgReady = true;
    return shipImages.get(filename);
  }

  const img = new Image();
  img.onload = () => { shipImgReady = true; };
  img.onerror = () => {
    console.warn("Failed to load ship image:", img.src);
    shipImgReady = false;
  };
  img.src = SHIP_ASSET_BASE + filename;
  shipImages.set(filename, img);
  return img;
}
