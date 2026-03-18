

/**
 * Renders ship shop cards into #ship-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl - container element (e.g. document.getElementById("ship-shop-list"))
 * @param {object} opts.state - your game state (expects state.player.money and state.player.shipType or similar)
 * @param {(shipKey: string, stats: any) => void} opts.onBuy - called when purchase succeeds
 * @param {(msg: string) => void} [opts.onToast] - optional UI feedback
 */
function renderStationShipShop({ rootEl, state, onBuy, onToast, shopType = "human" }) {
  if (!rootEl) return;
  let forSaleKeys = {};
  if(shopType === "human"){
      forSaleKeys = Object.keys(SHIPS).filter((k) => k.startsWith("human_"));
  }else if(shopType === "jared"){
      forSaleKeys = Object.keys(SHIPS).filter((k) => k.startsWith("jared_"));
  }else if (shopType === "technician"){
      forSaleKeys = Object.keys(SHIPS).filter((k) => k.startsWith("technician_"));
  }else{
    // all
    forSaleKeys = Object.keys(SHIPS)
  }

  const money = Number(state?.player?.money ?? 0);
  const baseUrl =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "/assets/"
      : "/spaceFighter/assets/";

  rootEl.innerHTML = `
    <div class="ship-shop-grid">
      ${forSaleKeys
        .map((shipKey) => {
          const s = getStats(shipKey);
          const cost = Number(s.cost || 0);
          const canAfford = money >= cost;
          // weaponGunCoords types gun, turret, drone, spinal
          const numberOfGunPorts = Array.isArray(s.weaponGunCoords)
            ? s.weaponGunCoords.filter((c) => c.type === "gun").length
            : 0;
          const numberOfTurretPorts = Array.isArray(s.weaponGunCoords)
            ? s.weaponGunCoords.filter((c) => c.type === "turret").length
            : 0;
          const numberOfDronePorts = Array.isArray(s.weaponGunCoords)
            ? s.weaponGunCoords.filter((c) => c.type === "drone").length
            : 0;
          const numberOfSpinalPorts = Array.isArray(s.weaponGunCoords)
            ? s.weaponGunCoords.filter((c) => c.type === "spinal").length
            : 0;

          // Weapons capacity report.
          const weaponCapacityReport = `
            ${numberOfGunPorts > 0 ? `Gun ports: ${numberOfGunPorts}` : ""}
            ${numberOfTurretPorts > 0 ? `Turret ports: ${numberOfTurretPorts}` : ""}
            ${numberOfDronePorts > 0 ? `Drone ports: ${numberOfDronePorts}` : ""}
            ${numberOfSpinalPorts > 0 ? `Spinal ports: ${numberOfSpinalPorts}` : ""}
          `.trim();
          return `
            <div class="ship-card">
              <div class="ship-card-row">
                <div class="ship-card-thumb">
                  <img src="${baseUrl}${s.image}" alt="${prettyName(shipKey)}">
                </div>
                <div class="ship-card-info">
                  <div class="ship-card-title">${prettyName(shipKey)} - ${cost}§</div>
                  <div class="ship-card-meta">
                    <div>🛡️ Hull: ${s.hull}, Shield: ${s.shield} + ${s.shieldRegen}/s</div>
                    <div>🚀 Speed: ${s.speed} + ${s.acceleration}/s</div>
                    <div>🔧 CPU: ${s.CPU}, Outfit Space: ${s.outfitSpace}</div>
                    <div>⚡ Energy: ${s.energyMax} + ${s.energyRegen}/s</div>
                    <div>💥 DamagePower x${(s.damageMult ?? 1).toFixed(2)}, FireRate x${(s.firerateMult ?? 1).toFixed(2)}</div>
                    ${weaponCapacityReport ? `<div>${weaponCapacityReport}</div>` : ""}
                  </div>
                </div>
              </div>

              <button
                class="ship-buy-btn"
                data-buy="${shipKey}"
                ${canAfford ? "" : "disabled"}
                aria-disabled="${canAfford ? "false" : "true"}"
              >
                Buy 
              </button>

              ${canAfford ? "" : `<div class="ship-card-warn">Not enough money</div>`}
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  rootEl.querySelectorAll(".ship-buy-btn[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const shipKey = btn.getAttribute("data-buy");
      if (!shipKey) return;

      const stats = getStats(shipKey);
      const cost = Number(stats.cost || 0);
      const curMoney = Number(state?.player?.money ?? 0);

      if (curMoney < cost) {
        onToast?.("Not enough money.");
        return;
      }

      state.player.money = curMoney - cost;
      state.player.shipType = shipKey;
      state.player.shipStats = stats;

      onBuy?.(shipKey, stats);
      onToast?.(`Purchased ${prettyName(shipKey)} for ${cost}§`);

      renderStationShipShop({ rootEl, state, onBuy, onToast });
    });
  });
}

