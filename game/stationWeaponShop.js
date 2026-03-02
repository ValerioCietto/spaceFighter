/**
 * Renders weapon shop cards into #weapon-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl
 * @param {object} opts.state
 * @param {(weapon: any) => void} [opts.onBuy]
 * @param {(msg: string) => void} [opts.onToast]
 */
async function renderStationWeaponShop({ rootEl, state, onBuy, onToast }) {
  if (!rootEl) return;

  rootEl.innerHTML = `<p>Loading weapons…</p>`;

  const weapons = await loadNormalizedWeapons();
  if (!weapons.length) {
    rootEl.innerHTML = `<p>No weapons available right now.</p>`;
    return;
  }

  const player = state?.player;
  const money = Number(player?.money ?? 0);
  const ownedWeaponCounts = getOwnedWeaponCounts(player);

  rootEl.innerHTML = `
    <div class="outfit-shop-grid">
      ${weapons
        .map((weapon) => {
          const canAfford = money >= weapon.cost;
          const ownedQuantity = ownedWeaponCounts.get(weapon.id) || 0;
          const disabled = !canAfford;

          return `
            <article class="outfit-card">
              <div class="outfit-card-title-row">
                <h4 class="outfit-card-title">${escapeHtml(weapon.name)}</h4>
                <span class="outfit-card-category">${escapeHtml(weapon.aspect)}</span>
              </div>
              <div class="outfit-card-meta">
                <div>💰 Cost: ${weapon.cost}§</div>
                <div>💥 Damage: ${formatStat(weapon.damage)}</div>
                <div>⏱️ Delay: ${formatStat(weapon.delay_ms)} ms</div>
                <div>🎯 Range: ${formatStat(weapon.engage_range)}</div>
                <div>🔋 Energy: ${formatStat(weapon.energy_cost)}</div>
                <div>🧨 Projectiles: ${formatStat(weapon.projectiles)}</div>
                <div>📦 Owned: ${ownedQuantity}</div>
              </div>
              <p class="outfit-card-description">${escapeHtml(weapon.description)}</p>
              <button
                class="ship-buy-btn"
                data-buy-weapon="${escapeHtml(weapon.id)}"
                ${disabled ? "disabled" : ""}
              >
                Buy (+1)
              </button>
              ${!canAfford ? '<div class="ship-card-warn">Not enough money</div>' : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  rootEl.querySelectorAll(".ship-buy-btn[data-buy-weapon]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const weaponId = btn.getAttribute("data-buy-weapon");
      if (!weaponId) return;

      const weapon = weapons.find((entry) => entry.id === weaponId);
      if (!weapon) {
        onToast?.("Could not find selected weapon.");
        return;
      }

      const playerState = state?.player;
      if (!playerState) {
        onToast?.("Missing player state.");
        return;
      }

      const inventory = getOwnedWeaponInventory(playerState);

      const curMoney = Number(playerState.money ?? 0);
      if (curMoney < weapon.cost) {
        onToast?.("Purchase failed: not enough credits.");
        return;
      }

      playerState.money = curMoney - weapon.cost;
      inventory.push({
        id: weapon.id,
        name: weapon.name,
        cost: weapon.cost,
        purchasedAt: Date.now(),
      });

      playerState.ownedWeapons = inventory;

      if (typeof saveState === "function") {
        saveState(state);
      }

      onBuy?.(weapon);
      onToast?.(`Purchased ${weapon.name} for ${weapon.cost}§. Remaining credits: ${playerState.money}§`);

      renderStationWeaponShop({ rootEl, state, onBuy, onToast });
    });
  });
}

/**
 * Renders owned weapons that can be sold.
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl
 * @param {object} opts.state
 * @param {(weapon: any, soldFor: number) => void} [opts.onSell]
 * @param {(msg: string) => void} [opts.onToast]
 */
