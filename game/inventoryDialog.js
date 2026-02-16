function renderInventory(state) {
  const p = state?.player;
  if (!p) return;

  const bodyEl = document.querySelector(".inventory-body");
  const creditsEl = document.getElementById("stat-credits");
  const hullEl = document.getElementById("stat-hull");
  const shieldEl = document.getElementById("stat-shield");
  const cargoEl = document.getElementById("stat-cargo");
  if (!bodyEl || !creditsEl) return;

  // ---- TOP STATS (always visible) ----
  creditsEl.textContent = Math.floor(Number(p.money ?? 0));

  const hullMax = Number(p.maxHull ?? p.shipStats?.hull ?? 0);
  const hullNow = Number(p.hull ?? hullMax ?? 0);
  const shieldMax = Number(p.maxShield ?? p.shipStats?.shield ?? 0);
  const shieldNow = Number(p.shield ?? shieldMax ?? 0);

  if (hullEl) hullEl.textContent = hullMax ? `${Math.round((hullNow / hullMax) * 100)}%` : "0%";
  if (shieldEl) shieldEl.textContent = shieldMax ? `${Math.round((shieldNow / shieldMax) * 100)}%` : "0%";
  if (cargoEl) cargoEl.textContent = `${p.cargo ?? 0} / ${p.cargoMax ?? 0}`;

  // ---- DATA ----
  const owned = Array.isArray(p.ownedSpaceships) ? p.ownedSpaceships : [];
  const activeId = p.activeShipId ?? p.currentSpaceship ?? null;
  const activeShip = owned.find((s) => s.id === activeId) || owned[0] || null;

  // ---- PANELS ----
  const currentPanel = bodyEl.querySelector('[data-panel="current"]');
  const ownedPanel = bodyEl.querySelector('[data-panel="owned"]');

  // If your HTML didn't include panels yet, fallback to old behavior (optional)
  if (!currentPanel || !ownedPanel) {
    // minimal fallback: render owned list like before
    const old = bodyEl.querySelector("#owned-ships-section");
    if (old) old.remove();

    const shipsHtml = owned
      .map((s) => {
        const isActive = activeId === s.id;
        return `
          <div class="inventory-ship">
            <strong>${escapeHtml(s.name)}</strong> ${isActive ? `<span class="tag-active">ACTIVE</span>` : ""}
            <div>Template: ${escapeHtml(s.templateName)}</div>
            <div>Outfits: ${s.outfits?.length || 0}</div>
            <button class="btn-set-active" data-set-active="${s.id}" ${isActive ? "disabled" : ""}>
              Set active
            </button>
          </div>
        `;
      })
      .join("");

    bodyEl.insertAdjacentHTML(
      "beforeend",
      `
      <div id="owned-ships-section">
        <hr>
        <h3>Owned Ships</h3>
        <div class="inventory-ships">
          ${shipsHtml || "<div>No ships owned</div>"}
        </div>
      </div>
      `
    );

    bodyEl.querySelectorAll("[data-set-active]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-set-active"));
        setActiveShip(state, id);
        renderInventory(state);
      });
    });

    return;
  }

  // ---- RENDER CURRENT TAB ----
  if (!activeShip) {
    currentPanel.innerHTML = `<div>No active ship</div>`;
  } else {
    const stats = activeShip.shipStats || p.shipStats || {};
    const outfits = Array.isArray(activeShip.outfits) ? activeShip.outfits : [];

    currentPanel.innerHTML = `
      <h3 style="margin:6px 0;">${escapeHtml(activeShip.name)}</h3>
      <div style="opacity:.85;">Template: ${escapeHtml(activeShip.templateName)}</div>
      <hr>

      <div><strong>Hull:</strong> ${Number(stats.hull ?? 0)}</div>
      <div><strong>Shield:</strong> ${Number(stats.shield ?? 0)} <span style="opacity:.8">(regen ${Number(stats.shieldRegen ?? 0)}/s)</span></div>
      <div><strong>Speed:</strong> ${Number(stats.speed ?? 0)}</div>
      <div><strong>Acceleration:</strong> ${Number(stats.acceleration ?? 0)}</div>
      <div><strong>Damage mult:</strong> ${Number(stats.damageMult ?? 1)}</div>
      <div><strong>Fire rate mult:</strong> ${Number(stats.firerateMult ?? 1)}</div>

      <hr>
      <h4 style="margin:10px 0 6px;">Equipped outfits</h4>
      ${
        outfits.length
          ? `<ul style="margin:0; padding-left:18px;">
              ${outfits.map(o => `<li>${escapeHtml(o.name ?? "Outfit")}</li>`).join("")}
            </ul>`
          : `<div style="opacity:.7;">No outfits equipped</div>`
      }
    `;
  }

  // ---- RENDER OWNED TAB ----
  ownedPanel.innerHTML = `
    <h3 style="margin:6px 0;">Owned Ships</h3>
    <div class="inventory-ships">
      ${
        owned.length
          ? owned
              .map((s) => {
                const isActive = activeId === s.id;
                return `
                  <div class="inventory-ship">
                    <strong>${escapeHtml(s.name)}</strong>
                    ${isActive ? `<span class="tag-active">ACTIVE</span>` : ""}
                    <div>Template: ${escapeHtml(s.templateName)}</div>
                    <div>Outfits: ${s.outfits?.length || 0}</div>
                    <button class="btn-set-active" data-set-active="${s.id}" ${isActive ? "disabled" : ""}>
                      Set active
                    </button>
                  </div>
                `;
              })
              .join("")
          : `<div>No ships owned</div>`
      }
    </div>
  `;

  // ---- BIND TAB SWITCH + ACTIONS (event delegation, once) ----
  bindInventoryTabsOnce(state);
  bindOwnedShipsActionsOnce(state);

  // ensure a panel is visible + has content on open
  ensureInventoryActivePanelHasContent(state);
}

