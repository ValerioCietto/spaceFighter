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
    _subtabMenuEl: null,
    _sectionTitleEl: null,
    _tabButtons: [],
    _activeTab: "info",
    _activeSubtabs: {},
    _isOpen: false,
    _options: null,

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
          html = `<p>${subtabId} is coming soon.</p>`;
          break;

        case "Plaza":
          html = `<p>${subtabId} is coming soon.</p>`;
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
      // new method to implement later
    },

    renderWeaponShop() {
      // new method to implement later
    },
  };

  global.StationManager = StationManager;
})(window);
