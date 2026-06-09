/*
  FABRİKA Intent Engine
  - intent.json yükler
  - Kullanıcı metnini normalize eder
  - Alias ve keyword puanlaması ile en uygun intent'i bulur
  - query intent ise sorgular.json içindeki queryName'e bağlar
*/

(function(){
  function normalizeTR(s){
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[ç]/g,'c').replace(/[ğ]/g,'g').replace(/[ı]/g,'i')
      .replace(/[ö]/g,'o').replace(/[ş]/g,'s').replace(/[ü]/g,'u')
      .replace(/[âîû]/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  async function loadJSON(url){
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error(url + ' yüklenemedi: ' + r.status);
    return await r.json();
  }

  async function loadIntentCatalog(url='intent.json'){
    const data = await loadJSON(url);
    window.FABRIKA_INTENTS = Array.isArray(data.intents) ? data.intents : [];
    return window.FABRIKA_INTENTS;
  }

  async function loadQueryCatalog(url='sorgular.json'){
    const data = await loadJSON(url);
    window.FABRIKA_QUERIES = Array.isArray(data.queries) ? data.queries : [];
    return window.FABRIKA_QUERIES;
  }

  function scoreIntent(userText, intent){
    const q = normalizeTR(userText);
    if(!q) return 0;

    let best = 0;
    const aliases = Array.isArray(intent.aliases) ? intent.aliases : [];

    for(const a of aliases){
      const na = normalizeTR(a);
      if(!na) continue;
      if(q === na) best = Math.max(best, 100);
      else if(q.includes(na) || na.includes(q)) best = Math.max(best, 82);
      else {
        const qw = new Set(q.split(' ').filter(Boolean));
        const aw = new Set(na.split(' ').filter(Boolean));
        let hit = 0;
        for(const w of qw) if(aw.has(w)) hit++;
        const denom = Math.max(1, Math.max(qw.size, aw.size));
        best = Math.max(best, Math.round((hit / denom) * 70));
      }
    }

    const keys = Array.isArray(intent.keywords) ? intent.keywords : [];
    if(keys.length){
      let hit = 0;
      const qwords = new Set(q.split(' ').filter(Boolean));
      for(const k of keys){
        if(qwords.has(normalizeTR(k))) hit++;
      }
      best = Math.max(best, Math.min(75, hit * 12));
    }

    if(intent.priority) best += Math.min(10, Math.round(intent.priority / 20));
    return best;
  }

  function findIntent(userText, minScore=55){
    const intents = window.FABRIKA_INTENTS || [];
    let best = null;
    let bestScore = 0;

    for(const intent of intents){
      const s = scoreIntent(userText, intent);
      if(s > bestScore){
        best = intent;
        bestScore = s;
      }
    }

    if(!best || bestScore < minScore) return null;
    return {...best, score: bestScore};
  }

  function resolveIntentToQuery(intent){
    if(!intent) return null;
    if(intent.type === 'system') return intent;

    const queries = window.FABRIKA_QUERIES || [];
    const q = queries.find(x => x && x.name === intent.queryName);
    if(!q) return null;

    return {
      type: 'query',
      intent: intent.intent,
      queryName: intent.queryName,
      score: intent.score,
      query: q
    };
  }

  async function initFabrikaIntentEngine(opts={}){
    await loadQueryCatalog(opts.queriesUrl || 'sorgular.json');
    await loadIntentCatalog(opts.intentsUrl || 'intent.json');
    return {
      intents: window.FABRIKA_INTENTS.length,
      queries: window.FABRIKA_QUERIES.length
    };
  }

  window.FabrikaIntentEngine = {
    normalizeTR,
    loadIntentCatalog,
    loadQueryCatalog,
    initFabrikaIntentEngine,
    findIntent,
    resolveIntentToQuery,
    scoreIntent
  };
})();