async function renderSellWeaponShop({ rootEl, state, onSell, onToast }) {
  if (!rootEl) return;

  rootEl.innerHTML = `<p>Loading weapons…</p>`;

  const player = state?.player;
  const inventory = getOwnedWeaponInventory(player);
  if (!inventory.length) {
    rootEl.innerHTML = `<p>No weapons available to sell.</p>`;
    return;
  }

  const weapons = await loadNormalizedWeapons();
  const weaponById = new Map(weapons.map((weapon) => [weapon.id, weapon]));

  rootEl.innerHTML = `
    <div class="outfit-shop-grid">
      ${inventory
        .map((weapon, index) => {
          const weaponId = toWeaponIdentity(weapon);
          const catalogWeapon = weaponById.get(weaponId);
          const name = String(weapon?.name || catalogWeapon?.name || "Unknown weapon");
          const originalCost = Number(weapon?.cost ?? catalogWeapon?.cost ?? 0);
          const sellPrice = Math.floor(originalCost * 0.75);

          return `
            <article class="outfit-card">
              <div class="outfit-card-title-row">
                <h4 class="outfit-card-title">${escapeHtml(name)}</h4>
                <span class="outfit-card-category">${escapeHtml(catalogWeapon?.aspect || "owned")}</span>
              </div>
              <div class="outfit-card-meta">
                <div>💰 Template price: ${originalCost}§</div>
                <div>🏷️ Sell value (75%): ${sellPrice}§</div>
              </div>
              <button class="ship-buy-btn" data-sell-weapon-index="${index}">Sell weapon</button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  rootEl.querySelectorAll(".ship-buy-btn[data-sell-weapon-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const weaponIndex = Number(btn.getAttribute("data-sell-weapon-index"));
      if (!Number.isInteger(weaponIndex)) return;

      const currentInventory = getOwnedWeaponInventory(state?.player);
      const soldWeapon = currentInventory[weaponIndex];
      if (!soldWeapon) return;

      const soldWeaponId = toWeaponIdentity(soldWeapon);
      const catalogWeapon = weaponById.get(soldWeaponId);
      const baseCost = Number(soldWeapon?.cost ?? catalogWeapon?.cost ?? 0);
      const soldFor = Math.floor(baseCost * 0.75);

      currentInventory.splice(weaponIndex, 1);
      state.player.ownedWeapons = currentInventory;
      state.player.money = Number(state?.player?.money ?? 0) + soldFor;

      if (typeof saveState === "function") {
        saveState(state);
      }

      onSell?.(soldWeapon, soldFor);
      onToast?.(`Sold ${soldWeapon?.name || catalogWeapon?.name || "weapon"} for ${soldFor}§`);

      renderSellWeaponShop({ rootEl, state, onSell, onToast });
    });
  });
}

function getOwnedWeaponInventory(player) {
  const ownedWeapons = Array.isArray(player?.ownedWeapons)
    ? player.ownedWeapons
    : (Array.isArray(player?.weaponsOwned) ? player.weaponsOwned : []);

  const inventory = ownedWeapons.slice();

  if (player) {
    player.ownedWeapons = inventory;
  }

  return inventory;
}

function getOwnedWeaponCounts(player) {
  const inventory = getOwnedWeaponInventory(player);
  const counts = new Map();

  inventory.forEach((weapon) => {
    const weaponId = toWeaponIdentity(weapon);
    if (!weaponId) return;
    counts.set(weaponId, (counts.get(weaponId) || 0) + 1);
  });

  return counts;
}

function toWeaponIdentity(weapon) {
  if (weapon?.id) return String(weapon.id);
  return slugify(weapon?.name || "");
}

async function loadNormalizedWeapons() {
  if (window.__stationWeaponShopCache) return window.__stationWeaponShopCache;

  try {
    const response = await fetch("weapons.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const list = Array.isArray(payload?.weapons) ? payload.weapons : [];

    window.__stationWeaponShopCache = list.map((raw, index) => normalizeWeapon(raw, index));
    return window.__stationWeaponShopCache;
  } catch (err) {
    console.warn("[station-weapon-shop] Failed to load weapons.json", err);
    return [];
  }
}

function normalizeWeapon(raw, index) {
  const safeRaw = raw || {};
  const baseName = String(safeRaw.name || `Weapon ${index + 1}`);
  const id = String(safeRaw.id || slugify(baseName) || `weapon_${index}`);

  return {
    id,
    name: baseName,
    cost: clampNumber(safeRaw.cost, 0, Number.MAX_SAFE_INTEGER, 0),
    description: String(safeRaw.description || "No description available."),
    aspect: String(safeRaw.aspect || "unknown"),
    damage: clampNumber(safeRaw.damage, 0, Number.MAX_SAFE_INTEGER, 0),
    delay_ms: clampNumber(safeRaw.delay_ms, 1, Number.MAX_SAFE_INTEGER, 1000),
    projectiles: clampNumber(safeRaw.projectiles, 1, Number.MAX_SAFE_INTEGER, 1),
    engage_range: clampNumber(safeRaw.engage_range, 0, Number.MAX_SAFE_INTEGER, 0),
    energy_cost: clampNumber(safeRaw.energy_cost, 0, Number.MAX_SAFE_INTEGER, 0),
    image: String(safeRaw.image || ""),
    color: String(safeRaw.color || "#FFFFFF"),
    width: clampNumber(safeRaw.width, 1, 64, 1),
    auto_aim: clampNumber(safeRaw.auto_aim, 0, Number.MAX_SAFE_INTEGER, 0),
    autofire_toggle: Boolean(safeRaw.autofire_toggle),
    raw: safeRaw,
  };
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatStat(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(2).replace(/\.00$/, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
