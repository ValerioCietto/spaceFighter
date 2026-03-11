# Weapon Firing System Analysis

## Objective of this analysis
This document maps the current firing flow and clarifies how **laser beam**, **gun/projectile**, **turret**, and **spinal** weapons are handled today.

It also documents the completed transition away from the legacy **"change weapon" (global selected weapon index)** model to the active **"per-port equipped weapon" (`weaponGunCoords`)** model, plus the remaining follow-up work.

---

## 1) Current runtime architecture (high-level)

### Main actors
- `game/game.js`
  - Creates the runtime state and wires systems together.
  - Instantiates `weaponManager` via `createWeaponManager(...)`.
  - Routes fire/lock input to gameplay systems and routes the former weapon-cycle control to outfit activation wiring.
- `game/combat/weaponManager.js`
  - Core firing logic for player and enemies.
  - Handles cooldowns, energy usage, auto-aim behavior, beam-vs-projectile branching, projectile spawn, and enemy fire updates.
- `game/weapons.json`
  - Weapon catalog and behavior parameters (damage, delay, range, energy, aspect, spread, and slot constraints like `spinal`).

### Core firing flow (player)
1. Input triggers `attemptFireWeapon(manual)` (Space key / touch button / auto calls).
2. `weaponManager.attemptPlayerFire` enumerates **all player weapon ports** from `state.player.shipStats.weaponGunCoords`, resolves equipped weapons per-port, and applies slot-based rules (`turret` overrides and spinal-only checks).
3. For each port:
   - Resolve which weapon is equipped by matching `port.weaponEquipped` against weapon `name`/`code`/`id`.
   - Enforce autofire gate, cooldown (`delay_ms` with `firerateMult`), and energy availability.
   - Spend energy.
   - Fire beam or projectile implementation.

**Important:** player fire selection is fully port-driven via `weaponGunCoords[].weaponEquipped`; legacy index-based weapon switching has been removed from active flow.

---

## 2) Weapon data model and equip model

### Weapon catalog model
Weapons are loaded from `game/weapons.json` and normalized in `weaponManager` usage. Relevant fields:
- Timing/throughput: `delay_ms`, `projectiles`
- Ballistics: `base_speed`, `life_span`, `spread`, `acceleration`, `speed`, `turn_speed_rad`, `homing`
- Damage: `damage`, optional `damageEnergy`
- Beam visuals: `color`, `width`
- Firing behavior: `aspect`, `auto_aim`, `autofire_toggle`, `engage_range`, `energy_cost`

### Port equip model
The player ship stores weapon mount points in `shipStats.weaponGunCoords`; each coord can carry:
- `type` (e.g. `gun`, `turret`, `spinal`, `drone`)
- local position (`x`,`y`)
- equipped weapon code (`weaponEquipped`)
- runtime cooldown timestamp per port (`weaponLastFire`)

Inventory/equip UI writes `weaponEquipped` directly on each port.


### Spinal weapon flag
The catalog now supports `"spinal": true` as a mount constraint. Weapons flagged this way are treated as endgame spinal-class weapons and are blocked from non-spinal ports at fire-resolution time.


---

## 3) Beam vs projectile behavior

## 3.1 Laser beam weapons (and lightning)
A weapon is treated as beam when:
- `aspect` is `laser` or `lightning`, or
- explicit `beam === true`

Beam firing behavior:
- No projectile entity is spawned.
- A target is resolved by range (`engage_range`) against nearest enemy or current lock target.
- Damage is applied immediately.
- A short-lived visual entry is pushed into `beamEffects` (`x1,y1 -> x2,y2`, color, width, life).

So beam weapons are **instant-hit + transient VFX**, not physics projectiles.

## 3.2 Gun/projectile weapons
For non-beam weapons:
- Muzzle is computed from port coordinate rotated by ship angle.
- Each shot spawns one or more projectile entities (`projectiles` count + spread).
- Projectiles carry velocity, lifetime, damage, aspect, homing/turn data.
- Ship velocity is inherited for non-homing shots.

So gun-style weapons are **entity-based ballistic shots**.

---

## 4) Gun vs turret vs spinal in current code

