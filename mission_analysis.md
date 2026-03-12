# Mission Analysis: Story & Lore Arc

## Goal
Add a coherent 10-mission narrative arc to `game/missions/story-missions.json` covering hidden gates, human/jared conflict, technician revelations, and access progression.

## Existing Mission Schema Observed
Current story missions use this structure:
- `id` (string, unique)
- `kind` (string, typically `story`)
- `title` (string)
- `description` (string)
- optional `system` (string)
- optional `rewards` object (`money`, `weapon`, `outfit`, `spaceship`)

To minimize integration risk, new missions will follow the same schema.

## Proposed Arc (from request)
1. Discover hidden gate in Alpha Centauri; report to Alpha Centauri station.
2. Destroy capital ship Zeus in Taurus Horns; reward 100,000 credits + military station access.
3. At military station, buy Jared Chaos Gate Matrix; then travel to Nyx Fall.
4. In Alpha Centauri, defeat pirate raid; receive tip about Jared outfits in Nemo.
5. In Nemo, equip Jared outfits and attempt hidden jump from Alpha Centauri.
6. In Smuggler's Den, learn Jareds and humans can cooperate; inspect relic starship for lore reveal.
7. In Tortuga, find map for Turtuk system and stealth outfits.
8. In Turtuk, discover mutual-destruction threat; go north to LX1 to contact technicians.
9. Escort technician singularity in Warfield; witness large-scale destruction.
10. Go to Gargantua; technician singularity pilot reveals technicians are ancestral humans; unlock ability to buy technician ships at LX1/Far Space 1.

## Data Decisions
- Keep mission progression as plain story entries without adding new schema keys.
- Encode unlocks/lore effects in mission `description` text.
- Use consistent ID prefix: `story-arc-<slug>` for uniqueness and traceability.
- Keep `kind` as `story`.
- Include `system` wherever explicitly provided.
- Apply the exact requested economic reward on mission 2 as `money: 100000`.

## Spelling/Normalization Choices
- Use "Taurus Horns" exactly as given.
- Use "Nyx Fall", "Smuggler's Den", "Tortuga", "Turtuk", "LX1", "Warfield", "Gargantua", "Far Space 1" as canonical names.
- Normalize "tecnician" to "technician" in mission text.

## Implementation Plan
1. Append 10 new story mission objects to `game/missions/story-missions.json`.
2. Validate JSON syntax.
3. Review formatting consistency.
