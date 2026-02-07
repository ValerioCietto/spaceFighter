// hypergateDrawer.js
// Standalone drawer for hyperspace warp gates

let gatePulseT = 0;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt                  // delta time in seconds
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {object} opts.state          // expects state.player.x / y
 * @param {object} opts.SystemInfo     // expects hyperspace_gates[]
 * @param {HTMLImageElement} opts.gateImg
 */
function drawHyperGates(ctx, dt, opts) {
  const { width, height, state, SystemInfo, gateImg } = opts;
  if (!ctx || !state || !SystemInfo) return;

  gatePulseT += dt;

  const gates = Array.isArray(SystemInfo.hyperspace_gates)
    ? SystemInfo.hyperspace_gates
    : [];

  const pulse = 0.5 + 0.5 * Math.sin(gatePulseT * 2.5);
  const glowAlpha = 0.25 + pulse * 0.35;
  const glowScale = 0.35 + pulse * 0.15;

  for (const gate of gates) {
    if (!gate || gate.type !== "warp") continue;

    const gx = Number(gate.position_x ?? gate.x ?? 0);
    const gy = Number(gate.position_y ?? gate.y ?? 0);
    const size = Math.max(1, Number(gate.width ?? 64));
    const name = String(gate.name ?? "");

    const screenX = width / 2 + (gx - state.player.x);
    const screenY = height / 2 + (gy - state.player.y);

    ctx.save();
    ctx.translate(screenX, screenY);

    // slow rotation (rad/sec)
    const rotSpeed = Number(gate.rotation ?? 0);
    const rot = Number.isFinite(rotSpeed) ? rotSpeed * gatePulseT : 0;
    if (rot) ctx.rotate(rot);

    // pulsating cyan core
    const coreR = (size / 2) * glowScale;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    grad.addColorStop(0, `rgba(120,200,255,${glowAlpha})`);
    grad.addColorStop(1, "rgba(120,200,255,0)");

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (gateImg?.complete && gateImg.naturalWidth > 0) {
      ctx.drawImage(gateImg, -size / 2, -size / 2, size, size);

      if (name) {
        ctx.save();
        ctx.rotate(-rot);
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.strokeText(name, 0, -size / 2 - 6);
        ctx.fillStyle = "white";
        ctx.fillText(name, 0, -size / 2 - 6);
        ctx.restore();
      }

      ctx.restore();
      continue;
    }

    // fallback
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}