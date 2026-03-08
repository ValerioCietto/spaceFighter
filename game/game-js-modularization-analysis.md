# game.js modularization analysis (focus: weapon management + canvas drawing)

## Why `game/game.js` is hard to maintain today

`game/game.js` is currently ~2.4k lines and mixes:
- state bootstrapping,
- weapon orchestration and firing logic,
- projectile/beam simulation,
- canvas rendering for world entities,
- UI and DOM wiring,
- loop scheduling.

This makes the file hard to navigate and increases merge conflicts when touching unrelated areas.

## Highest-value split points

## 1) Weapon management module

### Current pain points in `game.js`
- Player and enemy weapon behaviors are partially duplicated (beam metadata parsing and effect creation are repeated for player and enemy).
- `attemptFireWeapon` currently combines input semantics, autofire toggle behavior, cooldown checks, energy checks, and firing side-effects in one local flow.
- Projectile object assembly is spread across player and enemy firing code, increasing drift risk when projectile schema evolves.

### Suggested module structure

**Create `game/combat/weaponManager.js`** with a factory API:

```js
export function createWeaponManager({ state, deps }) {
  return {
    attemptPlayerFire,
    cyclePlayerWeapon,
    updateEnemyFire,
    isBeamWeapon,
    getCurrentWeaponIndex,
    setCurrentWeaponIndex,
  };
}
```

**Move from `game.js` into this module:**
- `attemptFireWeapon`, `applyAutofireToggleAndGate`, `canPlayerFireWeapon`, `spendPlayerWeaponEnergy`.
- `playerFireWeapon`, `playerFireBeam`, `enemyFireBeam`.
- `resolveBaseAngleForWeapon`, `resolveBeamTarget`, `isBeamWeapon`, `rotatePoint`.
- `weaponLastFire`, `currentWeaponIndex` private fields (inside closure).

### Additional extraction for cleaner code

**Create `game/combat/projectileFactory.js`**
- `createBallisticProjectile(...)`
- `createBeamEffect(...)`

This removes inline object literals from firing logic and gives one place to evolve projectile schema.

### Expected result
- `game.js` loses ~250–400 lines directly.
- Weapon behavior can be tested in isolation with mocked `state`/`deps`.
- Beam and ballistic paths become easier to extend (new weapon aspect types, charge weapons, etc.).

---

## 2) Canvas rendering modules

### Current pain points in `game.js`
- Rendering code is monolithic: stars, station, targets, enemy indicators, projectiles, beams, player ship, minimap, and gates are all defined in one file.
- Repeated world-to-screen transformations and repeated hull/shield ring drawing logic for player/enemies.
- Draw order is encoded as direct function calls in the loop, which makes render pipeline changes risky.

### Suggested module structure

**Create `game/render/camera.js`**
- `worldToScreen({ x, y }, state, viewport)`
- `withCameraTransform(ctx, fn)` (optional helper)

**Create `game/render/shipRenderer.js`**
- `drawShipSprite(ctx, ship, image, screenPos)`
- `drawHullShieldRings(ctx, { screenX, screenY, hullRatio, shieldRatio, shieldDiameter })`

This removes duplicated ring rendering logic currently repeated for enemies and player.

**Create `game/render/projectileRenderer.js`**
- `drawEnemyProjectiles(...)`
- `drawPlayerProjectiles(...)`
- `drawBeamEffects(...)`
- `drawLightningBolt(...)`

**Create `game/render/worldRenderer.js`**
- `drawMainStar(...)`
- `drawStation(...)`
- `drawTarget(...)`
- `drawTargetLine(...)`
- `drawEnemyLineIndicator(...)`
- `drawGates(...)`

**Create `game/render/minimapRenderer.js`**
- `drawMinimap(...)`

**Create `game/render/renderPipeline.js`**
- `renderFrame({ ctx, minimapCtx, state, resources, dt })`
- Encodes the render order in one place.

### Expected result
- `game.js` loses ~600–900 rendering lines.
- Draw responsibilities become explicit by domain.
- New visual features can be added without touching gameplay orchestration.

---

## 3) Incremental migration strategy (low-risk)

1. Extract pure helpers first (`isBeamWeapon`, `worldToScreen`, ring drawing).
2. Introduce `weaponManager` while keeping existing data structures untouched.
3. Move projectile/beam rendering into dedicated renderer modules.
4. Move minimap renderer next (already self-contained).
5. Finalize with a `renderPipeline` call in the loop.

This sequence minimizes regressions and avoids a big-bang refactor.

## Suggested dependency boundaries

When creating modules, pass dependencies explicitly (dependency injection) instead of importing globals from everywhere.

Examples of injected dependencies:
- `applyDamageToEnemy`, `applyDamageToTarget`, `applyDamageToPlayer`
- `getNearestEnemy`
- `loadShipImage`
- `SystemInfo`

This keeps modules testable and avoids hidden coupling.

## Concrete “first PR” extraction candidates

If you want a practical first step with high ROI:

1. Move weapon runtime logic into `weaponManager.js`.
2. Move `drawBeamEffects` + `drawLightningBolt` + projectile draw functions into `projectileRenderer.js`.
3. Add a shared `drawHullShieldRings` helper used by both `drawShip` and `drawEnemies`.

These changes reduce file length meaningfully without changing save format or gameplay data model.
