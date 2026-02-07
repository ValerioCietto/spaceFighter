const SystemInfo = {
    name: "Solar",
    size: 6000,
    stars: [
        {
            name: "Sun",
            position_x: 3000,
            position_y: 3000,
            radius: 100
        }
    ],
    planets: [],
    stations: [
        {
            name: "H1N17 - Tarazed Shipyards",
            position_x: 3450,
            position_y: 2800,
            station_radius: 80,
            station_rot_speed: Math.PI / 32
        }
    ],
    hyperspace_gates: [
        {
            name: "H0N17 - Alpha centauri",
            position_x: 200,
            position_y: 2900,
            rotation: 0.1,
            width: 250,
            type: "warp"
        },
        {
            name: "H1N16 - Beta centauri",
            position_x: 3100,
            position_y: 80,
            rotation: 0.1,
            width: 250,
            type: "warp"
        },
    ],
    max_enemy_number:2,
    spawn_rate:4, // threat level
};