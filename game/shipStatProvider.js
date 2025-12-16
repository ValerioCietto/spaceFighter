// Command to launch: `npx serve .` (module consumed by game.html via <script type="module">)
// Humans

// starfighter perseus
// icarus
// hermes berseker
// theseus gunship
// diamond fortress athena
// diamond fortress spike
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


const SHIPS = {
  // Humans
  human_hermes: {
    speed: 135,
    acceleration: 125,
    turningSpeedRad: Math.PI * 1.35,
    engineFlareType: "fire",
    engineFlareWidth: 18,
    engineFlareLength: 42,
    image: "human_berseker.png",
    shieldDiameterPx: 88,
    shipCenter: { x: 0.5, y: 0.5 }, // normalized (0..1) relative to sprite
    engineCoords: [{ x: 0.18, y: 0.50 }, { x: 0.18, y: 0.58 }],
    weaponGunCoords: [{ x: 0.78, y: 0.44 }, { x: 0.78, y: 0.56 }],
  },

  human_gunship: {
    speed: 105,
    acceleration: 90,
    turningSpeedRad: Math.PI * 0.85,
    engineFlareType: "flagellum",
    engineFlareWidth: 26,
    engineFlareLength: 55,
    image: "human_gunship.png",
    shieldDiameterPx: 120,
    shipCenter: { x: 0.52, y: 0.52 },
    engineCoords: [{ x: 0.16, y: 0.45 }, { x: 0.16, y: 0.60 }],
    weaponGunCoords: [{ x: 0.84, y: 0.38 }, { x: 0.84, y: 0.62 }],
  },

  human_icarus: {
    speed: 160,
    acceleration: 140,
    turningSpeedRad: Math.PI * 1.55,
    engineFlareType: "triangular",
    engineFlareWidth: 14,
    engineFlareLength: 52,
    image: "human_icarus.png",
    shieldDiameterPx: 80,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.20, y: 0.50 }],
    weaponGunCoords: [{ x: 0.82, y: 0.50 }],
  },

  human_mercury: {
    speed: 175,
    acceleration: 155,
    turningSpeedRad: Math.PI * 1.75,
    engineFlareType: "sphere",
    engineFlareWidth: 12,
    engineFlareLength: 46,
    image: "human_mercury.png",
    shieldDiameterPx: 76,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.22, y: 0.48 }, { x: 0.22, y: 0.52 }],
    weaponGunCoords: [{ x: 0.84, y: 0.47 }, { x: 0.84, y: 0.53 }],
  },

  human_perseus: {
    speed: 150,
    acceleration: 120,
    turningSpeedRad: Math.PI * 1.25,
    engineFlareType: "triangular",
    engineFlareWidth: 16,
    engineFlareLength: 48,
    image: "human_starfighter.png",
    shieldDiameterPx: 90,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.20, y: 0.50 }],
    weaponGunCoords: [{ x: 0.83, y: 0.45 }, { x: 0.83, y: 0.55 }],
  },

  human_demeter: {
    speed: 95,
    acceleration: 110,
    turningSpeedRad: Math.PI * 1.05,
    engineFlareType: "fire",
    engineFlareWidth: 30,
    engineFlareLength: 35,
    image: "human_toad.png",
    shieldDiameterPx: 130,
    shipCenter: { x: 0.5, y: 0.52 },
    engineCoords: [{ x: 0.14, y: 0.50 }],
    weaponGunCoords: [{ x: 0.80, y: 0.50 }],
  },

  human_zeus: {
    speed: 120,
    acceleration: 105,
    turningSpeedRad: Math.PI * 0.95,
    engineFlareType: "flagellum",
    engineFlareWidth: 22,
    engineFlareLength: 60,
    image: "human_zeus.png",
    shieldDiameterPx: 115,
    shipCenter: { x: 0.52, y: 0.5 },
    engineCoords: [{ x: 0.15, y: 0.46 }, { x: 0.15, y: 0.54 }],
    weaponGunCoords: [{ x: 0.86, y: 0.42 }, { x: 0.86, y: 0.58 }],
  },

  // Jared
  jared_zuque: {
    speed: 145,
    acceleration: 115,
    turningSpeedRad: Math.PI * 1.15,
    engineFlareType: "sphere",
    engineFlareWidth: 18,
    engineFlareLength: 44,
    image: "jared_zuque.png",
    shieldDiameterPx: 96,
    shipCenter: { x: 0.5, y: 0.52 },
    engineCoords: [{ x: 0.18, y: 0.50 }],
    weaponGunCoords: [{ x: 0.82, y: 0.50 }],
  },

  jared_three_eyes: {
    speed: 155,
    acceleration: 130,
    turningSpeedRad: Math.PI * 1.35,
    engineFlareType: "triangular",
    engineFlareWidth: 16,
    engineFlareLength: 50,
    image: "jared_three_eyes.png",
    shieldDiameterPx: 92,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.20, y: 0.50 }],
    weaponGunCoords: [{ x: 0.83, y: 0.46 }, { x: 0.83, y: 0.54 }],
  },

  jared_three_eyes_spike_hybrid: {
    speed: 165,
    acceleration: 145,
    turningSpeedRad: Math.PI * 1.45,
    engineFlareType: "flagellum",
    engineFlareWidth: 14,
    engineFlareLength: 58,
    image: "jared_three_eyes_spike_hybrid.png",
    shieldDiameterPx: 88,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.19, y: 0.50 }],
    weaponGunCoords: [{ x: 0.84, y: 0.48 }, { x: 0.84, y: 0.52 }],
  },

  // Technicians
  technician_spike_razor_upgraded: {
    speed: 170,
    acceleration: 150,
    turningSpeedRad: Math.PI * 1.65,
    engineFlareType: "fire",
    engineFlareWidth: 14,
    engineFlareLength: 62,
    image: "technician_spike_razor_upgraded.png",
    shieldDiameterPx: 84,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.18, y: 0.48 }, { x: 0.18, y: 0.52 }],
    weaponGunCoords: [{ x: 0.86, y: 0.40 }, { x: 0.86, y: 0.60 }],
  },

  technician_spike_razor: {
    speed: 160,
    acceleration: 135,
    turningSpeedRad: Math.PI * 1.55,
    engineFlareType: "triangular",
    engineFlareWidth: 14,
    engineFlareLength: 54,
    image: "technician_spike_razor.png",
    shieldDiameterPx: 86,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.19, y: 0.50 }],
    weaponGunCoords: [{ x: 0.85, y: 0.44 }, { x: 0.85, y: 0.56 }],
  },

  technician_hard_shell_double_closed: {
    speed: 110,
    acceleration: 120,
    turningSpeedRad: Math.PI * 0.80,
    engineFlareType: "sphere",
    engineFlareWidth: 26,
    engineFlareLength: 40,
    image: "technician_hard_shell_double_closed.png",
    shieldDiameterPx: 140,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.82, y: 0.46 }, { x: 0.82, y: 0.54 }],
  },

  technician_hard_shell_v1: {
    speed: 115,
    acceleration: 110,
    turningSpeedRad: Math.PI * 0.85,
    engineFlareType: "sphere",
    engineFlareWidth: 28,
    engineFlareLength: 42,
    image: "technician_hard_shell_v1.png",
    shieldDiameterPx: 138,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.13, y: 0.55 }],
    weaponGunCoords: [{ x: 0.84, y: 0.50 }],
  },
};

const DEFAULT_STATS = {
  speed: 150,
  acceleration: 120,
  turningSpeedRad: Math.PI * 1.25,
  engineFlareType: "triangular",
  engineFlareWidth: 16,
  engineFlareLength: 48,
  image: "human_starfighter.png",
  shieldDiameterPx: 90,
  shipCenter: { x: 0.5, y: 0.5 },
  engineCoords: [{ x: 0.20, y: 0.50 }],
  weaponGunCoords: [{ x: 0.83, y: 0.50 }],
};

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
