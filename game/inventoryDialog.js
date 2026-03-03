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
  const missionsPanel = bodyEl.querySelector('[data-panel="missions"]');

  // If your HTML didn't include panels yet, fallback to old behavior (optional)
  if (!currentPanel || !ownedPanel || !missionsPanel) {
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

  // Keep tab contents in sync when active ship changes.
  renderInventoryTabContent(state, "current", currentPanel);
  renderInventoryTabContent(state, "owned", ownedPanel);
  renderInventoryTabContent(state, "missions", missionsPanel);

  // ---- BIND TAB SWITCH + ACTIONS (event delegation, once) ----
  bindInventoryTabsOnce(state);
  bindOwnedShipsActionsOnce(state);
  bindCurrentShipRenameActionsOnce(state);
  bindCurrentShipOutfitActionsOnce(state);
  bindCurrentShipWeaponEquipActionsOnce(state);
  bindMissionRewardActionsOnce(state);

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

  bodyEl.addEventListener("click", (e) => {
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
    const nextWeapon = inventory.find((weapon) => !weapon?.equippedOnShipId);
    if (!nextWeapon) {
      alert("No unequipped weapon available in inventory.");
      return;
    }

    const equippedWeapons = Array.isArray(activeShip.equippedWeapons) ? activeShip.equippedWeapons : [];
    const prevEquippedInInventory = inventory.find(
      (weapon) => Number(weapon?.equippedOnShipId) === Number(activeShip.id) && Number(weapon?.equippedPortIndex) === portIndex
    );
    if (prevEquippedInInventory) {
      prevEquippedInInventory.equippedOnShipId = null;
      prevEquippedInInventory.equippedPortIndex = null;
    }

    nextWeapon.equippedOnShipId = activeShip.id;
    nextWeapon.equippedPortIndex = portIndex;

    const withoutPort = equippedWeapons.filter((slot) => Number(slot?.portIndex) !== portIndex);
    withoutPort.push({
      id: String(nextWeapon?.id ?? ""),
      name: String(nextWeapon?.name ?? "Unknown weapon"),
      portIndex,
      portType: String((activeShip.shipStats?.weaponGunCoords || [])[portIndex]?.type || "gun"),
    });
    activeShip.equippedWeapons = withoutPort;

    if (typeof saveState === "function") saveState(state);
    renderInventory(state);
  });
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
    const equippedByPort = new Map(
      (Array.isArray(activeShip.equippedWeapons) ? activeShip.equippedWeapons : []).map((entry) => [
        Number(entry?.portIndex),
        entry,
      ])
    );

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
                    const equipped = equippedByPort.get(idx);
                    return `
                    <li style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:6px 8px;">
                      <span>
                        Port ${idx + 1} (${escapeHtml(coord?.type || "gun")})
                        · x:${formatStatValue(Number(coord?.x ?? 0))}
                        y:${formatStatValue(Number(coord?.y ?? 0))}
                        ${equipped ? `· <strong>${escapeHtml(equipped.name || equipped.id || "Weapon")}</strong>` : ""}
                      </span>
                      <button type="button" data-equip-weapon-port-index="${idx}">equip</button>
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
