// the purpose of this file is to contains the constants
// so they will be available to all successive modules.

// image and assets path
window.BASE_PATH = location.hostname.includes("github.io") ? "/spaceFighter" : "";

const SHIP_ASSET_BASE = window.BASE_PATH + "/assets/";
const STORAGE_KEY = "spaceFighterSaveData";