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
        ]
      };
      
      const STAR_DIAMETER = 300;
      const STAR_RADIUS_WORLD = 100;
      const STAR_X = 3000;
      const STAR_Y = 3000;

      const STATION_X = STAR_X + 450;
      const STATION_Y = STAR_Y - 200;
      const STATION_RADIUS = 80;
      const STATION_ROT_SPEED = Math.PI / 32; // rad/sec

      const STATION_ASSET = "/spaceFighter/assets/space_station.png";
      const stationImg = new Image();
      stationImg.src = STATION_ASSET;

      const spaceshipStats = {
        speed: 150,
        acceleration: 120,
        turningSpeedRad: Math.PI * 1.25,
        engineFlareType: "triangular",
        engineFlareWidth: 16,
        engineFlareLength: 48,
        image: "human_starfigther.png",
        shieldDiameterPx: 90,
        shipCenter: { x: 0.5, y: 0.5 },
        engineCoords: [{ x: 0.20, y: 0.50 }],
        weaponGunCoords: [{ x: 0.83, y: 0.50 }],
      }

      const FRICTION = 70;
      const ROTATION_SPEED = Math.PI;

      const STORAGE_KEY = "spaceFighterSaveData";
      const MONEY_PER_TARGET = 10;

      // Weapons definitions
      const WeaponSpaceBullet = {
        name: "Space Bullet",
        damage: 1,
        base_speed: 250,
        life_span: 3.0,
        spread: 0.15,
        projectiles: 1,
        aspect: "round_bullet",
        delay_ms: 50
      };

      const WeaponSniper = {
        name: "Sniper",
        damage: 10,
        base_speed: 1000,
        life_span: 5.0,
        spread: 0.0,
        projectiles: 1,
        aspect: "line",
        auto_aim: 1.0,
        delay_ms: 500
      };

      const WeaponShotgun = {
        name: "Shotgun",
        damage: 2,
        base_speed: 350,
        acceleration: -75,
        life_span: 2.0,
        spread: 5.0,
        projectiles: 5,
        aspect: "bullet",
        delay_ms: 200
      };

      const WeaponHomingMissiles = {
        name: "Homing missiles",
        damage: 5,
        base_speed: 100,
        acceleration: 10,
        speed: 200,
        turning_speed_deg: 120,
        life_span: 20.0,
        spread: 3.0,
        projectiles: 1,
        aspect: "missile",
        delay_ms: 1000,
        homing: true
      };
      WeaponHomingMissiles.turn_speed_rad =
        WeaponHomingMissiles.turning_speed_deg * Math.PI / 180;

      const weapons = [
        WeaponSpaceBullet,
        WeaponSniper,
        WeaponShotgun,
        WeaponHomingMissiles
      ];
      let currentWeaponIndex = 0;
      const weaponLastFire = [0, 0, 0, 0];

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

      const SHIP_ASSET_BASE = "/spaceFighter/assets/";

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
        "technician_hard_shell_double_open1.png",
        "technician_hard_shell_double_open2.png",
        "technician_hard_shell_double_open3.png",
        "technician_hard_shell_double_open4.png",
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
        shipSkinIndex = (shipSkinIndex + 1) % shipSkins.length;
        currentShipImg = loadShipImage(shipSkins[shipSkinIndex]);
      }

      let width = 0;
      let height = 0;

      let minimapSize = 0;
      let minimapScale = 0;

      const state = {
        x: SystemInfo.size / 2,
        y: SystemInfo.size / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        money: 0
      };

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

      function normalizeAngleDiff(diff) {
        diff = (diff + Math.PI) % (2 * Math.PI);
        if (diff < 0) diff += 2 * Math.PI;
        return diff - Math.PI;
      }

      function attemptFireWeapon() {
        const weapon = weapons[currentWeaponIndex];
        const now = performance.now();
        const last = weaponLastFire[currentWeaponIndex] || 0;

        if (now - last < weapon.delay_ms) {
          return;
        }
        weaponLastFire[currentWeaponIndex] = now;

        let baseAngle = state.angle;
        if (weapon.auto_aim && target) {
          const toTargetAngle = Math.atan2(target.y - state.y, target.x - state.x);
          let diff = normalizeAngleDiff(toTargetAngle - state.angle);
          if (Math.abs(diff) <= weapon.auto_aim) {
            baseAngle = toTargetAngle;
          }
        }

        const spreadRad = (weapon.spread || 0) * Math.PI / 180;
        const muzzleDistance = 18;
        const shipSpeedX = state.vx;
        const shipSpeedY = state.vy;

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

          const startX = state.x + dirX * muzzleDistance;
          const startY = state.y + dirY * muzzleDistance;

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
            if (typeof saved[k] === "number") state[k] = saved[k];
          });

          // shipName (string)
          if (typeof saved.shipName === "string" && saved.shipName.trim()) {
            state.shipName = saved.shipName.trim();

            // apply stats for this ship
            // (expects getStats to be in scope / imported)
            state.shipStats = getStats(state.shipName);
          }

          // galaxySystemName (string)
          if (typeof saved.galaxySystemName === "string" && saved.galaxySystemName.trim()) {
            state.galaxySystemName = saved.galaxySystemName.trim();
          }
        } catch (e) {
          console.warn("Impossibile caricare lo stato:", e);
        }

        moneyValueEl.textContent = `${state.money.toFixed(0)}§`;
      }

      function saveState() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
          console.warn("Impossibile salvare lo stato:", e);
        }
      }

      function update(dt) {
        stationAngle += STATION_ROT_SPEED * dt;

        // Movimento nave: manuale o docking autopilot
        if (dockingActive && !stationDialogOpen) {
          // AUTOPILOT verso stazione
          const dx = STATION_X - state.x;
          const dy = STATION_Y - state.y;
          const dist = Math.hypot(dx, dy);

          const desiredAngle = Math.atan2(dy, dx);
          let diff = normalizeAngleDiff(desiredAngle - state.angle);
          const maxTurn = ROTATION_SPEED * dt;
          if (diff > maxTurn) diff = maxTurn;
          if (diff < -maxTurn) diff = -maxTurn;
          state.angle += diff;

          let targetSpeed;
          if (dist > 200) {
            targetSpeed = spaceshipStats.speed * 0.7;
          } else if (dist > 50) {
            targetSpeed = spaceshipStats.speed * 0.3;
          } else {
            targetSpeed = 30; // near 50px, slowdown
          }

          const dirX = Math.cos(state.angle);
          const dirY = Math.sin(state.angle);
          state.vx = dirX * targetSpeed;
          state.vy = dirY * targetSpeed;
        } else {
          // CONTROLLO MANUALE
          if (input.left) {
            state.angle -= ROTATION_SPEED * dt;
          }
          if (input.right) {
            state.angle += ROTATION_SPEED * dt;
          }

          let speed = Math.hypot(state.vx, state.vy);

          if (input.thrust) {
            const ax = Math.cos(state.angle) * spaceshipStats.acceleration;
            const ay = Math.sin(state.angle) * spaceshipStats.acceleration;
            state.vx += ax * dt;
            state.vy += ay * dt;
          }

          if (!input.thrust) {
            if (speed > 0) {
              const decel = FRICTION * dt;
              speed = Math.max(0, speed - decel);
              if (speed === 0) {
                state.vx = 0;
                state.vy = 0;
              } else {
                const factor = speed / Math.hypot(state.vx, state.vy);
                state.vx *= factor;
                state.vy *= factor;
              }
            }
          }

          if (input.brake && speed > 0) {
            const decel = spaceshipStats.acceleration * dt;
            speed = Math.max(0, speed - decel);
            if (speed === 0) {
              state.vx = 0;
              state.vy = 0;
            } else {
              const factor = speed / Math.hypot(state.vx, state.vy);
              state.vx *= factor;
              state.vy *= factor;
            }
          }
        }

        const newSpeed = Math.hypot(state.vx, state.vy);
        if (newSpeed > spaceshipStats.speed) {
          const factor = spaceshipStats.speed / newSpeed;
          state.vx *= factor;
          state.vy *= factor;
        }

        state.x += state.vx * dt;
        state.y += state.vy * dt;

        state.x = Math.max(0, Math.min(SystemInfo.size, state.x));
        state.y = Math.max(0, Math.min(SystemInfo.size, state.y));

        // Completamento docking: quando centrata
        if (dockingActive && !stationDialogOpen) {
          const dx2 = STATION_X - state.x;
          const dy2 = STATION_Y - state.y;
          const dist2 = Math.hypot(dx2, dy2);
          if (dist2 < 5) {
            state.x = STATION_X;
            state.y = STATION_Y;
            state.vx = 0;
            state.vy = 0;
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
              target.hp -= damage;
              remove = true;
              if (target.hp <= 0) {
                state.money += MONEY_PER_TARGET;
                moneyValueEl.textContent = `${state.money.toFixed(0)}§`;
                spawnTarget();
              }
            }
          }

          if (remove) {
            projectiles.splice(i, 1);
          }
        }

        speedValueEl.textContent = newSpeed.toFixed(1);
        posValueEl.textContent = `${state.x.toFixed(0)}, ${state.y.toFixed(0)}`;
      }

      function drawStarfield() {
        ctx.save();
        ctx.fillStyle = "#020309";
        ctx.fillRect(0, 0, width, height);

        const camX = state.x;
        const camY = state.y;

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
        const screenX = width / 2 + (STAR_X - state.x);
        const screenY = height / 2 + (STAR_Y - state.y);

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
        const screenX = width / 2 + (STATION_X - state.x);
        const screenY = height / 2 + (STATION_Y - state.y);
      
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

        const screenX = width / 2 + (target.x - state.x);
        const screenY = height / 2 + (target.y - state.y);

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
        const targetX = width / 2 + (target.x - state.x);
        const targetY = height / 2 + (target.y - state.y);

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
          const screenX = width / 2 + (p.x - state.x);
          const screenY = height / 2 + (p.y - state.y);

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
        ctx.rotate(state.angle + Math.PI / 2);

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
          minimapCtx.arc(tx, ty, 2.5, 0, Math.PI * 2);
          minimapCtx.fillStyle = "#ff5252";
          minimapCtx.fill();
        }

        const sx = (state.x - SystemInfo.size / 2) * minimapScale;
        const sy = (state.y - SystemInfo.size / 2) * minimapScale;

        minimapCtx.save();
        minimapCtx.translate(sx, sy);
        minimapCtx.rotate(state.angle);

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
        drawStarfield();
        drawMainStar();
        drawStation();
        drawTarget();
        drawTargetLine();
        drawProjectiles();
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