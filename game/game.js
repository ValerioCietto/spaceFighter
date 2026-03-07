 (function () {
      const state = {
        discoveredSystems: ["Sol", "Glacius"],
        player: {
          x: SystemInfo.size / 2,
          y: SystemInfo.size / 2,
          vx: 0,
          vy: 0,
          angle: -Math.PI / 2,
          money: 0,
          systemName: "Glacius",
      
          currentSpaceshipId: 0,
      
          shipName: "human_starfighter",
          
          ownedSpaceships: [
            // spaceships the player has bought and can select in the inventory screen or station shipyard Equip Ship sub tab.
            {
              id: 0,
              name: "Little Raven",
      
              templateName: "human_perseus",
                shipStats: {
                cost: 5000,
                shield: 99,
                hull: 48, // a little beat down perseus
                speed: 145,
                acceleration: 170,
                turningSpeedRad: Math.PI * 1.2,
                engineFlareType: "triangular",
                engineFlareWidth: 10,
                engineFlareLength: 26,
                image: "human_perseus1.png",
                shieldDiameterPx: 33,
                shieldRegen:1,
                CPU: 5,
                shipCenter: { x: 0.5, y: 0.5 },
                engineCoords: [{ x: 0, y: -5 }],
                weaponGunCoords: [{type: "gun", x: 18, y: 0, equippedWeapon: "pea_shooter" }],
              },
      
              outfits: [
                {
                  name: "Shield Booster Mk1",
                  price: 200,
                  type: "defensive",
                  status: "equipped", // use: "equipped" / "stored"
                  outfitSpaceCost: 1,
                  effects: [{ shieldMaxBonus: 20 }],
                  description: "A cheap small max shield bonus with no downsides.",
                },
                {
                  name: "Target pointer hud",
                  price: 10,
                  type: "software",
                  status: "equipped",
                  outfitSpaceCost: 0,
                  effects: [{ givesAbility: "targetHighlighter" }],
                  description:
                    "Helps to see nearer target. Press TAB or bullseye button to toggle.",
                },
              ],
      
              weapons: {
                gunPorts: [],
                turretPorts: [],
                dronePorts: [],
              },
      
              abilities: {
                // granted by outfits/software or story unlocks
                // e.g. targetHighlighter: true
              },

              cargo: [],
            },
          ],
          // weapons the player has bought and can equip
          ownedWeapons: [],
          ownedOutfits: [],
          ownedSoftware: [],
          missions: [],
        },
      
        enemies: [],
        neutralPassive: [],
        allies: [],
        targets: [],
      
        ui: {
          mode: "game", // "inventory" | "galaxyMap" | "station" | "tutorialMode" | "game"
          deathModal: false,
        },
      };
  
      const STAR_DIAMETER = SystemInfo.stars[0].radius+200;
      const STAR_RADIUS_WORLD = SystemInfo.stars[0].radius;
      const STAR_X = SystemInfo.size/2;
      const STAR_Y = SystemInfo.size/2;

      const DEFAULT_STATION_RADIUS = 80;
      const DEFAULT_STATION_ROT_SPEED = Math.PI / 32; // rad/sec

      const STATION_ASSET = window.BASE_PATH + "/assets/human_space_station_basic1.png";
      const stationImg = new Image();
      stationImg.src = STATION_ASSET;

      const FRICTION = 70;
      const MONEY_PER_TARGET = 1000;

      const canvas = document.getElementById("game-canvas");
      const ctx = canvas.getContext("2d");

      const minimapCanvas = document.getElementById("minimap-canvas");
      const minimapCtx = minimapCanvas.getContext("2d");

      const speedValueEl = document.getElementById("speed-value");
      const posValueEl = document.getElementById("pos-value");
      const moneyValueEl = document.getElementById("money-value");

      const touchButtons = document.querySelectorAll(".touch-btn");
      const lockButton = document.querySelector('.touch-btn[data-action="lock"]');
      const solarSystemEl = document.getElementById("solar-system-value");
    
      const shieldValueEl = document.getElementById("shield-value");
      const hullValueEl = document.getElementById("hull-value");
      const energyValueEl = document.getElementById("energy-value");
      
      // station overlay elements

      const stationOverlayBtn = document.getElementById("station-overlay-btn");
      stationOverlayBtn.addEventListener("click", stationOverlayOpen);

      const hyperspaceBtn = document.getElementById("hyperspace-btn");
      const hyperSpaceManager = createHyperSpaceManager({
        state,
        systemInfo: SystemInfo,
        buttonEl: hyperspaceBtn,
        saveState,
        discoverSystem,
        starX: STAR_X,
        starY: STAR_Y,
        getCanvasContext: () => ctx,
        getCanvasSize: () => ({ width, height }),
        getLineToTarget: () => lineToTarget,
        onSystemEntered: (systemName) => {
          if (globalThis.StationManager?.refreshMissionsForSystem) {
            globalThis.StationManager.refreshMissionsForSystem(systemName, { force: true });
          }
          saveState();
        },
      });
      hyperspaceBtn.addEventListener("click", hyperSpaceManager.enterHyperspace);

      function getPrimaryStation() {
        return SystemInfo?.stations?.[0] || null;
      }

      function getStationInteractionRadius(station) {
        const stationRadius = Math.max(
          1,
          Number(station?.station_radius) || DEFAULT_STATION_RADIUS
        );
        return stationRadius + 120;
      }

      function isPlayerNearSpaceStation(){
        // AnyStation software allows the player to open station overlay
        // even if not near a space station.
        // AnyStation - make yourself at home even in space.
        if(state.player?.abilities?.anystation){
          return true;
        }
        const station = getPrimaryStation();
        if (!station) return false;

        const stationX = Number(station.position_x);
        const stationY = Number(station.position_y);
        if (!Number.isFinite(stationX) || !Number.isFinite(stationY)) return false;

        const dx = state.player.x - stationX;
        const dy = state.player.y - stationY;
        const dist = Math.hypot(dx, dy);
        const interactionRadius = getStationInteractionRadius(station);
        if(dist < interactionRadius){
          return true;
        }
        else{
          return false;
        }
      }
      function updateStationButtonVisibility() {
        stationOverlayBtn.style.display =
          isPlayerNearSpaceStation() ? "block" : "none";
      }

      function stationOverlayOpen(){
        const station = getPrimaryStation() || {};
        StationManager.openStation({
          name: station.name || "Orbital Station",
          systemInfo: SystemInfo,
        });
      }

      const inventoryOverlayEl = document.getElementById("inventory-overlay");
      const inventoryCloseBtn = document.getElementById("inventory-close-btn");
      const inventoryTutorialBtn = document.getElementById("inventory-tutorial-btn");
      const inventoryBtn = document.getElementById("inventory-btn");

      inventoryBtn.addEventListener("click", openInventory);
      function openInventory() {
        inventoryOverlayEl.classList.add("open");
        state.ui.mode = "inventory";
        renderInventory(state);
      }

      function closeInventory() {
        inventoryOverlayEl.classList.remove("open");
        if (state.ui.mode === "inventory") {
          state.ui.mode = "game";
        }
      }

      inventoryCloseBtn.addEventListener("click", closeInventory);
      inventoryTutorialBtn.addEventListener("click", () => {
        closeInventory();
        enterTutorialMode();
      });

      const galaxyMapBtn = document.getElementById("galaxy-map-btn");
      galaxyMapBtn.addEventListener("click", openGalaxyOverlay);

      // optional: ESC key
      window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
          closeInventory();
          exitTutorialMode();
        }
      });

      const tutorialOverlayEl = document.getElementById("tutorial-overlay");
      const tutorialAnnotationsEl = document.getElementById("tutorial-annotations");
      const tutorialCloseBtn = document.getElementById("tutorial-close-btn");

      const tutorialSteps = [
        { selector: "#inventory-btn", text: "Manage stuff", offsetX: -120, offsetY: -5 },
        { selector: "#galaxy-map-btn", text: "Plan where to go", offsetX: -130, offsetY: 5 },
        { selector: '.touch-btn[data-action="left"]', text: `Turn ↺`, offsetX: -30, offsetY: -50 },
        { selector: '.touch-btn[data-action="right"]', text: "Turn ↻", offsetX: 0, offsetY: -50 },
        { selector: '.touch-btn[data-action="fire"]', text: "Fire", offsetX: -10, offsetY: -50 },
        { selector: '.touch-btn[data-action="lock"]', text: "Targeting", offsetX: -15, offsetY: -50 },
        { selector: '.touch-btn[data-action="weapon-cycle"]', text: "Weapons", offsetX: -5, offsetY: -50 },
        { selector: '.touch-btn[data-action="thrust"]', text: "Forward", offsetX: 25, offsetY: -85 },
        { selector: '.touch-btn[data-action="brake"]', text: "Brake", offsetX: 45, offsetY: -110 },
      ];

      function isTutorialMode() {
        const params = new URLSearchParams(window.location.search);
        return params.get("new") === "1";
      }

      function openTutorialOverlay() {
        tutorialOverlayEl.classList.add("open");
        renderTutorialAnnotations();
      }

      function closeTutorialOverlay() {
        tutorialOverlayEl.classList.remove("open");
        tutorialAnnotationsEl.innerHTML = "";
      }

      function renderTutorialAnnotations() {
        tutorialAnnotationsEl.innerHTML = "";

        tutorialSteps.forEach((step) => {
          const target = document.querySelector(step.selector);
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const callout = document.createElement("div");
          callout.className = "tutorial-callout";
          callout.textContent = step.text;
          tutorialAnnotationsEl.appendChild(callout);

          const boxRect = callout.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const offsetX = step.offsetX || 0;
          const offsetY = step.offsetY || 0;
          let left = centerX - boxRect.width / 2 + offsetX;
          let top = centerY - boxRect.height / 2 + offsetY;

          const maxLeft = window.innerWidth - boxRect.width - 8;
          left = Math.max(8, Math.min(left, maxLeft));

          const maxTop = window.innerHeight - boxRect.height - 8;
          top = Math.max(8, Math.min(top, maxTop));

          callout.style.left = `${left}px`;
          callout.style.top = `${top}px`;
        });
      }

      function enterTutorialMode() {
        state.ui.mode = "tutorialMode";
        openTutorialOverlay();
      }

      function exitTutorialMode() {
        state.ui.mode = "game";
        closeTutorialOverlay();
      }

      if (isTutorialMode()) {
        enterTutorialMode();
      }

      tutorialCloseBtn.addEventListener("click", exitTutorialMode);
      window.addEventListener("resize", () => {
        if (state.ui.mode === "tutorialMode") {
          renderTutorialAnnotations();
        }
      });

      const deathOverlayEl = document.getElementById("death-overlay");
      const deathReloadBtn = document.getElementById("death-reload-btn");
      const deathRestartBtn = document.getElementById("death-restart-btn");

      function openDeathOverlay() {
        deathOverlayEl.classList.add("open");
        state.ui.mode = "death";
      }

      function closeDeathOverlay() {
        deathOverlayEl.classList.remove("open");
      }

      // Called by game logic when hull <= 0
      function onPlayerDeath() {
        openDeathOverlay();
      }

      deathReloadBtn.addEventListener("click", () => {
        window.location.reload();
      });

      deathRestartBtn.addEventListener("click", () => {
        // redirect to 
        window.location.href = new URL('index.html', window.BASE_URL || window.location.origin + '/').toString();
      });

      const galaxyOverlayEl = document.getElementById("galaxy-overlay");
      const galaxyCloseBtn = document.getElementById("galaxy-close-btn");

      function openGalaxyOverlay() {
        saveState();
        galaxyOverlayEl.classList.add("open");
        state.ui.mode = "galaxyMap";
      }

      function closeGalaxyOverlay() {
        galaxyOverlayEl.classList.remove("open");
        state.ui.mode = "game";
      }

      galaxyCloseBtn.addEventListener("click", closeGalaxyOverlay);

      // optional ESC close
      window.addEventListener("keydown", e => {
        if (e.key === "Escape") closeGalaxyOverlay();
      });
      
      // loadShipImage(filename) from shipStatProvider.js

      let width = 0;
      let height = 0;

      let minimapSize = 0;
      let minimapScale = 0;

      const input = {
        left: false,
        right: false,
        thrust: false,
        brake: false
      };

      let lineToTarget = false;
      let stationAngle = 0;

      const projectiles = [];
      const enemyProjectiles = [];
      const beamEffects = [];
      let target = null;

      function spawnTarget() {
        const centerX = SystemInfo.size / 2;
        const centerY = SystemInfo.size / 2;
        const maxR = 500;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * maxR;
        const radius = 10 + Math.random() * 30;
        const targetHp = 1 + Math.random() * 9;

        target = {
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          radius,
          hp: targetHp
        };
      }

      function spawnEnemy(shipName) {
        const centerX = SystemInfo.size / 2;
        const centerY = SystemInfo.size / 2;
        // enemy spawn distance from star
        const r = ENEMY_SPAWN_R_MIN + Math.random() * (ENEMY_SPAWN_R_MAX - ENEMY_SPAWN_R_MIN);

        const a = Math.random() * Math.PI * 2;
        const shipStats = getStats(shipName);

        const maxShield = shipStats?.shield ?? 20;
        const maxHull = shipStats?.hull ?? 20;

        const weapon = pickEnemyWeapon();

        const enemy = {
          id: enemyIdSeq++,
          shipName,
          shipStats,
          img: shipStats.image,

          x: centerX + Math.cos(a) * r,
          y: centerY + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          angle: 0,

          weapon,
          lastFire: 0,

          shield: maxShield,
          maxShield,
          hull: maxHull,
          maxHull,
        };

        state.enemies.push(enemy);
        console.log(state.enemies);
      }

      let enemyIdSeq = 0;
      state.enemies = [];
      function updateEnemySpawning(dt) {
        // enemies are now defined in systemInfo.enemies as an array of { type: "enemyTypeName", spawn_weight: number } objects, where enemyTypeName corresponds to an object in ENEMY_TYPES which defines the spaceships that can spawn for that enemy type
        if (!Array.isArray(SystemInfo.enemies)) {
          console.warn("enemies is not an array, issue on loading enemies array from systemInfo.");
          SystemInfo.enemies = [];
        }

        for(const enemyGroup of SystemInfo.enemies){
          // each group has its own spawn rate and max number
          const enemyGroupType = ENEMY_TYPES.find(type => type.name === enemyGroup.type);
          if(enemyGroupType){

            const enemyGroupSpaceships = enemyGroupType.spaceships;
            // if the group doesn't have an enemySpawnAcc, create one in the enemyGroup
            if(enemyGroup.enemySpawnAcc === undefined || isNaN(enemyGroup.enemySpawnAcc)){
              SystemInfo.enemies = SystemInfo.enemies.map(g => {
                if(g === enemyGroup){
                  return { ...g, enemySpawnAcc: 0, enemyCurrentCount: 0 };
                }
                else{
                  return g;
                }              
              });
            }
            // so now the enemyGroup has an enemySpawnAcc that we can use to track spawning for that group
            enemyGroup.enemySpawnAcc += dt;
            const spawnRate = enemyGroup.spawn_rate || 1;
            const maxNumber = enemyGroup.max_count || 0;
            // if we already have maxNumber, skip spawning for this group
            const currentNumber = enemyGroup.enemyCurrentCount || 0;
            if(currentNumber < maxNumber){
              // if enemySpawnAcc exceeds spawnRate, spawn an enemy from this group and reset the acc
              if(enemyGroup.enemySpawnAcc >= spawnRate){
                enemyGroup.enemySpawnAcc -= spawnRate;
                // spawn an enemy from this group by picking a random spaceship from enemyGroupSpaceships and using its stats to create the enemy, then add the enemy to state.enemies
                const shipName = enemyGroupSpaceships[(Math.random() * enemyGroupSpaceships.length) | 0];
                // call spawnEnemy with the shipName to create the enemy and add it to state.enemies
                spawnEnemy(shipName);
                enemyGroup.enemyCurrentCount = (enemyGroup.enemyCurrentCount || 0) + 1;
              }
            }


          }
        }
        
      }

      function updateMakeEnemiesToFire(dt) {
        const now = performance.now();
        if (!state.enemies || state.enemies.length === 0) return;

        state.enemies.forEach((enemy) => {

          if (!enemy || !enemy.weapon || !enemy.shipStats) return;

          const firerateMult = Number(enemy.shipStats.firerateMult) || 1.0;
          const minDelayMs = Math.max(1, Number(enemy.weapon.delay_ms) || 0) * 1 / firerateMult;

          const last = Number(enemy.lastFire) || 0;
          if (now - last < minDelayMs) return;

          if (enemyFireWeapon(enemy)) {
            enemy.lastFire = now;
          }
        });
      }

      function enemyFireWeapon(enemy) {
        const w = enemy.weapon;
        if (!w) return false;

        // range check
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist > (w.engage_range || 0)) return false;

        if (isBeamWeapon(w)) {
          enemyFireBeam(enemy, w);
          return true;
        }

        // aim at player
        const angle = Math.atan2(dy, dx);

        const spreadRad = (w.spread || 0) * Math.PI / 180;
        const muzzleDistance = 18;

        const count = w.projectiles || 1;

        for (let i = 0; i < count; i++) {
          const offset = spreadRad > 0
            ? (-spreadRad + Math.random() * (2 * spreadRad))
            : 0;

          const a = angle + offset;
          const dirX = Math.cos(a);
          const dirY = Math.sin(a);

          const speed = Number(w.base_speed) || 0;

          const startX = enemy.x + dirX * muzzleDistance;
          const startY = enemy.y + dirY * muzzleDistance;

          enemyProjectiles.push({
            owner: "enemy",
            enemyId: enemy.id,

            x: startX,
            y: startY,
            vx: dirX * speed,
            vy: dirY * speed,

            age: 0,
            life: w.life_span,
            damage: w.damage,
            aspect: w.aspect || "line",
            angle: a,

            homing: !!w.homing,
            speed,
            accel: w.acceleration || 0,
            maxSpeed: w.speed || w.base_speed || 0,
            turnSpeed: w.turn_speed_rad || 0 
          });
        }

        return true;
      }

      function enemyFireBeam(enemy, weapon) {
        const beamDamage = Number(weapon.damage) || 0;
        const beamDamageEnergy = Number(weapon.damageEnergy) || 0;
        const beamColor = weapon.color || "#ffffff";
        const beamWidth = Math.max(1, Number(weapon.width) || 1);
        const beamLife = Math.max(0.01, Number(weapon.life_span) || 0.1);
        const beamAspect = weapon.aspect || "laser";
        const beamProjectiles = Math.max(1, Number(weapon.projectiles) || 1);

        for (let i = 0; i < beamProjectiles; i++) {
          applyDamageToPlayer({ damage: beamDamage, damageEnergy: beamDamageEnergy });
          beamEffects.push({
            x1: enemy.x,
            y1: enemy.y,
            x2: state.player.x,
            y2: state.player.y,
            color: beamColor,
            width: beamWidth,
            age: 0,
            life: beamLife,
            aspect: beamAspect,
          });
        }
      }

     function attemptFireWeapon(manual = false) {
       const idx = currentWeaponIndex;
       const weapon = weapons[idx];
       const now = performance.now();

       if (!weapon) return;
     
       // 1) Autofire toggle + gating (no projectile side-effects here)
       const toggleRes = applyAutofireToggleAndGate({ weapon, idx, manual });
       if (!toggleRes.canProceed) return;
     
       // 2) Can-fire checks (cooldown etc.)
       if (!canPlayerFireWeapon({ weapon, idx, now })) return;

       // 3) Spend energy only when the shot is actually allowed
       spendPlayerWeaponEnergy(weapon);
     
       // 4) Mark last fire timestamp
       weaponLastFire[idx] = now;
     
       // 5) Execute fire (projectiles creation)
       playerFireWeapon({ weapon, now });
     }
     
     /** Autofire: keep behavior identical to original */
     function applyAutofireToggleAndGate({ weapon, idx, manual }) {
       // If NOT manual: only proceed if weapon supports autofire AND it is currently toggled ON
       if (!manual) {
         if (!weapon?.autofire_toggle) return { canProceed: false };
         if (!weapons[idx]?.autofireToggled) return { canProceed: false };
       }
     
       // Preserve original toggle semantics:
       // - manual press while autofire ON => turn it OFF
       // - else => turn it ON
       if (manual && weapon?.autofire_toggle && weapons[idx].autofireToggled) {
         weapons[idx].autofireToggled = false;
       } else {
         weapons[idx].autofireToggled = true;
       }
     
       return { canProceed: true };
     }
     
     /** Cooldown / firerate gating (no firing side-effects here) */
     function canPlayerFireWeapon({ weapon, idx, now }) {
       const last = weaponLastFire[idx] || 0;
       const firerateMult = state.player.shipStats.firerateMult || 1.0;
       const minDelay = weapon.delay_ms * (1 / firerateMult);
       const canFire = now - last >= minDelay;
       if (!canFire) return false;

       const currentEnergy = Number(state?.player?.shipStats?.energy) || 0;
       const energyCost = Math.max(0, Number(weapon?.energy_cost) || 0);
       return currentEnergy >= energyCost;
     }

     function spendPlayerWeaponEnergy(weapon) {
       const stats = state?.player?.shipStats;
       if (!stats) return;

       const energyCost = Math.max(0, Number(weapon?.energy_cost) || 0);
       const currentEnergy = Number(stats.energy) || 0;
       stats.energy = Math.max(0, currentEnergy - energyCost);
     }
     
     /** Fire logic: aim + spawn projectiles (no toggle/can-fire logic here) */
    function playerFireWeapon({ weapon }) {
      if (isBeamWeapon(weapon)) {
        playerFireBeam(weapon);
        return;
      }

      const baseAngle = resolveBaseAngleForWeapon({ weapon });
    
      const spreadRad = (weapon.spread || 0) * Math.PI / 180;
      const shipSpeedX = state.player.vx;
      const shipSpeedY = state.player.vy;
    
      const damageMult = state.player.shipStats.damageMult || 1;
      const weaponDamage = weapon.damage * damageMult;
    
      const count = weapon.projectiles || 1;
      // If no ports are defined, fallback to old single muzzle (keeps robustness)
      const ports = Array.isArray(state.player.shipStats.weaponGunCoords) && state.player.shipStats.weaponGunCoords.length
        ? state.player.shipStats.weaponGunCoords
        : [{ type: "gun", x: 0, y: 18 }];
    
      for (const port of ports) {
        if (!port) continue;
    
        // rotate local port coords by ship angle, then translate to world
        const p = rotatePoint(port.x, port.y, state.player.angle);
        const muzzleX = state.player.x + p.x;
        const muzzleY = state.player.y + p.y;
        for (let i = 0; i < count; i++) {
          const offset = spreadRad > 0 ? (-spreadRad + Math.random() * (2 * spreadRad)) : 0;
          const angle = baseAngle + offset;
    
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
    
          let vx, vy, speed;
    
          if (weapon.homing) {
            speed = weapon.base_speed;
            vx = dirX * speed;
            vy = dirY * speed;
          } else {
            speed = weapon.base_speed;
            vx = shipSpeedX + dirX * weapon.base_speed;
            vy = shipSpeedY + dirY * weapon.base_speed;
          }
          projectiles.push({
            x: muzzleX,
            y: muzzleY,
            vx,
            vy,
            age: 0,
            life: weapon.life_span,
            damage: weaponDamage,
            aspect: weapon.aspect,
            angle,
            homing: !!weapon.homing,
            speed,
            accel: weapon.acceleration || 0,
            maxSpeed: weapon.speed || weapon.base_speed || 0,
            turnSpeed: weapon.turn_speed_rad || 0,
            arming_time: weapon.arming_time || 0,
          });
        }
      }
    }

    function playerFireBeam(weapon) {
      const engageRange = Number(weapon.engage_range) || 0;
      if (engageRange <= 0) return;

      const beamTarget = resolveBeamTarget(state.player.x, state.player.y, engageRange);
      if (!beamTarget) return;

      const beamDamage = Number(weapon.damage) || 0;
      const beamDamageEnergy = Number(weapon.damageEnergy) || 0;
      const beamColor = weapon.color || "#ffffff";
      const beamWidth = Math.max(1, Number(weapon.width) || 1);
      const beamLife = Math.max(0.01, Number(weapon.life_span) || 0.1);
      const beamAspect = weapon.aspect || "laser";
      const beamProjectiles = Math.max(1, Number(weapon.projectiles) || 1);

      for (let i = 0; i < beamProjectiles; i++) {
        if (beamTarget.kind === "enemy") {
          applyDamageToEnemy(beamTarget.entity, { damage: beamDamage, damageEnergy: beamDamageEnergy });
        } else {
          applyDamageToTarget(beamTarget.entity, beamDamage);
        }

        beamEffects.push({
          x1: state.player.x,
          y1: state.player.y,
          x2: beamTarget.entity.x,
          y2: beamTarget.entity.y,
          color: beamColor,
          width: beamWidth,
          age: 0,
          life: beamLife,
          aspect: beamAspect,
        });
      }
    }

    function resolveBeamTarget(originX, originY, range) {
      const nearestEnemy = getNearestEnemy(originX, originY);
      if (nearestEnemy) {
        const enemyDist = Math.hypot(nearestEnemy.x - originX, nearestEnemy.y - originY);
        if (enemyDist <= range) return { kind: "enemy", entity: nearestEnemy };
      }

      if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
        const targetDist = Math.hypot(target.x - originX, target.y - originY);
        if (targetDist <= range) return { kind: "target", entity: target };
      }

      return null;
    }

    function isBeamWeapon(weapon) {
      const aspect = (weapon?.aspect || "").toLowerCase();
      return aspect === "laser" || aspect === "lightning" || weapon?.beam === true;
    }
    
    function rotatePoint(x, y, angleRad) {
      const c = Math.cos(angleRad);
      const s = Math.sin(angleRad);
      return { x: x * c - y * s, y: x * s + y * c };
    }
     
     function resolveBaseAngleForWeapon({ weapon }) {
       let baseAngle = state.player.angle;
     
       if (weapon.auto_aim && state.enemies && state.enemies.length > 0) {
         let nearest = null;
         let minDist2 = Infinity;
     
         for (const e of state.enemies) {
           if (!e) continue;
           const dx = e.x - (state.player.x + state.player.vx);
           const dy = e.y - (state.player.y + state.player.vy);
           const d2 = dx * dx + dy * dy;
           if (d2 < minDist2) {
             minDist2 = d2;
             nearest = e;
           }
         }
     
         if (nearest) {
           const toEnemyAngle = Math.atan2(
             nearest.y - (state.player.y + state.player.vy),
             nearest.x - (state.player.x + state.player.vx)
           );
           const diff = normalizeAngleDiff(toEnemyAngle - state.player.angle);
           if (Math.abs(diff) <= weapon.auto_aim) {
             baseAngle = toEnemyAngle;
           }
         }
       }
     
       return baseAngle;
     }

      function cycleWeapon() {
        currentWeaponIndex = (currentWeaponIndex + 1) % weapons.length;
      }

      function updateLockButtonVisual() {
        if (!lockButton) return;
        if (lineToTarget) {
          lockButton.classList.add("toggled");
        } else {
          lockButton.classList.remove("toggled");
        }
      }

      // STARFIELD
      const starLayers = [];
      const NUM_LAYERS = 3;
      const STARS_PER_LAYER = 80;

      function initStarfield() {
        starLayers.length = 0;
        for (let i = 0; i < NUM_LAYERS; i++) {
          const factor = 0.2 + i * 0.3;
          const stars = [];
          for (let s = 0; s < STARS_PER_LAYER; s++) {
            stars.push({
              x: Math.random() * SystemInfo.size * 2 - SystemInfo.size,
              y: Math.random() * SystemInfo.size * 2 - SystemInfo.size
            });
          }
          starLayers.push({ factor, stars });
        }
      }

      function resize() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const minimapContainer = document.getElementById("minimap");
        minimapSize = Math.min(
          minimapContainer.clientWidth,
          minimapContainer.clientHeight
        );

        minimapCanvas.width = minimapSize * dpr;
        minimapCanvas.height = minimapSize * dpr;
        minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        minimapScale = (minimapSize * 0.8) / SystemInfo.size;
      }

      window.addEventListener("resize", resize);

      function loadState() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;

          const saved = JSON.parse(raw);
          if (!saved?.player) return;

          ["x", "y", "vx", "vy", "angle", "money"].forEach((k) => {
            if (typeof saved.player[k] === "number") state.player[k] = saved.player[k];
          });

          if (typeof saved.player.systemName === "string" && saved.player.systemName.trim()) {
            state.player.systemName = saved.player.systemName.trim();
          }

          if (Array.isArray(saved.discoveredSystems)) {
            state.discoveredSystems = saved.discoveredSystems
              .map((name) => String(name || "").trim())
              .filter(Boolean);
          }

          if (Array.isArray(saved.player.ownedSpaceships)) {
            state.player.ownedSpaceships = saved.player.ownedSpaceships;
          }

          if (Number.isFinite(saved.player.currentSpaceshipId)) {
            state.player.currentSpaceshipId = saved.player.currentSpaceshipId;
          }

          if (!Number.isFinite(state.player.currentSpaceshipId) && Number.isFinite(saved.player.activeShipId)) {
            state.player.currentSpaceshipId = saved.player.activeShipId;
          }

          const loadedOwnedWeapons = Array.isArray(saved.player.ownedWeapons)
            ? saved.player.ownedWeapons
                .filter((weapon) => {
                  if (!weapon) return false;
                  if (typeof weapon === "string") return weapon.trim().length > 0;
                  if (typeof weapon === "object") {
                    const id = String(weapon.id || "").trim();
                    const name = String(weapon.name || "").trim();
                    return Boolean(id || name);
                  }
                  return false;
                })
                .map((weapon) => {
                  if (typeof weapon === "string") {
                    return {
                      id: weapon.trim(),
                      name: weapon.trim(),
                      cost: 0,
                    };
                  }

                  return {
                    ...weapon,
                    id: String(weapon.id || "").trim() || String(weapon.name || "").trim(),
                    name: String(weapon.name || "").trim() || String(weapon.id || "").trim(),
                    cost: Number.isFinite(Number(weapon.cost)) ? Number(weapon.cost) : 0,
                  };
                })
            : [];
          state.player.ownedWeapons = loadedOwnedWeapons;

          if (Array.isArray(saved.player.missions)) {
            state.player.missions = saved.player.missions;
          }

          applyActiveShip(state); 
        } catch (e) {
          console.warn("Impossibile caricare lo stato:", e);
        }

        discoverSystem(state.player.systemName);

        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
      }

      function discoverSystem(systemName) {
        const normalizedName = String(systemName || "").trim();
        if (!normalizedName) return;

        if (!Array.isArray(state.discoveredSystems)) {
          state.discoveredSystems = [];
        }

        const alreadyDiscovered = state.discoveredSystems.some(
          (knownName) => String(knownName).toLowerCase() === normalizedName.toLowerCase()
        );
        if (!alreadyDiscovered) {
          state.discoveredSystems.push(normalizedName);
        }
      }


      function saveState() {
        try {
          const inventory = Array.isArray(state?.player?.ownedWeapons)
            ? state.player.ownedWeapons
            : [];
          state.player.ownedWeapons = inventory;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
          console.warn("Impossibile salvare lo stato:", e);
        }
      }

      function moveEnemies(dt){
        if(state.enemies.length > 0){
          // move every enemy toward the player if they haven't reached the engagement range
          
          state.enemies.forEach(enemy => {
            const stats = enemy.shipStats || getStats(enemy.shipName);

            const turnSpeed = stats?.turningSpeedRad ?? (Math.PI / 2); // rad/sec fallback
            const maxSpeed = stats?.speed ?? 220;
            const accel = stats?.acceleration ?? 120;

            const engageRange = enemy.weapon?.engage_range ?? 500;

            const dx = state.player.x - enemy.x;
            const dy = state.player.y - enemy.y;
            const dist = Math.hypot(dx, dy) || 1;

            // 1) turn toward player (bounded by turning speed)
            const desiredAngle = Math.atan2(dy, dx);
            let diff = normalizeAngleDiff(desiredAngle - enemy.angle);
            const maxTurn = turnSpeed * dt;
            if (diff > maxTurn) diff = maxTurn;
            if (diff < -maxTurn) diff = -maxTurn;
            enemy.angle += diff;

            // 2) compute target speed: full chase outside engage range, slower inside
            const targetSpeed = dist > engageRange ? maxSpeed : maxSpeed * 0.5;

            // 3) accelerate/decelerate enemy velocity toward targetSpeed along facing direction
            const dirX = Math.cos(enemy.angle);
            const dirY = Math.sin(enemy.angle);

            const curSpeed = Math.hypot(enemy.vx || 0, enemy.vy || 0);
            let newSpeed = curSpeed;

            if (curSpeed < targetSpeed) {
              newSpeed = Math.min(targetSpeed, curSpeed + accel * dt);
            } else if (curSpeed > targetSpeed) {
              newSpeed = Math.max(targetSpeed, curSpeed - accel * dt);
            }

            enemy.vx = dirX * newSpeed;
            enemy.vy = dirY * newSpeed;

            // 4) apply movement
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;

            // (optional) clamp to world bounds like player
            enemy.x = Math.max(0, Math.min(SystemInfo.size, enemy.x));
            enemy.y = Math.max(0, Math.min(SystemInfo.size, enemy.y));
          });
        }
      }

    function drawEnemies() {
      if (!state.enemies || state.enemies.length === 0) return;

        state.enemies.forEach((enemy) => {
          const stats = enemy.shipStats;
          const imgFile = stats?.image;
          if (!imgFile) return;

          if (!enemy._imgFile || enemy._imgFile !== imgFile || !enemy._img) {
            enemy._imgFile = imgFile;
            enemy._img = loadShipImage(imgFile);
          }

          const img = enemy._img;
          if (!img || !img.complete || img.naturalWidth <= 0) return;

          // world -> screen
          const screenX = width / 2 + (enemy.x - state.player.x);
          const screenY = height / 2 + (enemy.y - state.player.y);

          // --- draw ship sprite ---
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate((enemy.angle || 0) + Math.PI / 2);

          const targetW = enemy.shipStats.shieldDiameterPx;
          const scale = targetW / img.naturalWidth;
          const w = img.naturalWidth * scale;
          const h = img.naturalHeight * scale;

          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();

          // --- indicator circles (hull + shield), target-like arcs ---
          const hullMax = enemy.maxHull ?? enemy.hull ?? 1;
          const shieldMax = enemy.maxShield ?? enemy.shield ?? 1;

          const hullRatio = Math.max(0, Math.min(1, (enemy.hull ?? 0) / hullMax));
          const shieldRatio = Math.max(0, Math.min(1, (enemy.shield ?? 0) / shieldMax));

          // ring radii (tweak to taste)
          const hullR = enemy.shipStats.shieldDiameterPx-6; // 22
          const shieldR = enemy.shipStats.shieldDiameterPx; // 28

          // base full circles (subtle)
          ctx.save();
          ctx.lineWidth = 3;

          // HULL (grey)
          ctx.beginPath();
          ctx.strokeStyle = "rgba(180,180,180,0.25)";
          ctx.arc(screenX, screenY, hullR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(180,180,180,0.95)";
          ctx.arc(
            screenX,
            screenY,
            hullR,
            -Math.PI / 2,
            -Math.PI / 2 + hullRatio * Math.PI * 2
          );
          ctx.stroke();

          // SHIELD (light blue)
          ctx.beginPath();
          ctx.strokeStyle = "rgba(120,200,255,0.20)";
          ctx.arc(screenX, screenY, shieldR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(120,200,255,0.95)";
          ctx.arc(
            screenX,
            screenY,
            shieldR,
            -Math.PI / 2,
            -Math.PI / 2 + shieldRatio * Math.PI * 2
          );
          ctx.stroke();

          ctx.restore();
        });
      }

      let enemyShieldRegenAcc = 0;
      // call this inside update(dt)
      function regenEnemyShields(dt) {
        enemyShieldRegenAcc += dt;

        // run at 10Hz, but frame-rate independent
        while (enemyShieldRegenAcc >= 0.1) {
          enemyShieldRegenAcc -= 0.1;

          if (!state.enemies || state.enemies.length === 0) continue;

          state.enemies.forEach((enemy) => {
            if (!enemy || !enemy.shipStats) return;

            const regen = Math.max(0.1, Number(enemy.shipStats.shieldRegen)/10 || 0);
            const maxShield =
              Number(enemy.maxShield ?? enemy.shipStats.shieldHp ?? enemy.shield ?? 0);

            if (!Number.isFinite(maxShield) || maxShield <= 0) return;

            enemy.maxShield = maxShield;
            enemy.shield = Math.min(maxShield, (Number(enemy.shield) || 0) + regen);
          });
        }
      }

      let playerShieldRegenAcc = 0;
      // call this inside update(dt)
      function regenPlayerShield(dt) {
        const stats = state?.player?.shipStats;
        if (!stats) return;

        playerShieldRegenAcc += dt;

        // 10 Hz regen
        while (playerShieldRegenAcc >= 0.1) {
          playerShieldRegenAcc -= 0.1;

          const regen = Math.max(0.1, Number(stats.shieldRegen)/10 || 0.1);
          const maxShield = Number(stats.shieldMax);

          if (!Number.isFinite(maxShield) || maxShield <= 0) return;

          stats.shield = Math.min(
            maxShield,
            (Number(stats.shield) || 0) + regen
          );
        }
      }

      let playerEnergyRegenAcc = 0;
      let moneyPerMinuteAcc = 0;
      let outfitCreditPerMinuteById = {};

      async function loadOutfitCreditPerMinuteIndex() {
        try {
          const response = await fetch("outfits.json", { cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const payload = await response.json();
          const outfits = Array.isArray(payload?.outfits) ? payload.outfits : [];
          outfitCreditPerMinuteById = outfits.reduce((acc, outfit) => {
            const id = String(outfit?.id || "").trim();
            if (!id) return acc;
            acc[id] = Number(outfit?.creditPerMinute) || 0;
            return acc;
          }, {});
        } catch (err) {
          console.warn("Failed to load outfits credit bonus index:", err);
          outfitCreditPerMinuteById = {};
        }
      }

      function getActiveShip() {
        const owned = Array.isArray(state?.player?.ownedSpaceships)
          ? state.player.ownedSpaceships
          : [];
        const activeId = Number(state?.player?.currentSpaceshipId ?? state?.player?.activeShipId ?? 0);
        return owned.find((ship) => Number(ship?.id) === activeId) || owned[0] || null;
      }

      function getCurrentShipCreditPerMinuteBonus() {
        const ship = getActiveShip();
        if (!ship || !Array.isArray(ship.outfits) || ship.outfits.length === 0) return 0;

        return ship.outfits.reduce((sum, outfitRef) => {
          const outfitId = String(outfitRef?.id ?? outfitRef ?? "").trim();
          if (!outfitId) return sum;

          const bonusFromCatalog = Number(outfitCreditPerMinuteById[outfitId]) || 0;
          const bonusFromOutfit = Number(outfitRef?.creditPerMinute) || 0;
          return sum + (bonusFromCatalog || bonusFromOutfit);
        }, 0);
      }

      function updateMoneyPerMinute(dt) {
        if (!Number.isFinite(dt) || dt <= 0) return;

        moneyPerMinuteAcc += dt;

        while (moneyPerMinuteAcc >= 60) {
          moneyPerMinuteAcc -= 60;

          const creditBonus = getCurrentShipCreditPerMinuteBonus();
          if (creditBonus > 0) {
            state.player.money = (Number(state?.player?.money) || 0) + creditBonus;
          }
        }
      }

      function regenPlayerEnergy(dt) {
        const stats = state?.player?.shipStats;
        if (!stats) return;

        playerEnergyRegenAcc += dt;

        // 10 Hz regen
        while (playerEnergyRegenAcc >= 0.1) {
          playerEnergyRegenAcc -= 0.1;

          const regenStep = Math.max(0, Number(stats.energyRegen) || 0) / 10;
          const energyMax = Math.max(0, Number(stats.energyMax) || 0);
          if (energyMax <= 0) return;

          stats.energy = Math.min(
            energyMax,
            (Number(stats.energy) || 0) + regenStep
          );
        }
      }




    function update(dt, dtMillis) {
      const station = getPrimaryStation();
      const stationRotSpeed = Number(station?.station_rot_speed) || DEFAULT_STATION_ROT_SPEED;
      stationAngle += stationRotSpeed * dt;
      playerMoveUpdate(dt);
      updatePlayerProjectiles(dt, dtMillis);
      updateEnemyProjectiles(dt);
      updateBeamEffects(dt);
      regenPlayerEnergy(dt);
      updateMoneyPerMinute(dt);
      
      const newSpeed = Math.hypot(state.player.vx, state.player.vy);
      speedValueEl.textContent = newSpeed.toFixed(1);
      posValueEl.textContent = `${state.player.x.toFixed(0)}, ${state.player.y.toFixed(0)}`;
      solarSystemEl.textContent = SystemInfo.name;
      shieldValueEl.textContent = state.player.shipStats.shield.toFixed(1);
      hullValueEl.textContent = state.player.shipStats.hull.toFixed(1);
      energyValueEl.textContent = state.player.shipStats.energy.toFixed(1);
    }

    /** Moves + rotates player (manual or docking autopilot), clamps speed, integrates position */
    function playerMoveUpdate(dt) {
      if (hyperSpaceManager.isTransitionActive()) {
        hyperSpaceManager.updateTransition(dt);
      } else {
        playerManualMove(dt);
      }
      clampPlayerSpeed();
      integratePlayerPosition(dt);
      clampPlayerToWorld();
    }

    function playerManualMove(dt) {
      if (input.left) state.player.angle -= state.player.shipStats.turningSpeedRad * dt;
      if (input.right) state.player.angle += state.player.shipStats.turningSpeedRad * dt;

      let speed = Math.hypot(state.player.vx, state.player.vy);

      if (input.thrust) {
        const ax = Math.cos(state.player.angle) * state.player.shipStats.acceleration;
        const ay = Math.sin(state.player.angle) * state.player.shipStats.acceleration;
        state.player.vx += ax * dt;
        state.player.vy += ay * dt;
        return;
      }

      // friction when not thrusting
      if (speed > 0) {
        const decel = FRICTION * dt;
        speed = Math.max(0, speed - decel);
        applySpeedToVelocity(speed);
      }

      // brake
      if (input.brake && speed > 0) {
        const decel = state.player.shipStats.acceleration * dt;
        speed = Math.max(0, speed - decel);
        applySpeedToVelocity(speed);
      }
    }

    function applySpeedToVelocity(speed) {
      if (speed === 0) {
        state.player.vx = 0;
        state.player.vy = 0;
        return;
      }
      const cur = Math.hypot(state.player.vx, state.player.vy) || 1;
      const factor = speed / cur;
      state.player.vx *= factor;
      state.player.vy *= factor;
    }

    function clampPlayerSpeed() {
      const s = Math.hypot(state.player.vx, state.player.vy);
      const max = hyperSpaceManager.getSpeedLimit();
      if (s <= max) return;
      const factor = max / s;
      state.player.vx *= factor;
      state.player.vy *= factor;
    }

    function integratePlayerPosition(dt) {
      state.player.x += state.player.vx * dt;
      state.player.y += state.player.vy * dt;
    }

    function clampPlayerToWorld() {
      state.player.x = Math.max(0, Math.min(SystemInfo.size, state.player.x));
      state.player.y = Math.max(0, Math.min(SystemInfo.size, state.player.y));
    }

    function updatePlayerProjectiles(dt, dtMillis) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.age += dt;
        p.ageMs = (p.ageMs || 0) + dtMillis;

        updateHomingProjectile(p, dt);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const armed = p.ageMs >= (p.arming_time || 0);

        let remove = projectileExpired(p);
        if (!remove && armed) remove = projectileHitTarget(p);
        if (!remove && armed) remove = projectileHitAnyEnemy(p);

        if (remove) projectiles.splice(i, 1);
      }
    }

    function updateEnemyProjectiles(dt){
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        p.age += dt;

        updateEnemyHomingProjectile(p, dt);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // no need for dedicated logic
        let remove = projectileExpired(p);

        if (!remove) remove = projectileHitPlayer(p);

        if (remove) enemyProjectiles.splice(i, 1);
      }
    }


    function updateEnemyHomingProjectile(p, dt){
      // enemy projectiles home into player!
      if (!p.homing || !state.player) return;

      const desiredAngle = Math.atan2(state.player.y - p.y, state.player.x - p.x);
      let diff = normalizeAngleDiff(desiredAngle - p.angle);
      const maxTurn = (p.turnSpeed || 0) * dt;
      if (diff > maxTurn) diff = maxTurn;
      if (diff < -maxTurn) diff = -maxTurn;
      p.angle += diff;

      p.speed = Math.min(p.maxSpeed || p.speed, p.speed + (p.accel || 0) * dt);
      p.vx = Math.cos(p.angle) * p.speed;
      p.vy = Math.sin(p.angle) * p.speed;
    }


    function getNearestEnemy(x, y) {
      const enemies = Array.isArray(state?.enemies) ? state.enemies : [];
      let best = null;
      let bestD2 = Infinity;

      for (const e of enemies) {
        if (!e) continue;
        const ex = Number(e.x);
        const ey = Number(e.y);
        if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;

        const dx = ex - x;
        const dy = ey - y;
        const d2 = dx * dx + dy * dy;

        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }


    function updateHomingProjectile(p, dt) {
      if (!p?.homing) return;

      // 1) prefer nearest enemy
      let t = getNearestEnemy(p.x, p.y);

      // 2) fallback to generic target
      if (!t && typeof target !== "undefined" && target) {
        if (Number.isFinite(target.x) && Number.isFinite(target.y)) {
          t = target;
        }
      }

      if (!t) return;

      const desiredAngle = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = normalizeAngleDiff(desiredAngle - p.angle);

      const maxTurn = (p.turnSpeed || 0) * dt;
      if (diff > maxTurn) diff = maxTurn;
      if (diff < -maxTurn) diff = -maxTurn;

      p.angle += diff;

      if (p.accel) {
        p.speed += p.accel * dt;
      }

      if (p.maxSpeed && p.maxSpeed > 0) {
        p.speed = Math.min(p.speed, p.maxSpeed);
      }

      p.vx = Math.cos(p.angle) * p.speed;
      p.vy = Math.sin(p.angle) * p.speed;
    }

    

    function projectileExpired(p) {
      return p.age > (p.life || 3.0);
    }

    function projectileHitPlayer(p){
      if (!state.player) return false;

      const dx = p.x - state.player.x;
      const dy = p.y - state.player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > state.player.shipStats.shieldDiameterPx) return false;

      applyDamageToPlayer(p);
      return true;
    }

    function applyDamageToPlayer(p){
      const projectile = p;
      const damage = projectile.damage || 1;
      const damageEnergy = Number(projectile.damageEnergy) || 0;
      let totalDamage = damage;

      if (damageEnergy > 0) {
        const playerStats = state?.player?.shipStats;
        if (playerStats) {
          playerStats.energy = Math.max(0, (Number(playerStats.energy) || 0) - damageEnergy);
        }
      }

      if (state.player.shipStats.shield > 0 && totalDamage > 0) {
        const absorbed = Math.min(state.player.shipStats.shield, totalDamage);
        state.player.shipStats.shield -= absorbed;
        totalDamage -= absorbed;
      }

      if (state.player.shipStats.hull > 0 && totalDamage > 0) {
        state.player.shipStats.hull -= totalDamage;
        totalDamage = 0;
      }

      if (state.player.shipStats.hull <= 0) {
        console.log("DESTROYED");
        onPlayerDeath();
      }
    }

    function projectileHitTarget(p) {
      if (!target) return false;

      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const dist = Math.hypot(dx, dy);

      if (dist > target.radius) return false;

      const damage = p.damage || 1;
      const damageMult = state.player.shipStats.damageMult || 1;
      applyDamageToTarget(target, damage * damageMult);

      return true;
    }

    function applyDamageToTarget(targetObj, damage) {
      if (!targetObj) return;
      targetObj.hp -= damage;

      if (targetObj.hp <= 0) {
        if (typeof addMoneyWithCreditGainBonus === "function") {
          addMoneyWithCreditGainBonus(state, MONEY_PER_TARGET);
        } else {
          state.player.money += MONEY_PER_TARGET;
        }
        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
        progressDestroyTargetMissions();
        spawnTarget();
      }
    }

    function updateBeamEffects(dt) {
      for (let i = beamEffects.length - 1; i >= 0; i--) {
        const beam = beamEffects[i];
        beam.age += dt;
        if (beam.age >= beam.life) {
          beamEffects.splice(i, 1);
        }
      }
    }

    function projectileHitAnyEnemy(p) {
      if (!state.enemies || state.enemies.length === 0) return false;

      for (let e = 0; e < state.enemies.length; e++) {
        const enemy = state.enemies[e];
        if (!enemy || !enemy.shipStats) continue;

        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > enemy.shipStats.shieldDiameterPx) continue;

        applyDamageToEnemy(enemy, p);
        return true; // projectile consumed
      }
      return false;
    }




    function progressDestroyTargetMissions() {
      const missions = Array.isArray(state.player?.missions) ? state.player.missions : [];
      let changed = false;

      missions.forEach((mission) => {
        if (!mission || mission.completed) return;
        if (!Number.isFinite(mission.destroyTargets) || !Number.isFinite(mission.destroyedTargets)) return;

        mission.destroyedTargets += 1;
        if (mission.destroyedTargets >= mission.destroyTargets) {
          mission.destroyedTargets = mission.destroyTargets;
          mission.completed = true;
        }
        changed = true;
      });

      if (changed) {
        saveState();
      }
    }

    function applyDamageToEnemy(enemy, projectile) {
      const damage = projectile.damage || 1;
      const damageEnergy = Number(projectile.damageEnergy) || 0;
      // formula to expand with enemy shield reduction
      let totalDamage = damage;

      if (damageEnergy > 0 && enemy?.shipStats) {
        enemy.shipStats.energy = Math.max(0, (Number(enemy.shipStats.energy) || 0) - damageEnergy);
      }

      if (enemy.shield > 0 && totalDamage > 0) {
        const absorbed = Math.min(enemy.shield, totalDamage);
        enemy.shield -= absorbed;
        totalDamage -= absorbed;
      }

      if (enemy.hull > 0 && totalDamage > 0) {
        enemy.hull -= totalDamage;
        totalDamage = 0;
      }

      if (enemy.hull <= 0) {
        destroyEnemyById(enemy.id);
      }
    }

      function destroyEnemyById(id) {
        const idx = state.enemies.findIndex(e => e && e.id === id);
        if (idx < 0) return false;

        const enemy = state.enemies[idx];
        const cost = Number(enemy?.shipStats?.cost) || 0;

        if (typeof addMoneyWithCreditGainBonus === "function") {
          addMoneyWithCreditGainBonus(state, cost / 1000);
        } else {
          state.player.money += (cost / 1000);
        }
        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;

        state.enemies.splice(idx, 1);
        progressDestroyTargetMissions();
        return true;
      }

      function drawMainStar() {
        const screenX = width / 2 + (STAR_X - state.player.x);
        const screenY = height / 2 + (STAR_Y - state.player.y);

        const radius = STAR_RADIUS_WORLD;

        ctx.save();
        const gradient = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          radius
        );
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.3, "#fff9c4");
        gradient.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      function drawStation() {
        const station = getPrimaryStation();
        if (!station) return;

        const stationX = Number(station.position_x);
        const stationY = Number(station.position_y);
        if (!Number.isFinite(stationX) || !Number.isFinite(stationY)) return;

        const stationRadius = Math.max(
          1,
          Number(station.station_radius) || DEFAULT_STATION_RADIUS
        );

        const screenX = width / 2 + (stationX - state.player.x);
        const screenY = height / 2 + (stationY - state.player.y);
      
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(stationAngle);
      
        if (stationImg.complete && stationImg.naturalWidth > 0) {
          // Draw centered; size based on your existing station radius
          const size = stationRadius * 2;
          ctx.drawImage(stationImg, -size / 2, -size / 2, size, size);
          ctx.restore();
          return;
        }
      
        // fallback (your old vector, keep for loading errors)
        const r = stationRadius;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "#888888";
        ctx.fill();
        ctx.strokeStyle = "#bbbbbb";
        ctx.lineWidth = 2;
        ctx.stroke();
      
        ctx.restore();
      }

      function drawTarget() {
        if (!target) return;

        const screenX = width / 2 + (target.x - state.player.x);
        const screenY = height / 2 + (target.y - state.player.y);

        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, target.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#4caf50";
        ctx.stroke();

        const hpRatio = target.hp / 10;
        ctx.beginPath();
        ctx.strokeStyle = "#c8e6c9";
        ctx.lineWidth = 3;
        ctx.arc(
          screenX,
          screenY,
          target.radius + 6,
          -Math.PI / 2,
          -Math.PI / 2 + hpRatio * Math.PI * 2
        );
        ctx.stroke();

        ctx.restore();
      }

      function drawTargetLine() {
        if (!lineToTarget || !target) return;

        const shipX = width / 2;
        const shipY = height / 2;
        const targetX = width / 2 + (target.x - state.player.x);
        const targetY = height / 2 + (target.y - state.player.y);

        const dx = targetX - shipX;
        const dy = targetY - shipY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;

        const dirX = dx / dist;
        const dirY = dy / dist;

        const startX = shipX + dirX * 25;
        const startY = shipY + dirY * 25;

        const REF_DIST = 400;
        const t = Math.min(1, dist / REF_DIST);
        const length = 10 + (60 - 10) * t;

        const endX = startX + dirX * length;
        const endY = startY + dirY * length;

        ctx.save();
        ctx.strokeStyle = "#c84040";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }

      function drawEnemyLineIndicator() {
        if (!lineToTarget || !state.enemies || state.enemies.length === 0) return;

        const shipX = width / 2;
        const shipY = height / 2;

        for (const enemy of state.enemies) {
          // world -> screen
          const enemyX = width / 2 + (enemy.x - state.player.x);
          const enemyY = height / 2 + (enemy.y - state.player.y);

          const dx = enemyX - shipX;
          const dy = enemyY - shipY;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) continue;

          const dirX = dx / dist;
          const dirY = dy / dist;

          // scale with distance (optional)
          const REF_DIST = 400;
          const t = Math.min(1, dist / REF_DIST);

          const offset = 30;
          const size = 5 + 7 * t; // triangle length

          const centerX = shipX + dirX * offset;
          const centerY = shipY + dirY * offset;

          const perpX = -dirY;
          const perpY = dirX;

          const BASE_WIDTH = 0.22; // smaller base
          const BACK_OFFSET = 0.65;

          const tipX = centerX + dirX * size;
          const tipY = centerY + dirY * size;

          const baseLeftX =
            centerX - dirX * size * BACK_OFFSET + perpX * size * BASE_WIDTH;
          const baseLeftY =
            centerY - dirY * size * BACK_OFFSET + perpY * size * BASE_WIDTH;

          const baseRightX =
            centerX - dirX * size * BACK_OFFSET - perpX * size * BASE_WIDTH;
          const baseRightY =
            centerY - dirY * size * BACK_OFFSET - perpY * size * BASE_WIDTH;

          ctx.save();
          ctx.fillStyle = "#ff5252";
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(baseLeftX, baseLeftY);
          ctx.lineTo(baseRightX, baseRightY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }



      function drawEnemyProjectiles() {
        if (!enemyProjectiles.length) return;

        ctx.save();

        enemyProjectiles.forEach((p) => {
          const screenX = width / 2 + (p.x - state.player.x);
          const screenY = height / 2 + (p.y - state.player.y);

          const aspect = p.aspect || "bullet";

          if (aspect === "line") {
            const len = 10;
            const ax = Math.cos(p.angle) * len;
            const ay = Math.sin(p.angle) * len;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + ax, screenY + ay);
            ctx.stroke();
          } else if (aspect === "fire"){
            const len = 10-p.age;
            const ax = Math.cos(p.angle) * len;
            const ay = Math.sin(p.angle) * len;
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + ax, screenY + ay);
            ctx.stroke();
          } else if (aspect === "missile") {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(p.angle);

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -3);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#ff5252";
            ctx.beginPath();
            ctx.moveTo(-4, -3);
            ctx.lineTo(-8, -5);
            ctx.lineTo(-4, -1);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-4, 3);
            ctx.lineTo(-8, 5);
            ctx.lineTo(-4, 1);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.restore();
      }

      function drawProjectiles() {
        if (!projectiles.length) return;
        ctx.save();

        projectiles.forEach((p) => {
          const screenX = width / 2 + (p.x - state.player.x);
          const screenY = height / 2 + (p.y - state.player.y);

          const aspect = p.aspect || "bullet";

          if (aspect === "line") {
            const len = 10;
            const ax = Math.cos(p.angle) * len;
            const ay = Math.sin(p.angle) * len;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + ax, screenY + ay);
            ctx.stroke();
          }else if(aspect === "fire"){
            const len = 15-p.age*2; 
            const ax = Math.cos(p.angle) * len;
            const ay = Math.sin(p.angle) * len;
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + ax, screenY + ay);
            ctx.stroke();
          }else if (aspect === "missile") {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(p.angle);

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -3);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#ff5252";
            ctx.beginPath();
            ctx.moveTo(-4, -3);
            ctx.lineTo(-8, -5);
            ctx.lineTo(-4, -1);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-4, 3);
            ctx.lineTo(-8, 5);
            ctx.lineTo(-4, 1);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.restore();
      }

      function drawLightningBolt(x1, y1, x2, y2) {
        const segments = 12;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const baseX = x1 + dx * t;
          const baseY = y1 + dy * t;
          const jitter = (Math.random() - 0.5) * 12;
          ctx.lineTo(baseX + nx * jitter, baseY + ny * jitter);
        }

        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      function drawBeamEffects() {
        if (!beamEffects.length) return;

        ctx.save();
        for (const beam of beamEffects) {
          const screenX1 = width / 2 + (beam.x1 - state.player.x);
          const screenY1 = height / 2 + (beam.y1 - state.player.y);
          const screenX2 = width / 2 + (beam.x2 - state.player.x);
          const screenY2 = height / 2 + (beam.y2 - state.player.y);

          const aspect = (beam.aspect || "laser").toLowerCase();
          ctx.strokeStyle = beam.color;
          ctx.lineWidth = beam.width;

          if (aspect === "lightning") {
            drawLightningBolt(screenX1, screenY1, screenX2, screenY2);
          } else {
            ctx.beginPath();
            ctx.moveTo(screenX1, screenY1);
            ctx.lineTo(screenX2, screenY2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      function drawShip() {

        ctx.save();
        ctx.translate(width / 2, height / 2);

        ctx.rotate(state.player.angle + Math.PI / 2);
        const engineFlareX = 0; 
        const engineFlareY = 40;
        const engineFlareWidth = state.player.shipStats.engineFlareWidth;
        const engineFlareLength = state.player.shipStats.engineFlareLength;

        if (input.thrust) {
          state.player.shipStats.engineCoords.forEach(engineCoord => {
            ctx.save();
            ctx.translate(engineFlareX+engineCoord.x, engineFlareY+engineCoord.y);


            ctx.rotate(-Math.PI / 2);

            ctx.beginPath();
            ctx.moveTo(0, 0); // tip
            ctx.lineTo(engineFlareLength, -engineFlareWidth / 2);
            ctx.lineTo(engineFlareLength * 0.85, 0);
            ctx.lineTo(engineFlareLength, engineFlareWidth / 2);
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 235, 59, 0.9)";
            ctx.fill();

            // Inner white core
            ctx.beginPath();
            ctx.moveTo(0, 0); // tip
            ctx.lineTo(engineFlareLength * 0.65, -(engineFlareWidth * 0.35));
            ctx.lineTo(engineFlareLength * 0.52, 0);
            ctx.lineTo(engineFlareLength * 0.65, (engineFlareWidth * 0.35));
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();

            ctx.restore();
          });
          
        }

        const hullMax = state.player.shipStats.hullMax || 1;
        const shieldMax = state.player.shipStats.shieldMax || 1;
        const hull = state.player.shipStats.hull ?? 0;
        const shield = state.player.shipStats.shield ?? 0;

        const hullRatio = Math.max(0, Math.min(1, hull / hullMax));
        const shieldRatio = Math.max(0, Math.min(1, shield / shieldMax));

        const shieldDiameter = state.player.shipStats.shieldDiameterPx ?? 28;
        const hullR = shieldDiameter - 6;
        const shieldR = shieldDiameter;

        ctx.save();
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(180,180,180,0.25)";
        ctx.arc(0, 0, hullR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(180,180,180,0.95)";
        ctx.arc(0, 0, hullR, -Math.PI / 2, -Math.PI / 2 + hullRatio * Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(120,200,255,0.20)";
        ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(120,200,255,0.95)";
        ctx.arc(0, 0, shieldR, -Math.PI / 2, -Math.PI / 2 + shieldRatio * Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // --- IMAGE SHIP (preferred) ---
        if (currentShipImg && currentShipImg.complete && currentShipImg.naturalWidth > 0) {
          const targetW = state.player.shipStats.shieldDiameterPx; // tweak to taste
          const scale = targetW / currentShipImg.naturalWidth;
          const w = currentShipImg.naturalWidth * scale;
          const h = currentShipImg.naturalHeight * scale;

          ctx.drawImage(currentShipImg, -w / 2, -h / 2, w, h);
          ctx.restore();
          return;
        }

        ctx.restore();

      }


      function drawMinimap() {
        const w = minimapSize;
        const h = minimapSize;

        minimapCtx.clearRect(0, 0, w, h);

        minimapCtx.save();
        minimapCtx.translate(w / 2, h / 2);

        const hexRadius = (SystemInfo.size / 2) * minimapScale;
        minimapCtx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const x = hexRadius * Math.cos(a);
          const y = hexRadius * Math.sin(a);
          if (i === 0) minimapCtx.moveTo(x, y);
          else minimapCtx.lineTo(x, y);
        }
        minimapCtx.closePath();
        minimapCtx.strokeStyle = "rgba(255,255,255,0.4)";
        minimapCtx.lineWidth = 1;
        minimapCtx.stroke();

        const starRadius = (STAR_DIAMETER / 2) * minimapScale;
        minimapCtx.beginPath();
        minimapCtx.arc(0, 0, starRadius, 0, Math.PI * 2);
        const grd = minimapCtx.createRadialGradient(0, 0, 0, 0, 0, starRadius);
        grd.addColorStop(0, "#ffffff");
        grd.addColorStop(1, "rgba(255,255,255,0.1)");
        minimapCtx.fillStyle = grd;
        minimapCtx.fill();

        // Station as small grey dot
        const station = getPrimaryStation();
        if (station) {
          const stationX = Number(station.position_x);
          const stationY = Number(station.position_y);
          if (Number.isFinite(stationX) && Number.isFinite(stationY)) {
            const stx = (stationX - SystemInfo.size / 2) * minimapScale;
            const sty = (stationY - SystemInfo.size / 2) * minimapScale;
            minimapCtx.beginPath();
            minimapCtx.arc(stx, sty, 3, 0, Math.PI * 2);
            minimapCtx.fillStyle = "#bbbbbb";
            minimapCtx.fill();
          }
        }

        if (target) {
          const tx = (target.x - SystemInfo.size / 2) * minimapScale;
          const ty = (target.y - SystemInfo.size / 2) * minimapScale;
          minimapCtx.beginPath();
          minimapCtx.arc(tx, ty, 1.5, 0, Math.PI * 2);
          minimapCtx.fillStyle = "#ff5252";
          minimapCtx.fill();
        }

        if(state.enemies && state.enemies.length > 0){
          // draw the enemies in minimap
          state.enemies.forEach(enemy => {
            const ex = (enemy.x - SystemInfo.size / 2) * minimapScale;
            const ey = (enemy.y - SystemInfo.size / 2) * minimapScale;
            minimapCtx.beginPath();
            minimapCtx.arc(ex, ey, 2.5, 0, Math.PI * 2);
            minimapCtx.fillStyle = "#ff5252";
            minimapCtx.fill();
          });
        }

        if(SystemInfo.hyperspace_gates && SystemInfo.hyperspace_gates.length > 0){
          SystemInfo.hyperspace_gates.forEach(gate => {
            const gate_x = (gate.position_x - SystemInfo.size / 2) * minimapScale;
            const gate_y = (gate.position_y - SystemInfo.size / 2) * minimapScale;
            minimapCtx.beginPath();
            minimapCtx.arc(gate_x, gate_y, 2.5, 0, Math.PI * 2);
            minimapCtx.fillStyle = "#52f9ff";
            minimapCtx.fill();
          });
        }

        const sx = (state.player.x - SystemInfo.size / 2) * minimapScale;
        const sy = (state.player.y - SystemInfo.size / 2) * minimapScale;

        minimapCtx.save();
        minimapCtx.translate(sx, sy);
        minimapCtx.rotate(state.player.angle);

        minimapCtx.beginPath();
        minimapCtx.moveTo(6, 0);
        minimapCtx.lineTo(-4, -3);
        minimapCtx.lineTo(-4, 3);
        minimapCtx.closePath();
        minimapCtx.fillStyle = "#4fc3f7";
        minimapCtx.fill();

        minimapCtx.restore();
        minimapCtx.restore();
      }

      const baseAssetPath = location.hostname === "127.0.0.1" || location.hostname === "localhost"
        ? "/assets"
        : "/spaceFighter/assets";

      const gateImageByType = {
        warp: new Image(),
        chaos: new Image(),
        hidden: new Image(),
      };

      gateImageByType.warp.src = `${baseAssetPath}/gate_human1.png`;
      gateImageByType.chaos.src = `${baseAssetPath}/gate_jared1.png`;
      gateImageByType.hidden.src = `${baseAssetPath}/gate_technician.png`;

      let gatePulseT = 0;

      function drawGates(dt) {
        gatePulseT += dt;

        const gates = Array.isArray(SystemInfo?.hyperspace_gates)
          ? SystemInfo.hyperspace_gates
          : [];

        const pulse = 0.5 + 0.5 * Math.sin(gatePulseT * 2.5);
        const glowAlpha = 0.25 + pulse * 0.35;
        const glowScale = 0.35 + pulse * 0.15;

        for (const gate of gates) {
          if (!gate) continue;

          const gateType = String(gate.type ?? "warp").toLowerCase();
          const img = gateImageByType[gateType] ?? gateImageByType.warp;

          const GATE_X = Number(gate.position_x ?? gate.x ?? 0);
          const GATE_Y = Number(gate.position_y ?? gate.y ?? 0);
          const size = Math.max(1, Number(gate.width ?? 64));
          const name = String(gate.name ?? "");

          const screenX = width / 2 + (GATE_X - state.player.x);
          const screenY = height / 2 + (GATE_Y - state.player.y);

          ctx.save();
          ctx.translate(screenX, screenY);

          /* --- SLOW ROTATION (per-gate) --- */
          // hyperspace_gate.rotation = radians per second
          const rotSpeed = Number(gate.rotation ?? 0);
          const rot = Number.isFinite(rotSpeed) ? rotSpeed * gatePulseT : 0;
          if (rot !== 0) ctx.rotate(rot);
          /* --- END ROTATION --- */

          /* --- PULSATING CORE --- */
          const coreR = (size / 2) * glowScale;
          const coreGlow = gateType === "chaos"
            ? ["255,120,120", "255,120,120"]
            : gateType === "hidden"
              ? ["180,190,210", "180,190,210"]
              : ["120,200,255", "120,200,255"];

          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
          grad.addColorStop(0, `rgba(${coreGlow[0]},${glowAlpha})`);
          grad.addColorStop(1, `rgba(${coreGlow[1]},0)`);

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, coreR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          /* --- END CORE --- */

          if (img?.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);

            if (name) {
              ctx.save();
              ctx.rotate(-rot); // keep text upright
              ctx.font = "14px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.lineWidth = 4;
              ctx.strokeStyle = "rgba(0,0,0,0.6)";
              ctx.strokeText(name, 0, -size / 2 - 6);
              ctx.fillStyle = "white";
              ctx.fillText(name, 0, -size / 2 - 6);
              ctx.restore();
            }

            ctx.restore();
            continue;
          }

          // fallback
          const r = size / 2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          if (name) {
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "white";
            ctx.fillText(name, 0, -r - 6);
          }

          ctx.restore();
        }
      }

      let lastTime = performance.now();

      function loop(now) {
        if(state.ui.mode === "game"){
          const dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;
          const dtMillis = dt * 1000;  
          
          update(dt, dtMillis);
          updateEnemySpawning(dt);
          moveEnemies(dt);
          regenEnemyShields(dt);
          regenPlayerShield(dt);
          updateMakeEnemiesToFire(dt);
          drawStarfield(ctx, width, height, starLayers, state.player.x, state.player.y, SystemInfo.size);
          attemptFireWeapon(false);
          updateStationButtonVisibility();
          hyperSpaceManager.updateButtonVisibility();
          drawGates(dt);
          drawMainStar();
          drawStation();
          drawTarget();
          drawTargetLine();
          drawEnemyLineIndicator();
          hyperSpaceManager.drawGateLineIndicator();
          drawEnemyProjectiles();
          drawProjectiles();
          drawBeamEffects();
          drawEnemies();
          drawShip();
          drawMinimap();

          if (hyperSpaceManager.getFadeAlpha() > 0) {
            ctx.save();
            ctx.globalAlpha = hyperSpaceManager.getFadeAlpha();
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
          }
        }
        requestAnimationFrame(loop);
      }

      async function init() {
        resize();
        initStarfield();
        loadState();
        spawnTarget();
        updateLockButtonVisual();
        await initWeapons();
        await loadOutfitCreditPerMinuteIndex();
        applyActiveShip(state);

        // Station manager: gli passo info di sistema e un getter dello state giocatore
        StationManager.init({
          systemInfo: SystemInfo,
          getPlayerState: () => state,
          onOpen: () => { state.ui.mode = "station"; },
          onClose: () => { state.ui.mode = "game";console.log("Closing station UI"); },
          onShipBought: (shipKey, stats) => {
            onBoughtSpaceship({ state, shipStats: stats, templateName: shipKey });
            saveState(state);
          },
          onMissionRewardsGranted: () => {
            moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
            saveState(state);
          },
          onMissionAccepted: () => {
            saveState(state);
          },
        });

        setupInput(
          input,
          attemptFireWeapon,
          () => {
            lineToTarget = !lineToTarget;
            updateLockButtonVisual();
          },
          cycleWeapon,
          (idx) => { currentWeaponIndex = idx; },
          touchButtons
        );

        setInterval(saveState, 2000);
        lastTime = performance.now();
        requestAnimationFrame(loop);
      }

      window.addEventListener("load", init);
    })();
