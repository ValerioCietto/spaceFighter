# Area of Effect (AoE) Damage Analysis (codebase-integrated)

This document explains how to add AoE damage using the **current SpaceFighter code paths** instead of pseudo-only architecture.

---

## Where to integrate in the existing code

Main combat loop and projectile hit logic already live in `game/game.js`:

- Player projectile updates: `updatePlayerProjectiles(dt, dtMillis)`
- Enemy projectile updates: `updateEnemyProjectiles(dt)`
- Hit checks:
  - `projectileHitAnyEnemy(p)`
  - `projectileHitPlayer(p)`
  - `projectileHitTarget(p)`
- Damage application:
  - `applyDamageToEnemy(enemy, projectile)`
  - `applyDamageToPlayer(projectile)`
  - `applyDamageToTarget(targetObj, damage)`

Weapon data is loaded from `game/weapons.json` via `game/weapon_system.js` (`loadWeaponsFromJson()` / `withDerivedFields()`).

So, AoE should be implemented by extending:
1. weapon JSON schema,
2. projectile object fields created in fire functions,
3. hit resolution functions in `game/game.js`.

---

## Minimal data additions to `game/weapons.json`

Add optional keys to explosive or piercing weapons:

```json
{
  "aoe_radius": 120,
  "aoe_damage": 8,
  "aoe_push": 180,
  "aoe_falloff": "linear",
  "max_pierces": 3,
  "pierce_cooldown_ms": 120
}
```

### Notes
- Keep fields optional so existing weapons remain compatible.
- You usually do **not** need to change `weapon_system.js`; it already forwards unknown JSON fields as part of weapon objects.


### Full weapon declaration example (copy/paste)

Example missile declaration in `game/weapons.json` with both AoE and piercing fields:

```json
{
  "name": "Viper Missile",
  "cost": 12000,
  "damage": 6,
  "base_speed": 320,
  "speed": 320,
  "acceleration": 40,
  "turning_speed_deg": 140,
  "life_span": 3.5,
  "projectiles": 1,
  "aspect": "missile",
  "homing": true,
  "arming_time": 120,
  "delay_ms": 700,
  "energy_cost": 25,
  "engage_range": 3000,
  "aoe_radius": 110,
  "aoe_damage": 10,
  "aoe_push": 140,
  "aoe_falloff": "linear",
  "max_pierces": 2,
  "pierce_cooldown_ms": 100,
  "description": "Homing missile with splash damage and limited piercing behavior."
}
```

Notes for this declaration:
- `turning_speed_deg` is accepted because `withDerivedFields()` derives `turn_speed_rad` automatically.
- For non-piercing missile behavior, set `max_pierces` to `1` and/or omit piercing keys.
- For pure direct-hit missile behavior, omit `aoe_*` keys.

---

## Shared AoE helper to add in `game/game.js`

Add one reusable helper near existing damage helpers (`applyDamageToEnemy`, etc.):

```js
function applyExplosionAoE({ centerX, centerY, radius, damage, pushPixels, sourceTeam }) {
  if (!Number.isFinite(radius) || radius <= 0) return;

  // Enemies
  for (const enemy of state.enemies || []) {
    if (!enemy || !enemy.shipStats) continue;

    const dx = enemy.x - centerX;
    const dy = enemy.y - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;

    const t = Math.max(0, 1 - dist / radius); // linear falloff
    applyDamageToEnemy(enemy, { damage: damage * t, damageEnergy: 0 });

    const len = dist || 1;
    const push = (pushPixels || 0) * t;
    enemy.vx = (enemy.vx || 0) + (dx / len) * push;
    enemy.vy = (enemy.vy || 0) + (dy / len) * push;
  }

  // Player (if friendly fire enabled by design)
  if (state.player) {
    const dx = state.player.x - centerX;
    const dy = state.player.y - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist <= radius && sourceTeam !== "player") {
      const t = Math.max(0, 1 - dist / radius);
      applyDamageToPlayer({ damage: damage * t, damageEnergy: 0 });

      const len = dist || 1;
      const push = (pushPixels || 0) * t;
      state.player.vx += (dx / len) * push;
      state.player.vy += (dy / len) * push;
    }
  }
}
```

Use this helper from multiple weapon behaviors below.

---

## Example 1: Proximity effect weapon (ship-centered fake explosion)

### Best hook point in current code
Use the existing player fire path:
- `playerTryFireCurrentWeapon(manual)` -> `playerFireWeapon({ weapon })`

For a weapon marked with, for example, `"aspect": "proximity"`, skip projectile spawn and explode immediately at player coordinates.

