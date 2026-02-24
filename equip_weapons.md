# Equip Weapons Plan

## Goal
Implement **weapon equip/unequip management** in the **station inventory dialog** with a ship-slot visual UI, type-aware slot restrictions, and persistence of equipped weapons on owned ships.

> Scope for this iteration: equip/unequip only. No firing-logic changes.

---

## Functional Requirements

1. Weapon equip is performed in station/inventory dialog.
2. Ships expose `weaponGunCoords` entries that can define a slot `type`.
   - If slot `type` is missing, default it to `gun`.
3. Supported weapon types: `gun`, `turret`, `drone`, `spinal`.
4. Slot-type compatibility rules:
   - Non-`spinal` weapons cannot be equipped on `spinal` slots.
   - `spinal` weapons cannot be equipped on non-`spinal` slots.
   - (By implication) equip should enforce matching weapon/slot compatibility with the spinal special case above.
5. On equip flow, display all ship weapon slots graphically using ship layout coordinates.
6. Render each `weaponGunCoord` as a rounded square centered at its position.
7. Persist equipped state on owned ships:
   - Add `weaponEquipped` attribute to each `weaponGunCoord` in `ownedspaceships`.
   - Store equipped weapon **name** in `weaponEquipped`.
8. Slot visuals:
   - If a slot has an equipped weapon: rounded square with transparent inside.
   - If empty, fill with alpha-20 color by slot type:
     - `gun`: green
     - `turret`: blue
     - `drone`: red
     - `spinal`: gold

---

## Implementation Plan

### 1) Data model updates (owned ships)
- Normalize/initialize `ownedspaceships[*].weaponGunCoords[*]`:
  - Ensure `type` defaults to `gun` when missing.
  - Ensure `weaponEquipped` exists (initially `null` or empty string).
- Add migration-safe hydration logic when loading older saves so missing fields are backfilled.

### 2) Weapon metadata/type normalization
- Confirm weapon definitions include type; if absent, decide default behavior (recommended: `gun` unless data explicitly says otherwise).
- Add a shared helper for weapon type extraction and slot type extraction to avoid divergent logic.

### 3) Compatibility validation utility
- Add a single function (e.g. `canEquipWeaponInSlot(weaponType, slotType)`) used by UI + equip action.
- Enforce spinal rules strictly:
  - `spinal` weapon ↔ only `spinal` slot.
  - non-`spinal` weapon ↔ any non-`spinal` slot (or stricter exact matching if later desired).
- Return structured reason codes/messages for UI feedback (invalid slot type, slot already occupied, etc.).

### 4) Station inventory equip UI
- Extend inventory dialog to include an **equip mode/panel** for currently selected ship + selected weapon.
- Render ship slot map using `weaponGunCoords` coordinates.
- Draw rounded squares centered at each slot position.
- Apply color states:
  - Equipped: transparent interior (with visible border).
  - Empty: alpha-20 fill by slot type color map.
- Provide interaction:
  - Click compatible empty slot to equip selected weapon.
  - Click occupied slot with same weapon (or via explicit action) to unequip.
  - Disable/ignore invalid slot clicks and show short explanation.

### 5) Equip/unequip actions
- Equip action:
  - Validate weapon ownership/inventory availability.
  - Validate slot compatibility.
  - Set `weaponGunCoords[i].weaponEquipped = weapon.name`.
  - Update inventory counts/state accordingly.
- Unequip action:
  - Clear `weaponEquipped` on target slot.
  - Return weapon to inventory/state.
- Ensure UI refresh reflects changes immediately.

### 6) Persistence and save/load
- Include `weaponEquipped` in save payload for owned ships.
- Verify load path reconstructs equipped state and defaults missing fields.

### 7) Non-goals (explicit)
- No integration with combat fire control or projectile behavior in this iteration.
- No balancing or DPS/stat changes tied to equipped slots.

---

## Edge Cases to Handle

- Older ships/saves without `type` and/or `weaponEquipped`.
- Selecting a weapon with missing/unknown type metadata.
- Attempting to equip when inventory count is zero.
- Multiple slots attempting same weapon when inventory supports only one instance.
- Switching ships while equip panel is open.

---

## Suggested Validation Checklist

1. Open station inventory with ship that has mixed slot types.
2. Verify empty slot colors by type (gun/turret/drone/spinal).
3. Equip non-spinal weapon into spinal slot → blocked.
4. Equip spinal weapon into non-spinal slot → blocked.
5. Equip compatible weapon into empty slot → succeeds and slot becomes transparent.
6. Unequip weapon → slot returns to type color and item returns to inventory.
7. Save + reload → equipped slots persist correctly.
8. Load old save without new fields → defaults applied without crashes.
