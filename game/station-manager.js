// Command to launch: `npx serve .` then open http://localhost:3000/game.html in a browser

(function (global) {
  const DEFAULT_TABS = ["info", "outfitter", "finance", "spaceships"];

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

  const StationManager = {
    _overlay: null,
    _contentEl: null,
    _titleEl: null,
    _exitBtn: null,
    _tabButtons: [],
    _activeTab: "info",
    _isOpen: false,
    _options: null,

    init(options) {
      this._options = options || {};
      this._overlay = document.getElementById("station-overlay");
      this._contentEl = document.getElementById("station-content");
      this._titleEl = document.getElementById("station-title");
      this._exitBtn = document.getElementById("station-exit-btn");
      this._tabButtons = Array.from(
        document.querySelectorAll(".station-tab-btn")
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

      this.setActiveTab("info");
    },

    openStation(stationContext) {
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

      this.setActiveTab(this._activeTab || "info");
    },

    closeStation() {
      if (!this._overlay) return;
      this._isOpen = false;
      this._overlay.classList.remove("open");
      this._overlay.setAttribute("aria-hidden", "true");
    },

    isOpen() {
      return !!this._isOpen;
    },

    setActiveTab(tabId) {
      if (!DEFAULT_TABS.includes(tabId)) {
        tabId = "info";
      }
      this._activeTab = tabId;

      this._tabButtons.forEach((btn) => {
        const t = btn.getAttribute("data-tab");
        if (t === tabId) btn.classList.add("active");
        else btn.classList.remove("active");
      });

      this._renderTab(tabId);
    },

    _renderTab(tabId) {
      if (!this._contentEl) return;

      const getSystemInfo = createSafeGet(
        () => this._options.systemInfo,
        null
      );
      const getPlayerState = createSafeGet(
        () => this._options.getPlayerState && this._options.getPlayerState(),
        null
      );

      const sys = getSystemInfo();
      const player = getPlayerState();

      const systemName = sys?.name || "Unknown System";
      const stationLabel = this._titleEl?.textContent || "Station";
      const money = player?.money != null ? player.money.toFixed(0) : "0";

      let html = "";

      switch (tabId) {
        case "info":
          html = `
            <h3>Info</h3>
            <p>Welcome to <strong>${stationLabel}</strong>.</p>
            <p>System: <strong>${systemName}</strong></p>
            <p>Current balance: <strong>${money}§</strong></p>
            <p>This is a placeholder for station lore, services description and local news.</p>
          `;
          break;

        case "outfitter":
          html = `
            <h3>Outfitter</h3>
            <p>Here you will be able to buy and equip weapons, shields and utilities for your ship.</p>
            <ul>
              <li>Weapon upgrades (coming soon)</li>
              <li>Hull and armor plating</li>
              <li>Utility modules</li>
            </ul>
          `;
          break;

        case "finance":
          html = `
            <h3>Finance</h3>
            <p>Station financial services.</p>
            <ul>
              <li>Deposit / withdraw credits (coming soon)</li>
              <li>Contracts and bounties</li>
              <li>Local market overview</li>
            </ul>
          `;
          break;

        case "spaceships":
          html = `
            <h3>Spaceships</h3>
            <p>Shipyard interface.</p>
            <ul>
              <li>Browse available hulls</li>
              <li>Trade-in current ship</li>
              <li>Preview stats and roles</li>
            </ul>
          `;
          break;

        default:
          html = `<p>Unknown tab: ${tabId}</p>`;
      }

      this._contentEl.innerHTML = html;
    },
  };

  global.StationManager = StationManager;
})(window);
