


function renderInventory(state) {
  const p = state.player;

  const creditsEl = document.getElementById("stat-credits");
  const hullEl = document.getElementById("stat-hull");
  const shieldEl = document.getElementById("stat-shield");
  const cargoEl = document.getElementById("stat-cargo");
  const bodyEl = document.querySelector(".inventory-body");
  if (!creditsEl || !bodyEl) return;

  // stats
  creditsEl.textContent = Math.floor(Number(p.money ?? 0));

  const hullMax = Number(p.maxHull ?? p.shipStats?.hull ?? 0);
  const hullNow = Number(p.hull ?? hullMax ?? 0);
  const shieldMax = Number(p.maxShield ?? p.shipStats?.shield ?? 0);
  const shieldNow = Number(p.shield ?? shieldMax ?? 0);

  hullEl.textContent = hullMax ? `${Math.round((hullNow / hullMax) * 100)}%` : "0%";
  shieldEl.textContent = shieldMax
    ? `${Math.round((shieldNow / shieldMax) * 100)}%`
    : "0%";

  cargoEl.textContent = `${p.cargo ?? 0} / ${p.cargoMax ?? 0}`;

  // ---- OWNED SHIPS SECTION (replace, don't append) ----
  const old = bodyEl.querySelector("#owned-ships-section");
  if (old) old.remove();

  const owned = Array.isArray(p.ownedSpaceships) ? p.ownedSpaceships : [];
  const activeId = p.activeShipId ?? null;

  const shipsHtml = owned
    .map((s) => {
      const isActive = activeId === s.id;
      return `
        <div class="inventory-ship">
          <strong>${s.name}</strong> ${isActive ? `<span class="tag-active">ACTIVE</span>` : ""}
          <div>Template: ${s.templateName}</div>
          <div>Outfits: ${s.outfits?.length || 0}</div>
          <button class="btn-set-active" data-set-active="${s.id}" ${
            isActive ? "disabled" : ""
          }>
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

  // events
  bodyEl.querySelectorAll("[data-set-active]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-set-active"));
      setActiveShip(state, id);

      // refresh UI
      renderInventory(state);
    });
  });
}

function setActiveShip(state, shipId) {
  const p = state?.player;
  if (!p || !Array.isArray(p.ownedSpaceships)) return;

  const inst = p.ownedSpaceships.find((s) => s.id === shipId);
  if (!inst) return;

  p.activeShipId = shipId;

  // optional: actually switch the currently flown ship
  p.shipType = inst.templateName;

  // base template stats + instance overrides
  const base = getStats(inst.templateName); // your ShipStatsProvider template
  p.shipStats = { ...base, ...(inst.shipStats || {}) };
  p.shipName = inst.templateName;
  // keep hull/shield sane when switching
  p.maxHull = Number(p.shipStats.hull ?? p.maxHull ?? 0);
  p.hull = Math.min(Number(p.hull ?? p.maxHull), p.maxHull);

  p.maxShield = Number(p.shipStats.shield ?? p.maxShield ?? 0);
  p.shield = Math.min(Number(p.shield ?? p.maxShield), p.maxShield);

}