# Spaceship purchase & inventory persistence — improvement analysis

## Scope
Reported issues:
1. Buying a ship does not update the in-game ship image immediately.
2. A newly bought ship is not shown as ACTIVE in inventory.
3. Setting a ship as active works once, but ACTIVE status is lost when reopening inventory.

## Root causes found

### 1) Purchase flow stores ship but does not activate it
In the station shop buy callback, the code only appends a new ship instance (`onBoughtSpaceship`) and saves state. It never switches `currentSpaceshipId` to the bought ship, nor calls `applyActiveShip`.

**Impact:** Player keeps flying the previous ship image/stats after purchase.

**Where:**
- `game/game.js` inside `renderStationShipShop(... onBuy: ...)`
- `game/stationShipShop.js` in `onBoughtSpaceship(...)`

### 2) Inventory reads a different active-ship field than the one used by activation logic
`setActiveShip` writes `player.currentSpaceshipId`.
Inventory rendering checks `player.activeShipId` or `player.currentSpaceship` instead.

**Impact:** Inventory ACTIVE tag can be wrong even when activation actually happened.

**Where:**
- Writer: `game/shipStatProvider.js` (`setActiveShip`)
- Readers: `game/inventoryDialog.js` (`renderInventory`, `renderInventoryTabContent`)

### 3) Reopen mismatch is a consistency bug, not a save bug
`setActiveShip` already calls `saveState(state)`.
On reopen, inventory recomputes active ship using legacy keys (`activeShipId/currentSpaceship`) rather than `currentSpaceshipId`.

**Impact:** Active selection appears not persisted in UI, although value is saved under a different key.

## Improvements to implement

### A) Normalize active ship key everywhere
Use **only** `player.currentSpaceshipId` as single source of truth.

- Update `renderInventory` active ID lookup:
  - from `p.activeShipId ?? p.currentSpaceship ?? ...`
  - to `p.currentSpaceshipId` (with safe numeric fallback).
- Update `renderInventoryTabContent` to use `p.currentSpaceshipId` as well.
- Keep temporary migration fallback only in load-time normalization (already partially present in `game.js`).

### B) Activate purchased ship immediately
In shop `onBuy` flow:
1. Capture returned ship instance from `onBoughtSpaceship`.
2. Set `state.player.currentSpaceshipId = newShip.id`.
3. Call `applyActiveShip(state)`.
4. Save state.

This ensures image + live stats switch right after purchase.

### C) Remove duplicate/confusing active fields (cleanup)
- Avoid writing/reading `activeShipId` or `currentSpaceship` in runtime UI code.
- Optionally add a one-time migration in `loadState`:
  - if `currentSpaceshipId` missing and old fields exist, map once then persist.

### D) Add lightweight regression checks
Manual QA scenarios:
1. Buy ship in station → verify ship image changes immediately.
2. Open inventory after purchase → bought ship marked ACTIVE.
3. Set another ship ACTIVE, close/open inventory → ACTIVE badge remains on correct ship.
4. Reload page → ACTIVE ship remains consistent in gameplay + inventory.

## Priority
1. **P1:** A + B (fix user-visible gameplay mismatch).
2. **P2:** C (tech debt cleanup).
3. **P2:** D (prevent regressions).
