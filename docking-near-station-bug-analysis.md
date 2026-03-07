# Bug analysis: player cannot dock when near the station

## Reported issue
When the player ship is visually close to the station, the **Dock/Station** button does not appear (or docking cannot be triggered).

## What I inspected
- Dock eligibility is computed in `isPlayerNearSpaceStation()` in `game/game.js`.
- Station rendering is done in `drawStation()` in `game/game.js`.

## Root cause
There is a coordinate-source mismatch:

1. **Dock proximity check uses `SystemInfo.stations[0]` coordinates**
   - `isPlayerNearSpaceStation()` computes distance from:
     - `SystemInfo.stations[0].position_x`
     - `SystemInfo.stations[0].position_y`
   - Then checks if distance is `< 200`.

2. **Rendered station uses hardcoded derived constants (`STATION_X`, `STATION_Y`)**
   - `STATION_X` and `STATION_Y` are derived from star center (`STAR_X + 450`, `STAR_Y - 200`), not from `SystemInfo.stations[0]`.
   - `drawStation()` renders the station at those constants.

Because of this, the station can be **drawn in one world position** but docking distance is checked against **a different world position**.

### Concrete mismatch in current defaults
- Rendered station position:
  - `STATION_X = STAR_X + 450 = 4450`
  - `STATION_Y = STAR_Y - 200 = 3800`
- Proximity-check station position from `SystemInfo`:
  - `position_x = 3450`
  - `position_y = 2800`

Offset is roughly `(1000, 1000)` world units, so being “near” the visible station does not satisfy dock distance.

## Why players experience it as “can’t dock near station”
The UI visibility for the station button depends on `isPlayerNearSpaceStation()`. If that returns false (because it compares distance to another point), the button remains hidden even while the player is next to the drawn station.

## Recommended fix
Unify station position source for both rendering and interaction.

### Preferred approach
Use `SystemInfo.stations[0]` as the single source of truth:
- Render station at `SystemInfo.stations[0].position_x / position_y`.
- Compute docking distance using the same coordinates.
- Optionally use `station_radius` from system data and define interaction radius as:
  - `station_radius + docking_margin`.

### Alternative approach (less ideal)
If constants are intentional, then initialize `SystemInfo.stations[0]` from `STATION_X`/`STATION_Y` so checks and rendering still align.

## Extra robustness suggestions
- Guard against missing station data (`SystemInfo.stations?.length === 0`) to avoid runtime errors.
- If multiple stations are supported, check nearest station rather than always index `0`.
