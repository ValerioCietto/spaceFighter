// the purpose of this file is to contains the constants
// so they will be available to all successive modules.

// image and assets path
window.BASE_PATH = location.hostname.includes("github.io") ? "/spaceFighter" : "";
const ENEMY_SPAWN_R_MIN = 1500; // don't make enemies spawn too near main star
const ENEMY_SPAWN_R_MAX = 2500; // neither too far
const SHIP_ASSET_BASE = window.BASE_PATH + "/assets/";
const STORAGE_KEY = "spaceFighterSaveData";