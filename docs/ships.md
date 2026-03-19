# Ship List Used In Game

This document lists the ships that are actually wired into gameplay today.

Source of truth:
- `game/shipStatProvider.js` for live ship stats, station shipyards, and enemy spawns
- `game/stationShipShop.js` for what each faction shipyard sells

`shops/common/ships.json` contains a larger 30-ship design catalog, but many of those ships are not currently connected to the playable game loop.

## Humans

### Sold in human shipyards
- `human_perseus` - Perseus
- `human_demeter` - Demeter
- `human_mercury` - Mercury
- `human_icarus` - Icarus
- `human_hermes` - Hermes
- `human_gunship` - Gunship
- `human_artemis` - Artemis
- `human_athena` - Athena
- `human_ares` - Ares
- `human_zeus` - Zeus

### Used by human enemies
- `human_perseus`
- `human_mercury`
- `human_icarus`
- `human_hermes`
- `human_gunship`
- `human_artemis`
- `human_ares`
- `human_zeus`

## Jared

### Sold in Jared shipyards
- `jared_zuque` - Zuque
- `jared_three_eyes` - Three Eyes
- `jared_three_eyes_spike_hybrid` - Three Eyes Spike Hybrid
- `jared_berseker` - Berseker
- `jared_jeweled` - Jeweled
- `jared_queen` - Queen

### Used by Jared enemies
- `jared_zuque`
- `jared_berseker`
- `jared_jeweled`
- `jared_queen`

## Technicians

### Sold in technician shipyards
- `technician_spike_razor` - Spike Razor
- `technician_spike_razor_upgraded` - Spike Razor Upgraded
- `technician_motherlode` - Motherlode
- `technician_hard_shell_v1` - Hard Shell V1
- `technician_singularity` - Singularity

### Used by technician enemies
- `technician_spike_razor`
- `technician_spike_razor_upgraded`
- `technician_motherlode`
- `technician_hard_shell_v1`
- `technician_singularity`

## Summary

- Runtime ship roster in use: 21 ships
- Human ships in use: 10
- Jared ships in use: 6
- Technician ships in use: 5

## Not Currently Wired From The 30-Ship Design Doc

Examples that appear in `shops/common/ships.json` but are not currently present in `game/shipStatProvider.js`:
- Human: `apollo`, `theseus`, `hestia`
- Jared: `sun_tzu`, `qilin`, `baihu`, `longma`, `huli_jing`, `taotie`, `xuanwu`, `fenghuang`, `kui_ox`
- Technicians: `a_1`, `d_1`, `d_2`, `f_1`, `f_2`, `f_3`, `f_4`, `f_5`, `c_1`, `c_2`
