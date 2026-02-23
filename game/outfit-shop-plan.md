# Outfit Shop Implementation Plan

Goal: add a **station outfit shop** flow that behaves like the current ship shop list (`#ship-shop-list`), but mounted in `#outfit-shop-list` under the station **Outfits** tab.

## 1) Mirror the ship-shop architecture
- Use `game/stationShipShop.js` as the reference pattern for:
  - render entry function(s)
  - callback-based buy actions (`onBuy`)
  - toast / message hook (`onToast`)
  - graceful handling when required data is missing
- Create a dedicated module for outfits (for example `game/stationOutfitShop.js`) that exposes:
  - `renderStationOutfitShop({ rootEl, state, onBuy, onToast })`
  - optional `renderSellOutfitShop(...)` only if station subtabs will support selling outfits now.

## 2) Define a normalized outfit data contract
- Confirm primary source of truth (`shops/common/outfits.json`, `game/outfits.json`, `game/software_outfits.json`, `game/hull_mods.json`, etc.) and pick one aggregation strategy.
- Normalize each outfit record for rendering and purchase logic:
  - `key/id`, `name`, `category`, `cost`, `mass`, `energy`, `heat`, `description`, `species/faction`, optional `tier`.
- Add defensive defaults for optional fields so cards never break when a property is absent.

## 3) Build the outfit list renderer (`#outfit-shop-list`)
- Render shop cards into `#outfit-shop-list` with a grid layout aligned to ship shop UX.
- Per card include:
  - name + category
  - key stats (cost, mass, energy/heat effects)
  - concise description
  - buy/equip button
- Add basic filtering controls (category/species/tier) only if data already supports it without introducing blocking dependencies.

## 4) Wire StationManager to the new renderer
- Implement `renderOutfitShop()` in `game/station-manager.js`:
  - find `#outfit-shop-list`
  - read player state via `getPlayerState()`
  - call `renderStationOutfitShop(...)`
  - forward lifecycle callbacks to station options (similar to ship shop pattern)
- Keep behavior no-op safe when module or root element is unavailable.

## 5) Implement purchase + state integration
- On buy click:
  - validate credits
  - validate slot/capacity constraints (if outfit system enforces them)
  - subtract credits
  - add to owned inventory or installed outfits list
  - emit success/failure toast
- Re-render list/UI after purchase so affordability and ownership state update immediately.

## 6) Styling + UX consistency
- Reuse existing station/shop CSS tokens and class naming where possible.
- If needed, extend `game/game.css` (or station css) with outfit-specific classes (e.g. `.outfit-shop-grid`, `.outfit-card`) paralleling ship shop styles.
- Ensure cards remain readable for long descriptions and mobile-width layouts.

## 7) Validation checklist
- Open station UI and verify:
  - Outfits tab renders cards (no empty placeholder)
  - buy action updates credits/inventory
  - unaffordable items are blocked with feedback
  - no console errors when visiting other tabs
- Run existing project checks (or at minimum a local static serve + manual UI smoke test).

## 8) Optional follow-ups
- Add sell-outfit flow and dedicated subtab if needed.
- Add small data-driven badges (species lock, installed, owned count).
- Extract shared shop card primitives between ship and outfit modules to reduce duplication.
