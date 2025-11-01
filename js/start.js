(function(){
  // DOM
  const btnContinue = document.getElementById('btnContinue');
  const btnNew = document.getElementById('btnNew');
  const btnLoad = document.getElementById('btnLoad');

  // Continue availability
  const canContinue = SFSave.hasAnySave();
  btnContinue.disabled = !canContinue;

  // Button actions
  btnContinue.addEventListener('click', ()=> SFSave.go('continue'));
  btnNew.addEventListener('click', ()=> SFSave.go('new'));
  btnLoad.addEventListener('click', ()=> SFSave.go('load'));

  // Keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if (e.code === 'Enter' && !btnContinue.disabled) SFSave.go('continue');
    if (e.code === 'KeyN') SFSave.go('new');
    if (e.code === 'KeyL') SFSave.go('load');
  });

  // ----- Animated starfield background (Hi-DPI) -----
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
  let W=0, H=0, DPR=1;

  const LAYERS = [
    { count: 140, speed: 12, size: [0.6, 1.2], alpha: 0.35 },
    { count: 80,  speed: 24, size: [0.8, 1.8], alpha: 0.55 },
    { count: 40,  speed: 46, size: [1.0, 2.4], alpha: 0.8  }
  ];
  const stars = [];

  function rand(a,b){ return a + Math.random()*(b-a); }

  function initStars(){
    stars.length = 0;
    for (const L of LAYERS){
      for (let i=0;i<L.count;i++){
        stars.push({
          x: Math.random()*W, y: Math.random()*H,
          r: rand(L.size[0], L.size[1])*DPR,
          s: L.speed, a: L.alpha
        });
      }
    }
  }

  function resize(){
    DPR = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
    W = Math.floor(window.innerWidth*DPR);
    H = Math.floor(window.innerHeight*DPR);
    canvas.width = W; canvas.height = H;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    initStars();
  }
  window.addEventListener('resize', resize, { passive:true });
  resize();

  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05, (now-last)/1000); last = now;

    // background fill (subtle vignette)
    ctx.fillStyle = '#060a14'; ctx.fillRect(0,0,W,H);

    // draw stars
    for (const st of stars){
      st.x += st.s * dt * DPR * 0.6;
      if (st.x > W+8) st.x = -8, st.y = Math.random()*H;
      ctx.globalAlpha = st.a;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI*2);
      ctx.fillStyle = '#bcd7ff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();