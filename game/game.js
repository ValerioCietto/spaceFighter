 (function () {
      const state = {
        discoveredSystems: ["Sol"],
        player: {
          x: SystemInfo.size / 2,
          y: SystemInfo.size / 2,
          vx: 0,
          vy: 0,
          angle: -Math.PI / 2,
          money: 0,
          systemName: "Sol",
      
          currentSpaceshipId: 0,
      
          shipName: "human_starfighter",
      
          ownedSpaceships: [
            {
              id: 0,
              name: "Little Raven",
      
              templateName: "human_perseus",
                shipStats: {
                cost: 10000,
                shield: 100,
                hull: 50,
                speed: 150,
                acceleration: 180,
                turningSpeedRad: Math.PI * 1.25,
                engineFlareType: "triangular",
                engineFlareWidth: 10,
                engineFlareLength: 26,
                image: "human_perseus.png",
                shieldDiameterPx: 33,
                shieldRegen:1,
                CPU: 10,
                shipCenter: { x: 0.5, y: 0.5 },
                engineCoords: [{ x: 0, y: -5 }],
                weaponGunCoords: [{type: "gun", x: 18, y: 0 }],
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
            },
          ],
        },
      
        enemies: [],
        neutralPassive: [],
        allies: [],
        targets: [],
      
        ui: {
          mode: "game", // "inventory" | "galaxyMap" | "station" | "game"
          deathModal: false,
        },
      };
  
      const STAR_DIAMETER = SystemInfo.stars[0].radius+200;
      const STAR_RADIUS_WORLD = SystemInfo.stars[0].radius;
      const STAR_X = SystemInfo.size/2;
      const STAR_Y = SystemInfo.size/2;

      const STATION_X = STAR_X + 450;
      const STATION_Y = STAR_Y - 200;
      const STATION_RADIUS = 80;
      const STATION_ROT_SPEED = Math.PI / 32; // rad/sec

      const STATION_ASSET = window.BASE_PATH + "/assets/human_space_station_basic.png";
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
      const stationOverlayEl = document.getElementById("station-overlay");
      const stationExitBtn = document.getElementById("station-exit-btn");

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
      });
      hyperspaceBtn.addEventListener("click", hyperSpaceManager.enterHyperspace);

      const shopRoot = document.getElementById("ship-shop-list");

      function isPlayerNearSpaceStation(){
        // AnyStation software allows the player to open station overlay
        // even if not near a space station.
        // AnyStation - make yourself at home even in space.
        if(state.player?.abilities?.anystation){
          return true;
        }
        const dx = state.player.x - SystemInfo.stations[0].position_x;
        const dy = state.player.y - SystemInfo.stations[0].position_y;
        const dist = Math.hypot(dx, dy);
        if(dist < 200){
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
        stationOverlayEl.classList.add("open");
        state.ui.mode = "station";
        shopRoot.innerHTML = "";

        renderStationShipShop({
          rootEl: shopRoot,
          state,
          onBuy: (shipKey, stats) => {
            const templateName = shipKey;
            onBoughtSpaceship({ state, shipStats: stats, templateName });
            saveState(state);
          },
          onToast: (msg) => console.log("[shop]", msg),
        });
      }

      stationExitBtn.addEventListener("click", () => {
        stationOverlayEl.classList.remove("open");
        state.ui.mode = "game";
      });

      const inventoryOverlayEl = document.getElementById("inventory-overlay");
      const inventoryCloseBtn = document.getElementById("inventory-close-btn");
      const inventoryBtn = document.getElementById("inventory-btn");

      inventoryBtn.addEventListener("click", openInventory);
      function openInventory() {
        inventoryOverlayEl.classList.add("open");
        state.ui.mode = "inventory";
        renderInventory(state);
      }

      function closeInventory() {
        inventoryOverlayEl.classList.remove("open");
        state.ui.mode = "game";
      }

      inventoryCloseBtn.addEventListener("click", closeInventory);

      const galaxyMapBtn = document.getElementById("galaxy-map-btn");
      galaxyMapBtn.addEventListener("click", openGalaxyOverlay);

      // optional: ESC key
      window.addEventListener("keydown", e => {
        if (e.key === "Escape") closeInventory();
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
        alert("Restart from save file not yet implemented");
      });

      const galaxyOverlayEl = document.getElementById("galaxy-overlay");
      const galaxyCloseBtn = document.getElementById("galaxy-close-btn");

      function openGalaxyOverlay() {
        saveState();
        galaxyOverlayEl.classList.add("open");
      }

      function closeGalaxyOverlay() {
        galaxyOverlayEl.classList.remove("open");
      }

      galaxyCloseBtn.addEventListener("click", closeGalaxyOverlay);

      // optional ESC closewdwd
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

      function spawnEnemy() {
        const centerX = SystemInfo.size / 2;
        const centerY = SystemInfo.size / 2;

        const a = Math.random() * Math.PI * 2;
        const r = ENEMY_SPAWN_R_MIN + Math.random() * (ENEMY_SPAWN_R_MAX - ENEMY_SPAWN_R_MIN);

        const shipName = ENEMY_TYPES[(Math.random() * ENEMY_TYPES.length) | 0];
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

      let enemySpawnAcc = 0;
      let enemyIdSeq = 0;
      state.enemies = [];
      function updateEnemySpawning(dt) {
        const maxN = SystemInfo.max_enemy_number || 0;
        const rate = SystemInfo.spawn_rate || 0;
        if (maxN <= 0 || rate <= 0) return;

        enemySpawnAcc += dt;
        while (enemySpawnAcc >= rate) {
          enemySpawnAcc -= rate;

          if (state?.enemies && state.enemies.length < maxN) {
            spawnEnemy();
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
        if (!port || port.type !== "gun") continue;
    
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
      
      stationAngle += STATION_ROT_SPEED * dt;
      playerMoveUpdate(dt);
      updatePlayerProjectiles(dt, dtMillis);
      updateEnemyProjectiles(dt);
      regenPlayerEnergy(dt);
      
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
      let totalDamage = damage;

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
      target.hp -= damage * damageMult;

      if (target.hp <= 0) {
        state.player.money += MONEY_PER_TARGET;
        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
        spawnTarget();
      }
      return true;
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



    function applyDamageToEnemy(enemy, projectile) {
      const damage = projectile.damage || 1;
      // formula to expand with enemy shield reduction
      let totalDamage = damage;

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

        state.player.money += (cost / 1000);
        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;

        state.enemies.splice(idx, 1);
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
        const screenX = width / 2 + (STATION_X - state.player.x);
        const screenY = height / 2 + (STATION_Y - state.player.y);
      
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(stationAngle);
      
        if (stationImg.complete && stationImg.naturalWidth > 0) {
          // Draw centered; size based on your existing station radius
          const size = STATION_RADIUS * 2;
          ctx.drawImage(stationImg, -size / 2, -size / 2, size, size);
          ctx.restore();
          return;
        }
      
        // fallback (your old vector, keep for loading errors)
        const r = STATION_RADIUS;
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
        const stx = (STATION_X - SystemInfo.size / 2) * minimapScale;
        const sty = (STATION_Y - SystemInfo.size / 2) * minimapScale;
        minimapCtx.beginPath();
        minimapCtx.arc(stx, sty, 3, 0, Math.PI * 2);
        minimapCtx.fillStyle = "#bbbbbb";
        minimapCtx.fill();

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

      const humanGateImg = new Image();
      humanGateImg.src = location.hostname === "127.0.0.1" || location.hostname === "localhost"
        ? "/assets/gate_human.png"
        : "/spaceFighter/assets/gate_human.png";

      let gatePulseT = 0;

      function drawGates(dt) {
        gatePulseT += dt;

        const gates = Array.isArray(SystemInfo?.hyperspace_gates)
          ? SystemInfo.hyperspace_gates
          : [];

        const img = humanGateImg;

        const pulse = 0.5 + 0.5 * Math.sin(gatePulseT * 2.5);
        const glowAlpha = 0.25 + pulse * 0.35;
        const glowScale = 0.35 + pulse * 0.15;

        for (const gate of gates) {
          if (!gate || gate.type !== "warp") continue;

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
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
          grad.addColorStop(0, `rgba(120,200,255,${glowAlpha})`);
          grad.addColorStop(1, "rgba(120,200,255,0)");

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
        applyActiveShip(state);

        // Station manager: gli passo info di sistema e un getter dello state giocatore
        StationManager.init({
          systemInfo: SystemInfo,
          getPlayerState: () => state
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
