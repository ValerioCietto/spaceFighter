# Allies Support Analysis

## Goal
Add a new **allies** group that is managed similarly to **enemies**, with behavior-driven NPC ships. Allies should use AI behaviors like enemies, but **must not attack the player**.

## Core Model Update

### New entity group
- Introduce `allies` as a first-class ship group in world/combat update loops.
- Keep parity with enemy lifecycle handling where possible:
  - spawn
  - update
  - target selection
  - gate/station transitions
  - despawn
  - death/reward side effects (if any)

### Identity & affiliation
Every NPC should have:
- `group`: `player | allies | enemies | neutral` (or equivalent enum/string set)
- `affiliation`: optional sub-faction id for future diplomacy/rules
- `ai_behavior`: behavior id + state payload

## Required Behavior Rules

### Shared rule for all allies
- Allies **never intentionally target the player**.
- Allies can target enemies depending on behavior.

### Ally AI behaviors

#### 1) `escort-default`
- Member of the player fleet.
- Follows player ship with formation offset or dynamic trailing.
- Enters hyperspace gates when player enters.
- Attempts to attack nearest **damaged** ship near player (prefer enemies first; if mixed damaged targets exist, enemies still take priority).

#### 2) `escort-meatshield`
- Follows player and remains within ~300 px radius.
- Prioritizes staying between incoming threats and player when possible.
- Objective is to absorb pressure with its own shield/hull.
- Should still attack nearby enemies if able, but positioning/protection takes priority.

#### 3) `escort-aggressive`
- Fleet member.
- Attacks enemies on sight with high pursuit/commitment.
- Lower retreat threshold than other escorts.

#### 4) `merchant`
- Civilian pathing from gate→gate or gate→station.
- On destination reach (gate/station): despawn.
- After 10 seconds: spawn a new merchant at destination heading to a random valid next destination.
- Should avoid combat; evade if threatened.

#### 5) `patrol`
- Not affiliated with player fleet.
- Reactive: engages enemy that attacks any allied ship or player ship.
- Can patrol route/area until a valid reaction trigger occurs.

#### 6) `warrior`
- Not affiliated with player fleet.
- Actively attacks nearest enemy target.

## Enemy Targeting Update
Enemies should now choose nearest target among:
- player
- any allies ship

This replaces/extends player-only targeting and makes ally presence tactically meaningful.

## Targeting and Threat System Suggestions

### Candidate filtering
- Build candidate list by hostility matrix rather than hardcoded checks.
- `isHostile(attackerGroup, targetGroup)` should govern legal targets.

### Suggested hostility baseline
- enemies hostile to: player, allies
- allies hostile to: enemies
- player hostile to: enemies (existing behavior)

### Priority heuristics (example)
Use weighted score:
- base by distance (nearer is better)
- + bonus for target damaging protected entity (for escort/patrol reactions)
- + bonus for damaged/low-shield targets (if behavior says so)
- + behavior-specific overrides

## Data Contract Proposal

Add fields to NPC definitions/config:
- `group`
- `ai_behavior`
- `fleet_member` (bool)
- `follow_radius`
- `protect_radius`
- `aggression`
- `home_route` (for patrol)
- `trade_route` (for merchant)
- `respawn_delay_ms` (merchant default 10000)

## Spawning & Lifecycle Notes

### Spawn sources
- scripted mission spawns
- ambient system population
- gate/station traffic generation (merchant)

### Despawn rules
- Merchant despawns on destination reach.
- Optional offscreen cleanup for non-critical allies.
- Fleet escorts should persist across gate transitions with player.

## Hyperspace / Gate Integration
- Fleet escorts (`escort-*`) should gate with player.
- On player gate jump:
  - mark escort transfer intent
  - reposition escorts safely in destination system near player spawn point
  - preserve health/shield/ammo state

## Combat Interaction Notes
- Allies spawn weapon bullets and laser effects, and those ally-fired attacks must collide with enemies.
- Ally projectiles/beam damage should never damage the player or allied ships.
- Player attacks should never damage allies (allies are non-damageable by player by design).
- Ensure player lock-on/auto-aim systems can distinguish allies from enemies.
- UI indicators:
  - ally marker color
  - fleet vs non-fleet ally icon difference

## Minimal Implementation Plan (Incremental)

### Phase 1: Foundation
1. Add `allies` collection and shared update loop integration.
2. Add hostility matrix and retarget logic.
3. Update enemies to target nearest of player/allies.

### Phase 2: Baseline ally AI
1. Implement `warrior` and `escort-aggressive` first (simplest combat behaviors).
2. Add `escort-default` follow + gate sync.
3. Add `escort-meatshield` protective positioning.

### Phase 3: World simulation
1. Implement `merchant` route/despawn/respawn cycle.
2. Implement `patrol` reactive defense behavior.

### Phase 4: Polish
1. UI markers and target filtering.
2. Balance passes for ally durability/damage.
3. Performance optimization for larger combined fleets.

## Risks / Edge Cases
- Enemy retarget jitter between player and allies if no target lock cooldown.
- Escort crowding/collision around player without spacing logic.
- Merchant respawn loops creating runaway population without caps.
- Patrol reaction false positives if damage attribution is noisy.
- Gate-transfer duplication/loss bugs for fleet escorts.

## Testing Checklist
- Enemy target selection switches to nearest player/allied ship correctly.
- Ally bullets/laser effects collide with enemies and apply damage correctly.
- Player attacks do not damage allies.
- Allies never target player under any behavior.
- Escorts reliably follow and gate-jump with player.
- `escort-meatshield` stays within ~300 px and blocks/interposes.
- Merchant despawn + 10s respawn chain works and remains population-capped.
- Patrol reacts when enemy attacks allied or player ship.
- Warrior consistently picks nearest enemy.

## Resolved Decisions
- Allies are never damageable by the player.
- Patrol and warrior allies never cross system boundaries.

## Open Decisions (for "more later")
- Should merchant ships call for patrol backup when attacked?
- How should rewards/penalties work when allies get kills or die?
- Cap limits per behavior type per system?
