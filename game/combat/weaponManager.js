(function () {
  function normalizeEnemyBehavior(behavior) {
    const normalized = String(behavior || "").trim().toLowerCase();
    if (normalized === "turret" || normalized === "idle" || normalized === "smart") return normalized;
    return "aggressive";
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
    let weaponLastFire = [];
    const WEAPON_LOG_PREFIX = "[WeaponFire]";

    function logWeaponFlow(event, payload = {}) {
      console.log(`${WEAPON_LOG_PREFIX} ${event}`, payload);
    }

    function ensureRuntimeState() {
      const weapons = getWeapons();
      if (!Array.isArray(weapons)) return [];
      if (weaponLastFire.length !== weapons.length) {
        weaponLastFire = new Array(weapons.length).fill(0);
      }
      return weapons;
    }

    function getEffectiveWeaponForPort(weapon, port) {
      const portType = String(port?.type || "").trim().toLowerCase();
      if (portType === "turret") {
        return {
          ...weapon,
          autofire_toggle: true,
          auto_aim: 4.0,
        };
      }

      return weapon;
    }

    function applyAutofireToggleAndGate({ weapon, idx, manual, weapons }) {
      if (!manual) {
        if (!weapon?.autofire_toggle) {
          logWeaponFlow("skip:autofire-disabled", {
            weapon: weapon?.name || weapon?.code || idx,
            manual,
          });
          return { canProceed: false };
        }
        if (!weapons[idx]?.autofireToggled) {
          logWeaponFlow("skip:autofire-not-toggled", {
            weapon: weapon?.name || weapon?.code || idx,
            manual,
          });
          return { canProceed: false };
        }
      }

      if (manual && weapon?.autofire_toggle && weapons[idx].autofireToggled) {
        weapons[idx].autofireToggled = false;
      } else {
        weapons[idx].autofireToggled = true;
      }

      return { canProceed: true };
    }

    function canPlayerFireWeapon({ weapon, idx, now, port }) {
      const portLast = Number(port?.weaponLastFire);
      const last = Number.isFinite(portLast) ? portLast : (weaponLastFire[idx] || 0);
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

      logWeaponFlow("player:beam-fired", {
        weapon: weapon?.name || weapon?.code || "unknown",
        targetType: beamTarget.kind,
        targetX: beamTarget.entity.x,
        targetY: beamTarget.entity.y,
        projectiles: beamProjectiles,
      });

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

    function playerFireWeapon({ weapon, port }) {
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
      const firePort = port || { type: "gun", x: 0, y: 18 };

      const p = rotatePoint(firePort.x, firePort.y, state.player.angle);
      const muzzleX = state.player.x + p.x;
      const muzzleY = state.player.y + p.y;

      logWeaponFlow("player:projectile-fired", {
        weapon: weapon?.name || weapon?.code || "unknown",
        portType: firePort.type,
        portOffset: { x: firePort.x, y: firePort.y },
        muzzle: { x: muzzleX, y: muzzleY },
        baseAngle,
        spreadDeg: weapon.spread || 0,
        projectiles: count,
      });

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

    function getPlayerWeaponPorts() {
      const ports = Array.isArray(state?.player?.shipStats?.weaponGunCoords) && state.player.shipStats.weaponGunCoords.length
        ? state.player.shipStats.weaponGunCoords
        : [{ type: "gun", x: 0, y: 18 }];
      return ports;
    }

    function resolvePortWeapon(weapons, port) {
      if (!port) return null;
      const equippedName = String(port.weaponEquipped || "").trim();
      if (!equippedName) return null;
      const equippedKey = equippedName.toLowerCase();
      const weapon = weapons.find((candidate) => {
        const candidateName = String(candidate?.name || "").trim().toLowerCase();
        const candidateCode = String(candidate?.code || candidate?.id || "").trim().toLowerCase();
        return candidateName === equippedKey || candidateCode === equippedKey;
      });
      if (!weapon) return null;
      if (weapon.spinal === true && String(port?.type || "").trim().toLowerCase() !== "spinal") {
        return null;
      }
      const idx = weapons.indexOf(weapon);
      return { weapon: getEffectiveWeaponForPort(weapon, port), idx };
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
        logWeaponFlow("enemy:beam-fired", {
          enemyId: enemy.id,
          weapon: w?.name || w?.code || "unknown",
          distanceToPlayer: dist,
        });
        enemyFireBeam(enemy, w);
        return true;
      }

      const angle = Math.atan2(dy, dx);
      const spreadRad = (w.spread || 0) * Math.PI / 180;
      const muzzleDistance = 18;

      const count = w.projectiles || 1;

      logWeaponFlow("enemy:projectile-fired", {
        enemyId: enemy.id,
        weapon: w?.name || w?.code || "unknown",
        distanceToPlayer: dist,
        projectiles: count,
      });

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

        const behavior = normalizeEnemyBehavior(enemy.behavior);
        if (behavior === "idle" && !enemy.isProvoked) return;
        if (behavior === "smart" && enemy.isRetreating) return;

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
      console.log("Attempting player fire. Manual:", manual);
      const weapons = ensureRuntimeState();
      const now = performance.now();
      const ports = getPlayerWeaponPorts();

      logWeaponFlow("attempt:start", {
        manual,
        ports: ports.length,
        weaponCount: weapons.length,
      });

      for (const port of ports) {
        console.log("Checking port:", port);
        const resolved = resolvePortWeapon(weapons, port);
        if (!resolved) continue;
        console.log("Resolved weapon for port:", resolved);
        const { weapon, idx } = resolved;
        const toggleRes = applyAutofireToggleAndGate({ weapon, idx, manual, weapons });
        if (!toggleRes.canProceed) continue;

        if (!canPlayerFireWeapon({ weapon, idx, now, port })) {
          logWeaponFlow("skip:cooldown-or-energy", {
            weapon: weapon?.name || weapon?.code || idx,
            energy: Number(state?.player?.shipStats?.energy) || 0,
            energyCost: Math.max(0, Number(weapon?.energy_cost) || 0),
            manual,
          });
          continue;
        }

        spendPlayerWeaponEnergy(weapon);
        weaponLastFire[idx] = now;
        port.weaponLastFire = now;
        logWeaponFlow("state:weapon-fired", {
          weapon: weapon?.name || weapon?.code || idx,
          manual,
          remainingEnergy: Number(state?.player?.shipStats?.energy) || 0,
        });
        playerFireWeapon({ weapon, port, now });
      }
    }

    return {
      attemptPlayerFire,
      updateEnemiesFire,
      isBeamWeapon,
    };
  }

  globalThis.createWeaponManager = createWeaponManager;
})();
