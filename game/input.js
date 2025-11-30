// Command to launch: `npx serve .` then open http://localhost:3000/game.html in a browser

function setupInput(input, attemptFireWeapon, toggleLock, cycleWeapon, setWeaponIndex, touchButtons) {
  // Keyboard input
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
        input.left = true;
        break;
      case "ArrowRight":
        input.right = true;
        break;
      case "ArrowUp":
        input.thrust = true;
        break;
      case "ArrowDown":
        input.brake = true;
        break;
      case " ":
      case "Spacebar":
        attemptFireWeapon();
        break;
      case "Tab":
        e.preventDefault();
        toggleLock(); // toggle linea verso il target + update UI
        break;
      case "1":
        setWeaponIndex(0);
        break;
      case "2":
        setWeaponIndex(1);
        break;
      case "3":
        setWeaponIndex(2);
        break;
      case "4":
        setWeaponIndex(3);
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
        input.left = false;
        break;
      case "ArrowRight":
        input.right = false;
        break;
      case "ArrowUp":
        input.thrust = false;
        break;
      case "ArrowDown":
        input.brake = false;
        break;
      case "Tab":
        e.preventDefault();
        // niente: il toggle è gestito solo in keydown
        break;
    }
  });

  // Touch input
  function bindTouchButton(btn) {
    const action = btn.getAttribute("data-action");

    const start = (e) => {
      e.preventDefault();
      if (action === "fire") {
        attemptFireWeapon();
        return;
      }
      if (action === "lock") {
        toggleLock();
        return;
      }
      if (action === "weapon-cycle") {
        cycleWeapon();
        return;
      }
      if (action === "left") input.left = true;
      if (action === "right") input.right = true;
      if (action === "thrust") input.thrust = true;
      if (action === "brake") input.brake = true;
    };

    const end = (e) => {
      e.preventDefault();
      if (action === "left") input.left = false;
      if (action === "right") input.right = false;
      if (action === "thrust") input.thrust = false;
      if (action === "brake") input.brake = false;
    };

    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", end, { passive: false });
    btn.addEventListener("touchcancel", end, { passive: false });

    btn.addEventListener("mousedown", start);
    window.addEventListener("mouseup", end);
  }

  touchButtons.forEach(bindTouchButton);
}