

/**
 * Renders ship shop cards into #ship-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl - container element (e.g. document.getElementById("ship-shop-list"))
 * @param {object} opts.state - your game state (expects state.player.money and state.player.shipType or similar)
 * @param {(shipKey: string, stats: any) => void} opts.onBuy - called when purchase succeeds
 * @param {(msg: string) => void} [opts.onToast] - optional UI feedback
 */
function renderStationShipShop({ rootEl, state, onBuy, onToast }) {
  if (!rootEl) return;

  const forSaleKeys = Object.keys(SHIPS).filter((k) => k.startsWith("human_"));

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

          return `
            <div class="ship-card">
              <div class="ship-card-row">
                <div class="ship-card-thumb">
                  <img src="${baseUrl}${s.image}" alt="${prettyName(shipKey)}">
                </div>

                <div class="ship-card-info">
                  <div class="ship-card-title">${prettyName(shipKey)}</div>
                  <div class="ship-card-meta">
                    <div>Cost: ${cost}§</div>
                    <div>Shield: ${s.shield}</div>
                    <div>Hull: ${s.hull}</div>
                    <div>Speed: ${s.speed}</div>
                    <div>Accel: ${s.acceleration}</div>
                    <div>CPU: ${s.CPU}</div>
                    <div>DamagePower x${(s.damageMult ?? 1).toFixed(2)}</div>
                    <div>FireRate x${(s.firerateMult ?? 1).toFixed(2)}</div>
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

function renderStationWeaponShop({ rootEl, state, onBuy, onToast }) {
  if (!rootEl) return;

  const forSaleWeapons = (Array.isArray(weapons) ? [...weapons] : []).sort((a, b) => Number(a?.cost || 0) - Number(b?.cost || 0));
  const money = Number(state?.player?.money ?? 0);

  if (!Array.isArray(state?.player?.ownedWeapons)) {
    state.player.ownedWeapons = [];
  }

  const getOwnedCount = (weaponName) =>
    state.player.ownedWeapons.filter((w) => w?.name === weaponName).length;

  rootEl.innerHTML = `
    <div class="ship-shop-grid">
      ${forSaleWeapons
        .map((w) => {
          const cost = Number(w.cost || 0);
          const canAfford = money >= cost;
          const ownedCount = getOwnedCount(w.name);

          return `
            <div class="ship-card">
              <div class="ship-card-row">
                <div class="ship-card-info">
                  <div class="ship-card-title">${w.name}</div>
                  <div class="ship-card-meta">
                    <div>Cost: ${cost}§</div>
                    <div>Damage: ${w.damage ?? "-"}</div>
                    <div>Projectiles: ${w.projectiles ?? "-"}</div>
                    <div>Delay: ${w.delay_ms ?? "-"} ms</div>
                    <div>Energy: ${w.energy_cost ?? "-"}</div>
                    <div>Owned: ${ownedCount}</div>
                  </div>
                </div>
              </div>

              <button
                class="ship-buy-btn"
                data-buy-weapon="${w.name}"
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

  rootEl.querySelectorAll(".ship-buy-btn[data-buy-weapon]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const weaponName = btn.getAttribute("data-buy-weapon");
      if (!weaponName) return;

      const weapon = forSaleWeapons.find((w) => w.name === weaponName);
      if (!weapon) return;

      const cost = Number(weapon.cost || 0);
      const curMoney = Number(state?.player?.money ?? 0);

      if (curMoney < cost) {
        onToast?.("Not enough money.");
        return;
      }

      state.player.money = curMoney - cost;
      state.player.ownedWeapons.push({ ...weapon });

      onBuy?.(weapon);
      onToast?.(`Purchased ${weapon.name} for ${cost}§`);

      renderStationWeaponShop({ rootEl, state, onBuy, onToast });
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

  const newShip = {
    id: nextId,
    name: templateName,
    templateName,

    // instance-level stat overrides (start empty)
    shipStats: shipStats,

    outfits: [],

    weapons: {
      gunPorts: [],
      turretPorts: [],
      dronePorts: [],
    },

    abilities: {},
  };

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