## 4.1 What is implemented now
`weaponGunCoords[].type` is currently used mainly as **metadata/UI semantics**:
- Ship definitions declare mount composition (`gun`, `turret`, `spinal`, `drone`).
- Shop UI shows counts by type.
- Equip UI lists ports and stores `weaponEquipped` on the selected port.

## 4.2 Implemented slot constraints and overrides
In current firing logic (`weaponManager`), port `type` now applies two concrete runtime rules:
- `turret` ports override mounted weapon attributes to `autofire_toggle: true` and `auto_aim: 4.0`, enabling broad auto-targeting behavior around the ship.
- Weapons with `spinal: true` can fire **only** when mounted on a `spinal` port (`port.type === "spinal"`).

`gun`/`turret`/`spinal` still share the same projectile/beam spawn core, but slot-specific gating is now enforced at weapon resolution time.

---

## 5) Enemy firing model
Enemies do not use the player's per-port equip model:
- Each enemy has a single `enemy.weapon` object.
- Fire cadence is gated by `enemy.lastFire` and `enemy.shipStats.firerateMult`.
- Enemy behavior labels (`aggressive`, `turret`, `idle`, `smart`) control if/when they choose to fire, but do not map to a port system.

This means the refactor target (port-equipped architecture) is presently player-centric.

---

## 6) Legacy "change weapon" vs port-equipped reality

### Legacy remnants removed
- `currentWeaponIndex`, `setCurrentWeaponIndex`, and `cyclePlayerWeapon` were removed from the active player firing path.
- Numeric weapon-index selection (`1..4`) is no longer used for weapon switching.
- The former cycle input path (`weapon-cycle`) is now available for outfit activation wiring.

---

## 7) Refactor implications for the target architecture
Target: “weapon system no more based on change weapon, but on weapons equipped in `weaponGunCoords`.”

### 7.1 Completed cleanup
1. Removed `currentWeaponIndex`-based APIs from `weaponManager` and related remnants in weapon loading code.
2. Removed numeric weapon index selection and repurposed cycle input toward outfit activation.
3. Kept cooldown ownership per-port (`port.weaponLastFire`) while preserving global fallback behavior.

### 7.2 Remaining semantic upgrades (recommended)
Continue expanding behavior by `port.type` to realize intended class differences:
- **gun**
  - Hull-forward orientation (already baseline).
- **turret**
  - Add independent turret yaw/traverse speed and optional firing arcs (beyond current `auto_aim: 4.0` override).
- **spinal**
  - Add strict forward arc, charge/recoil identity, and high-impact cadence (beyond current spinal-slot enforcement).
- **drone** (future)
  - Launch autonomous entities instead of direct projectile spawn.

### 7.3 Data-contract hardening
To avoid ambiguous runtime behavior:
- Require `weaponEquipped` on every active port (or explicit null).
- Validate `weaponEquipped` against weapon catalog at ship apply/equip time.
- Add optional per-port runtime fields (`yaw`, `heat`, `state`) where needed for turrets/spinals.

---

## 8) Main risks during refactor
1. **Save compatibility:** older saves may lack `weaponEquipped` per port.
2. **Mixed coordinate conventions:** some ship entries use normalized coordinates (0..1-style) while others use local pixel-like offsets; turret logic must preserve existing behavior.
3. **UI mismatch:** if cycle/index controls are removed, HUD/tutorial/help text must align.
4. **Balance shock:** true turret/spinal semantics can significantly change DPS and target uptime.

---

## 9) Suggested phased migration plan
1. **Phase A (cleanup):** remove index-driven selection API and inputs, keep current per-port firing behavior unchanged.
2. **Phase B (type-aware firing):** branch by `port.type` in `playerFireWeapon` path, beginning with turret aim semantics.
3. **Phase C (spinal identity):** add spinal-only constraints/benefits (arc + charge + impact profile).
4. **Phase D (validation/tooling):** add startup assertions for bad equips and missing catalog references.

This sequence minimizes regressions while moving to the desired design.

---

## 10) Conclusion
The codebase now fires from `weaponGunCoords`-equipped ports **without legacy weapon-index switching** and enforces two key slot semantics: turret auto-fire/auto-aim override and spinal-only weapon gating.

Next steps are refinement-focused:
- deepen turret and spinal simulation identity,
- harden data validation and save migration,
- expand per-port runtime state where needed.
