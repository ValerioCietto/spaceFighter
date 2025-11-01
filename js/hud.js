(function(){
  const PFX = SF.STORAGE_PREFIX + 'hud.';
  const KEY = {
    dest: PFX+'dest',     // {q,r} axial
    zoom: PFX+'zoom'      // number
  };

  // ----- Hex map basics (axial coordinates) -----
  const canvas = document.getElementById('hexmap');
  const ctx = canvas.getContext('2d');
  const head = document.getElementById('nav-dest');
  const posEl = document.getElementById('nav-pos');

  // map state
  let zoom = Number(localStorage.getItem(KEY.zoom) || 1);
  zoom = Math.max(.8, Math.min(1.6, zoom));
  const HEX = { r: 18 * zoom };                   // hex radius
  const GRID = { w: 9, h: 9 };                    // sectors shown
  const center = { q: 0, r: 0 };                  // player sector (0,0) placeholder
  let destination = loadDest() || null;

  function saveDest(obj){ localStorage.setItem(KEY.dest, JSON.stringify(obj)); }
  function loadDest(){ try{ return JSON.parse(localStorage.getItem(KEY.dest)||'null'); }catch{ return null; } }

  function axialToPixel(q, r){
    const size = HEX.r;
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    const y = size * (3/2 * r);
    return { x, y };
  }
  function drawHex(x, y, r, stroke, fill){
    const a = Math.PI/3;
    ctx.beginPath();
    for (let i=0;i<6;i++){
      const px = x + r * Math.cos(a*i + Math.PI/6);
      const py = y + r * Math.sin(a*i + Math.PI/6);
      (i===0) ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
    }
    ctx.closePath();
    if (fill){ ctx.fillStyle = fill; ctx.fill(); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function resize(){
    // keep square
    const w = canvas.clientWidth;
    canvas.width = w; canvas.height = w;
    render();
  }
  new ResizeObserver(resize).observe(canvas);

  function render(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0b1324'; ctx.fillRect(0,0,W,H);

    // shift to center
    ctx.save();
    ctx.translate(W/2, H/2);

    // grid loop centered around player (0,0)
    const halfQ = Math.floor(GRID.w/2);
    const halfR = Math.floor(GRID.h/2);

    for (let dq=-halfQ; dq<=halfQ; dq++){
      for (let dr=-halfR; dr<=halfR; dr++){
        const q = center.q + dq;
        const r = center.r + dr;
        const {x,y} = axialToPixel(q, r);
        // background fill
        let fill = null;
        // player sector
        if (q===center.q && r===center.r) fill = 'rgba(77,163,255,.18)';
        // destination
        if (destination && q===destination.q && r===destination.r) fill = 'rgba(25,217,183,.22)';
        drawHex(x,y, HEX.r-1, '#25324a', fill);

        // tiny center dot
        ctx.beginPath(); ctx.arc(x,y, 1.6, 0, Math.PI*2);
        ctx.fillStyle='#9fb3d1'; ctx.fill();
      }
    }

    // legends
    ctx.restore();
    posEl.textContent = `pos ${center.q},${center.r}` + (destination ? ` → ${destination.q},${destination.r}` : '');
    head.textContent = destination ? `q${destination.q} r${destination.r}` : 'no destination';
  }

  // ----- interaction: click to set destination -----
  canvas.addEventListener('click', (ev)=>{
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width/rect.width);
    const py = (ev.clientY - rect.top)  * (canvas.height/rect.height);

    // transform to centered space
    const W = canvas.width, H = canvas.height;
    const x = px - W/2;
    const y = py - H/2;

    // approximate axial from pixel (inverse transform)
    const qf = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX.r;
    const rf = (2/3 * y) / HEX.r;
    // round to nearest hex
    let rq = Math.round(qf);
    let rr = Math.round(rf);
    const q_diff = Math.abs(rq - qf);
    const r_diff = Math.abs(rr - rf);
    const s_diff = Math.abs((-rq - rr) - (-(qf + rf)));
    if (q_diff > r_diff && q_diff > s_diff) rq = -rr - Math.round(-(qf+rf));
    else if (r_diff > s_diff) rr = -rq - Math.round(-(qf+rf));

    destination = { q: rq, r: rr };
    saveDest(destination);
    render();
  });

  // zoom controls
  document.getElementById('nav-zoom-in').addEventListener('click', ()=>{
    zoom = Math.min(1.6, +(zoom + 0.1).toFixed(2));
    localStorage.setItem(KEY.zoom, String(zoom));
    HEX.r = 18 * zoom; render();
  });
  document.getElementById('nav-zoom-out').addEventListener('click', ()=>{
    zoom = Math.max(.8, +(zoom - 0.1).toFixed(2));
    localStorage.setItem(KEY.zoom, String(zoom));
    HEX.r = 18 * zoom; render();
  });

  // initial render
  resize();
})();
