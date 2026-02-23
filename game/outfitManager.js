// Terminal: (if you want a quick smoke test) node outfitManager.test.js
// outfitManager.js
"use strict";

/**
 * OutfitManager
 * - Keeps equip state on the ship object itself:
 *   ship.outfits: string[]
 *   ship.__baseShipStats: snapshot of ship.shipStats the first time we touch it
 *
 * You must provide an outfits index map: { [outfitId]: outfitDef }
 * where outfitDef is like the entries you built in outfits.json.
 */
class OutfitManager {
  constructor(outfitsIndex = []) {
    this.outfitsIndex = outfitsIndex || [];
    // load outfits index from outfits.json if not provided
    if (Object.keys(this.outfitsIndex).length === 0) {
      try {
        const data = require("./outfits.json");
        if (data && Array.isArray(data.outfits)) {
          for (const outfit of data.outfits) {
            if (outfit.id) this.outfitsIndex[outfit.id] = outfit;
          }
        } else {
          console.warn("OutfitManager: outfits.json format invalid, expected { outfits: [...] }");
        }
        } catch (err) {
            console.warn("OutfitManager: failed to load outfits.json, no outfits available", err);
        }
    }
  }

  getOutfit(outfitId) {
    return this.outfitsIndex[outfitId] || null;
  }

  equipOutfit(state, shipId, outfitId) {
    const ship = this.#getShip(state, shipId);
    const outfit = this.getOutfit(outfitId);
    if (!outfit) return { ok: false, error: `Outfit not found: ${outfitId}` };

    this.#ensureOutfitState(ship);

    // enforce maxPerShip if present
    if (Number.isFinite(outfit.maxPerShip) && outfit.maxPerShip > 0) {
      const alreadyCount = ship.outfits.filter((id) => id === outfitId).length;
      if (alreadyCount >= outfit.maxPerShip) {
        return { ok: false, error: `maxPerShip reached for ${outfitId}` };
      }
    }

    // avoid duplicates unless maxPerShip allows stacking
    if (!outfit.maxPerShip && ship.outfits.includes(outfitId)) {
      return { ok: false, error: `Outfit already equipped: ${outfitId}` };
    }

    ship.outfits.push(outfitId);
    this.#recomputeShipStatsFromOutfits(ship);

    return { ok: true };
  }

  unequipOutfit(state, shipId, outfitId) {
    const ship = this.#getShip(state, shipId);

    this.#ensureOutfitState(ship);

    const idx = ship.outfits.lastIndexOf(outfitId);
    if (idx === -1) return { ok: false, error: `Outfit not equipped: ${outfitId}` };

    ship.outfits.splice(idx, 1);
    this.#recomputeShipStatsFromOutfits(ship);

    return { ok: true };
  }

  /* -------------------- internals -------------------- */

  #getShip(state, shipId) {
    if (!state?.player?.ownedSpaceships) throw new Error("Missing state.player.ownedSpaceships");
    const ship = state.player.ownedSpaceships[shipId];
    if (!ship) throw new Error(`Ship not found at ownedSpaceships[${shipId}]`);
    ship.shipStats = ship.shipStats || {};
    return ship;
  }

  #ensureOutfitState(ship) {
    if (!Array.isArray(ship.outfits)) ship.outfits = [];
    if (!ship.__baseShipStats) {
      // snapshot the ship stats as the "base", before any outfit effects
      ship.__baseShipStats = this.#deepClone(ship.shipStats || {});
    }
  }

  #recomputeShipStatsFromOutfits(ship) {
    // start from base snapshot
    const base = ship.__baseShipStats || {};
    const next = this.#deepClone(base);

    for (const outfitId of ship.outfits) {
      const outfit = this.getOutfit(outfitId);
      if (!outfit) continue;

      this.#applyOutfitToStats(next, outfit);
    }

    ship.shipStats = next;
  }

  #applyOutfitToStats(stats, outfit) {
    // metadata keys we do NOT apply as stats
    const SKIP = new Set(["id", "name", "outfitType", "type", "cost", "illegal", "maxPerShip"]);

    // These are "delta multipliers": +0.05 means *1.05 on an existing multiplier (default 1)
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

    // additive keys (flat add)
    const ADD_KEYS = new Set([
      "energyRegen",
      "energyMax",
      "CPU",
      "outfitSpace",
      "extraProjectiles",
      "spread",
      "creditPerMinute",
    ]);

    for (const [k, v] of Object.entries(outfit)) {
      if (SKIP.has(k)) continue;
      if (typeof v !== "number") continue;

      if (MULT_DELTA_KEYS.has(k) || k.endsWith("Mult")) {
        const cur = typeof stats[k] === "number" ? stats[k] : 1;
        stats[k] = cur * (1 + v);
        continue;
      }

      if (ADD_KEYS.has(k)) {
        const cur = typeof stats[k] === "number" ? stats[k] : 0;
        stats[k] = cur + v;
        continue;
      }

      // fallback: additive
      const cur = typeof stats[k] === "number" ? stats[k] : 0;
      stats[k] = cur + v;
    }
  }

  #deepClone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }
}