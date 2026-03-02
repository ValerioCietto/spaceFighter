// Command to launch: `npx serve .` then open http://localhost:3000/game.html in a browser

function setupInput(
  input,
  attemptFireWeapon,
  toggleLock,
  cycleWeapon,
  setWeaponIndex,
  touchButtons
) {
  // Keyboard input
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        input.left = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        input.right = true;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        input.thrust = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        input.brake = true;
        break;
      case " ":
      case "Spacebar":
        attemptFireWeapon(true);
        break;
      case "Tab":
        e.preventDefault();
        toggleLock();
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
      case "Shift":
        console.log("outfit_key");
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        input.left = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        input.right = false;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        input.thrust = false;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        input.brake = false;
        break;
      case "Tab":
        e.preventDefault();
        break;
      case "M":
        toggleMap();
        break;
    }
  });

  function toggleMap(){
    console.log("show map");
  }

  // Touch input
  function bindTouchButton(btn) {
    const action = btn.getAttribute("data-action");

    const start = (e) => {
      e.preventDefault();
      if (action === "fire") {
        attemptFireWeapon(true);
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
