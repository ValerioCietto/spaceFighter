// run with: npx http-server .

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  let W = 0, H = 0, DPR = 1;

  // --------- resize ----------
  function resize() {
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    W = Math.floor(window.innerWidth * DPR);
    H = Math.floor(window.innerHeight * DPR);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    buildStars();
    resetShipCenter();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // --------- static starfield with parallax ----------
  let stars = [];

  function buildStars() {
    stars = [];
    const layers = [
      { density: 0.35, parallax: 0.25 }, // lontane
      { density: 0.22, parallax: 0.5 },  // medie
      { density: 0.12, parallax: 0.9 }   // vicine
    ];

    layers.forEach(layer => {
      const count = Math.floor((W * H) / (9000 / layer.density));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,     // posizione "mondo"
          y: Math.random() * H,
          r: (Math.random() * 1.6 + 0.4) * DPR,
          a: Math.random() * 0.8 + 0.2,
          p: layer.parallax         // fattore parallax
        });
      }
    });
  }

  // --------- ship state ----------
  const SHIP_SIZE = 64 * DPR;       // dimensione disegno nave
  const THRUST = 320 * DPR;         // accel avanti px/s²
  const BRAKE = 260 * DPR;          // accelerazione contraria con down
  const ANG_SPEED = 3.0;            // rad/s
  const FRICTION = 0.98;            // attrito

  const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2 // punta verso l'alto
  };

  function resetShipCenter() {
    ship.x = W / 2;
    ship.y = H / 2;
  }

  // --------- sprite nave ----------
  const shipImg = new Image();
  shipImg.src = 'assets/F1-Human-Icarus.png'; // aggiorna se il path è diverso

  // --------- input ----------
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false
  };

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowUp':    keys.up = true; break;
      case 'ArrowDown':  keys.down = true; break;
      case 'ArrowLeft':  keys.left = true; break;
      case 'ArrowRight': keys.right = true; break;
      case 'Space':
        if (!keys.shoot) { // edge: pressione nuova
          fireBullet();
        }
        keys.shoot = true;
        e.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowUp':    keys.up = false; break;
      case 'ArrowDown':  keys.down = false; break;
      case 'ArrowLeft':  keys.left = false; break;
      case 'ArrowRight': keys.right = false; break;
      case 'Space':      keys.shoot = false; break;
    }
  });

  // --------- bullets ----------
  const bullets = [];
  const BULLET_SPEED = 520 * DPR;
  const BULLET_LIFE = 1.2; // secondi
  const BULLET_RADIUS = 3 * DPR;

  function fireBullet() {
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    bullets.push({
      x: ship.x + cos * (SHIP_SIZE * 0.5),
      y: ship.y + sin * (SHIP_SIZE * 0.5),
      vx: cos * BULLET_SPEED,
      vy: sin * BULLET_SPEED,
      life: BULLET_LIFE
    });
  }

  // --------- loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    updatePhysics(dt);
    draw();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // --------- update ----------
  function updatePhysics(dt) {
    // rotazione
    if (keys.left)  ship.angle -= ANG_SPEED * dt;
    if (keys.right) ship.angle += ANG_SPEED * dt;

    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);

    // accelerazione avanti
    if (keys.up) {
      ship.vx += cos * THRUST * dt;
      ship.vy += sin * THRUST * dt;
    }

    // decelerazione (freno)
    if (keys.down) {
      ship.vx -= cos * BRAKE * dt;
      ship.vy -= sin * BRAKE * dt;
    }

    // attrito
    ship.vx *= FRICTION;
    ship.vy *= FRICTION;

    // movimento nave (mondo)
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // niente wrap: la nave continua in mondo infinito,
    // lo sfondo parallax usa ship.x/ship.y per muovere le stelle.

    // update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (
        b.life <= 0 ||
        b.x < -50 || b.x > W + 50 ||
        b.y < -50 || b.y > H + 50
      ) {
        bullets.splice(i, 1);
      }
    }
  }

  // --------- draw ----------
  function draw() {
    // sfondo
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, W, H);

    // stelle in parallax in base a ship.x / ship.y
    for (const s of stars) {
      let sx = s.x - ship.x * s.p;
      let sy = s.y - ship.y * s.p;

      // wrap sullo schermo
      sx = ((sx % W) + W) % W;
      sy = ((sy % H) + H) % H;

      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#bcd7ff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // bullets
    ctx.fillStyle = '#ffd38a';
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // nave: sempre al centro dello schermo
    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ship.angle + Math.PI / 2); // sprite up-align
    if (shipImg.complete && shipImg.naturalWidth) {
      ctx.drawImage(
        shipImg,
        -SHIP_SIZE / 2,
        -SHIP_SIZE / 2,
        SHIP_SIZE,
        SHIP_SIZE
      );
    } else {
      // placeholder triangle
      ctx.beginPath();
      ctx.moveTo(0, -SHIP_SIZE * 0.5);
      ctx.lineTo(SHIP_SIZE * 0.3, SHIP_SIZE * 0.4);
      ctx.lineTo(-SHIP_SIZE * 0.3, SHIP_SIZE * 0.4);
      ctx.closePath();
      ctx.fillStyle = '#4da3ff';
      ctx.fill();
    }
    ctx.restore();
  }
})();
