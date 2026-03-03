(function (global) {
  const OUTFIT_CATALOG_URL = "outfits.json";

  let creditGainByOutfitId = null;
  let loadingPromise = null;

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getPlayerFromState(stateOrPlayer) {
    if (stateOrPlayer?.player) return stateOrPlayer.player;
    return stateOrPlayer || null;
  }

  function getActiveShip(player) {
    if (!player) return null;
    const owned = Array.isArray(player.ownedSpaceships) ? player.ownedSpaceships : [];
    const activeId = Number(player.currentSpaceshipId ?? player.activeShipId ?? 0);
    return owned.find((ship) => Number(ship?.id) === activeId) || owned[0] || null;
  }

  function extractCreditGainFromOutfitEntry(outfitEntry) {
    if (!outfitEntry) return 0;
    if (typeof outfitEntry === "object") {
      const inlineMult = toNumber(outfitEntry.creditGainMult, NaN);
      if (Number.isFinite(inlineMult)) return inlineMult;
      const outfitId = String(outfitEntry.id ?? "");
      return toNumber(creditGainByOutfitId?.[outfitId], 0);
    }

    const outfitId = String(outfitEntry);
    return toNumber(creditGainByOutfitId?.[outfitId], 0);
  }

  function getCreditGainMultBonus(stateOrPlayer) {
    const player = getPlayerFromState(stateOrPlayer);
    const activeShip = getActiveShip(player);
    if (!activeShip) return 0;

    const equippedOutfits = Array.isArray(activeShip.outfits) ? activeShip.outfits : [];
    let totalBonus = 0;

    equippedOutfits.forEach((outfitEntry) => {
      totalBonus += extractCreditGainFromOutfitEntry(outfitEntry);
    });

    if (totalBonus > 0) return totalBonus;

    const statMult = toNumber(activeShip?.shipStats?.creditGainMult, NaN);
    if (Number.isFinite(statMult) && statMult > 1) {
      return statMult - 1;
    }

    return 0;
  }

  function applyCreditGainBonus(stateOrPlayer, amount) {
    const baseAmount = toNumber(amount, 0);
    if (baseAmount <= 0) return baseAmount;
    const bonus = getCreditGainMultBonus(stateOrPlayer);
    return baseAmount * (1 + bonus);
  }

  function addMoneyWithCreditGainBonus(stateOrPlayer, amount) {
    const player = getPlayerFromState(stateOrPlayer);
    if (!player) return 0;

    const totalToAdd = applyCreditGainBonus(stateOrPlayer, amount);
    player.money = toNumber(player.money, 0) + totalToAdd;
    return totalToAdd;
  }

  function ensureCreditGainCatalogLoaded() {
    if (creditGainByOutfitId) return Promise.resolve(creditGainByOutfitId);
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(OUTFIT_CATALOG_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const outfits = Array.isArray(payload?.outfits) ? payload.outfits : [];
        creditGainByOutfitId = {};

        outfits.forEach((outfit) => {
          const id = String(outfit?.id ?? "");
          if (!id) return;
          creditGainByOutfitId[id] = toNumber(outfit?.creditGainMult, 0);
        });

        return creditGainByOutfitId;
      })
      .catch((err) => {
        console.warn("[creditGainBonus] Failed loading outfits catalog", err);
        creditGainByOutfitId = {};
        return creditGainByOutfitId;
      });

    return loadingPromise;
  }

  global.ensureCreditGainCatalogLoaded = ensureCreditGainCatalogLoaded;
  global.getCreditGainMultBonus = getCreditGainMultBonus;
  global.applyCreditGainBonus = applyCreditGainBonus;
  global.addMoneyWithCreditGainBonus = addMoneyWithCreditGainBonus;

  ensureCreditGainCatalogLoaded();
})(window);
