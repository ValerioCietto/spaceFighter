
 // Weapons definitions
const WeaponSpaceBullet = {
  name: "Space Bullet",
  cost: 1000,
  damage: 1,
  base_speed: 250,
  life_span: 3.0,
  spread: 0.15,
  projectiles: 1,
  aspect: "round_bullet",
  delay_ms: 50,
  energy_cost: 10,
  engage_range: 700,
};

const WeaponSniper = {
  name: "Sniper",
  cost: 2000,
  damage: 5,
  base_speed: 1000,
  life_span: 5.0,
  spread: 0.0,
  projectiles: 1,
  aspect: "line",
  auto_aim: 0.5,
  delay_ms: 300,
  energy_cost: 100,
  engage_range: 5000,
};

const WeaponShotgun = {
  name: "Shotgun",
  cost: 1500,
  damage: 2,
  base_speed: 300,
  acceleration: -75,
  life_span: 2.0,
  spread: 10.0,
  projectiles: 5,
  aspect: "bullet",
  delay_ms: 200,
  energy_cost: 50,
  engage_range: 500,
};

const WeaponHomingMissiles = {
  name: "Homing missiles",
  cost: 2500,
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
  homing: true,
  energy_cost: 5,
  engage_range: 2000,
};
WeaponHomingMissiles.turn_speed_rad =
  WeaponHomingMissiles.turning_speed_deg * Math.PI / 180;

const WeaponLazyMissiles = {
  name: "Lazy missiles",
  cost: 1200,
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
  homing: true,
  energy_cost: 20,
  engage_range: 3000,
};
WeaponLazyMissiles.turn_speed_rad =
  WeaponLazyMissiles.turning_speed_deg * Math.PI / 180;

const WeaponShockwave = {
  name: "Shockwave",
  cost: 5500,
  damage: 2,
  base_speed: 300,
  acceleration: -75,
  life_span: 0.2,
  spread: 360.0,
  projectiles: 90,
  aspect: "line",
  delay_ms: 200,
  energy_cost: 40,
  engage_range: 60,
};  

const WeaponMinelayer = {
  name: "Minelayer",
  cost: 3000,
  damage: 1,
  base_speed: 2,
  acceleration: -250,
  life_span: 120.0,
  speed: 0,
  spread: 360.0,
  projectiles: 30,
  aspect: "bullet",
  delay_ms: 2000,
  energy_cost: 15,
  engage_range: 4000,
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

const EnemyWeaponPool = [
  WeaponSpaceBullet,
  WeaponShockwave,
  WeaponShotgun
];

function pickEnemyWeapon() {
  return EnemyWeaponPool[(Math.random() * EnemyWeaponPool.length) | 0];
}

let currentWeaponIndex = 0;
const weaponLastFire = [0, 0, 0, 0, 0, 0, 0];


function normalizeAngleDiff(diff) {
  diff = (diff + Math.PI) % (2 * Math.PI);
  if (diff < 0) diff += 2 * Math.PI;
  return diff - Math.PI;
}


