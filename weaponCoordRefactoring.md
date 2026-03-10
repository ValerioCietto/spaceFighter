# Weapon Coord Refactoring Plan

## Current behavior
- Player fire uses the currently selected weapon and shoots it from **all** `weaponGunCoords`.
- Fire delay is tracked per selected weapon index, not per gun coordinate.
- Energy is checked once for the selected weapon before firing.

## Target behavior
1. Each `weaponGunCoords[i]` can define its own equipped weapon with:
   - `weaponGunCoords[i].weaponEquipped = weapon.name`
2. Each gun coordinate tracks an independent cooldown timer:
   - `weaponGunCoords[i].weaponLastFire`
3. Firing checks are evaluated per coordinate in order:
   - Skip if no weapon equipped.
   - Skip if cooldown is not ready.
   - Check current energy against that weapon's `energy_cost`.
   - If enough, spend energy immediately and fire.
   - Continue to next coordinate with updated energy value.

## Implementation notes
- Update the player fire flow in `game/combat/weaponManager.js` to iterate over ports.
- Resolve weapon per port by name (`weaponEquipped`) against loaded weapon definitions.
- Keep backwards compatibility for legacy field `equippedWeapon` where present.
- Keep weapon cycling APIs intact to avoid breaking existing input bindings.
