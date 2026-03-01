// Command to launch: `npx serve .` then open http://localhost:3000/game.html in a browser

(function (global) {
  const DEFAULT_TABS = ["Shipyard", "Outfits", "Weapons", "Market", "Bank", "Plaza"];
  const TAB_CONFIG = {
    Shipyard: ["New ship Shop", "Sell ship"],
    Outfits: ["Outfit Shop"],
    Weapons: ["Weapon Shop"],
    Market: ["Sell Ships", "Sell Outfits", "Sell Weapons", "Software Shop"],
    Bank: ["Loan", "Invest", "Deposit"],
    Plaza: ["Bar", "Missions", "Military"],
  };

  const MISSION_STORAGE_KEY = "spacefighter.station.missions.v1";

  function createSafeGet(fn, fallback) {
    return function () {
      try {
        const v = fn();
        return v == null ? fallback : v;
      } catch {
        return fallback;
      }
    };
  }

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const StationManager = {
    _overlay: null,
    _contentEl: null,
    _titleEl: null,
    _exitBtn: null,
    _subtabMenuEl: null,
    _sectionTitleEl: null,
    _tabButtons: [],
    _activeTab: "info",
    _activeSubtabs: {},
    _isOpen: false,
    _options: null,
    _storyMissionCatalog: [],
    _storyMissionLoaded: false,

    init(options) {
      console.log("[StationManager] Initializing with options:", options);
      this._options = options || {};
      this._overlay = document.getElementById("station-overlay");
      this._contentEl = document.getElementById("station-content");
      this._titleEl = document.getElementById("station-title");
      this._exitBtn = document.getElementById("station-exit-btn");
      this._subtabMenuEl = document.getElementById("station-subtabs");
      this._sectionTitleEl = document.getElementById("station-section-title");
      this._tabButtons = Array.from(
        document.querySelectorAll(".station-tab-btn, .tab-btn")
      );

      if (!this._overlay || !this._contentEl || !this._titleEl) {
        console.warn("[StationManager] Missing station dialog DOM elements");
        return;
      }

      if (this._exitBtn) {
        this._exitBtn.addEventListener("click", () => this.closeStation());
      }

      this._tabButtons.forEach((btn) => {
        const tabId = btn.getAttribute("data-tab");
        btn.addEventListener("click", () => {
          this.setActiveTab(tabId || "info");
        });
      });

      this.setActiveTab("Shipyard");
    },

    openStation(stationContext) {
      console.log("[StationManager] Opening station dialog with context:", stationContext);
      if (!this._overlay) return;

      this._isOpen = true;
      this._overlay.classList.add("open");
      this._overlay.setAttribute("aria-hidden", "false");

      const getSystemInfo = createSafeGet(
        () => this._options.systemInfo,
        null
      );
      const sys = stationContext?.systemInfo || getSystemInfo();

      const stationName = stationContext?.name || "Orbital Station";
      const systemName = sys?.name || "Unknown System";

      this._titleEl.textContent = `${stationName} – ${systemName}`;
      this.refreshMissionsForSystem(systemName, { force: false });

      this.setActiveTab(this._activeTab || "Shipyard");
      if (typeof this._options.onOpen === "function") {
        this._options.onOpen();
      }
    },

    closeStation() {
      console.log("[StationManager] Closing station dialog");
      if (!this._overlay) return;
      this._isOpen = false;
      this._overlay.classList.remove("open");
      this._overlay.setAttribute("aria-hidden", "true");
      if (typeof this._options.onClose === "function") {
        this._options.onClose();
      }
    },

    isOpen() {
      return !!this._isOpen;
    },

    async loadStoryMissions() {
      if (this._storyMissionLoaded) return;
      try {
        const res = await fetch("missions/story-missions.json");
        if (res.ok) {
          const data = await res.json();
          this._storyMissionCatalog = Array.isArray(data?.missions) ? data.missions : [];
        }
      } catch (err) {
        console.warn("[StationManager] Failed loading story missions", err);
      }
      this._storyMissionLoaded = true;
    },

    _loadMissionState() {
      try {
        return JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY) || "{}");
      } catch {
        return {};
      }
    },

    _saveMissionState(state) {
      try {
        localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.warn("[StationManager] Failed saving missions", err);
      }
    },

    _ensureMissionState(systemName, forceRefresh = false) {
      const safeSystemName = String(systemName || "Unknown System");
      const all = this._loadMissionState();
      const current = all[safeSystemName] || {
        randomMissions: [],
        accepted: [],
        completedStoryIds: [],
      };

      if (forceRefresh || !current.randomMissions.length) {
        current.randomMissions = this._buildRandomMissions(safeSystemName);
      }

      all[safeSystemName] = current;
      this._saveMissionState(all);
      return { all, current, systemName: safeSystemName };
    },

    _buildRandomMissions(systemName) {
      return Array.from({ length: 3 }, (_, idx) => {
        const destroyTargets = randomInt(2, 8);
        return {
          id: `rnd-${systemName}-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`,
          kind: "random",
          type: "destroy",
          title: `Eliminate Hostiles (${destroyTargets})`,
          description: `Destroy ${destroyTargets} hostile targets around ${systemName}.`,
          system: systemName,
          destroyTargets,
          destroyedTargets: 0,
          completed: false,
          rewarded: false,
          rewards: {
            money: randomInt(500, 1500),
          },
        };
      });
    },

    refreshMissionsForSystem(systemName, { force = true } = {}) {
      this._ensureMissionState(systemName, !!force);
      if (this._activeTab === "Plaza" && this._activeSubtabs.Plaza === "Missions") {
        this._renderTab("Plaza", "Missions");
      }
    },

    setActiveTab(tabId) {
      if (!DEFAULT_TABS.includes(tabId)) {
        tabId = "Shipyard";
      }
      this._activeTab = tabId;
      this._activeSubtabs[tabId] = this._activeSubtabs[tabId] || TAB_CONFIG[tabId]?.[0] || "";

      this._tabButtons.forEach((btn) => {
        const t = btn.getAttribute("data-tab");
        btn.classList.toggle("active", t === tabId);
        btn.classList.toggle("is-active", t === tabId);
      });

      this._renderSubtabs(tabId);
      this._renderTab(tabId, this._activeSubtabs[tabId]);
    },

    setActiveSubtab(tabId, subtabId) {
      this._activeSubtabs[tabId] = subtabId;
      this._renderSubtabs(tabId);
      this._renderTab(tabId, subtabId);
    },

    _renderSubtabs(tabId) {
      if (!this._subtabMenuEl) return;
      const subtabs = TAB_CONFIG[tabId] || [];
      const activeSubtab = this._activeSubtabs[tabId] || subtabs[0] || "";
      this._subtabMenuEl.innerHTML = "";

      subtabs.forEach((subtabLabel) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tab-btn";
        if (subtabLabel === activeSubtab) {
          btn.classList.add("is-active");
        }
        btn.textContent = subtabLabel;
        btn.addEventListener("click", () => this.setActiveSubtab(tabId, subtabLabel));
        this._subtabMenuEl.appendChild(btn);
      });
    },

    _renderTab(tabId, subtabId) {
      if (!this._contentEl) return;

      if (this._sectionTitleEl) {
        this._sectionTitleEl.textContent = `${tabId} · ${subtabId || ""}`;
      }

      let html = "";

      switch (tabId) {
        case "Outfits":
          html = `<div id="outfit-shop-list"></div>`;
          break;

        case "Weapons":
          html = `<div id="weapon-shop-list"></div>`;
          break;

        case "Bank":
          html = `<p>${subtabId} services are coming soon.</p>`;
          break;

        case "Shipyard":
          html = subtabId === "New ship Shop"
            ? `<div id="ship-shop-list"></div>`
            : `<div id="ship-shop-list"></div>`;
          break;

        case "Market":
          html = subtabId === "Sell Weapons"
            ? `<div id="weapon-shop-list"></div>`
            : `<p>${subtabId} is coming soon.</p>`;
          break;

        case "Plaza":
          html = subtabId === "Missions"
            ? `<div class="missions-board" id="missions-board"></div>`
            : `<p>${subtabId} is coming soon.</p>`;
          break;

        default:
          html = `<p>Unknown tab: ${tabId}</p>`;
      }

      this._contentEl.innerHTML = html;

      if (tabId === "Shipyard" && subtabId === "New ship Shop") {
        this.renderStationShipShop();
      }
      if (tabId === "Shipyard" && subtabId === "Sell ship") {
        this.renderSellShipShop();
      }
      if (tabId === "Outfits") {
        this.renderOutfitShop();
      }
      if (tabId === "Weapons") {
        this.renderWeaponShop();
      }
      if (tabId === "Market" && subtabId === "Sell Weapons") {
        this.renderSellWeaponShop();
      }
      if (tabId === "Plaza" && subtabId === "Missions") {
        this.renderMissions();
      }
    },

    _normalizeMissionForPlayer(mission, systemName) {
      const destroyTargets = Number(mission?.destroyTargets) || 1;
      return {
        id: mission.id,
        title: mission.title || "Mission",
        description: mission.description || "No description.",
        kind: mission.kind || "story",
        type: mission.type || "destroy",
        system: systemName,
        destroyTargets,
        destroyedTargets: Number(mission?.destroyedTargets) || 0,
        completed: !!mission.completed,
        rewarded: false,
        rewards: mission.rewards || {},
      };
    },

    acceptMission(systemName, mission) {
      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      if (!state?.player || !mission?.id) return;

      state.player.missions = Array.isArray(state.player.missions) ? state.player.missions : [];
      const alreadyAccepted = state.player.missions.some((m) => m?.id === mission.id);
      if (alreadyAccepted) return;

      state.player.missions.push(this._normalizeMissionForPlayer(mission, systemName));

      if (typeof this._options.onMissionAccepted === "function") {
        this._options.onMissionAccepted(mission, state);
      }

      this.renderMissions();
    },

    async renderMissions() {
      const board = document.getElementById("missions-board");
      if (!board) return;

      const systemName = this._options.systemInfo?.name || "Unknown System";
      await this.loadStoryMissions();
      const missionState = this._ensureMissionState(systemName, false);
      const completed = missionState.current.completedStoryIds || [];
      const storyMissions = this._storyMissionCatalog.filter((m) => {
        const systemMatch = !m.system || m.system === systemName;
        return systemMatch && !completed.includes(m.id);
      });

      const randomMissions = missionState.current.randomMissions || [];

      board.innerHTML = `
        <h4>Quick Missions</h4>
        <div class="missions-grid" id="quick-missions"></div>
        <h4>Story Missions</h4>
        <div class="missions-grid" id="story-missions"></div>
      `;

      const quickEl = board.querySelector("#quick-missions");
      const storyEl = board.querySelector("#story-missions");
      this._renderMissionCards(quickEl, randomMissions, missionState.systemName);
      this._renderMissionCards(storyEl, storyMissions, missionState.systemName);

      if (!randomMissions.length) {
        quickEl.innerHTML = '<p class="muted">No quick missions available right now.</p>';
      }
      if (!storyMissions.length) {
        storyEl.innerHTML = '<p class="muted">No story missions available in this system.</p>';
      }
    },

    _renderMissionCards(root, missions, systemName) {
      if (!root) return;
      root.innerHTML = "";

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      const acceptedIds = new Set(
        (Array.isArray(state?.player?.missions) ? state.player.missions : []).map((m) => m?.id)
      );

      missions.forEach((mission) => {
        const article = document.createElement("article");
        article.className = "mission-card";

        const reward = mission.rewards || {};
        const rewardBits = [];
        if (reward.money) rewardBits.push(`${reward.money}§`);
        if (reward.weapon) rewardBits.push(`Weapon: ${reward.weapon}`);
        if (reward.outfit) rewardBits.push(`Outfit: ${reward.outfit}`);
        if (reward.spaceship) rewardBits.push(`Ship: ${reward.spaceship}`);

        const destroyTargets = Number(mission.destroyTargets) || 1;
        article.innerHTML = `
          <h5>${mission.title || "Mission"}</h5>
          <p>${mission.description || "No description."}</p>
          <p><strong>Objective:</strong> Destroy ${destroyTargets} targets</p>
          <p><strong>Rewards:</strong> ${rewardBits.join(" · ") || "None"}</p>
        `;

        const button = document.createElement("button");
        button.className = "tab-btn is-active";
        const isAccepted = acceptedIds.has(mission.id);
        button.textContent = isAccepted ? "Accepted" : "Accept";
        button.disabled = isAccepted;
        button.addEventListener("click", () => this.acceptMission(systemName, mission));

        article.appendChild(button);
        root.appendChild(article);
      });
    },

    _grantMissionRewards(rewards) {
      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      if (!state?.player) return;
      const p = state.player;

      if (Number.isFinite(rewards.money)) {
        p.money += rewards.money;
      }

      if (rewards.weapon) {
        const inventory = Array.isArray(p.ownedWeapons)
          ? p.ownedWeapons
          : (Array.isArray(p.weaponsOwned) ? p.weaponsOwned : []);
        inventory.push({
          id: String(rewards.weapon).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
          name: rewards.weapon,
          source: "story_mission",
        });
        p.ownedWeapons = inventory;
      }

      if (rewards.outfit) {
        p.ownedOutfits = Array.isArray(p.ownedOutfits) ? p.ownedOutfits : [];
        p.ownedOutfits.push({
          name: rewards.outfit,
          source: "story_mission",
          status: "stored",
        });
      }

      if (rewards.spaceship) {
        p.ownedSpaceships = Array.isArray(p.ownedSpaceships) ? p.ownedSpaceships : [];
        const nextId = p.ownedSpaceships.reduce((max, s) => Math.max(max, Number(s?.id) || 0), 0) + 1;
        const templateName = rewards.spaceship;
        const shipStats = typeof global.getStats === "function" ? global.getStats(templateName) : {};
        p.ownedSpaceships.push({
          id: nextId,
          name: `Reward: ${templateName}`,
          templateName,
          shipStats,
          outfits: [],
          weapons: { gunPorts: [], turretPorts: [], dronePorts: [] },
          cargo: [],
        });
      }

      if (typeof this._options.onMissionRewardsGranted === "function") {
        this._options.onMissionRewardsGranted(rewards, state);
      }
    },

    renderStationShipShop() {
      const rootEl = document.getElementById("ship-shop-list");
      if (!rootEl || typeof global.renderStationShipShop !== "function") return;

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      rootEl.innerHTML = "";
      global.renderStationShipShop({
        rootEl,
        state,
        onBuy: (shipKey, stats) => {
          if (typeof this._options.onShipBought === "function") {
            this._options.onShipBought(shipKey, stats);
          }
        },
        onToast: (msg) => console.log("[shop]", msg),
      });
    },

    renderSellShipShop() {
      const rootEl = document.getElementById("ship-shop-list");
      if (!rootEl || typeof global.renderSellShipShop !== "function") return;

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      rootEl.innerHTML = "";
      global.renderSellShipShop({
        rootEl,
        state,
        onSell: (ship, soldFor) => {
          console.log("[shop] sold ship", ship, soldFor);
        },
        onToast: (msg) => console.log("[shop]", msg),
      });
    },

    renderOutfitShop() {
      const rootEl = document.getElementById("outfit-shop-list");
      if (!rootEl || typeof global.renderStationOutfitShop !== "function") return;

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      rootEl.innerHTML = "";

      global.renderStationOutfitShop({
        rootEl,
        state,
        onBuy: (outfit, ship) => {
          if (typeof this._options.onOutfitBought === "function") {
            this._options.onOutfitBought(outfit, ship);
          }
        },
        onToast: (msg) => {
          if (typeof this._options.onToast === "function") {
            this._options.onToast(msg);
            return;
          }
          console.log("[outfit-shop]", msg);
        },
      });
    },

    renderWeaponShop() {
      const rootEl = document.getElementById("weapon-shop-list");
      if (!rootEl || typeof global.renderStationWeaponShop !== "function") return;

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      rootEl.innerHTML = "";

      global.renderStationWeaponShop({
        rootEl,
        state,
        onBuy: (weapon) => {
          if (typeof this._options.onWeaponBought === "function") {
            this._options.onWeaponBought(weapon, state);
          }
        },
        onToast: (msg) => {
          if (typeof this._options.onToast === "function") {
            this._options.onToast(msg);
            return;
          }
          console.log("[weapon-shop]", msg);
        },
      });
    },

    renderSellWeaponShop() {
      const rootEl = document.getElementById("weapon-shop-list");
      if (!rootEl || typeof global.renderSellWeaponShop !== "function") return;

      const state = this._options.getPlayerState ? this._options.getPlayerState() : null;
      rootEl.innerHTML = "";

      global.renderSellWeaponShop({
        rootEl,
        state,
        onSell: (weapon, soldFor) => {
          console.log("[weapon-shop] sold weapon", weapon, soldFor);
        },
        onToast: (msg) => {
          if (typeof this._options.onToast === "function") {
            this._options.onToast(msg);
            return;
          }
          console.log("[weapon-shop]", msg);
        },
      });
    },
  };

  global.StationManager = StationManager;
})(window);
