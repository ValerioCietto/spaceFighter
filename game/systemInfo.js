const SystemInfo = {
    name: "Sol",
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
            name: "Terra",
            position_x: 3450,
            position_y: 2800,
            station_radius: 80,
            station_rot_speed: Math.PI / 32
        }
    ],
    hyperspace_gates: [
        {
            name: "Greenfield",
            position_x: 3200,
            position_y: 200,
            rotation: 0.1,
            width: 250,
            type: "warp"
        },
        {
            name: "Eos",
            position_x: 5100,
            position_y: 3000,
            rotation: 0.1,
            width: 250,
            type: "warp"
        },
                {
            name: "Alpha Centauri",
            position_x: 3700,
            position_y: 5200,
            rotation: 0.1,
            width: 250,
            type: "warp"
        },
        {
            name: "Glacius",
            position_x: 400,
            position_y: 5000,
            rotation: 0.1,
            width: 250,
            type: "warp"
        }
    ],
    max_enemy_number:2,
    spawn_rate:4, // threat level
};