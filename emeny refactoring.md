# Enemy Refactoring Implementation Plan

## Goal
Refactor enemy management so mission/enemy data is driven by an `enemies` array of objects, where each object defines enemy-specific `spawn_rate` and `max_count`.

## New Data Contract
Each mission/encounter config will support:

```json
"enemies": [
  {
    "type": "human_stealth",
    "faction": "pirate",
    "spawn_rate": 10,
    "max_count": 1
  },
  {
    "type": "jared_stealth",
    "faction": "pirate",
    "spawn_rate": 2,
    "max_count": 1
  }
]
```

## Implementation Steps

1. **Inventory current enemy config usage**
   - Locate all places where enemy type/spawn limits are currently represented as single fields or legacy schema.
   - Document assumptions currently hardcoded in runtime logic.

2. **Define schema and defaults**
   - Add/confirm schema support for `enemies: EnemyConfig[]`.
   - Define required fields (`type`, `faction`, `spawn_rate`, `max_count`) and safe defaults/fallback behavior for missing values.

3. **Update loaders/parsers**
   - Refactor config loading so it reads `enemies` as an array.
   - Preserve backward compatibility (if needed) by translating legacy fields into a one-item `enemies` list.

4. **Refactor spawn manager**
   - Replace single-enemy spawn logic with per-entry processing.
   - For each enemy entry:
     - Track active count by enemy `type` (or unique key such as `faction:type`).
     - Apply `spawn_rate` to spawn probability/timer logic.
     - Enforce `max_count` limit before spawning.

5. **Update runtime state tracking**
   - Ensure enemy death/despawn events decrement the correct per-entry counters.
   - Handle edge cases like pooled entities, mission phase transitions, and resets.

6. **Data migration**
   - Convert existing mission/enemy data to new `enemies` format.
   - Validate that converted data preserves intended gameplay balance.

7. **Debugging and telemetry**
   - Add logs/metrics around spawn attempts, blocked spawns (`max_count` reached), and active counts per enemy entry.
   - Provide clear warnings for malformed enemy definitions.

8. **Testing**
   - Unit tests:
     - parser accepts valid `enemies` array.
     - parser rejects/handles malformed entries.
     - spawn manager respects per-enemy `spawn_rate` and `max_count`.
   - Integration tests:
     - mixed enemy lists spawn independently.
     - max-count enforcement remains correct after kills/despawns.
     - legacy configs (if supported) still function.

9. **Balancing pass**
   - Tune per-enemy `spawn_rate` values after playtesting.
   - Verify no starvation where low-rate enemies never appear.

10. **Rollout strategy**
    - Ship behind feature flag or staged migration if risk is high.
    - Remove legacy schema handling after all content is migrated.

## Acceptance Criteria
- Runtime supports multiple enemy definitions via `enemies[]`.
- Each enemy entry spawns according to its own `spawn_rate` and `max_count`.
- Active enemy counting is correct through spawn/death/despawn cycles.
- Existing content remains playable (via migration or compatibility layer).
- Tests cover parser and spawn behavior for normal and edge cases.
