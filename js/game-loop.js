// minimal starfield so you can see the HUD on top
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
  let W=0, H=0, DPR=1, stars=[];

  function resize(){
    DPR = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
    W = Math.floor(innerWidth*DPR);
    H = Math.floor(innerHeight*DPR);
    canvas.width = W; canvas.height = H;
    canvas.style.width='100%'; canvas.style.height='100%';
    buildStars();
  }
  function buildStars(){
    stars = [];
    const count = Math.floor((W*H)/(9000));
    for (let i=0;i<count;i++){
      stars.push({ x: Math.random()*W, y: Math.random()*H, r: (Math.random()*1.6+0.4)*DPR, a: Math.random()*0.9+0.1, s: Math.random()*30+10 });
    }
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  let last=performance.now();
  function loop(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    ctx.fillStyle='#060a14'; ctx.fillRect(0,0,W,H);
    for (const s of stars){
      s.x += s.s*dt;
      if (s.x > W+4) s.x = -4, s.y = Math.random()*H;
      ctx.globalAlpha = s.a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fillStyle='#bcd7ff'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
