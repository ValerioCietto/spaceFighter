# Bug-fixing suggestions

## 1) Broken navigation on GitHub Pages (`/game/game.html` absolute path)
- **Where:** `js/save.js`, `js/species.js`.
- **Issue:** The code redirects using absolute paths like `/game/game.html`. On GitHub Pages project sites (served under `/spaceFighter/`), this can cause a **404**.
- **Risk:** Users can get stuck on start/species screens in production.
- **Suggested fix:** Build navigation targets from `window.BASE_URL` (or `new URL("game/game.html", window.BASE_URL)`), and use that consistently for `continue` and species selection.

## 2) Save deletion key mismatch in species flow
- **Where:** `js/species.js` + `js/save.js` conventions.
- **Issue:** `SFSave.del('spaceFighterSaveData')` is called, but `SFSave` prefixes keys with `sf.v1.`. This deletes `sf.v1.spaceFighterSaveData`, not the legacy `spaceFighterSaveData` key that other pages use.
- **Risk:** stale/legacy data remains and may cause unexpected state loading.
- **Suggested fix:** either (a) migrate all pages to one key schema, or (b) explicitly clear both `spaceFighterSaveData` and prefixed keys during new game start.

## 3) Load/Import page writes to different localStorage keys than start screen reads
- **Where:** `load.html` and `js/save.js`/`js/config.js`.
- **Issue:** `load.html` imports and displays saves under `spaceFighterSaveData*`, while start menu checks `sf.v1.*` keys (`SF.STORAGE_PREFIX` + `SF.SAVE_KEYS`).
- **Risk:** imported saves may not enable **Continue**, making it look like import failed until manual data migration.
- **Suggested fix:** unify on one storage format; add migration bridge from legacy `spaceFighterSaveData*` into `sf.v1.*` keys.

## 4) `game/outfits-shop.html` throws runtime errors (const reassignment + incorrect fetch handling)
- **Where:** `game/outfits-shop.html` script.
- **Issue(s):**
  - `const data = {}` is later reassigned (`data = await fetch(...)`) -> runtime `TypeError`.
  - `fetch()` result is a `Response`; code uses `data.result` without `await response.json()`.
  - Uses absolute path `/shops/common/outfits.json`, which can 404 on GitHub Pages subpath.
- **Risk:** shop page fails to render entirely at runtime.
- **Suggested fix:** use `let data`, parse JSON (`const json = await res.json()`), and resolve URL via `BASE_URL`.

## 5) Station overlay fetches non-existent config folders (likely repeated 404s)
- **Where:** `js/station-overlay.js`.
- **Issue:** Fetch paths target `assets/config/...` JSON files, but this repository has no `assets/config` directory.
- **Risk:** repeated network 404s, empty inventory/station metadata, noisy logs, and slower UI.
- **Suggested fix:** point to existing data folders (`world/`, `shops/`, `game/*.json`) or add the missing config content; also cache negative lookups.

## 6) Image 404 in game loop demo
- **Where:** `js/game-loop.js`.
- **Issue:** ship sprite path is `assets/F1-Human-Icarus.png`, but available asset is `assets/human_icarus.png`.
- **Risk:** missing player ship sprite in that loop/demo.
- **Suggested fix:** update path to existing filename or add a fallback image on `img.onerror`.

## 7) Double slash URL when restarting after death
- **Where:** `game/game.js`.
- **Issue:** redirect uses `window.BASE_URL + "/index.html"`; when `BASE_URL` already ends with `/`, this can create `//index.html`.
- **Risk:** often tolerated by browsers, but brittle and can break with strict URL handling/CDN rules.
- **Suggested fix:** normalize URL joining with `new URL("index.html", window.BASE_URL).toString()`.

## 8) Hardcoded galaxy JSON URLs reduce portability
- **Where:** `game/galaxy-map-viewer.html`.
- **Issue:** it hardcodes `/spaceFighter/game/galaxy-map.json` for production and `/game/galaxy-map.json` for local; this assumes specific deployment roots.
- **Risk:** viewer breaks when served from any other subpath/custom domain setup.
- **Suggested fix:** derive JSON URL from current page location or `BASE_URL` (single source of truth), with graceful fallback.
