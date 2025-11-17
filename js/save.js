ies(function(){
  const P = SF.STORAGE_PREFIX;
  const safe = (fn, fallback=null)=>{ try{ return fn(); }catch(e){ return fallback; } };

  function get(key, def=null){
    return safe(()=> {
      const raw = localStorage.getItem(P+key);
      return raw ? JSON.parse(raw) : def;
    }, def);
  }
  function set(key, val){ safe(()=> localStorage.setItem(P+key, JSON.stringify(val))); }
  function del(key){ safe(()=> localStorage.removeItem(P+key)); }

  function hasAnySave(){
    // True if any known save key exists OR any key starting with prefix exists
    for (const k of SF.SAVE_KEYS){
      if (localStorage.getItem(P+k)) return true;
    }
    // fallback scan
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if (key && key.startsWith(P)) return true;
    }
    return false;
  }

  // simple helper for navigation – you can swap targets later
  function go(to){
    // Stub routes (use actual pages when ready)
    if (to === 'continue')       window.location.href = 'game.html?resume=1';
    else if (to === 'new')       window.location.href = 'species-choose.html';
    else if (to === 'load')      window.location.href = 'load.html';
  }

  window.SFSave = { get, set, del, hasAnySave, go };
})();
