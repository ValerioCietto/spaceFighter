(function () {
  function createHyperSpaceManager({
    state,
    systemInfo,
    buttonEl,
    saveState,
    discoverSystem,
    starX,
    starY,
    getCanvasContext,
    getCanvasSize,
    getLineToTarget,
    onSystemEntered,
  }) {
    const transition = {
      active: false,
      phase: "idle", // align | accelerate | fadeIn | fadeOut
      destinationSystemName: null,
      fadeAlpha: 0,
    };

    function getNearestHyperspaceGate() {
      const gates = Array.isArray(systemInfo?.hyperspace_gates)
        ? systemInfo.hyperspace_gates
        : [];

      let nearestGate = null;
      let nearestDist = Infinity;

      for (const gate of gates) {
        if (!gate || gate.type !== "warp") continue;

        const dx = state.player.x - Number(gate.position_x ?? gate.x ?? 0);
        const dy = state.player.y - Number(gate.position_y ?? gate.y ?? 0);
        const dist = Math.hypot(dx, dy);

        if (dist < nearestDist) {
          nearestGate = gate;
          nearestDist = dist;
        }
      }

      return nearestGate ? { gate: nearestGate, distance: nearestDist } : null;
    }

    function isPlayerNearHyperspaceGate() {
      const nearest = getNearestHyperspaceGate();
      if (!nearest) return false;

      const gateSize = Math.max(1, Number(nearest.gate.width ?? 64));
      const interactionRadius = Math.max(160, gateSize * 0.75);
      return nearest.distance <= interactionRadius;
    }

    function updateButtonVisibility() {
      buttonEl.style.display = isPlayerNearHyperspaceGate() ? "block" : "none";
    }

    function enterHyperspace() {
      const nearest = getNearestHyperspaceGate();
      if (!nearest || !isPlayerNearHyperspaceGate()) return;
      if (transition.active) return;

      const gateX = Number(nearest.gate.position_x ?? nearest.gate.x ?? state.player.x);
      const gateY = Number(nearest.gate.position_y ?? nearest.gate.y ?? state.player.y);
      const destinationSystemName = String(nearest.gate.name || "Unknown System");

      state.player.x = gateX;
      state.player.y = gateY;
      state.player.vx = 0;
      state.player.vy = 0;

      transition.active = true;
      transition.phase = "align";
      transition.destinationSystemName = destinationSystemName;
      transition.fadeAlpha = 0;
    }

    function normalizeAngle(rad) {
      let out = rad;
      while (out > Math.PI) out -= Math.PI * 2;
      while (out < -Math.PI) out += Math.PI * 2;
      return out;
    }

    function updateTransition(dt) {
      if (!transition.active) return;

      const targetAngle = Math.atan2(state.player.y - starY, state.player.x - starX);
      const maxTurn = state.player.shipStats.turningSpeedRad * dt;

      if (transition.phase === "align") {
        const delta = normalizeAngle(targetAngle - state.player.angle);

        if (Math.abs(delta) <= maxTurn) {
          state.player.angle = targetAngle;
          transition.phase = "accelerate";
        } else {
          state.player.angle += Math.sign(delta) * maxTurn;
        }
        return;
      }

      if (transition.phase === "accelerate") {
        state.player.angle = targetAngle;
        const speed = Math.hypot(state.player.vx, state.player.vy);
        const nextSpeed = Math.min(2000, speed + state.player.shipStats.acceleration * 100 * dt);
        state.player.vx = Math.cos(state.player.angle) * nextSpeed;
        state.player.vy = Math.sin(state.player.angle) * nextSpeed;

        if (nextSpeed >= 2000) {
          transition.phase = "fadeIn";
        }
        return;
      }

      if (transition.phase === "fadeIn") {
        transition.fadeAlpha = Math.min(1, transition.fadeAlpha + dt * 2.5);

        if (transition.fadeAlpha >= 1) {
          discoverSystem(transition.destinationSystemName);
          state.player.systemName = transition.destinationSystemName;
          systemInfo.name = transition.destinationSystemName;
          if (typeof onSystemEntered === "function") {
            onSystemEntered(transition.destinationSystemName);
          }
          state.player.x = systemInfo.size / 2;
          state.player.y = systemInfo.size / 2;
          transition.phase = "fadeOut";
        }
        return;
      }

      if (transition.phase === "fadeOut") {
        const speed = Math.hypot(state.player.vx, state.player.vy);
        const nextSpeed = Math.max(0, speed - state.player.shipStats.acceleration * 100 * dt);
        state.player.vx = Math.cos(state.player.angle) * nextSpeed;
        state.player.vy = Math.sin(state.player.angle) * nextSpeed;
        transition.fadeAlpha = Math.max(0, transition.fadeAlpha - dt * 1.4);

        if (nextSpeed <= 0 && transition.fadeAlpha <= 0) {
          state.player.vx = 0;
          state.player.vy = 0;
          transition.active = false;
          transition.phase = "idle";
          transition.destinationSystemName = null;
          saveState(state);
        }
      }
    }

    function drawGateLineIndicator() {
      if (getLineToTarget()) return;

      const gates = Array.isArray(systemInfo?.hyperspace_gates)
        ? systemInfo.hyperspace_gates
        : [];
      if (!gates.length) return;

      const { width, height } = getCanvasSize();
      const shipX = width / 2;
      const shipY = height / 2;
      const ctx = getCanvasContext();

      for (const gate of gates) {
        if (!gate || gate.type !== "warp") continue;

        const gateX = width / 2 + (Number(gate.position_x ?? gate.x ?? 0) - state.player.x);
        const gateY = height / 2 + (Number(gate.position_y ?? gate.y ?? 0) - state.player.y);

        const dx = gateX - shipX;
        const dy = gateY - shipY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) continue;

        const dirX = dx / dist;
        const dirY = dy / dist;

        const t = Math.min(1, dist / 400);
        const offset = 30;
        const size = 5 + 7 * t;

        const centerX = shipX + dirX * offset;
        const centerY = shipY + dirY * offset;

        const perpX = -dirY;
        const perpY = dirX;

        const tipX = centerX + dirX * size;
        const tipY = centerY + dirY * size;

        const baseLeftX = centerX - dirX * size * 0.65 + perpX * size * 0.22;
        const baseLeftY = centerY - dirY * size * 0.65 + perpY * size * 0.22;

        const baseRightX = centerX - dirX * size * 0.65 - perpX * size * 0.22;
        const baseRightY = centerY - dirY * size * 0.65 - perpY * size * 0.22;

        ctx.save();
        ctx.fillStyle = "#00e5ff";
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseLeftX, baseLeftY);
        ctx.lineTo(baseRightX, baseRightY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    return {
      enterHyperspace,
      updateButtonVisibility,
      updateTransition,
      drawGateLineIndicator,
      isTransitionActive: () => transition.active,
      getFadeAlpha: () => transition.fadeAlpha,
      getSpeedLimit: () => (transition.active ? 2000 : state.player.shipStats.speed),
    };
  }

  window.createHyperSpaceManager = createHyperSpaceManager;
})();
