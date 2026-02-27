# Change plan: ship image not updating after purchase

## Bug summary
When a player buys a ship in the station ship shop, the newly purchased ship is saved and stats are updated, but the rendered player ship image does not refresh immediately. In contrast, changing active ship from inventory does update the image.

## Likely root cause
- The inventory flow calls `setActiveShip(state, shipId)`, which triggers `applyActiveShip(state)` and reloads `currentShipImg`.
- The buy flow currently appends the new ship instance and saves state, but does not explicitly switch active ship using `setActiveShip`, nor guarantee `applyActiveShip` runs for the new instance.
- This creates a mismatch: state contains the new ship, but runtime render image remains from previous active ship.

## Planned changes
1. **Unify purchase flow with active-ship flow**
   - After `onBoughtSpaceship(...)` returns the created ship instance, set it as active using `setActiveShip(state, newShip.id)`.
   - Avoid only mutating `state.player.shipType` / raw stats in shop code without syncing active instance.

2. **Ensure runtime sprite refresh happens on purchase**
   - Verify the buy callback path runs `applyActiveShip(state)` through `setActiveShip` so `currentShipImg` is reloaded from the new ship template image.

3. **Keep persistence behavior unchanged**
   - Continue saving state after purchase/activation as already done, so reload behavior remains consistent.

4. **Guardrails and fallback**
   - If ship creation unexpectedly fails, keep existing behavior and show a toast/log warning instead of breaking station flow.

## Files expected to be touched when implementing fix
- `game/game.js` (ship buy callback wiring)
- `game/stationShipShop.js` (purchase state mutation cleanup, optional)
- `game/shipStatProvider.js` (only if minor activation helper adjustments are needed)

## Validation plan
- Buy a new ship from station shop and confirm player sprite changes immediately.
- Open inventory and verify the newly bought ship is marked active.
- Swap ships from inventory and confirm sprite continues to update correctly.
- Reload the game and verify active ship + sprite persist correctly.
