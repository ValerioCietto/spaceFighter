 (function () {

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
        max_enemy_number:2,
        spawn_rate:4,
      };
      const ENEMY_SPAWN_R_MIN = 1500;
      const ENEMY_SPAWN_R_MAX = 2500;

      const ENEMY_SHIELD_REGEN_PER_SEC = 1; // 1 hp/s
      const ENEMY_DESPAWN_R = 4000; // optional safety: if too far from player


      const state = {
        player: {
          x: SystemInfo.size / 2,
          y: SystemInfo.size / 2,
          vx: 0,
          vy: 0,
          angle: -Math.PI / 2,
          money: 0,
          shipName: "human_starfighter",
          systemName: "Solar"
        },
        enemies:[],
        neutralPassive:[],
        allies:[],
        targets:[],
      };

      function applyShip(shipName) {
        console.log("applying ship name: "+shipName);
        state.player.shipName = shipName;                 // e.g. "human_zeus"
        state.player.shipStats = getStats(state.player.shipName);
      
        // ensure the sprite matches the stats image
        const imgFile = state.player.shipStats?.image;    // e.g. "human_zeus.png"
        if (imgFile) {
          shipSkinIndex = Math.max(0, shipSkins.indexOf(imgFile));
          currentShipImg = loadShipImage(imgFile);
        }
      }

  
      const STAR_DIAMETER = SystemInfo.stars[0].radius+200;
      const STAR_RADIUS_WORLD = SystemInfo.stars[0].radius;
      const STAR_X = SystemInfo.size/2;
      const STAR_Y = SystemInfo.size/2;

      const STATION_X = STAR_X + 450;
      const STATION_Y = STAR_Y - 200;
      const STATION_RADIUS = 80;
      const STATION_ROT_SPEED = Math.PI / 32; // rad/sec

      const STATION_ASSET = window.BASE_PATH + "/assets/space_station.png";
      const stationImg = new Image();
      stationImg.src = STATION_ASSET;

      const FRICTION = 70;
      const MONEY_PER_TARGET = 10;

     

      const canvas = document.getElementById("game-canvas");
      const ctx = canvas.getContext("2d");

      const minimapCanvas = document.getElementById("minimap-canvas");
      const minimapCtx = minimapCanvas.getContext("2d");

      const speedValueEl = document.getElementById("speed-value");
      const posValueEl = document.getElementById("pos-value");
      const moneyValueEl = document.getElementById("money-value");

      const touchButtons = document.querySelectorAll(".touch-btn");
      const lockButton = document.querySelector('.touch-btn[data-action="lock"]');
      const dockButtonEl = document.getElementById("dock-button");

      const dockingMessageEl = document.getElementById("docking-message");
      const stationOverlayEl = document.getElementById("station-overlay");
      const stationExitBtn = document.getElementById("station-exit-btn");
      const stationTabButtons = document.querySelectorAll(".station-tab-btn");
      const stationTabContentEl = document.getElementById("station-tab-content");

      const changeShipBtn = document.getElementById("change-ship-button");
      if (!changeShipBtn) return;

      changeShipBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation(); // important if anything listens higher up
        cycleShipSkin();     // ONLY this
        saveState();
      });


      const shipNames = [
        "human_artemis",
        "human_hermes",
        "human_gunship",
        "human_icarus",
        "human_mercury",
        "human_perseus",
        "human_demeter",
        "human_zeus",
      ];

      const shipSkins = [
        "human_berseker.png",
        "human_gunship.png",
        "human_icarus.png",
        "human_mercury.png",
        "human_starfighter.png",
        "human_toad.png",
        "human_zeus.png",
        "jared_zuque.png",
        "jared_three_eyes.png",
        "jared_three_eyes_spike_hybrid.png",
        "technician_spike_razor_upgraded.png",
        "technician_spike_razor.png",
        "technician_hard_shell_double_closed.png",
        "technician_hard_shell_v1.png"
      ];
            
      // sprite cache
      const shipImages = new Map();
      let shipSkinIndex = 0;
      let shipImgReady = false;
      
      function loadShipImage(filename) {
        shipImgReady = false;
      
        // cached
        if (shipImages.has(filename)) {
          shipImgReady = true;
          return shipImages.get(filename);
        }
      
        const img = new Image();
        img.onload = () => { shipImgReady = true; };
        img.onerror = () => {
          console.warn("Failed to load ship image:", img.src);
          shipImgReady = false;
        };
        img.src = SHIP_ASSET_BASE + filename;
        shipImages.set(filename, img);
        return img;
      }
      
      // initial sprite
      let currentShipImg = loadShipImage(shipSkins[shipSkinIndex]);
      
      function cycleShipSkin() {
        const currentIdx = Math.max(0, shipNames.indexOf(state.player.shipName));
        const nextIdx = (currentIdx + 1) % shipNames.length;
        applyShip(shipNames[nextIdx]);
      }

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
      let target = null;

      let dockingActive = false;
      let stationDialogOpen = false;

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

        // basic hp model (prefer stats if you have them)
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
        if (enemySpawnAcc < rate) return;
        enemySpawnAcc = 0;

        if (state?.enemies ){
          if(state?.enemies.length < maxN){
            spawnEnemy();
          }
        }
        
      }

      function attemptFireWeapon() {
        const weapon = weapons[currentWeaponIndex];
        const now = performance.now();
        const last = weaponLastFire[currentWeaponIndex] || 0;
        const firerateMult = state.player.shipStats.firerateMult || 1.0;
        if (now - last < ( weapon.delay_ms * firerateMult)) {
          return;
        }
        weaponLastFire[currentWeaponIndex] = now;

        let baseAngle = state.player.angle;
        if (weapon.auto_aim && target) {
          const toTargetAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
          let diff = normalizeAngleDiff(toTargetAngle - state.player.angle);
          if (Math.abs(diff) <= weapon.auto_aim) {
            baseAngle = toTargetAngle;
          }
        }

        const spreadRad = (weapon.spread || 0) * Math.PI / 180;
        const muzzleDistance = 18;
        const shipSpeedX = state.player.vx;
        const shipSpeedY = state.player.vy;

        const count = weapon.projectiles || 1;

        for (let i = 0; i < count; i++) {
          const offset = spreadRad > 0
            ? (-spreadRad + Math.random() * (2 * spreadRad))
            : 0;

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

          const startX = state.player.x + dirX * muzzleDistance;
          const startY = state.player.y + dirY * muzzleDistance;

          projectiles.push({
            x: startX,
            y: startY,
            vx,
            vy,
            age: 0,
            life: weapon.life_span,
            damage: weapon.damage,
            aspect: weapon.aspect,
            angle,
            homing: !!weapon.homing,
            speed: speed,
            accel: weapon.acceleration || 0,
            maxSpeed: weapon.speed || weapon.base_speed || 0,
            turnSpeed: weapon.turn_speed_rad || 0
          });
        }
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

      if (dockButtonEl) {
       dockButtonEl.addEventListener("click", (e) => {
         e.preventDefault();
         startDocking();
       });
     }

      function startDocking() {
        if (stationDialogOpen) return;
        dockingActive = true;
        dockingMessageEl.classList.add("visible");
      }

      function openStationDialog() {
        stationDialogOpen = true;
        dockingActive = false;
        dockingMessageEl.classList.remove("visible");
        stationOverlayEl.classList.add("open");
      }

      function closeStationDialog() {
        stationDialogOpen = false;
        stationOverlayEl.classList.remove("open");
      }

      function setActiveTab(tab) {
        stationTabButtons.forEach(btn => {
          btn.classList.toggle("active", btn.dataset.tab === tab);
        });

        let html = "";
        if (tab === "info") {
          html = `
            <h3>Info</h3>
            <p>General information about the station, services and traffic.</p>
          `;
        } else if (tab === "outfitter") {
          html = `
            <h3>Outfitter</h3>
            <p>Configure and upgrade weapons, shields and systems.</p>
          `;
        } else if (tab === "finance") {
          html = `
            <h3>Finance</h3>
            <p>Manage your money, loans and station fees.</p>
          `;
        } else if (tab === "spaceships") {
          html = `
            <h3>Spaceships</h3>
            <p>View, buy or sell starships and modules.</p>
          `;
        }
        stationTabContentEl.innerHTML = html;
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

          // numeric state
          ["x", "y", "vx", "vy", "angle", "money"].forEach((k) => {
            if (typeof saved?.player[k] === "number") state.player[k] = saved.player[k];
          });
          console.log(state.player)

          // shipName (string)
          if (typeof saved.player.shipName === "string" && saved.player.shipName.trim()) {
            const name = saved.player.shipName.trim();
            if (shipNames.includes(name)) applyShip(name);
          }

          // galaxySystemName (string)
          if (typeof saved.player.systemName === "string" && saved.player.systemName.trim()) {
            state.player.systemName = saved.player.systemName.trim();
          }
        } catch (e) {
          console.warn("Impossibile caricare lo stato:", e);
        }

        moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
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
          
          // for every enemy
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

        const targetW = 52;
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
        const hullR = 22;
        const shieldR = 28;

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

        // run at 1Hz, but frame-rate independent
        while (enemyShieldRegenAcc >= 1) {
          enemyShieldRegenAcc -= 1;

          if (!state.enemies || state.enemies.length === 0) continue;

          state.enemies.forEach((enemy) => {
            if (!enemy || !enemy.shipStats) return;

            const regen = Math.max(1, Number(enemy.shipStats.shieldRegen) || 0);
            const maxShield =
              Number(enemy.maxShield ?? enemy.shipStats.shieldHp ?? enemy.shield ?? 0);

            if (!Number.isFinite(maxShield) || maxShield <= 0) return;

            enemy.maxShield = maxShield;
            enemy.shield = Math.min(maxShield, (Number(enemy.shield) || 0) + regen);
          });
        }
      }


      function update(dt) {
        stationAngle += STATION_ROT_SPEED * dt;

        // Movimento nave: manuale o docking autopilot
        if (dockingActive && !stationDialogOpen) {
          // AUTOPILOT verso stazione
          const dx = STATION_X - state.player.x;
          const dy = STATION_Y - state.player.y;
          const dist = Math.hypot(dx, dy);

          const desiredAngle = Math.atan2(dy, dx);
          let diff = normalizeAngleDiff(desiredAngle - state.player.angle);
          const maxTurn = state.player.shipStats.turningSpeedRad * dt;
          if (diff > maxTurn) diff = maxTurn;
          if (diff < -maxTurn) diff = -maxTurn;
          state.player.angle += diff;

          let targetSpeed;
          if (dist > 200) {
            targetSpeed = state.player.shipStats.speed * 0.7;
          } else if (dist > 50) {
            targetSpeed = state.player.shipStats.speed * 0.3;
          } else {
            targetSpeed = 30; // near 50px, slowdown
          }

          const dirX = Math.cos(state.player.angle);
          const dirY = Math.sin(state.player.angle);
          state.player.vx = dirX * targetSpeed;
          state.player.vy = dirY * targetSpeed;
        } else {
          // CONTROLLO MANUALE
          if (input.left) {
            state.player.angle -= state.player.shipStats.turningSpeedRad * dt;
          }
          if (input.right) {
            state.player.angle += state.player.shipStats.turningSpeedRad * dt;
          }

          let speed = Math.hypot(state.player.vx, state.player.vy);

          if (input.thrust) {
            const ax = Math.cos(state.player.angle) * state.player.shipStats.acceleration;
            const ay = Math.sin(state.player.angle) * state.player.shipStats.acceleration;
            state.player.vx += ax * dt;
            state.player.vy += ay * dt;
          }

          if (!input.thrust) {
            if (speed > 0) {
              const decel = FRICTION * dt;
              speed = Math.max(0, speed - decel);
              if (speed === 0) {
                state.player.vx = 0;
                state.player.vy = 0;
              } else {
                const factor = speed / Math.hypot(state.player.vx, state.player.vy);
                state.player.vx *= factor;
                state.player.vy *= factor;
              }
            }
          }

          if (input.brake && speed > 0) {
            const decel = state.player.shipStats.acceleration * dt;
            speed = Math.max(0, speed - decel);
            if (speed === 0) {
              state.player.vx = 0;
              state.player.vy = 0;
            } else {
              const factor = speed / Math.hypot(state.player.vx, state.player.vy);
              state.player.vx *= factor;
              state.player.vy *= factor;
            }
          }
        }

        const newSpeed = Math.hypot(state.player.vx, state.player.vy);
        if (newSpeed > state.player.shipStats.speed) {
          const factor = state.player.shipStats.speed / newSpeed;
          state.player.vx *= factor;
          state.player.vy *= factor;
        }

        state.player.x += state.player.vx * dt;
        state.player.y += state.player.vy * dt;

        state.player.x = Math.max(0, Math.min(SystemInfo.size, state.player.x));
        state.player.y = Math.max(0, Math.min(SystemInfo.size, state.player.y));

        // Completamento docking: quando centrata
        if (dockingActive && !stationDialogOpen) {
          const dx2 = STATION_X - state.player.x;
          const dy2 = STATION_Y - state.player.y;
          const dist2 = Math.hypot(dx2, dy2);
          if (dist2 < 5) {
            state.player.x = STATION_X;
            state.player.y = STATION_Y;
            state.player.vx = 0;
            state.player.vy = 0;
            dockingActive = false;
            openStationDialog();
          }
        }

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.age += dt;

          if (p.homing && target) {
            const desiredAngle = Math.atan2(target.y - p.y, target.x - p.x);
            let diff = normalizeAngleDiff(desiredAngle - p.angle);
            const maxTurn = p.turnSpeed * dt;
            if (diff > maxTurn) diff = maxTurn;
            if (diff < -maxTurn) diff = -maxTurn;
            p.angle += diff;

            p.speed = Math.min(p.maxSpeed || p.speed, p.speed + p.accel * dt);

            p.vx = Math.cos(p.angle) * p.speed;
            p.vy = Math.sin(p.angle) * p.speed;
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          let remove = false;

          if (p.age > (p.life || 3.0)) {
            remove = true;
          }

          if (!remove && target) {
            const dx = p.x - target.x;
            const dy = p.y - target.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= target.radius) {
              const damage = p.damage || 1;
              const damageMult = state.player.shipStats.damageMult || 1;
              target.hp -= (damage * damageMult);
              remove = true;
              if (target.hp <= 0) {
                state.player.money += MONEY_PER_TARGET;
                moneyValueEl.textContent = `${state.player.money.toFixed(0)}§`;
                spawnTarget();
              }
            }
          }

          if(!remove && state.enemies && state.enemies.length > 0){
            state.enemies.forEach(enemy => {
              const dx = p.x - enemy.x;
              const dy = p.y - enemy.y;
              const dist = Math.hypot(dx, dy);
              if (dist <= enemy.shipStats.shieldDiameterPx){
                const damage = p.damage || 1;
                const damageMult = state.player.shipStats.damageMult || 1;
                let totalDamage = damage * damageMult;

                // consume projectile on hit
                remove = true;

                // 1) shield absorbs first
                if (enemy.shield > 0 && totalDamage > 0) {
                  const absorbed = Math.min(enemy.shield, totalDamage);
                  enemy.shield -= absorbed;
                  totalDamage -= absorbed;
                }

                // 2) remaining goes to hull
                if (enemy.hull > 0 && totalDamage > 0) {
                  enemy.hull -= totalDamage;
                  totalDamage = 0;
                }

                // 3) destroy if hull depleted
                if (enemy.hull <= 0) {
                  destroyEnemyById(enemy.id);
                }
              }
            });
          }

          if (remove) {
            projectiles.splice(i, 1);
          }
        }

        speedValueEl.textContent = newSpeed.toFixed(1);
        posValueEl.textContent = `${state.player.x.toFixed(0)}, ${state.player.y.toFixed(0)}`;
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

      function drawStarfield() {
        ctx.save();
        ctx.fillStyle = "#020309";
        ctx.fillRect(0, 0, width, height);

        const camX = state.player.x;
        const camY = state.player.y;

        starLayers.forEach((layer, idx) => {
          const { factor, stars } = layer;
          const size = 2 + idx;

          stars.forEach((star) => {
            const sx = (star.x - camX * factor) % (SystemInfo.size * 2);
            const sy = (star.y - camY * factor) % (SystemInfo.size * 2);
            let x = sx;
            let y = sy;
            if (x < -SystemInfo.size) x += SystemInfo.size * 2;
            if (y < -SystemInfo.size) y += SystemInfo.size * 2;

            const screenX = width / 2 + x * 0.1;
            const screenY = height / 2 + y * 0.1;

            if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) return;

            const alpha = 0.3 + layer.factor * 0.5;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
          });
        });

        ctx.restore();
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
        ctx.strokeStyle = "#ff5252";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
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

     function drawShip() {
        ctx.save();
        ctx.translate(width / 2, height / 2);

        // sprite loaded need rotation 90° clockwise
        ctx.rotate(state.player.angle + Math.PI / 2);

        // --- ENGINE FLARE (when accelerating) ---
        // Engine flare anchor in SHIP-LOCAL coords (after rotation). Tweak these.
        const engineFlareX = 0; // behind the ship (left in local coords)
        const engineFlareY = 40;   // centered vertically
        const engineFlareWidth = 14;
        const engineFlareLength = 26;

        if (input.thrust) {
          ctx.save();
          ctx.translate(engineFlareX, engineFlareY);

          // rotate flare 90° anti-clockwise (CCW)
          ctx.rotate(-Math.PI / 2);

          // Inverted triangle: tip at (0,0), base to the RIGHT (+X)
          // Outer yellow flame
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
        }

        // --- IMAGE SHIP (preferred) ---
        if (currentShipImg && currentShipImg.complete && currentShipImg.naturalWidth > 0) {
          const targetW = 52; // tweak to taste
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

      let lastTime = performance.now();

      function loop(now) {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        update(dt);
        updateEnemySpawning(dt);
        moveEnemies(dt);
        regenEnemyShields(dt);
        drawStarfield();
        drawMainStar();
        drawStation();
        drawTarget();
        drawTargetLine();
        drawProjectiles();
        drawEnemies();
        drawShip();
        drawMinimap();

        requestAnimationFrame(loop);
      }

      function initStationUI() {
        setActiveTab("info");

        stationTabButtons.forEach(btn => {
          btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            setActiveTab(tab);
          });
        });

        stationExitBtn.addEventListener("click", () => {
          closeStationDialog();
        });
      }

      function init() {
        resize();
        initStarfield();
        loadState();
        spawnTarget();
        updateLockButtonVisual();
        applyShip(state.player.shipName || shipNames[0]);
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
          touchButtons,
          startDocking
        );

        setInterval(saveState, 2000);
        lastTime = performance.now();
        requestAnimationFrame(loop);
      }

      window.addEventListener("load", init);
    })();
