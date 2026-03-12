const INVENTORY_TABS = ["current", "owned", "weapons", "missions"];
const INVENTORY_DEFAULT_TAB = "current";

const inventoryDialogState = {
  activeTab: INVENTORY_DEFAULT_TAB,
};

function isValidInventoryTab(tabId) {
  return INVENTORY_TABS.includes(String(tabId || ""));
}

function getInventoryActiveTab() {
  return isValidInventoryTab(inventoryDialogState.activeTab)
    ? inventoryDialogState.activeTab
    : INVENTORY_DEFAULT_TAB;
}

function setInventoryActiveTab(tabId) {
  inventoryDialogState.activeTab = isValidInventoryTab(tabId)
    ? String(tabId)
    : INVENTORY_DEFAULT_TAB;
  return inventoryDialogState.activeTab;
}

function renderInventoryTabsState(bodyEl, state) {
  if (!bodyEl) return;
  const activeTab = getInventoryActiveTab();

  bodyEl.querySelectorAll(".inv-tab").forEach((btn) => {
    const isActive = btn.getAttribute("data-tab") === activeTab;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  bodyEl.querySelectorAll(".inv-panel").forEach((panel) => {
    const isActive = panel.getAttribute("data-panel") === activeTab;
    panel.classList.toggle("is-active", isActive);
    if (isActive) {
      renderInventoryTabContent(state, activeTab, panel);
    }
  });
}

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
  const activeId = state.player.currentSpaceshipId ?? state.player.activeShipId ?? 0;
  const activeShip = state.player.ownedSpaceships.find(s => s.id === activeId) || null;

  // ---- PANELS ----
  const currentPanel = bodyEl.querySelector('[data-panel="current"]');
  const ownedPanel = bodyEl.querySelector('[data-panel="owned"]');
  const weaponsPanel = bodyEl.querySelector('[data-panel="weapons"]');
  const missionsPanel = bodyEl.querySelector('[data-panel="missions"]');

  // If your HTML didn't include panels yet, fallback to old behavior (optional)
  if (!currentPanel || !ownedPanel || !weaponsPanel || !missionsPanel) {
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

  const nextTab = getInventoryActiveTab();
  setInventoryActiveTab(nextTab);

  // ---- BIND TAB SWITCH + ACTIONS (event delegation, once) ----
  bindInventoryTabsOnce(state);
  bindOwnedShipsActionsOnce(state);
  bindCurrentShipRenameActionsOnce(state);
  bindCurrentShipOutfitActionsOnce(state);
  bindCurrentShipWeaponEquipActionsOnce(state);
  bindMissionRewardActionsOnce(state);

  // ensure active tab + panel are state-driven
  ensureInventoryActivePanelHasContent(state);
}

function ensureInventoryActivePanelHasContent(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl) return;

  renderInventoryTabsState(bodyEl, state);
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

function bindCurrentShipOutfitActionsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invCurrentOutfitBound) return;
  bodyEl.__invCurrentOutfitBound = true;

  bodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-unequip-outfit-index]");
    if (!btn) return;

    const outfitIndex = Number(btn.getAttribute("data-unequip-outfit-index"));
    if (!Number.isInteger(outfitIndex) || outfitIndex < 0) return;

    const p = state?.player;
    const owned = Array.isArray(p?.ownedSpaceships) ? p.ownedSpaceships : [];
    const activeId = p?.currentSpaceshipId ?? p?.activeShipId ?? 0;
    const activeShip = owned.find((s) => s.id === activeId);
    if (!activeShip || !Array.isArray(activeShip.outfits) || !activeShip.outfits[outfitIndex]) return;

    const [removedOutfit] = activeShip.outfits.splice(outfitIndex, 1);
    await recomputeShipStatsFromEquippedOutfits(activeShip);

    const removedId = String(removedOutfit?.id ?? removedOutfit ?? "");
    if (removedId && Array.isArray(p.ownedOutfits)) {
      const equippedIdx = p.ownedOutfits.findIndex(
        (o) => String(o?.id ?? "") === removedId && Number(o?.equippedOnShipId) === Number(activeShip.id)
      );
      if (equippedIdx >= 0) {
        p.ownedOutfits[equippedIdx].equippedOnShipId = null;
      }
    }

    if (typeof saveState === "function") saveState(state);
    renderInventory(state);
  });
}

function bindCurrentShipRenameActionsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invCurrentRenameBound) return;
  bodyEl.__invCurrentRenameBound = true;

  bodyEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rename-active-ship]");
    if (!btn) return;

    const p = state?.player;
    const owned = Array.isArray(p?.ownedSpaceships) ? p.ownedSpaceships : [];
    const activeId = p?.currentSpaceshipId ?? p?.activeShipId ?? 0;
    const activeShip = owned.find((s) => s.id === activeId);
    if (!activeShip) return;

    const currentName = String(activeShip.name ?? "").trim();
    const nextName = prompt("Rename your ship:", currentName);
    if (nextName === null) return;

    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === currentName) return;

    activeShip.name = trimmedName;
    if (typeof saveState === "function") saveState(state);
    renderInventory(state);
  });
}

function bindCurrentShipWeaponEquipActionsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invCurrentWeaponEquipBound) return;
  bodyEl.__invCurrentWeaponEquipBound = true;

  bodyEl.addEventListener("click", async (e) => {
    const unequipBtn = e.target.closest("[data-unequip-weapon-port-index]");
    if (unequipBtn) {
      const portIndex = Number(unequipBtn.getAttribute("data-unequip-weapon-port-index"));
      if (!Number.isInteger(portIndex) || portIndex < 0) return;

      const p = state?.player;
      const ownedShips = Array.isArray(p?.ownedSpaceships) ? p.ownedSpaceships : [];
      const activeId = p?.currentSpaceshipId ?? p?.activeShipId ?? 0;
      const activeShip = ownedShips.find((s) => s.id === activeId);
      if (!activeShip) return;

      const inventory = Array.isArray(p?.ownedWeapons) ? p.ownedWeapons : [];
      const equippedWeapon = inventory.find(
        (weapon) => Number(weapon?.equippedOnShipId) === Number(activeShip.id) && Number(weapon?.equippedPortIndex) === portIndex
      );
      if (!equippedWeapon) return;

      equippedWeapon.equippedOnShipId = null;
      equippedWeapon.equippedPortIndex = null;

      const shipPorts = Array.isArray(activeShip?.shipStats?.weaponGunCoords) ? activeShip.shipStats.weaponGunCoords : [];
      const targetPort = shipPorts[portIndex];
      if (targetPort) {
        targetPort.weaponEquipped = null;
      }


      if (typeof saveState === "function") saveState(state);
      renderInventory(state);
      return;
    }

    const btn = e.target.closest("[data-equip-weapon-port-index]");
    if (!btn) return;

    const portIndex = Number(btn.getAttribute("data-equip-weapon-port-index"));
    if (!Number.isInteger(portIndex) || portIndex < 0) return;

    const p = state?.player;
    const ownedShips = Array.isArray(p?.ownedSpaceships) ? p.ownedSpaceships : [];
    const activeId = p?.currentSpaceshipId ?? p?.activeShipId ?? 0;
    const activeShip = ownedShips.find((s) => s.id === activeId);
    if (!activeShip) return;

    const inventory = Array.isArray(p?.ownedWeapons) ? p.ownedWeapons : [];
    const shipPorts = Array.isArray(activeShip?.shipStats?.weaponGunCoords) ? activeShip.shipStats.weaponGunCoords : [];
    const targetPort = shipPorts[portIndex];
    if (!targetPort) return;

    const portType = String(targetPort?.type || "gun").trim().toLowerCase();
    const isSpinalPort = portType === "spinal";
    const weaponSpinalMap = await getWeaponSpinalMap();

    const isWeaponCompatibleWithPort = (weapon) => {
      const weaponIsSpinal = Boolean(weapon?.spinal ?? weaponSpinalMap[String(weapon?.code || weapon?.id || "")] ?? false);
      return isSpinalPort ? weaponIsSpinal : !weaponIsSpinal;
    };

    const compatibleWeaponIndices = inventory
      .map((weapon, idx) => ({ weapon, idx }))
      .filter(({ weapon }) => isWeaponCompatibleWithPort(weapon));

    if (!compatibleWeaponIndices.length) {
      alert(isSpinalPort ? "No spinal weapon available in inventory." : "No compatible weapon available in inventory.");
      return;
    }

    const prevEquippedInInventory = inventory.find(
      (weapon) => Number(weapon?.equippedOnShipId) === Number(activeShip.id) && Number(weapon?.equippedPortIndex) === portIndex
    );

    const compatibleCargo = compatibleWeaponIndices.filter(({ weapon }) => !weapon?.equippedOnShipId);
    const cyclePool = prevEquippedInInventory
      ? [prevEquippedInInventory, ...compatibleCargo.map(({ weapon }) => weapon)]
      : compatibleCargo.map(({ weapon }) => weapon);

    if (!cyclePool.length) {
      alert(isSpinalPort ? "No spinal weapon available in cargo." : "No compatible weapon available in cargo.");
      return;
    }

    const currentWeaponCode = String(targetPort?.weaponEquipped || "").trim();
    const currentPoolIndex = cyclePool.findIndex((weapon) => String(weapon?.code || "").trim() === currentWeaponCode);
    const nextWeapon = cyclePool[(currentPoolIndex + 1) % cyclePool.length];

    if (prevEquippedInInventory) {
      prevEquippedInInventory.equippedOnShipId = null;
      prevEquippedInInventory.equippedPortIndex = null;
    }

    if (!nextWeapon) return;

    nextWeapon.equippedOnShipId = activeShip.id;
    nextWeapon.equippedPortIndex = portIndex;
    if (targetPort) {
      targetPort.weaponEquipped = String(nextWeapon?.code || "").trim();
    }

    if (typeof saveState === "function") saveState(state);
    renderInventory(state);
  });
}

