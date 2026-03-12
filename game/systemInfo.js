const SystemInfo = {
    name: "Glacius",
    size: 8000,
    stars: [
        {
            name: "Glacius Prime",
            position_x: 3000,
            position_y: 3000,
            radius: 100
        }
    ],
    planets: [],
    stations: [
        {
            name: "Brrrr Station",
            position_x: 3450,
            position_y: 2800,
            station_radius: 500,
            station_rot_speed: -Math.PI / 32
        }
    ],
    hyperspace_gates: [   
    ]
};
// on window load, fetch galaxy-map.json and populate SystemInfo.hyperspace_gates with the data, then export SystemInfo
window.addEventListener("load", () => {
    loadGatesFromGalaxyMap();
});

function loadGatesFromGalaxyMap(){
    fetch("galaxy-map.json")
        .then(response => response.json())
        .then(data => {
            const fallbackSystemName = String(SystemInfo.name || "Glacius");
            let systemName = fallbackSystemName;
            const saveDataStr = localStorage.getItem("spaceFighterSaveData");
            if (saveDataStr) {
                try {
                    const saveData = JSON.parse(saveDataStr);
                    const savedSystemName = String(saveData?.player?.systemName || "").trim();
                    if (savedSystemName) {
                        systemName = savedSystemName;
                    }
                } catch (e) {
                    console.warn("Failed to parse save data:", e);
                }
            }

            const currentSystem = data.systems.find(s => s.name === systemName);
            if (currentSystem) {
                console.log(`Found current system in galaxy map: ${systemName}`, currentSystem);
            }
            SystemInfo.name = currentSystem?.name || fallbackSystemName;

            const connectedLinks = data.links.filter(link => link.a === systemName || link.b === systemName);

            const normalizedLinks = connectedLinks.map(link => {
                if (link.a === systemName) {
                    return { ...link };
                }
                return { a: systemName, b: link.a, type: link.type };
            });

            if (currentSystem) {
                const gates = normalizedLinks.map(link => {
                    const otherSystemData = data.systems.find(s => s.name === link.b);
                    if (!otherSystemData) return null;

                    // calculate relative angle and distance between the two systems
                    const dx = otherSystemData.x - currentSystem.x;
                    const dy = otherSystemData.y - currentSystem.y;
                    const angle = Math.atan2(dy, dx);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const gateX = Math.round(currentSystem.x + Math.cos(angle) * Math.min(3000, Math.max(1000, distance * 10)));
                    const gateY = Math.round(currentSystem.y + Math.sin(angle) * Math.min(3000, Math.max(1000, distance * 10)));

                    return {
                        name: link.b,
                        position_x: gateX + 3000,
                        position_y: gateY + 3000,
                        rotation: 0.1, // we can calculate rotation based on the angle between the two systems if we want
                        width: 250,
                        type: link.type || "warp"
                    };
                }).filter(gate => gate !== null);

                // for each gate of type "hybrid", add a gate in same position but type "warp" and a gate in same position but type "chaos" with opposite rotation
                const hybridGates = gates.filter(gate => gate.type === "hybrid");
                hybridGates.forEach(gate => {
                    gates.push({ ...gate, type: "warp" });
                    gates.push({ ...gate, type: "chaos", rotation: -gate.rotation });
                });

                SystemInfo.hyperspace_gates = gates;
                // print gate positions
                gates.forEach(gate => {
                    console.log(`Gate ${gate.name}: x=${gate.position_x}, y=${gate.position_y}`);
                });
                SystemInfo.enemies = currentSystem.enemies || [];
                console.log("enemies:", SystemInfo.enemies);
                console.log(`Updated SystemInfo for ${systemName}:`, SystemInfo);
            } else {
                console.warn(`Current system ${systemName} not found in galaxy map systems data`);
                SystemInfo.hyperspace_gates = [];
            }
        })
        .catch(err => {
            console.warn("Failed to load galaxy map data, using default hyperspace gates", err);
        });
}

function getSystemInfo(){
    // this function compiles hyperspace_gates from galaxy-map.json
    console.log("to do");
}