function ensureInventoryActivePanelHasContent(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl) return;

  const activeTabBtn = bodyEl.querySelector(".inv-tab.is-active");
  const tab = activeTabBtn?.getAttribute("data-tab") || "current";

  bodyEl.querySelectorAll(".inv-panel").forEach((p) => {
    p.classList.toggle("is-active", p.getAttribute("data-panel") === tab);
  });
}

function bindOwnedShipsActionsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invOwnedBound) return;
  bodyEl.__invOwnedBound = true;

  bodyEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-set-active]");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-set-active"));
    if (!Number.isFinite(id)) return;

    setActiveShip(state, id);
    renderInventory(state);
  });
}



function bindInventoryTabsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invTabsBound) return;
  bodyEl.__invTabsBound = true;

  bodyEl.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (!tabBtn) return;

    const tab = tabBtn.getAttribute("data-tab");

    // toggle tab buttons
    bodyEl.querySelectorAll(".inv-tab").forEach((b) => {
      const active = b === tabBtn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });

    // toggle panels
    bodyEl.querySelectorAll(".inv-panel").forEach((p) => {
      const isActive = p.getAttribute("data-panel") === tab;
      p.classList.toggle("is-active", isActive);

      if (isActive) {
        renderInventoryTabContent(state, tab, p);
      }
    });
  });
}


function renderInventoryTabContent(state, tab, panelEl) {
  const p = state.player;
  const owned = Array.isArray(p.ownedSpaceships) ? p.ownedSpaceships : [];
  const activeId = p.activeShipId ?? p.currentSpaceship ?? 0;
  const activeShip = owned.find(s => s.id === activeId);
  const baseUrl =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "/assets/"
      : "/spaceFighter/assets/";

  if (tab === "current") {
    if (!activeShip) {
      panelEl.innerHTML = "<div>No active ship</div>";
      return;
    }

    panelEl.innerHTML = `
      <h3>${activeShip.name}</h3>
      <div>Template: ${activeShip.templateName}</div>
      <hr>
      <div><strong>Hull:</strong> ${p.shipStats?.hull ?? 0}</div>
      <div><strong>Shield:</strong> ${p.shipStats?.shield ?? 0}</div>
      <div><strong>Speed:</strong> ${p.shipStats?.speed ?? 0}</div>
      <div><strong>Acceleration:</strong> ${p.shipStats?.acceleration ?? 0}</div>
      <div><strong>Damage mult:</strong> ${p.shipStats?.damageMult ?? 1}</div>
      <div><strong>Fire rate mult:</strong> ${p.shipStats?.firerateMult ?? 1}</div>
      <hr>
      <h4>Equipped outfits</h4>
      ${
        activeShip.outfits?.length
          ? `<ul>${activeShip.outfits
              .map(o => `<li>${o.name}</li>`)
              .join("")}</ul>`
          : `<div style="opacity:.7">No outfits equipped</div>`
      }
    `;
  }

  if (tab === "owned") {
    if (!owned.length) {
      panelEl.innerHTML = "<div>No ships owned</div>";
      return;
    }

    panelEl.innerHTML = `
      <div class="inv-owned-grid">
        ${owned
          .map((s) => {
            const isActive = s.id === activeId;
            console.log(s.shipStats);
            return `
              <div class="ship-card">
                <img 
                style="max-width:${Number(s.shipStats.shieldDiameterPx || 96)}px; height:auto;"
                src="${baseUrl}${s.shipStats.image || ""}" alt="${escapeHtml(s.shipStats.image)}">

                <div class="ship-name">
                  ${escapeHtml(s.name)}
                  ${isActive ? `<span class="tag-active">ACTIVE</span>` : ""}
                </div>

                <div class="ship-stats">
                  Template: ${escapeHtml(s.templateName)}<br>
                  Outfits: ${s.outfits?.length || 0}
                </div>

                <div class="ship-footer">
                  <button data-set-active="${s.id}" ${isActive ? "disabled" : ""}>
                    Set Active
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}


