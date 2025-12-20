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