/**
 * Renders owned ships that can be sold into #ship-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl
 * @param {object} opts.state
 * @param {(soldShip: any, soldFor: number) => void} [opts.onSell]
 * @param {(msg: string) => void} [opts.onToast]
 */
function renderSellShipShop({ rootEl, state, onSell, onToast }) {
  if (!rootEl) return;

  const ownedShips = Array.isArray(state?.player?.ownedSpaceships)
    ? state.player.ownedSpaceships
    : [];
  const activeId = Number(state?.player?.currentSpaceshipId ?? state?.player?.activeShipId ?? 0);
  const sellableShips = ownedShips.filter((ship) => Number(ship?.id) !== activeId);

  if (!sellableShips.length) {
    rootEl.innerHTML = `<p>No ships available to sell.</p>`;
    return;
  }

  const baseUrl =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "/assets/"
      : "/spaceFighter/assets/";

  rootEl.innerHTML = `
    <div class="ship-shop-grid">
      ${sellableShips
        .map((ship) => {
          const templateName = String(ship?.templateName || ship?.name || "");
          const stats = getStats(templateName);
          const newPrice = Number(stats.cost || 0);
          const sellPrice = Math.floor(newPrice * 0.75);

          return `
            <div class="ship-card">
              <div class="ship-card-row">
                <div class="ship-card-thumb">
                  <img src="${baseUrl}${stats.image}" alt="${prettyName(templateName)}">
                </div>
                <div class="ship-card-info">
                  <div class="ship-card-title">${prettyName(templateName)} - ${sellPrice}§</div>
                  <div class="ship-card-meta">
                    <div>Template price: ${newPrice}§</div>
                    <div>Sell value (75%): ${sellPrice}§</div>
                  </div>
                </div>
              </div>
              <button class="ship-buy-btn" data-sell-id="${ship.id}">Sell ship</button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  rootEl.querySelectorAll(".ship-buy-btn[data-sell-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const shipId = Number(btn.getAttribute("data-sell-id"));
      if (!Number.isFinite(shipId)) return;

      const list = Array.isArray(state?.player?.ownedSpaceships)
        ? state.player.ownedSpaceships
        : [];
      const idx = list.findIndex((ship) => Number(ship?.id) === shipId);
      if (idx < 0) return;

      const ship = list[idx];
      const shipStats = getStats(ship?.templateName || ship?.name || "");
      const soldFor = Math.floor(Number(shipStats.cost || 0) * 0.75);

      if (typeof addMoneyWithCreditGainBonus === "function") {
        addMoneyWithCreditGainBonus(state, soldFor);
      } else {
        state.player.money = Number(state?.player?.money ?? 0) + soldFor;
      }
      list.splice(idx, 1);

      if (typeof saveState === "function") {
        saveState(state);
      }

      onSell?.(ship, soldFor);
      onToast?.(`Sold ${prettyName(ship?.templateName || ship?.name || "ship")} for ${soldFor}§`);

      renderSellShipShop({ rootEl, state, onSell, onToast });
    });
  });
}

function onBoughtSpaceship({ state, shipStats, templateName }) {
  if (!state?.player) return null;

  if (!Array.isArray(state.player.ownedSpaceships)) {
    state.player.ownedSpaceships = [];
  }

  const nextId =
    state.player.ownedSpaceships.length > 0
      ? Math.max(...state.player.ownedSpaceships.map(s => s.id || 0)) + 1
      : 0;

  const ports = Array.isArray(shipStats?.weaponGunCoords)
    ? shipStats.weaponGunCoords.map((coord) => ({
        ...coord,
        weaponEquipped: "pea_shooter",
      }))
    : [];

  const newShip = {
    id: nextId,
    name: templateName,
    templateName,
    shipStats: {
      ...shipStats,
      weaponGunCoords: ports,
    },
    outfits: [],
    weapons: {
      gunPorts: [],
      turretPorts: [],
      dronePorts: [],
    },
    abilities: {},
  };
  newShip.shipStats.hullMax = shipStats.hull;
  newShip.shipStats.shieldMax = shipStats.shield;
  newShip.shipStats.energyMax = shipStats.energyMax;

  state.player.ownedSpaceships.push(newShip);
  
  return newShip;
}

function prettyName(shipKey) {
  return shipKey
    .replace(/^human_/, "")
    .replace(/^jared_/, "")
    .replace(/^technician_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
