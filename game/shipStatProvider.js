// Command to launch: `npx serve .` (module consumed by game.html via <script type="module">)

const SHIPS = {
  // Humans
  human_berseker: {
    speed: 135,
    acceleration: 125,
    turningSpeedRad: Math.PI * 1.35,
    engineFlareType: "fire",
    engineFlareWidth: 18,
    engineFlareLength: 42,
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
    shieldDiameterPx: 76,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.22, y: 0.48 }, { x: 0.22, y: 0.52 }],
    weaponGunCoords: [{ x: 0.84, y: 0.47 }, { x: 0.84, y: 0.53 }],
  },

  human_starfighter: {
    speed: 150,
    acceleration: 120,
    turningSpeedRad: Math.PI * 1.25,
    engineFlareType: "triangular",
    engineFlareWidth: 16,
    engineFlareLength: 48,
    shieldDiameterPx: 90,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.20, y: 0.50 }],
    weaponGunCoords: [{ x: 0.83, y: 0.45 }, { x: 0.83, y: 0.55 }],
  },

  human_toad: {
    speed: 95,
    acceleration: 110,
    turningSpeedRad: Math.PI * 1.05,
    engineFlareType: "fire",
    engineFlareWidth: 30,
    engineFlareLength: 35,
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
    shieldDiameterPx: 115,
    shipCenter: { x: 0.52, y: 0.5 },
    engineCoords: [{ x: 0.15, y: 0.46 }, { x: 0.15, y: 0.54 }],
    weaponGunCoords: [{ x: 0.86, y: 0.42 }, { x: 0.86, y: 0.58 }],
  },

  // Jared
  "jared-zuque": {
    speed: 145,
    acceleration: 115,
    turningSpeedRad: Math.PI * 1.15,
    engineFlareType: "sphere",
    engineFlareWidth: 18,
    engineFlareLength: 44,
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
    shieldDiameterPx: 88,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.19, y: 0.50 }],
    weaponGunCoords: [{ x: 0.84, y: 0.48 }, { x: 0.84, y: 0.52 }],
  },

  // Technicians
  "technician-spike-razor-upgraded": {
    speed: 170,
    acceleration: 150,
    turningSpeedRad: Math.PI * 1.65,
    engineFlareType: "fire",
    engineFlareWidth: 14,
    engineFlareLength: 62,
    shieldDiameterPx: 84,
    shipCenter: { x: 0.5, y: 0.5 },
    engineCoords: [{ x: 0.18, y: 0.48 }, { x: 0.18, y: 0.52 }],
    weaponGunCoords: [{ x: 0.86, y: 0.40 }, { x: 0.86, y: 0.60 }],
  },

  "technician-spike-razor": {
    speed: 160,
    acceleration: 135,
    turningSpeedRad: Math.PI * 1.55,
    engineFlareType: "triangular",
    engineFlareWidth: 14,
    engineFlareLength: 54,
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
    shieldDiameterPx: 140,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.82, y: 0.46 }, { x: 0.82, y: 0.54 }],
  },

  technician_hard_shell_double_open1: {
    speed: 120,
    acceleration: 125,
    turningSpeedRad: Math.PI * 0.85,
    engineFlareType: "flagellum",
    engineFlareWidth: 26,
    engineFlareLength: 48,
    shieldDiameterPx: 135,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.84, y: 0.40 }, { x: 0.84, y: 0.60 }],
  },

  technician_hard_shell_double_open2: {
    speed: 125,
    acceleration: 130,
    turningSpeedRad: Math.PI * 0.90,
    engineFlareType: "flagellum",
    engineFlareWidth: 26,
    engineFlareLength: 50,
    shieldDiameterPx: 132,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.85, y: 0.40 }, { x: 0.85, y: 0.60 }],
  },

  technician_hard_shell_double_open3: {
    speed: 130,
    acceleration: 135,
    turningSpeedRad: Math.PI * 0.95,
    engineFlareType: "fire",
    engineFlareWidth: 24,
    engineFlareLength: 52,
    shieldDiameterPx: 128,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.86, y: 0.40 }, { x: 0.86, y: 0.60 }],
  },

  technician_hard_shell_double_open4: {
    speed: 135,
    acceleration: 140,
    turningSpeedRad: Math.PI * 1.00,
    engineFlareType: "fire",
    engineFlareWidth: 24,
    engineFlareLength: 54,
    shieldDiameterPx: 124,
    shipCenter: { x: 0.52, y: 0.54 },
    engineCoords: [{ x: 0.12, y: 0.50 }, { x: 0.12, y: 0.60 }],
    weaponGunCoords: [{ x: 0.87, y: 0.40 }, { x: 0.87, y: 0.60 }],
  },

  technician_hard_shell_v1: {
    speed: 115,
    acceleration: 110,
    turningSpeedRad: Math.PI * 0.85,
    engineFlareType: "sphere",
    engineFlareWidth: 28,
    engineFlareLength: 42,
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
  shieldDiameterPx: 90,
  shipCenter: { x: 0.5, y: 0.5 },
  engineCoords: [{ x: 0.20, y: 0.50 }],
  weaponGunCoords: [{ x: 0.83, y: 0.50 }],
};

/**
 * shipName can be:
 * - full filename (e.g. "human_zeus.png")
 * - key without extension (e.g. "human_zeus")
 * - dashed names (e.g. "jared-zuque.png")
 */
export function getStats(shipName) {
  const key = String(shipName || "").replace(/\.png$/i, "");
  return SHIPS[key] ? structuredClone(SHIPS[key]) : structuredClone(DEFAULT_STATS);
}