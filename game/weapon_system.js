
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
        damage: 5,
        base_speed: 1000,
        life_span: 5.0,
        spread: 0.0,
        projectiles: 1,
        aspect: "line",
        auto_aim: 0.5,
        delay_ms: 300
      };

      const WeaponShotgun = {
        name: "Shotgun",
        damage: 2,
        base_speed: 300,
        acceleration: -75,
        life_span: 2.0,
        spread: 10.0,
        projectiles: 5,
        aspect: "bullet",
        delay_ms: 200
      };

      const WeaponHomingMissiles = {
        name: "Homing missiles",
        damage: 5,
        base_speed: 100,
        acceleration: 10,
        speed: 300,
        turning_speed_deg: 90,
        life_span: 10.0,
        spread: 3.0,
        projectiles: 1,
        aspect: "missile",
        delay_ms: 1000,
        homing: true
      };
      WeaponHomingMissiles.turn_speed_rad =
        WeaponHomingMissiles.turning_speed_deg * Math.PI / 180;

      const WeaponLazyMissiles = {
        name: "Lazy missiles",
        damage: 10,
        base_speed: 10,
        acceleration: 300,
        speed: 1000,
        turning_speed_deg: 10,
        life_span: 10.0,
        spread: 3.0,
        projectiles: 2,
        aspect: "missile",
        delay_ms: 500,
        homing: true
      };
      WeaponLazyMissiles.turn_speed_rad =
        WeaponLazyMissiles.turning_speed_deg * Math.PI / 180;

      const WeaponShockwave = {
        name: "Shockwave",
        damage: 2,
        base_speed: 300,
        acceleration: -75,
        life_span: 0.2,
        spread: 360.0,
        projectiles: 90,
        aspect: "line",
        delay_ms: 200
      };  

      const WeaponMinelayer = {
        name: "Minelayer",
        damage: 1,
        base_speed: 2,
        acceleration: -250,
        life_span: 120.0,
        speed: 0,
        spread: 360.0,
        projectiles: 30,
        aspect: "bullet",
        delay_ms: 2000
      }


      const weapons = [
        WeaponLazyMissiles,
        WeaponMinelayer,
        WeaponSpaceBullet,
        WeaponSniper,
        WeaponShotgun,
        WeaponHomingMissiles,
        WeaponShockwave
      ];
      let currentWeaponIndex = 0;
      const weaponLastFire = [0, 0, 0, 0, 0,0,0];



function normalizeAngleDiff(diff) {
  diff = (diff + Math.PI) % (2 * Math.PI);
  if (diff < 0) diff += 2 * Math.PI;
  return diff - Math.PI;
}

function fireWeaponManager(entity, weapon, target, projectiles, now = performance.now()) {
  console.log(entity);
  console.log(target);
  console.log(projectiles);
  console.log(now);
  if (!weapon){
    console.log("no fire because no weapon.");
    return false;
  }

  const last = entity.weaponLastFire?.[entity.weaponIndex] || 0;
  const firerateMult = entity.shipStats?.firerateMult || 1.0;

  if (now - last < weapon.delay_ms * firerateMult){
    console.log("reload still not complete");
    console.log("now: " + now);
    console.log("last: " + last);
    console.log("delay: " + weapon.delay_ms);
    console.log("firerateMult: " + firerateMult);
    return false;
  } 

  if (!entity.weaponLastFire) entity.weaponLastFire = {};
  entity.weaponLastFire[entity.weaponIndex] = now;

  let baseAngle = entity.angle;

  if (weapon.auto_aim && target) {
    const toTargetAngle = Math.atan2(target.y - entity.y, target.x - entity.x);
    const diff = normalizeAngleDiff(toTargetAngle - entity.angle);
    if (Math.abs(diff) <= weapon.auto_aim) baseAngle = toTargetAngle;
  }

  const spreadRad = (weapon.spread || 0) * Math.PI / 180;
  const muzzleDistance = 18;
  const shipSpeedX = entity.vx;
  const shipSpeedY = entity.vy;

  const count = weapon.projectiles || 1;
  const damageMult = entity.shipStats?.damageMult || 1.0;

  for (let i = 0; i < count; i++) {
    const offset = spreadRad > 0 ? (-spreadRad + Math.random() * (2 * spreadRad)) : 0;
    const angle = baseAngle + offset;

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const startX = entity.x + dirX * muzzleDistance;
    const startY = entity.y + dirY * muzzleDistance;

    let vx, vy, speed;

    speed = weapon.base_speed;
    if (weapon.homing) {
      vx = dirX * speed;
      vy = dirY * speed;
    } else {
      vx = shipSpeedX + dirX * speed;
      vy = shipSpeedY + dirY * speed;
    }

    projectiles.push({
      ownerId: entity.id || "player",
      x: startX, y: startY,
      vx, vy,
      age: 0,
      life: weapon.life_span,
      damage: (weapon.damage || 1) * damageMult,
      aspect: weapon.aspect,
      angle,
      homing: !!weapon.homing,
      speed,
      accel: weapon.acceleration || 0,
      maxSpeed: weapon.speed || weapon.base_speed || 0,
      turnSpeed: weapon.turn_speed_rad || 0,
    });
  }

  return true;
}