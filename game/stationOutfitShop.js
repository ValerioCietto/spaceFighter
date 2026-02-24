/**
 * Renders outfit shop cards into #outfit-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl
 * @param {object} opts.state
 * @param {(outfit: any, ship: any) => void} [opts.onBuy]
 * @param {(msg: string) => void} [opts.onToast]
 */
async function renderStationOutfitShop({ rootEl, state, onBuy, onToast, filters }) {
  if (!rootEl) return;

  rootEl.innerHTML = `<p>Loading outfits…</p>`;

  const outfits = await loadNormalizedOutfits();
  if (!outfits.length) {
    rootEl.innerHTML = `<p>No outfits available right now.</p>`;
    return;
  }

  const currentFilters = {
    category: filters?.category || "all",
    species: filters?.species || "all",
  };

  const categories = ["all", ...new Set(outfits.map((o) => o.outfitType))];
  const species = ["all", ...new Set(outfits.map((o) => o.species))];

  const filtered = outfits.filter((o) => {
    if (currentFilters.category !== "all" && o.outfitType !== currentFilters.category) return false;
    if (currentFilters.species !== "all" && o.species !== currentFilters.species) return false;
    return true;
  });

  const money = Number(state?.player?.money ?? 0);
  const ownedOutfits = Array.isArray(state?.player?.ownedOutfits) ? state.player.ownedOutfits : [];

  rootEl.innerHTML = `
    <div class="outfit-shop-toolbar">
      <label>Category
        <select data-filter="category">
          ${categories.map((value) => `<option value="${escapeHtml(value)}" ${value === currentFilters.category ? "selected" : ""}>${escapeHtml(prettyLabel(value))}</option>`).join("")}
        </select>
      </label>
      <label>Species
        <select data-filter="species">
          ${species.map((value) => `<option value="${escapeHtml(value)}" ${value === currentFilters.species ? "selected" : ""}>${escapeHtml(prettyLabel(value))}</option>`).join("")}
        </select>
      </label>
    </div>

    <div class="outfit-shop-grid">
      ${filtered.map((outfit) => {
        const ownedCount = ownedOutfits.filter((o) => String(o?.id) === outfit.id).length;
        const canAfford = money >= outfit.cost;
        const uniqueReached = Number.isFinite(outfit.maxPerShip) && outfit.maxPerShip > 0 && ownedCount >= outfit.maxPerShip;
        const disabled = !canAfford || uniqueReached;

        return `
          <article class="outfit-card">
            <div class="outfit-card-title-row">
              <h4 class="outfit-card-title">${escapeHtml(outfit.name)}</h4>
              <span class="outfit-card-category">${escapeHtml(prettyLabel(outfit.outfitType))}</span>
            </div>
            <div class="outfit-card-meta">
              <div>💰 Cost: ${outfit.cost}§</div>
              <div>🧩 Space: ${outfit.outfitSpace}</div>
              <div>🧬 Species: ${escapeHtml(prettyLabel(outfit.species))}</div>
              ${outfit.effectSummary.length ? `<div>📈 ${escapeHtml(outfit.effectSummary.join(" • "))}</div>` : ""}
            </div>
            <p class="outfit-card-description">${escapeHtml(outfit.description)}</p>
            <button
              class="ship-buy-btn"
              data-buy-outfit="${escapeHtml(outfit.id)}"
              ${disabled ? "disabled" : ""}
            >
              Buy & Equip
            </button>
            ${!canAfford ? `<div class="ship-card-warn">Not enough money</div>` : ""}
            ${uniqueReached ? `<div class="ship-card-warn">Max copies reached for this ship</div>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;

  rootEl.querySelectorAll("select[data-filter]").forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      renderStationOutfitShop({
        rootEl,
        state,
        onBuy,
        onToast,
        filters: {
          category: rootEl.querySelector('[data-filter="category"]')?.value || "all",
          species: rootEl.querySelector('[data-filter="species"]')?.value || "all",
        },
      });
    });
  });

  rootEl.querySelectorAll(".ship-buy-btn[data-buy-outfit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const outfitId = btn.getAttribute("data-buy-outfit");
      if (!outfitId) return;

      const outfit = outfits.find((o) => o.id === outfitId);
      if (!outfit) {
        onToast?.("Could not find selected outfit.");
        return;
      }

      const player = state?.player;
      if (!player) {
        onToast?.("Missing player state.");
        return;
      }

      const ship = getActiveShip(player);
      if (!ship) {
        onToast?.("No active ship available.");
        return;
      }

      const curMoney = Number(player.money ?? 0);
      if (curMoney < outfit.cost) {
        onToast?.("Purchase failed: not enough credits.");
        return;
      }

      const projectedStats = projectOutfitStats(ship.shipStats || {}, outfit.raw);
      const checks = [
        { ok: Number(projectedStats.outfitSpace ?? 0) >= 0, msg: "outfitSpace cannot go below zero" },
        { ok: Number(projectedStats.energyRegen ?? 0) >= 0, msg: "energy regen cannot go below zero" },
        { ok: Number(projectedStats.speed ?? 0) >= 5, msg: "speed cannot go below 5" },
        { ok: Number(projectedStats.energyMax ?? 0) >= 50, msg: "energy max cannot go below 50" },
        { ok: Number(projectedStats.hull ?? 0) >= 50, msg: "hull cannot go below 50" },
      ];
      const failed = checks.find((c) => !c.ok);
      if (failed) {
        onToast?.(`Purchase failed: ${failed.msg}.`);
        return;
      }

      player.money = curMoney - outfit.cost;
      ship.shipStats = projectedStats;

      if (!Array.isArray(ship.outfits)) {
        ship.outfits = [];
      }
      ship.outfits.push({
        id: outfit.id,
        name: outfit.name,
        outfitType: outfit.outfitType,
        status: "equipped",
        description: outfit.description,
      });

      if (!Array.isArray(player.ownedOutfits)) {
        player.ownedOutfits = [];
      }
      player.ownedOutfits.push({
        id: outfit.id,
        name: outfit.name,
        outfitType: outfit.outfitType,
        cost: outfit.cost,
        species: outfit.species,
        tier: outfit.tier,
        equippedOnShipId: ship.id,
      });

      if (typeof saveState === "function") {
        saveState(state);
      }

      onBuy?.(outfit, ship);
      onToast?.(`Purchased ${outfit.name} for ${outfit.cost}§`);

      renderStationOutfitShop({
        rootEl,
        state,
        onBuy,
        onToast,
        filters: {
          category: rootEl.querySelector('[data-filter="category"]')?.value || "all",
          species: rootEl.querySelector('[data-filter="species"]')?.value || "all",
        },
      });
    });
  });
}

function getActiveShip(player) {
  const owned = Array.isArray(player?.ownedSpaceships) ? player.ownedSpaceships : [];
  const activeId = Number(player?.currentSpaceshipId ?? player?.activeShipId ?? 0);
  return owned.find((ship) => Number(ship?.id) === activeId) || owned[0] || null;
}

function projectOutfitStats(baseStats, outfit) {
  const next = { ...(baseStats || {}) };
  const MULT_DELTA_KEYS = new Set([
    "damageMult",
    "firerateMult",
    "hullMult",
    "shieldMult",
    "shieldRegenMult",
    "speedMult",
    "accelerationMult",
    "turningMult",
    "engageRangeMult",
    "projectileLifespanMult",
    "energyCostMult",
    "shopDiscountMult",
    "creditGainMult",
  ]);
  const SKIP = new Set(["id", "name", "outfitType", "type", "cost", "description", "species", "tier", "maxPerShip"]);

  for (const [key, value] of Object.entries(outfit || {})) {
    if (SKIP.has(key) || typeof value !== "number") continue;

    if (MULT_DELTA_KEYS.has(key) || key.endsWith("Mult")) {
      const statKey = key.slice(0, -4);
      const cur = Number(next[statKey] ?? 0);
      next[statKey] = cur * (1 + value);
      continue;
    }

    const cur = Number(next[key] ?? 0);
    next[key] = cur + value;
  }

  return next;
}

async function loadNormalizedOutfits() {
  if (window.__stationOutfitShopCache) return window.__stationOutfitShopCache;

  try {
    const response = await fetch("outfits.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const list = Array.isArray(payload?.outfits) ? payload.outfits : [];

    window.__stationOutfitShopCache = list.map((raw, index) => normalizeOutfit(raw, index));
    return window.__stationOutfitShopCache;
  } catch (err) {
    console.warn("[station-outfit-shop] Failed to load outfits.json", err);
    return [];
  }
}

function normalizeOutfit(raw, index) {
  const safeRaw = raw || {};
  const id = String(safeRaw.id || `outfit_${index}`);
  const name = String(safeRaw.name || prettyLabel(id));
  const outfitType = String(safeRaw.outfitType || safeRaw.type || "misc");
  const cost = Number(safeRaw.cost || 0);
  const outfitSpace = Number(safeRaw.outfitSpace || 0);
  const description = String(safeRaw.description || "No description available.");
  const species = String(safeRaw.species || "all");
  const tier = String(safeRaw.tier || "standard");

  return {
    id,
    name,
    outfitType,
    cost,
    outfitSpace,
    description,
    species,
    tier,
    maxPerShip: Number.isFinite(safeRaw.maxPerShip) ? Number(safeRaw.maxPerShip) : null,
    effectSummary: extractEffectSummary(safeRaw),
    raw: safeRaw,
  };
}

function extractEffectSummary(outfit) {
  const SKIP = new Set(["id", "name", "outfitType", "type", "cost", "description", "species", "tier", "maxPerShip"]);
  const effects = [];

  Object.entries(outfit || {}).forEach(([key, value]) => {
    if (SKIP.has(key) || typeof value !== "number") return;
    const sign = value > 0 ? "+" : "";
    effects.push(`${prettyLabel(key)} ${sign}${value}`);
  });

  return effects.slice(0, 4);
}

function prettyLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (m) => m.toUpperCase());
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
