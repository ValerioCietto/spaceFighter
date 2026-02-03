// Command to launch: `npx serve .` then open http://localhost:3000/game.html

// --- weapons loader (JSON-backed) ---

const REMOTE_WEAPONS_URL = "/spaceFighter/game/weapons.json";
const LOCAL_WEAPONS_URL = "/game/weapons.json";

function isLocalhost() {
  const h = (location.hostname || "").toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "";
}

function getWeaponsUrl() {
  return isLocalhost() ? LOCAL_WEAPONS_URL : REMOTE_WEAPONS_URL;
}

function withDerivedFields(w) {
  const out = { ...w };

  // Backward/forward compat: allow either turning_speed_deg or turn_speed_rad in JSON
  if (typeof out.turn_speed_rad !== "number" && typeof out.turning_speed_deg === "number") {
    out.turn_speed_rad = (out.turning_speed_deg * Math.PI) / 180;
  }

  return out;
}

async function loadWeaponsFromJson() {
  const url = getWeaponsUrl();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load weapons JSON (${res.status}) from ${url}`);

  const data = await res.json();

  // Expected shape:
  // { weapons: [...], enemyWeaponPool: [...] }
  const weapons = (data.weapons || []).map(withDerivedFields);

  // enemyWeaponPool can be array of weapon names, or full weapon objects
  let enemyWeaponPool = data.enemyWeaponPool || [];
  if (enemyWeaponPool.length && typeof enemyWeaponPool[0] === "string") {
    const byName = new Map(weapons.map((w) => [w.name, w]));
    enemyWeaponPool = enemyWeaponPool
      .map((name) => byName.get(name))
      .filter(Boolean);
  } else {
    enemyWeaponPool = enemyWeaponPool.map(withDerivedFields);
  }

  return { weapons, enemyWeaponPool };
}

// --- API kept compatible with your current code ---

let weapons = [];
let EnemyWeaponPool = [];

let currentWeaponIndex = 0;
let weaponLastFire = []; // sized after load

function pickEnemyWeapon() {
  return EnemyWeaponPool[(Math.random() * EnemyWeaponPool.length) | 0];
}

function normalizeAngleDiff(diff) {
  diff = (diff + Math.PI) % (2 * Math.PI);
  if (diff < 0) diff += 2 * Math.PI;
  return diff - Math.PI;
}

// Call this once at startup (before gameplay uses weapons)
async function initWeapons() {
  const loaded = await loadWeaponsFromJson();
  weapons = loaded.weapons;
  EnemyWeaponPool = loaded.enemyWeaponPool;

  weaponLastFire = new Array(weapons.length).fill(0);
  currentWeaponIndex = 0;

  if (!weapons.length) throw new Error("No weapons loaded from JSON.");
}

// Example usage (at boot):
// await initWeapons();
