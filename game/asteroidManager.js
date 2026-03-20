(function () {
  function createAsteroidManager(options) {
    const {
      state,
      systemInfo,
      basePath,
      starRadiusWorld,
      onReward,
      config,
    } = options || {};

    if (!state || !systemInfo) {
      throw new Error("createAsteroidManager requires state and systemInfo");
    }

    const asteroidMaterials = [
      { key: "basic", image: "asteroids/asteroid_basic1.png", weight: 60, rewardMin: 10, rewardMax: 80, hpMin: 8, hpMax: 24 },
      { key: "silver", image: "asteroids/asteroid_silver1.png", weight: 24, rewardMin: 90, rewardMax: 250, hpMin: 18, hpMax: 48 },
      { key: "gold", image: "asteroids/asteroid_gold1.png", weight: 12, rewardMin: 260, rewardMax: 650, hpMin: 32, hpMax: 72 },
      { key: "uranium", image: "asteroids/asteroid_uranium1.png", weight: 4, rewardMin: 700, rewardMax: 1000, hpMin: 45, hpMax: 120 },
    ];

    const asteroidConfig = {
      countMin: Number(config?.countMin) || 8,
      countMax: Number(config?.countMax) || 18,
      minSize: Number(config?.minSize) || 24,
      maxSize: Number(config?.maxSize) || 72,
      spawnRadiusMin: Number(config?.spawnRadiusMin) || starRadiusWorld + 450,
      spawnRadiusMax:
        Number(config?.spawnRadiusMax) ||
        Math.max((Number(config?.spawnRadiusMin) || starRadiusWorld + 450) + 1, systemInfo.size * 0.48),
    };

    const imageByMaterial = {};
    asteroidMaterials.forEach((material) => {
      const img = new Image();
      img.src = `${basePath}/assets/${material.image}`;
      imageByMaterial[material.key] = img;
    });

    let asteroidIdSeq = 0;

    function randomRange(min, max) {
      return min + Math.random() * (max - min);
    }

    function pickMaterial() {
      const total = asteroidMaterials.reduce((acc, m) => acc + (Number(m.weight) || 0), 0);
      if (total <= 0) return asteroidMaterials[0];

      let roll = Math.random() * total;
      for (const material of asteroidMaterials) {
        roll -= Number(material.weight) || 0;
        if (roll <= 0) return material;
      }
      return asteroidMaterials[0];
    }

    function sizeFactorFromDiameter(diameterPx) {
      const denom = Math.max(1, asteroidConfig.maxSize - asteroidConfig.minSize);
      return Math.max(0, Math.min(1, (diameterPx - asteroidConfig.minSize) / denom));
    }

    function computeScaledValue(min, max, factor) {
      return min + (max - min) * factor;
    }

    function spawnForSystem() {
      const centerX = systemInfo.size / 2;
      const centerY = systemInfo.size / 2;
      const amount = asteroidConfig.countMin + ((Math.random() * (asteroidConfig.countMax - asteroidConfig.countMin + 1)) | 0);

      state.asteroids = [];

      for (let i = 0; i < amount; i++) {
        const material = pickMaterial();
        const angle = Math.random() * Math.PI * 2;
        const distance = randomRange(asteroidConfig.spawnRadiusMin, asteroidConfig.spawnRadiusMax);
        const diameterPx = randomRange(asteroidConfig.minSize, asteroidConfig.maxSize);
        const sizeFactor = sizeFactorFromDiameter(diameterPx);

        const hp = computeScaledValue(Number(material.hpMin) || 1, Number(material.hpMax) || 1, sizeFactor);
        const reward = computeScaledValue(Number(material.rewardMin) || 10, Number(material.rewardMax) || 10, sizeFactor);

        state.asteroids.push({
          id: asteroidIdSeq++,
          material: material.key,
          diameterPx,
          radius: diameterPx / 2,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          maxHp: hp,
          hp,
          rewardCredits: reward,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: randomRange(-0.45, 0.45),
        });
      }
    }

    function update(dt) {
      if (!Array.isArray(state.asteroids) || state.asteroids.length === 0) return;
      state.asteroids.forEach((asteroid) => {
        asteroid.rotation += (asteroid.rotationSpeed || 0) * dt;
      });
    }

    function damage(asteroid, projectile) {
      if (!asteroid) return;
      asteroid.hp -= Number(projectile?.damage) || 1;
      if (asteroid.hp > 0) return;

      const idx = state.asteroids.findIndex((item) => item?.id === asteroid.id);
      if (idx < 0) return;

      const reward = Math.max(10, Math.min(1000, Math.round(Number(asteroid.rewardCredits) || 0)));
      if (typeof onReward === "function") onReward(reward);
      state.asteroids.splice(idx, 1);
    }

    function projectileHitAny(projectile) {
      if (!Array.isArray(state.asteroids) || state.asteroids.length === 0) return false;

      for (let i = 0; i < state.asteroids.length; i++) {
        const asteroid = state.asteroids[i];
        if (!asteroid) continue;

        const dx = projectile.x - asteroid.x;
        const dy = projectile.y - asteroid.y;
        if (Math.hypot(dx, dy) > asteroid.radius) continue;

        damage(asteroid, projectile);
        return true;
      }

      return false;
    }

    function draw(ctx, width, height, player) {
      if (!Array.isArray(state.asteroids) || state.asteroids.length === 0) return;

      state.asteroids.forEach((asteroid) => {
        const screenX = width / 2 + (asteroid.x - player.x);
        const screenY = height / 2 + (asteroid.y - player.y);
        const img = imageByMaterial[asteroid.material];

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(asteroid.rotation || 0);

        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -asteroid.radius, -asteroid.radius, asteroid.diameterPx, asteroid.diameterPx);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#777777";
          ctx.fill();
          ctx.strokeStyle = "#aaaaaa";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const hpRatio = Math.max(0, Math.min(1, asteroid.hp / (asteroid.maxHp || 1)));
        ctx.beginPath();
        ctx.strokeStyle = "rgba(180,180,180,0.25)";
        ctx.lineWidth = 2;
        ctx.arc(0, 0, asteroid.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(180,180,180,0.95)";
        ctx.lineWidth = 3;
        ctx.arc(0, 0, asteroid.radius + 5, -Math.PI / 2, -Math.PI / 2 + hpRatio * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });
    }

    return {
      spawnForSystem,
      update,
      projectileHitAny,
      draw,
      config: asteroidConfig,
    };
  }

  window.createAsteroidManager = createAsteroidManager;
})();