async function getWeaponSpinalMap() {
  if (window.__inventoryWeaponSpinalMap) return window.__inventoryWeaponSpinalMap;

  try {
    const response = await fetch("weapons.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const weapons = Array.isArray(payload?.weapons) ? payload.weapons : [];

    window.__inventoryWeaponSpinalMap = weapons.reduce((acc, weapon) => {
      const code = String(weapon?.code || weapon?.id || "").trim();
      if (code) acc[code] = Boolean(weapon?.spinal);
      return acc;
    }, {});
  } catch (err) {
    console.warn("[inventory] Failed to load weapons spinal metadata", err);
    window.__inventoryWeaponSpinalMap = {};
  }

  return window.__inventoryWeaponSpinalMap;
}



function bindMissionRewardActionsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invMissionBound) return;
  bodyEl.__invMissionBound = true;

  bodyEl.addEventListener("click", (e) => {
    const claimBtn = e.target.closest("[data-claim-mission]");
    if (claimBtn) {
      const missionId = claimBtn.getAttribute("data-claim-mission");
      const missions = Array.isArray(state?.player?.missions) ? state.player.missions : [];
      const mission = missions.find((m) => m?.id === missionId);
      if (!mission || !mission.completed || mission.rewarded) return;

      if (globalThis.StationManager?._grantMissionRewards) {
        globalThis.StationManager._grantMissionRewards(mission.rewards || {});
      }
      mission.rewarded = true;
      if (typeof saveState === "function") saveState(state);
      renderInventory(state);
      return;
    }

    const deleteBtn = e.target.closest("[data-delete-mission]");
    if (!deleteBtn) return;

    const missionId = deleteBtn.getAttribute("data-delete-mission");
    const missions = Array.isArray(state?.player?.missions) ? state.player.missions : [];
    const missionIdx = missions.findIndex((m) => m?.id === missionId);
    if (missionIdx < 0 || !missions[missionIdx]?.rewarded) return;

    missions.splice(missionIdx, 1);
    if (typeof saveState === "function") saveState(state);
    renderInventory(state);
  });
}

function bindInventoryTabsOnce(state) {
  const bodyEl = document.querySelector(".inventory-body");
  if (!bodyEl || bodyEl.__invTabsBound) return;
  bodyEl.__invTabsBound = true;

  const activateInventoryTab = (tabBtn) => {
    if (!tabBtn) return;
    const tab = tabBtn.getAttribute("data-tab");
    setInventoryActiveTab(tab);
    renderInventoryTabsState(bodyEl, state);
  };

  bodyEl.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (!tabBtn) return;

    activateInventoryTab(tabBtn);
  });

  bodyEl.addEventListener("touchstart", (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (!tabBtn) return;

    e.preventDefault();
    activateInventoryTab(tabBtn);
  });
}


