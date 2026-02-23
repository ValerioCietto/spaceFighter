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
// on window load, fetch galaxy-map.json and populate SystemInfo.hyperspace_gates with the data, then export SystemInfo
window.addEventListener("load", () => {
    fetch("galaxy-map.json")
        .then(response => response.json())
        .then(data => {
            console.log("Loaded galaxy map data:", data);
            // the player is in state.player.systemName, so find that system in the data and use its hyperspace gates
            // find the sistemName from localStorage key spaceFighterSaveData, parse it as JSON, and get the systemName from state.player.systemName
            const saveDataStr = localStorage.getItem("spaceFighterSaveData");
            if (saveDataStr) {
                try {
                    const saveData = JSON.parse(saveDataStr);
                    const systemName = saveData?.player?.systemName;
                    if (systemName) {
                        const currentSystem = data.systems.find(s => s.name === systemName);
                        if (currentSystem) {
                           console.log(`Found current system in galaxy map: ${systemName}`, currentSystem);
                        }
                        SystemInfo.name = currentSystem?.name || SystemInfo.name;
                        // reconstruct hyperspace gate positions from the map using xy positions
                        // first we get all links in the galaxy map that connect to this system
                        const connectedLinks = data.links.filter(link => link.a === systemName || link.b === systemName);
                        // print all links
                        const normalizedLinks = connectedLinks.map(link => {
                            if (link.a === systemName) {
                                return { ...link };
                            } else {
                                return { a: systemName, b: link.a, type: link.type };
                            }
                        });
                        // print normalized links
                        console.log(`Normalized links for system ${systemName}:`, normalizedLinks);
                        // the xy position of the gates is the relative position in the galaxy map.
                        // so we find the position of the current system in the galaxy map, and then we find the position of the connected system, and we calculate the relative position of the gate as the midpoint between the two systems, but closer to the current system.
                        const currentSystemData = data.systems.find(s => s.name === systemName);
                        if (currentSystemData) {
                            const gates = normalizedLinks.map(link => {
                                const otherSystemData = data.systems.find(s => s.name === link.b);
                                if (otherSystemData) {
                                    // calculate relative angle and distance between the two systems
                                    const dx = otherSystemData.x - currentSystemData.x;
                                    const dy = otherSystemData.y - currentSystemData.y;
                                    const angle = Math.atan2(dy, dx);
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    // log gate angle and distance
                                    console.log(`Gate to ${link.b}: angle=${angle.toFixed(2)}, distance=${distance.toFixed(2)}`);
                                    // place the gate at the angle between tthe two systems, distant distance*10 from the central star (3000, 3000), but not further than 3000 px and less than 1000 px from (3000, 3000)
                                    // round gate position to the nearest unit to avoid subpixel rendering issues
                                    const gateX = Math.round(currentSystemData.x + Math.cos(angle) * Math.min(3000, Math.max(1000, distance * 10)));
                                    const gateY = Math.round(currentSystemData.y + Math.sin(angle) * Math.min(3000, Math.max(1000, distance * 10)));
                                    return {
                                        name: link.b,
                                        position_x: gateX+3000,
                                        position_y: gateY+3000,
                                        rotation: 0.1, // we can calculate rotation based on the angle between the two systems if we want
                                        width: 250,
                                        type: link.type || "warp"
                                    };
                                }
                                return null;
                            }).filter(gate => gate !== null);
                            SystemInfo.hyperspace_gates = gates;
                            // print gate positions
                            gates.forEach(gate => {
                                console.log(`Gate ${gate.name}: x=${gate.position_x}, y=${gate.position_y}`);
                            });
                            console.log(`Updated SystemInfo for ${systemName}:`, SystemInfo);
                        } else {
                            console.warn(`Current system ${systemName} not found in galaxy map systems data`);
                        }                        
                    }
                } catch (e) {
                    console.warn("Failed to parse save data:", e);
                }
            }
        })
        .catch(err => {
            console.warn("Failed to load galaxy map data, using default hyperspace gates", err);
        });
});

function getSystemInfo(){
    // this function compiles hyperspace_gates from galaxy-map.json
    console.log("to do");
}