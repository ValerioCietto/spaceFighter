(function(){
  // a save game, if present is on localstorage key 'spaceFighterSaveData'
  const P = SF.STORAGE_PREFIX;
  const LEGACY_SAVE_KEYS = Array.from({ length: 13 }, (_, i) => i === 0 ? 'spaceFighterSaveData' : `spaceFighterSaveData${i}`);
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
    for (const legacyKey of LEGACY_SAVE_KEYS){
      if (localStorage.getItem(legacyKey)) return true;
    }
    // fallback scan
    for (let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if (key && key.startsWith(P)) return true;
    }
    return false;
  }

  function joinBaseUrl(path){
    const base = window.BASE_URL || window.location.origin + '/';
    return new URL(path, base).toString();
  }

  function clearForNewGame(){
    for (const k of SF.SAVE_KEYS) del(k);
    for (const legacyKey of LEGACY_SAVE_KEYS){
      safe(()=> localStorage.removeItem(legacyKey));
    }
  }

  function migrateLegacyIfNeeded(){
    const hasPrefixed = SF.SAVE_KEYS.some((k)=> !!localStorage.getItem(P+k));
    if (hasPrefixed) return;

    const legacyRaw = localStorage.getItem('spaceFighterSaveData');
    if (!legacyRaw) return;

    safe(()=>{
      // Keep the original payload; mirror it into the v1 namespace so Continue works.
      localStorage.setItem(P + 'player', legacyRaw);
    });
  }

  // simple helper for navigation – you can swap targets later
  function go(to){
    // Stub routes (use actual pages when ready)
    if (to === 'continue')       window.location.href = joinBaseUrl('game/game.html');
    else if (to === 'new')       window.location.href = joinBaseUrl('species-choose.html');
    else if (to === 'load')      window.location.href = joinBaseUrl('load.html');
  }

  migrateLegacyIfNeeded();

  window.SFSave = { get, set, del, hasAnySave, go, clearForNewGame };
})();
