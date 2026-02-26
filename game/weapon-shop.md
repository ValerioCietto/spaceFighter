# Weapon Shop Implementation Plan

Goal: implement the station **Weapons** shop (`#weapon-shop-list`) using `game/weapons.json` as source data, with purchase flow that **adds bought weapons to `state.player.weaponsOwned`** and does **not auto-equip** them.

## 1) Read from save file ownedWeapons, 
- Introduce `state.player.ownedWeapons` as the canonical owned-weapon collection, matching the naming pattern requested for `ownedSpaceships` / `ownedOutfits`.
- Keep equipped weapons separate from ownership:
  - ownership lives in `state.player.ownedWeapons`
  - equipped/active loadout continues in ship weapon port structures (gun/turret/drone/spinal loadout).

## 2) Define normalized weapon contract from `game/weapons.json`
- Parse and normalize each weapon into a stable card/view model:
  - `id` (derived slug from `name` if missing), `name`, `cost`, `description`, `aspect`
  - combat stats (`damage`, `delay_ms`, `projectiles`, `engage_range`, `energy_cost`, etc.)
- Add defaults for optional fields (`image`, `color`, `width`, `auto_aim`, `autofire_toggle`) so rendering never crashes on sparse entries.
- Validate numeric values and clamp invalid values to safe fallbacks at render time.

## 3) Create a dedicated station weapon shop renderer module
- Add or complete `game/stationWeaponShop.js` with an API parallel to ship/outfit shops:
  - `renderStationWeaponShop({ rootEl, state, onBuy, onToast })`
- Render cards into `#weapon-shop-list` with:
  - name, cost, short description
  - key combat stats for quick comparison
  - owned/affordability status and buy button state
- Prefer shared CSS classes where possible for consistency with ship/outfit shop UX.

## 4) Wire StationManager Weapons tab to real renderer
- Update `game/station-manager.js`:
  - implement `renderWeaponShop()`
  - find `#weapon-shop-list`
  - pass current state via `getPlayerState()`
  - call `renderStationWeaponShop(...)` with `onBuy`/`onToast` hooks
- Ensure no-op safety if root element or renderer function is unavailable.

## 5) Implement purchase behavior (buy only, no immediate equip)
- On buy click, validate:
  - player has enough money
  - weapon not already owned (or define stack/count behavior explicitly)
- On success:
  - subtract credits
  - append a normalized weapon ownership record to `state.player.weaponsOwned`
  - **do not** alter currently equipped weapon ports or active weapon index
- Provide user feedback:
  - success toast (purchased + remaining credits)
  - failure toast (insufficient funds / already owned)
- Re-render the weapon shop list after purchase for up-to-date affordability and owned states.

## 6) Persistence and save/load compatibility
- Update save/load paths so `weaponsOwned` persists in localStorage.
- On load, migrate old saves (`ownedWeapons`) into `weaponsOwned` once, then persist with new key.
- Add defensive load defaults to avoid undefined inventory arrays.

## 7) Deferred equip flow (explicitly later)
- Keep equipping out of scope for this task.
- Document next phase to add a dedicated equip UI (likely inventory or station subtab) that:
  - reads from `state.player.weaponsOwned`
  - assigns owned weapons to ship weapon ports
  - validates port type compatibility and CPU/energy constraints if needed.

## 8) Validation checklist
- Open station overlay and enter **Weapons** tab:
  - cards render from `game/weapons.json`
  - affordability states are correct
  - buy adds weapon to `state.player.weaponsOwned` only
  - buying does not auto-equip any weapon
- Save/reload and confirm `weaponsOwned` remains intact.
- Smoke test Shipyard/Outfits tabs to ensure no regressions from shared station logic.
