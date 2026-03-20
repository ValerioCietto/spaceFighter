# Asteroids feature notes

## Overview
Asteroid behavior and material definitions are managed by `game/asteroidManager.js` and consumed by `game/game.js`.

## Core behavior
- `state.asteroids` holds all asteroids in the current system.
- Asteroids are generated:
  - on `window.load` during `init()`
  - when entering a new system (`onSystemEntered`)
- Asteroids are placed in an orbital band outside the star region.

## Size-driven scaling
Each asteroid has a randomized size (`diameterPx`) between configured minimum and maximum values.

That size is used proportionally for:
- visual size in pixels
- hitpoints (`hp` / `maxHp`)
- money reward (`rewardCredits`)

So bigger asteroids are tougher and pay more.

## Materials and rewards
Weighted material tiers:
- `basic`
- `silver`
- `gold`
- `uranium`

Material rarity controls base min/max ranges for HP and reward, and size interpolation scales within those ranges.
Precious materials have higher HP and reward ranges.

Destroyed asteroids grant between 10 and 1000 credits after clamping.

## Combat interactions
Asteroids collide with and absorb:
- player projectiles
- enemy projectiles

Projectile damage reduces asteroid HP; destroyed asteroids are removed and pay credits.

## Visuals
Asteroids render with existing assets:
- `assets/asteroids/asteroid_basic1.png`
- `assets/asteroids/asteroid_silver1.png`
- `assets/asteroids/asteroid_gold1.png`
- `assets/asteroids/asteroid_uranium1.png`

A health ring is rendered around each asteroid.
