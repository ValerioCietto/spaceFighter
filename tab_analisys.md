# Tab analysis: Inventory dialog vs Station dialog

## Why station tabs feel better

From the current implementation, the station dialog has a clearer and more predictable tab architecture than inventory:

1. **Single source of truth for tab state**
   - Station keeps explicit state (`_activeTab`, `_activeSubtabs`) and always re-renders from state.  
   - Inventory infers active tab mostly from DOM classes (`.inv-tab.is-active`) and updates classes directly.

2. **Clear tab configuration model**
   - Station uses centralized tab definitions (`DEFAULT_TABS`, `TAB_CONFIG`) with fallback rules.  
   - Inventory has hardcoded tab logic spread between HTML markup, `bindInventoryTabsOnce`, and `renderInventoryTabContent`.

3. **Deterministic render flow**
   - Station tab switch pipeline is explicit: `setActiveTab` -> `_renderSubtabs` -> `_renderTab`.  
   - Inventory does a full refresh on open (`renderInventoryTabContent` for all tabs), then partially updates active panel on clicks.

4. **Safer default behavior**
   - Station validates requested tab and falls back to `Shipyard` when unknown.  
   - Inventory does not validate `data-tab` values before toggling panels.

5. **Scalable for nested navigation**
   - Station already supports subtabs per section.  
   - Inventory is flat; adding secondary groups (e.g., filters/sort/views) would require ad-hoc expansion.

6. **Layout consistency for long content**
   - Station dialog enforces a fixed header + scrollable body layout (`flex` + controlled overflow).  
   - Inventory has per-panel scroll handling and mixed behavior (`current`, `owned`, `missions` have custom scroll styles), which can produce inconsistent UX.

---

## Changes needed in Inventory dialog

## 1) Introduce a small InventoryTabManager state model (high impact)

Create a minimal state container similar to station:

- `activeTab` (default `current`)
- `tabs = ["current", "owned", "weapons", "missions"]`
- optional metadata map for labels and future subtabs/filters

Add helper methods:

- `setActiveTab(tabId)` with fallback to `current`
- `renderTabs()` (classes + ARIA)
- `renderActivePanel()`

**Benefit:** removes DOM-driven state drift and gives deterministic behavior.

---

## 2) Replace direct DOM toggling with state-driven rendering (high impact)

Current `bindInventoryTabsOnce` toggles classes directly. Refactor to:

- On click/touch, call `setActiveTab(tabId)` only.
- `setActiveTab` handles:
  - tab validation
  - active class updates
  - panel activation
  - tab-specific render

**Benefit:** same architecture as station (`setActiveTab` as entry point), easier debugging.

---

## 3) Add keyboard-accessible tab navigation (high impact UX/accessibility)

Inventory currently has `role="tablist"` and `role="tab"`, but no keyboard behavior.

Add keydown handling:

- `ArrowRight` / `ArrowLeft`: move focus to adjacent tab
- `Home` / `End`: jump to first/last tab
- `Enter` / `Space`: activate focused tab

Also add:

- stable `id` on tab buttons
- `aria-controls` on tabs
- `id` on tab panels
- `aria-labelledby` on panels
- `tabindex` management for inactive tabs

**Benefit:** parity with mature tab UX; predictable controller/keyboard behavior.

---

## 4) Normalize tab and panel styling to shared primitives (medium impact)

Station tabs use reusable `.tab-btn` + `.is-active`; inventory uses separate `.inv-tab` styling.

Recommended options:

- Either migrate inventory tabs to `.tab-btn` (plus small inventory-specific modifier), or
- Keep `.inv-tab` but align spacing, active/hover states, and focus-visible behavior with `.tab-btn`.

Also standardize panel scrolling:

- One scroll container strategy for all inventory panels (avoid per-tab custom overflow rules where possible).

**Benefit:** consistent look/feel and reduced CSS divergence.

---

## 5) Avoid full pre-render of every tab on open (medium impact performance)

Today inventory renders all four tab contents each refresh, then shows one panel.

Refactor:

- Render only active tab content on open
- Cache static or expensive sections when possible
- Re-render inactive tabs only when data changes require it

**Benefit:** faster open/switch on slower devices and cleaner render lifecycle.

---

## 6) Strengthen event binding ownership (medium impact maintainability)

Inventory binds multiple delegated handlers using `__inv*Bound` flags on `.inventory-body`.

Keep delegation, but consolidate under one controller object:

- `init(bodyEl, stateProvider)`
- `destroy()` when overlay closes (optional, but cleaner)
- event namespace map for click/touch/keydown

**Benefit:** less incidental coupling and easier future extension.

---

## 7) Add tab config constants and fallback guardrails (low-medium impact)

Mirror station’s config-driven approach:

- `INVENTORY_TABS`
- `INVENTORY_DEFAULT_TAB`
- `isValidInventoryTab(tab)`

When invalid tab is requested, fallback silently and log once in debug mode.

**Benefit:** protects against markup drift and future refactors.

---

## 8) Optional: add inventory subtabs where complexity is growing (future-proof)

If inventory keeps expanding:

- `current`: `Stats` / `Outfits` / `Weapon ports`
- `owned`: `All` / `By role` / `Damaged`
- `missions`: `Active` / `Completed` / `Rewarded`

Use same pattern as station subtab rendering.

**Benefit:** keeps top-level tabs clean as features grow.

---

## Concrete implementation checklist

1. Add constants and a tiny tab state object in `game/inventoryDialog.js`.
2. Refactor `bindInventoryTabsOnce` to only dispatch actions (`setActiveTab`) instead of class toggles.
3. Add `renderInventoryTabsState` + `renderInventoryActivePanel` helpers.
4. Add keyboard handlers + full tab ARIA wiring in `game/game.html` inventory tab markup.
5. Align inventory tab CSS with station tab interaction/focus styles in `game/game.css`.
6. Optionally lazy-render inactive panels and add simple panel cache invalidation.
7. Add a small smoke test checklist for manual verification:
   - mouse click tab switching
   - touch tab switching
   - keyboard navigation
   - invalid tab fallback
   - active panel persists after rerender

---

## Quick priority order

1. State-driven `setActiveTab` + validation
2. Keyboard/ARIA completion
3. Render lifecycle cleanup (lazy render)
4. CSS unification
5. Optional subtab expansion

