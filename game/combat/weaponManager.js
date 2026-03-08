(function () {
  function isBeamWeapon(weapon) {
    const aspect = (weapon?.aspect || "").toLowerCase();
    return aspect === "laser" || aspect === "lightning" || weapon?.beam === true;
  }

  function rotatePoint(x, y, angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  function createWeaponManager({
    state,
    getWeapons,
    projectiles,
    enemyProjectiles,
    beamEffects,
    getNearestEnemy,
    getTarget,
    normalizeAngleDiff,
    applyDamageToEnemy,
    applyDamageToTarget,
    applyDamageToPlayer,
  }) {
    let currentWeaponIndex = 0;
    let weaponLastFire = [];

    function ensureRuntimeState() {
      const weapons = getWeapons();
      if (!Array.isArray(weapons)) return [];
      if (weaponLastFire.length !== weapons.length) {
        weaponLastFire = new Array(weapons.length).fill(0);
      }
      if (!Number.isFinite(currentWeaponIndex) || currentWeaponIndex < 0) {
        currentWeaponIndex = 0;
      }
      if (weapons.length > 0) {
        currentWeaponIndex = currentWeaponIndex % weapons.length;
      } else {
        currentWeaponIndex = 0;
      }
      return weapons;
    }

    function applyAutofireToggleAndGate({ weapon, idx, manual, weapons }) {
      if (!manual) {
        if (!weapon?.autofire_toggle) return { canProceed: false };
        if (!weapons[idx]?.autofireToggled) return { canProceed: false };
      }

      if (manual && weapon?.autofire_toggle && weapons[idx].autofireToggled) {
        weapons[idx].autofireToggled = false;
      } else {
        weapons[idx].autofireToggled = true;
      }

      return { canProceed: true };
    }

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

    function resolveBeamTarget(originX, originY, range) {
      const nearestEnemy = getNearestEnemy(originX, originY);
      if (nearestEnemy) {
        const enemyDist = Math.hypot(nearestEnemy.x - originX, nearestEnemy.y - originY);
        if (enemyDist <= range) return { kind: "enemy", entity: nearestEnemy };
      }

      const target = getTarget();
      if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
        const targetDist = Math.hypot(target.x - originX, target.y - originY);
        if (targetDist <= range) return { kind: "target", entity: target };
      }

      return null;
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
      const ports = Array.isArray(state.player.shipStats.weaponGunCoords) && state.player.shipStats.weaponGunCoords.length
        ? state.player.shipStats.weaponGunCoords
        : [{ type: "gun", x: 0, y: 18 }];

      for (const port of ports) {
        if (!port) continue;

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

    function enemyFireWeapon(enemy) {
      const w = enemy.weapon;
      if (!w) return false;

      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist > (w.engage_range || 0)) return false;

      if (isBeamWeapon(w)) {
        enemyFireBeam(enemy, w);
        return true;
      }

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
          turnSpeed: w.turn_speed_rad || 0,
        });
      }

      return true;
    }

    function updateEnemiesFire() {
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

    function attemptPlayerFire(manual = false) {
      const weapons = ensureRuntimeState();
      const idx = currentWeaponIndex;
      const weapon = weapons[idx];
      const now = performance.now();

      if (!weapon) return;

      const toggleRes = applyAutofireToggleAndGate({ weapon, idx, manual, weapons });
      if (!toggleRes.canProceed) return;

      if (!canPlayerFireWeapon({ weapon, idx, now })) return;

      spendPlayerWeaponEnergy(weapon);
      weaponLastFire[idx] = now;
      playerFireWeapon({ weapon, now });
    }

    function cyclePlayerWeapon() {
      const weapons = ensureRuntimeState();
      if (!weapons.length) {
        currentWeaponIndex = 0;
        return;
      }
      currentWeaponIndex = (currentWeaponIndex + 1) % weapons.length;
    }

    function setCurrentWeaponIndex(idx) {
      const weapons = ensureRuntimeState();
      if (!weapons.length) {
        currentWeaponIndex = 0;
        return;
      }
      const numeric = Number(idx);
      const normalized = Number.isFinite(numeric) ? Math.floor(numeric) : 0;
      currentWeaponIndex = ((normalized % weapons.length) + weapons.length) % weapons.length;
    }

    function getCurrentWeaponIndex() {
      ensureRuntimeState();
      return currentWeaponIndex;
    }

    return {
      attemptPlayerFire,
      cyclePlayerWeapon,
      updateEnemiesFire,
      setCurrentWeaponIndex,
      getCurrentWeaponIndex,
      isBeamWeapon,
    };
  }

  globalThis.createWeaponManager = createWeaponManager;
})();
