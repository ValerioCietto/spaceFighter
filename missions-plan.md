# Missions plan

## Goal
Add a very basic mission board in the station dialog under **Plaza -> Missions**.

## Mission types
1. **Random generated missions**
   - Light, repeatable contracts.
   - Intended as quick ways to make money.
   - Regenerated when entering a system.

2. **Story missions**
   - Defined as JSON files in `game/missions/`.
   - Can reward credits and special objects:
     - weapons
     - outfits
     - exclusive spaceships

## Basic flow
- When player enters a system, random missions for that system are refreshed.
- Opening station -> Plaza -> Missions shows:
  - quick missions section
  - story mission section
- Completing a mission immediately grants rewards to player state.

## Persistence
- Mission board state saved in localStorage, scoped by system name.
- Story missions track completion IDs per system save scope.

## Next steps (future)
- Add mission requirements/objectives tracking in-flight.
- Add accept/abandon states instead of instant-complete button.
- Tie mission targets to enemies, planets, and hyperspace routes.
