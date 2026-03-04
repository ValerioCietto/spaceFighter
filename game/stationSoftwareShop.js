/**
 * Renders software shop cards into #software-shop-list
 * @param {object} opts
 * @param {HTMLElement} opts.rootEl
 * @param {object} opts.state
 * @param {(software: any) => void} [opts.onBuy]
 * @param {(msg: string) => void} [opts.onToast]
 */
async function renderStationSoftwareShop({ rootEl, state, onBuy, onToast, filters }) {
  if (!rootEl) return;

  rootEl.innerHTML = `<p>Loading software…</p>`;

  const catalog = await loadNormalizedSoftwareCatalog();
  if (!catalog.length) {
    rootEl.innerHTML = `<p>No software available right now.</p>`;
    return;
  }

  const player = state?.player;
  const money = Number(player?.money ?? 0);
  const owned = getOwnedSoftwareInventory(player);

  const currentFilters = {
    category: filters?.category || "all",
    legal: filters?.legal || "all",
  };

  const categories = ["all", ...new Set(catalog.map((item) => item.category))];

  const filtered = catalog.filter((item) => {
    if (currentFilters.category !== "all" && item.category !== currentFilters.category) return false;
    if (currentFilters.legal === "legal" && !item.legal) return false;
    if (currentFilters.legal === "illegal" && item.legal) return false;
    return true;
  });

  rootEl.innerHTML = `
    <div class="outfit-shop-toolbar">
      <label>Category
        <select data-filter="category">
          ${categories
            .map((value) => `<option value="${escapeHtmlSoftware(value)}" ${value === currentFilters.category ? "selected" : ""}>${escapeHtmlSoftware(prettyLabelSoftware(value))}</option>`)
            .join("")}
        </select>
      </label>
      <label>Legality
        <select data-filter="legal">
          <option value="all" ${currentFilters.legal === "all" ? "selected" : ""}>All</option>
          <option value="legal" ${currentFilters.legal === "legal" ? "selected" : ""}>Legal</option>
          <option value="illegal" ${currentFilters.legal === "illegal" ? "selected" : ""}>Illegal</option>
        </select>
      </label>
    </div>

    <div class="outfit-shop-grid">
      ${filtered
        .map((software) => {
          const alreadyOwned = owned.some((entry) => String(entry?.id) === software.id);
          const canAfford = money >= software.price;
          const disabled = alreadyOwned || !canAfford;

          return `
            <article class="outfit-card">
              <div class="outfit-card-title-row">
                <h4 class="outfit-card-title">${escapeHtmlSoftware(software.name)}</h4>
                <span class="outfit-card-category">${escapeHtmlSoftware(prettyLabelSoftware(software.category))}</span>
              </div>
              <div class="outfit-card-meta">
                <div>💰 Price: ${software.price}§</div>
                <div>🧠 CPU: ${software.cpu}</div>
                <div>${software.legal ? "✅ Legal" : "⚠️ Illegal"}</div>
                ${software.effectSummary.length ? `<div>📈 ${escapeHtmlSoftware(software.effectSummary.join(" • "))}</div>` : ""}
              </div>
              <p class="outfit-card-description">${escapeHtmlSoftware(software.flavor)}</p>
              <button class="ship-buy-btn" data-buy-software="${escapeHtmlSoftware(software.id)}" ${disabled ? "disabled" : ""}>
                ${alreadyOwned ? "Owned" : "Buy License"}
              </button>
              ${!canAfford ? '<div class="ship-card-warn">Not enough money</div>' : ""}
              ${alreadyOwned ? '<div class="ship-card-warn">Software can only be bought once</div>' : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  rootEl.querySelectorAll("select[data-filter]").forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      renderStationSoftwareShop({
        rootEl,
        state,
        onBuy,
        onToast,
        filters: {
          category: rootEl.querySelector('[data-filter="category"]')?.value || "all",
          legal: rootEl.querySelector('[data-filter="legal"]')?.value || "all",
        },
      });
    });
  });

  rootEl.querySelectorAll(".ship-buy-btn[data-buy-software]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const softwareId = btn.getAttribute("data-buy-software");
      if (!softwareId) return;

      const software = catalog.find((item) => item.id === softwareId);
      if (!software) {
        onToast?.("Could not find selected software.");
        return;
      }

      const playerState = state?.player;
      if (!playerState) {
        onToast?.("Missing player state.");
        return;
      }

      const inventory = getOwnedSoftwareInventory(playerState);
      const alreadyOwned = inventory.some((entry) => String(entry?.id) === software.id);
      if (alreadyOwned) {
        onToast?.(`Purchase failed: ${software.name} is already owned.`);
        return;
      }

      const curMoney = Number(playerState.money ?? 0);
      if (curMoney < software.price) {
        onToast?.("Purchase failed: not enough credits.");
        return;
      }

      playerState.money = curMoney - software.price;
      inventory.push({
        id: software.id,
        name: software.name,
        cpu: software.cpu,
        price: software.price,
        category: software.category,
        legal: software.legal,
        effects: software.effects,
        purchasedAt: Date.now(),
      });
      playerState.ownedSoftware = inventory;

      if (typeof saveState === "function") {
        saveState(state);
      }

      onBuy?.(software);
      onToast?.(`Purchased software ${software.name} for ${software.price}§`);

      renderStationSoftwareShop({
        rootEl,
        state,
        onBuy,
        onToast,
        filters: {
          category: rootEl.querySelector('[data-filter="category"]')?.value || "all",
          legal: rootEl.querySelector('[data-filter="legal"]')?.value || "all",
        },
      });
    });
  });
}

function getOwnedSoftwareInventory(player) {
  const inventory = Array.isArray(player?.ownedSoftware) ? player.ownedSoftware.slice() : [];
  if (player) {
    player.ownedSoftware = inventory;
  }
  return inventory;
}

async function loadNormalizedSoftwareCatalog() {
  if (window.__stationSoftwareShopCache) return window.__stationSoftwareShopCache;

  try {
    const response = await fetch("software_outfits.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const list = Array.isArray(payload?.items) ? payload.items : [];

    window.__stationSoftwareShopCache = list.map((raw, index) => normalizeSoftware(raw, index));
    return window.__stationSoftwareShopCache;
  } catch (err) {
    console.warn("[station-software-shop] Failed to load software_outfits.json", err);
    return [];
  }
}

function normalizeSoftware(raw, index) {
  const safeRaw = raw || {};
  const id = String(safeRaw.id || `software_${index}`);
  const name = String(safeRaw.name || prettyLabelSoftware(id));

  return {
    id,
    name,
    cpu: clampShopNumber(safeRaw.cpu, 0, Number.MAX_SAFE_INTEGER, 0),
    price: clampShopNumber(safeRaw.price, 0, Number.MAX_SAFE_INTEGER, 0),
    legal: safeRaw.legal !== false,
    category: String(safeRaw.category || "utility"),
    flavor: String(safeRaw.flavor || "No description available."),
    effects: safeRaw.effects || {},
    effectSummary: extractSoftwareEffectsSummary(safeRaw.effects || {}),
  };
}

function extractSoftwareEffectsSummary(effects) {
  return Object.entries(effects || {})
    .filter(([, value]) => typeof value === "number" || typeof value === "boolean")
    .slice(0, 4)
    .map(([key, value]) => `${prettyLabelSoftware(key)}: ${value}`);
}

function clampShopNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function prettyLabelSoftware(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (m) => m.toUpperCase());
}

function escapeHtmlSoftware(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
