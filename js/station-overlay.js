(function(){
  const OVERLAY = document.getElementById('dock');
  const ROOT = document.getElementById('station-root');
  const PFX = (window.SF?.STORAGE_PREFIX || 'sf.v1.') + 'station.';
  const KEY_LAST_TAB = PFX + 'lastTab';
  const KEY_CART     = PFX + 'cart';

  // ------- PUBLIC API -------
  async function open(opts={}){
    OVERLAY.classList.add('show'); OVERLAY.setAttribute('aria-hidden','false');
    // chiudi con backdrop click
    OVERLAY.querySelector('.dock-backdrop').onclick = ()=> close();
    // costruisci DOM della stazione
    buildDOM();
    // inizializza contenuti
    await initStation(opts.id || null);
  }
  function close(){
    OVERLAY.classList.remove('show'); OVERLAY.setAttribute('aria-hidden','true');
    ROOT.innerHTML = '';
  }
  window.StationOverlay = { open, close };

  // ------- BUILD STATIC DOM -------
  function buildDOM(){
    ROOT.innerHTML = `
      <header class="bar">
        <button class="btn ghost" id="btnBack">← Back to Space</button>
        <h1 id="placeName">Station</h1>
        <div class="spacer"></div>
      </header>

      <section class="hero">
        <canvas id="hero" width="1280" height="480" aria-label="Station view"></canvas>
      </section>

      <nav class="tabs" role="tablist" aria-label="Station Services">
        <button data-tab="shipyard"   class="tab">Shipyard</button>
        <button data-tab="weapons"    class="tab">Weapons</button>
        <button data-tab="shields"    class="tab">Shields</button>
        <button data-tab="utilities"  class="tab">Utilities</button>
        <button data-tab="engines"    class="tab">Engines</button>
        <button data-tab="offices"    class="tab">Offices</button>
        <button data-tab="market"     class="tab">Market</button>
        <button data-tab="spaceport"  class="tab">Spaceport</button>
      </nav>

      <main class="panels">
        <section id="p-shipyard"  class="panel"></section>
        <section id="p-weapons"   class="panel"></section>
        <section id="p-shields"   class="panel"></section>
        <section id="p-utilities" class="panel"></section>
        <section id="p-engines"   class="panel"></section>
        <section id="p-offices"   class="panel">
          <div class="office-grid">
            <article class="card">
              <h3>Job Board</h3>
              <p>Contracts, bounties and courier missions.</p>
              <button class="btn">Open</button>
            </article>
            <article class="card">
              <h3>Faction Office</h3>
              <p>Reputation, ranks and permits.</p>
              <button class="btn">Open</button>
            </article>
            <article class="card">
              <h3>Bank</h3>
              <p>Deposits, loans and insurance.</p>
              <button class="btn">Open</button>
            </article>
          </div>
        </section>
        <section id="p-market" class="panel">
          <div class="market">
            <div class="market-list" id="marketList"></div>
            <aside class="cart">
              <h3>Cart</h3>
              <div id="cartItems"></div>
              <div class="cart-total"><span>Total</span><strong id="cartTotal">0 cr</strong></div>
              <button class="btn primary" id="btnBuy">Buy</button>
            </aside>
          </div>
        </section>
        <section id="p-spaceport" class="panel">
          <div class="port">
            <div class="port-actions">
              <button class="btn">Repair</button>
              <button class="btn">Refuel</button>
              <button class="btn">Hire Crew</button>
            </div>
            <div class="port-footer">
              <button class="btn ghost" id="btnDepart">Depart</button>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  // ------- INIT / LOGIC -------
  async function initStation(placeId){
    const hero = ROOT.querySelector('#hero');
    const ctx = hero.getContext('2d');
    const placeName = ROOT.querySelector('#placeName');

    function drawHero(){
      const W = hero.width = hero.clientWidth;
      const H = hero.height = Math.max(220, Math.floor(hero.clientWidth*0.42));
      ctx.fillStyle='#0b1324'; ctx.fillRect(0,0,W,H);
      for(let i=0;i<W*H/6000;i++){ ctx.fillStyle='rgba(188,215,255,.7)'; ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1); }
      ctx.fillStyle='#0e1527'; ctx.fillRect(0,H*0.55,W,H*0.45);
      ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font='600 18px system-ui,sans-serif';
      ctx.fillText('Docked — Station Services', 16, 28);
    }
    new ResizeObserver(drawHero).observe(hero); drawHero();

    // Tabs
    const tabs = Array.from(ROOT.querySelectorAll('.tab'));
    const panels = {
      shipyard:  ROOT.querySelector('#p-shipyard'),
      weapons:   ROOT.querySelector('#p-weapons'),
      shields:   ROOT.querySelector('#p-shields'),
      utilities: ROOT.querySelector('#p-utilities'),
      engines:   ROOT.querySelector('#p-engines'),
      offices:   ROOT.querySelector('#p-offices'),
      market:    ROOT.querySelector('#p-market'),
      spaceport: ROOT.querySelector('#p-spaceport')
    };
    function activateTab(id){
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab===id));
      Object.entries(panels).forEach(([k,el]) => el.classList.toggle('active', k===id));
      localStorage.setItem(KEY_LAST_TAB, id);
    }
    tabs.forEach(btn => btn.addEventListener('click', ()=> activateTab(btn.dataset.tab)));
    activateTab(localStorage.getItem(KEY_LAST_TAB) || 'shipyard');

    // Back/Depart
    ROOT.querySelector('#btnBack').onclick = close;
    ROOT.querySelector('#btnDepart').onclick = close;

    // Registry
    async function ensureRegistry(){
      if (!(window.SFConfig && SFConfig.get)) return;
      await SFConfig.loadAll(['humans','jared','technicians'], []);
    }
    await ensureRegistry();

    // Place load (nome + shop tiers)
    async function loadPlace(){
      if (!placeId){ placeName.textContent='Station'; return null; }
      const tryPaths = [
        `assets/config/world/planets/humans/${placeId}.json`,
        `assets/config/world/planets/jared/${placeId}.json`,
        `assets/config/world/planets/technicians/${placeId}.json`,
        `assets/config/world/stations/humans/${placeId}.json`,
        `assets/config/world/stations/jared/${placeId}.json`,
        `assets/config/world/stations/technicians/${placeId}.json`
      ];
      for (const p of tryPaths){
        try{ const r=await fetch(p); if (r.ok){ const j=await r.json(); placeName.textContent=j.name||'Station'; return j; } }catch(_){}
      }
      placeName.textContent='Station'; return null;
    }
    const place = await loadPlace();

    // Inventory
    function listFromRegistry(kind){
      if (!(window.SFConfig && SFConfig.get)) return [];
      return Array.from(SFConfig.get(kind).values());
    }
    function mapKind(k){ return (k==='ship')?'ships':(k+'s'); }
    function filterByRules(pool, rules, kind){
      const out = [];
      for (const item of pool){
        const ok = (rules||[]).some(r=>{
          if (r.kind && mapKind(r.kind)!==kind) return false;
          if (r.speciesOrigin && r.speciesOrigin!=='Any' && item.speciesOrigin!==r.speciesOrigin) return false;
          if (r.classes && item.class && !r.classes.includes(item.class)) return false;
          if (typeof r.tiersMax==='number' && typeof item.tier==='number' && item.tier>r.tiersMax) return false;
          if (r.tagsAny && r.tagsAny.length && !((item.tags||[]).some(t=>r.tagsAny.includes(t)))) return false;
          return true;
        });
        if (ok || !rules?.length) out.push(item);
      }
      return out;
    }
    async function resolveInventory(place){
      const inv = { ships:[], weapons:[], utilities:[], engines:[] };
      if (place?.shopTiers?.length){
        const rules = [];
        for (const id of place.shopTiers){
          const sp = id.includes('human_')?'humans':id.includes('jared_')?'jared':'technicians';
          const path = `assets/config/shops/${sp}/${id.replace('shop_','')}.json`;
          try{ const r=await fetch(path); if (r.ok){ const j=await r.json(); rules.push(...(j.rules||[])); } }catch(_){}
        }
        ['ships','weapons','utilities','engines'].forEach(kind=>{
          inv[kind] = filterByRules(listFromRegistry(kind), rules, kind);
        });
      }else{
        inv.ships=listFromRegistry('ships');
        inv.weapons=listFromRegistry('weapons');
        inv.utilities=listFromRegistry('utilities');
        inv.engines=listFromRegistry('engines');
      }
      return inv;
    }

    const inv = await resolveInventory(place);

    // Renderers
    function renderList(container, list, kind){
      container.innerHTML = '';
      if (!list?.length){ container.innerHTML = `<p class="muted">Nothing available.</p>`; return; }
      const grid = document.createElement('div'); grid.className='grid';
      list.forEach(d=>{
        const el = document.createElement('article'); el.className='card';
        const meta = document.createElement('div'); meta.className='meta';
        const title = document.createElement('h3'); title.textContent = d.name || d.id;
        const desc = document.createElement('p'); desc.textContent = d.lore || d.tags?.join(' • ') || '';
        const price = document.createElement('div'); price.className='price';
        price.textContent = `${d.price?.buy ?? 0} cr`;
        meta.append(title, desc, price);
        const buy = document.createElement('div'); buy.className='buy';
        const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Inspect';
        btn.onclick = ()=> alert(`${d.name||d.id}\n\n${(d.lore||JSON.stringify(d,null,2)).slice(0,800)}`);
        buy.append(btn);
        el.append(meta,buy);
        grid.appendChild(el);
      });
      container.appendChild(grid);
    }

    renderList(panels.shipyard, inv.ships, 'ships');
    renderList(panels.weapons, inv.weapons, 'weapons');
    const shieldUtils = (inv.utilities||[]).filter(u => (u.effect||'').startsWith('shield'));
    renderList(panels.shields, shieldUtils, 'utilities');
    renderList(panels.utilities, inv.utilities, 'utilities');
    renderList(panels.engines, inv.engines, 'engines');

    // Market (cart persistente)
    const MARKET_ITEMS = [
      { id:'ore', name:'Raw Ore', price:12 },
      { id:'water', name:'Water', price:4 },
      { id:'food', name:'Food', price:7 },
      { id:'parts', name:'Parts', price:22 },
      { id:'gems', name:'Gemstones', price:90 }
    ];
    const cart = loadCart();
    function loadCart(){ try{ return JSON.parse(localStorage.getItem(KEY_CART)||'{}'); }catch{ return {}; } }
    function saveCart(){ localStorage.setItem(KEY_CART, JSON.stringify(cart)); }
    function renderMarket(){
      const list = ROOT.querySelector('#marketList');
      const cartBox = ROOT.querySelector('#cartItems');
      const cartTotal = ROOT.querySelector('#cartTotal');
      list.innerHTML='';

      MARKET_ITEMS.forEach(it=>{
        const row = document.createElement('article'); row.className='card';
        row.innerHTML = `<div class="meta"><h3>${it.name}</h3><p>Common commodity.</p><div class="price">${it.price} cr</div></div>`;
        const buy = document.createElement('div'); buy.className='buy';
        const input = document.createElement('input'); input.type='number'; input.min='0'; input.value=cart[it.id]?.qty||0; input.className='qty';
        input.oninput = ()=>{ cart[it.id]={ id:it.id, name:it.name, price:it.price, qty:Number(input.value)||0 }; update(); };
        buy.append(input); row.appendChild(buy); list.appendChild(row);
      });

      function update(){
        cartBox.innerHTML=''; let total=0;
        Object.values(cart).forEach(i=>{ if(!i.qty) return; const line=document.createElement('div'); line.textContent=`${i.name} × ${i.qty}`; const sub=i.qty*i.price; total+=sub; const subEl=document.createElement('span'); subEl.style.float='right'; subEl.textContent=`${sub} cr`; line.appendChild(subEl); cartBox.appendChild(line); });
        cartTotal.textContent = `${total} cr`; saveCart();
      }
      update();
      ROOT.querySelector('#btnBuy').onclick = ()=>{ alert('Purchase complete!'); Object.keys(cart).forEach(k=> delete cart[k]); saveCart(); renderMarket(); };
    }
    renderMarket();
  }
})();