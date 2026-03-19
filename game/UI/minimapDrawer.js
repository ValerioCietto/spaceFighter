function createMinimapDrawer({
  canvas,
  containerEl,
  systemInfo,
  state,
  getTarget,
  starDiameter,
}) {
  const ctx = canvas?.getContext?.("2d");
  let minimapSize = 0;
  let minimapScale = 0;

  function resize({ devicePixelRatio = window.devicePixelRatio || 1 } = {}) {
    if (!canvas || !ctx || !containerEl) return;

    minimapSize = Math.min(
      containerEl.clientWidth || 0,
      containerEl.clientHeight || 0
    );

    canvas.width = minimapSize * devicePixelRatio;
    canvas.height = minimapSize * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    minimapScale = minimapSize > 0 ? (minimapSize * 0.8) / systemInfo.size : 0;
  }

  function drawDot(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function getStations() {
    return Array.isArray(systemInfo?.stations) ? systemInfo.stations : [];
  }

  function draw() {
    if (!ctx || !minimapSize) return;

    const w = minimapSize;
    const h = minimapSize;
    const worldHalf = systemInfo.size / 2;
    const target = typeof getTarget === "function" ? getTarget() : null;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const hexRadius = worldHalf * minimapScale;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = hexRadius * Math.cos(a);
      const y = hexRadius * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const starRadius = (starDiameter / 2) * minimapScale;
    ctx.beginPath();
    ctx.arc(0, 0, starRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, starRadius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = gradient;
    ctx.fill();

    getStations().forEach((station) => {
      const stationX = Number(station.position_x);
      const stationY = Number(station.position_y);
      if (Number.isFinite(stationX) && Number.isFinite(stationY)) {
        drawDot(
          (stationX - worldHalf) * minimapScale,
          (stationY - worldHalf) * minimapScale,
          3,
          "#bbbbbb"
        );
      }
    });

    if (target) {
      drawDot(
        (target.x - worldHalf) * minimapScale,
        (target.y - worldHalf) * minimapScale,
        1.5,
        "#ff5252"
      );
    }

    if (Array.isArray(state?.enemies)) {
      state.enemies.forEach((enemy) => {
        drawDot(
          (enemy.x - worldHalf) * minimapScale,
          (enemy.y - worldHalf) * minimapScale,
          2.5,
          "#ff5252"
        );
      });
    }

    if (Array.isArray(systemInfo?.hyperspace_gates)) {
      systemInfo.hyperspace_gates.forEach((gate) => {
        drawDot(
          (gate.position_x - worldHalf) * minimapScale,
          (gate.position_y - worldHalf) * minimapScale,
          2.5,
          "#52f9ff"
        );
      });
    }

    const playerX = (state.player.x - worldHalf) * minimapScale;
    const playerY = (state.player.y - worldHalf) * minimapScale;

    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.rotate(state.player.angle);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -3);
    ctx.lineTo(-4, 3);
    ctx.closePath();
    ctx.fillStyle = "#4fc3f7";
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  return {
    resize,
    draw,
  };
}