function renderInventoryTabContent(state, tab, panelEl) {
  const p = state.player;
  const owned = Array.isArray(p.ownedSpaceships) ? p.ownedSpaceships : [];
  const activeId = state.player.currentSpaceshipId ?? state.player.activeShipId ?? 0;
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

    const activeShipStats = activeShip.shipStats || p.shipStats || {};
    const baseShipStats =
      activeShip.__baseShipStats ||
      (typeof getStats === "function" ? getStats(activeShip.templateName) : {}) ||
      {};
    const outfits = Array.isArray(activeShip.outfits) ? activeShip.outfits : [];
    const shieldDiameter = Number(activeShipStats.shieldDiameterPx || 96);
    const portCoords = Array.isArray(activeShipStats.weaponGunCoords) ? activeShipStats.weaponGunCoords : [];

    panelEl.innerHTML = `
      <h3 style="display:flex;align-items:center;gap:8px;">
        <span>${escapeHtml(activeShip.name)}</span>
        <button type="button" data-rename-active-ship>Rename</button>
      </h3>
      <div>Template: ${activeShip.templateName}</div>
      <hr>

      <h4 style="margin:8px 0;">Weapon equip</h4>
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div
          style="
            width:${shieldDiameter}px;
            height:${shieldDiameter}px;
            border:1px solid rgba(255,255,255,.35);
            border-radius:8px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:rgba(0,0,0,.25);
            overflow:hidden;
            flex:0 0 auto;
          "
        >
          <img
            src="${baseUrl}${activeShipStats.image || ""}"
            alt="${escapeHtml(activeShipStats.image || activeShip.name)}"
            style="max-width:100%;max-height:100%;object-fit:contain;"
          >
        </div>

        <div style="flex:1 1 280px;">
          ${
            portCoords.length
              ? `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">${portCoords
                  .map((coord, idx) => {
                    const equippedCode = String(coord?.weaponEquipped || "").trim();
                    return `
                    <li style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:6px 8px;">
                      <span>
                        Port ${idx + 1} (${escapeHtml(coord?.type || "gun")})
                        · x:${formatStatValue(Number(coord?.x ?? 0))}
                        y:${formatStatValue(Number(coord?.y ?? 0))}
                        ${equippedCode ? `· <strong>${escapeHtml(equippedCode)}</strong>` : ""}
                      </span>
                      <div style="display:flex;gap:6px;">
                        <button type="button" data-equip-weapon-port-index="${idx}">equip</button>
                        ${equippedCode ? `<button type="button" data-unequip-weapon-port-index="${idx}">unequip</button>` : ""}
                      </div>
                    </li>
                  `;
                  })
                  .join("")}</ul>`
              : `<div style="opacity:.7">No weapon ports for this ship.</div>`
          }
        </div>
      </div>

      <hr>

      <h4 style="margin:8px 0;">Ship stats</h4>
      <div style="opacity:.75; margin-bottom:8px;">Showing base template values + cumulative outfit bonus.</div>
      ${renderShipStatsWithBonuses(baseShipStats, activeShipStats)}

      <hr>
      <h4>Equipped outfits</h4>
      ${
        outfits.length
          ? `<ul>${outfits
              .map((o, idx) => `
                <li style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;">
                  <span>${escapeHtml(o?.name ?? o?.id ?? o ?? "Outfit")}</span>
                  <button data-unequip-outfit-index="${idx}">Unequip</button>
                </li>
              `)
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



  if (tab === "weapons") {
    const ownedWeapons = Array.isArray(p.ownedWeapons) ? p.ownedWeapons : [];

    if (!ownedWeapons.length) {
      panelEl.innerHTML = '<div style="opacity:.7">No weapons owned</div>';
      return;
    }

    panelEl.innerHTML = `
      <div class="inv-missions-list">
        ${ownedWeapons
          .map((weapon, index) => {
            const weaponId = String(weapon?.id ?? "");
            const weaponName = String(weapon?.name ?? weaponId ?? `Weapon ${index + 1}`);
            const shipId = Number(weapon?.equippedOnShipId);
            const equippedShip = owned.find((s) => Number(s?.id) === shipId);
            const location = equippedShip
              ? `Equipped on ${escapeHtml(equippedShip.name || equippedShip.templateName || `ship #${shipId}`)}${Number.isInteger(Number(weapon?.equippedPortIndex)) ? ` (port ${Number(weapon.equippedPortIndex) + 1})` : ""}`
              : "In cargo";

            return `
              <article class="inv-mission-card">
                <h4>${escapeHtml(weaponName)}</h4>
                <p><strong>ID:</strong> ${escapeHtml(weaponId || "n/a")}</p>
                <p><strong>Status:</strong> ${location}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  if (tab === "missions") {
    const missions = Array.isArray(p.missions) ? p.missions : [];
    if (!missions.length) {
      panelEl.innerHTML = '<div style="opacity:.7">No current missions. Visit Station Plaza to accept one.</div>';
      return;
    }

    panelEl.innerHTML = `
      <div class="inv-missions-list">
        ${missions.map((mission) => {
          const destroyTargets = Number(mission.destroyTargets) || 1;
          const destroyedTargets = Number(mission.destroyedTargets) || 0;
          const progressRatio = Math.max(0, Math.min(1, destroyedTargets / destroyTargets));
          const canClaim = !!mission.completed && !mission.rewarded;
          const claimed = !!mission.rewarded;
          const rewardMoney = Number(mission?.rewards?.money) || 0;

          return `
            <article class="inv-mission-card">
              <h4>${escapeHtml(mission.title || "Mission")}</h4>
              <p>${escapeHtml(mission.description || "")}</p>
              <p><strong>Progress:</strong> ${destroyedTargets} / ${destroyTargets}</p>
              <div class="inv-progress"><div class="inv-progress-fill" style="width:${Math.round(progressRatio * 100)}%"></div></div>
              <p><strong>Reward:</strong> ${rewardMoney}§</p>
              ${canClaim
                ? `<button data-claim-mission="${escapeHtml(mission.id)}">Get reward</button>`
                : claimed
                  ? `<button data-delete-mission="${escapeHtml(mission.id)}">Delete mission</button>`
                  : `<button disabled>In progress</button>`}
            </article>
          `;
        }).join("")}
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

function renderShipStatsWithBonuses(baseStats, currentStats) {
  const base = baseStats && typeof baseStats === "object" ? baseStats : {};
  const current = currentStats && typeof currentStats === "object" ? currentStats : {};

  const statKeys = Array.from(
    new Set([...Object.keys(base), ...Object.keys(current)])
  )
    .filter((key) => Number.isFinite(Number(base[key])) || Number.isFinite(Number(current[key])))
    .sort((a, b) => a.localeCompare(b));

  if (!statKeys.length) {
    return `<div style="opacity:.7">No ship stats available</div>`;
  }

  const rows = statKeys.map((key) => {
    const baseValue = Number(base[key] ?? 0);
    const currentValue = Number(current[key] ?? 0);
    const bonusValue = currentValue - baseValue;
    const bonusText = bonusValue > 0 ? `+${formatStatValue(bonusValue)}` : formatStatValue(bonusValue);

    return `
      <tr>
        <td style="padding:2px 6px 2px 0;"><strong>${escapeHtml(key)}</strong></td>
        <td style="padding:2px 10px;">${formatStatValue(baseValue)}</td>
        <td style="padding:2px 10px; color:${bonusValue >= 0 ? "#73d66b" : "#ff8484"};">${bonusText}</td>
        <td style="padding:2px 0;">${formatStatValue(currentValue)}</td>
      </tr>
    `;
  }).join("");

  return `
    <table style="width:100%; border-collapse:collapse; font-size:.95rem;">
      <thead>
        <tr style="opacity:.8; text-align:left;">
          <th>Stat</th>
          <th>Base</th>
          <th>Outfits</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatStatValue(value) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}


async function recomputeShipStatsFromEquippedOutfits(ship) {
  if (!ship || typeof ship !== "object") return;

  const baseStats = ship.__baseShipStats || { ...(ship.shipStats || {}) };
  ship.__baseShipStats = { ...baseStats };
  let nextStats = { ...baseStats };

  const outfitsCatalog = await getOutfitsCatalogById();
  const equipped = Array.isArray(ship.outfits) ? ship.outfits : [];
  for (const outfit of equipped) {
    const outfitId = String(outfit?.id ?? outfit ?? "");
    const raw = outfitsCatalog[outfitId];
    if (!raw) continue;

    if (typeof projectOutfitStats === "function") {
      nextStats = projectOutfitStats(nextStats, raw);
    }
  }

  ship.shipStats = nextStats;
}

async function getOutfitsCatalogById() {
  const normalized = typeof loadNormalizedOutfits === "function" ? await loadNormalizedOutfits() : [];
  const byId = {};
  for (const outfit of normalized) {
    if (!outfit?.id) continue;
    byId[String(outfit.id)] = outfit.raw || null;
  }
  return byId;
}