```js
function playerFireWeapon({ weapon }) {
  if ((weapon.aspect || "").toLowerCase() === "proximity") {
    applyExplosionAoE({
      centerX: state.player.x,
      centerY: state.player.y,
      radius: Number(weapon.aoe_radius) || 0,
      damage: Number(weapon.aoe_damage ?? weapon.damage) || 0,
      pushPixels: Number(weapon.aoe_push) || 0,
      sourceTeam: "player",
    });
    return;
  }

  // existing logic continues...
}
```

This gives your requested behavior:
- fake explosion centered at ship coords,
- x damage in y radius,
- push targets away by x-like configurable impulse distance.

---

## Example 2: Missile impact explosion

### Best hook points in current code
Missile-like projectiles already exist (`homing`, `arming_time`) and are updated in `updatePlayerProjectiles` / `updateEnemyProjectiles`.

When a missile collides (in `projectileHitAnyEnemy`, `projectileHitPlayer`, or `projectileHitTarget`), trigger AoE centered at hit location before removing projectile.

```js
function projectileHitAnyEnemy(p) {
  if (!state.enemies || state.enemies.length === 0) return false;

  for (let e = 0; e < state.enemies.length; e++) {
    const enemy = state.enemies[e];
    if (!enemy || !enemy.shipStats) continue;

    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist > enemy.shipStats.shieldDiameterPx) continue;

    applyDamageToEnemy(enemy, p);

    if ((Number(p.aoe_radius) || 0) > 0) {
      applyExplosionAoE({
        centerX: p.x,
        centerY: p.y,
        radius: Number(p.aoe_radius),
        damage: Number(p.aoe_damage ?? p.damage) || 0,
        pushPixels: Number(p.aoe_push) || 0,
        sourceTeam: "player",
      });
    }

    return true;
  }

  return false;
}
```

Also make sure projectile spawn copies AoE fields from weapon into `projectiles.push({...})` and `enemyProjectiles.push({...})`.

---

## Example 3: Piercing bullet with max collisions + hit cooldown ms

### Best hook points in current code
Current `projectileHitAnyEnemy` consumes projectile on first hit (`return true`). For piercing, track hit state on each projectile.

Add fields when spawning projectile:

```js
remainingPierces: Number(weapon.max_pierces) || 1,
pierceCooldownMs: Number(weapon.pierce_cooldown_ms) || 0,
lastPierceHitMs: 0,
```

Then change collision handling:

```js
function projectileHitAnyEnemy(p) {
  if (!state.enemies || state.enemies.length === 0) return false;

  const now = performance.now();
  const canPierceNow = (now - (p.lastPierceHitMs || 0)) >= (p.pierceCooldownMs || 0);

  for (const enemy of state.enemies) {
    if (!enemy || !enemy.shipStats) continue;

    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    if (Math.hypot(dx, dy) > enemy.shipStats.shieldDiameterPx) continue;

    if (!canPierceNow) return false;

    applyDamageToEnemy(enemy, p);
    p.lastPierceHitMs = now;
    p.remainingPierces = (p.remainingPierces ?? 1) - 1;

    // expire only after max collisions reached
    return p.remainingPierces <= 0;
  }

  return false;
}
```

This directly matches your requirement:
- collide X times before expiring,
- enforce Y ms before a successive accepted collision.

---

## Practical implementation order

1. **Schema first**: Add AoE/piercing fields to selected weapons in `game/weapons.json`.
2. **Spawn fields**: In `game/game.js`, ensure `projectiles.push` and `enemyProjectiles.push` copy new fields from weapon.
3. **Shared helper**: Add `applyExplosionAoE(...)` once.
4. **Use helper**:
   - proximity path in `playerFireWeapon`,
   - missile-impact path in projectile hit handlers.
5. **Piercing rule**: Update `projectileHitAnyEnemy` and (if needed) player-hit equivalent for enemy piercing shots.
6. **Balance pass**: tune `aoe_radius`, `aoe_damage`, `aoe_push`, `max_pierces`, `pierce_cooldown_ms` values per weapon.

---

## Guardrails specific to this codebase

- Keep backward compatibility: default undefined AoE/pierce fields to safe values (`0` radius, `1` pierce).
- Reuse existing damage functions (`applyDamageToEnemy`, `applyDamageToPlayer`) so shields/hull behavior stays consistent.
- Clamp push results if needed to avoid extreme velocity spikes (can reuse existing speed-clamp patterns in movement logic).
- If friendly fire is undesired for player AoE, gate with `sourceTeam` checks.

---

## Quick validation checklist

- Proximity weapon: damages multiple enemies near player in one trigger.
- Missile: on hit, splash damage affects nearby enemies (and optionally player).
- Piercing bullet: survives exactly X hits and respects Y ms hit interval.
- Non-AoE/non-piercing weapons behave unchanged.
