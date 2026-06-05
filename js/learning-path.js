/* ════════════════════════════════════════════════════════════════════════
   WordMode — MODÜL ÖĞRENME YOLU (Learning Path)
   Mevcut uygulamanın İÇİNE entegre. Ayrı HTML yok. Legacy'ye dokunulmaz.
   Excel verisinden Modül → Part → Cümle ağacı kurar; kilit YOK.
   Mevcut motorları çağırır: speak, WM_getImageFor, callAI, updateSRS, addXP.
   ──────────────────────────────────────────────────────────────────────── */
(function WMLearningPath(){
  'use strict';
  if (window.__WM_PATH__) return; window.__WM_PATH__ = true;

  /* ---------- durum ---------- */
  var PATH = { tree: [], byModule: {}, lessonsFlat: [] };
  var PROG = loadProg();
  var view = { level: 'modules', moduleId: null, lessonId: null, stepIdx: 0 };

  function loadProg(){
    try { return JSON.parse(localStorage.getItem('wmPathProgress')) ||
      { known:{}, lessonDone:{}, lastLesson:null, xp:0 }; }
    catch(e){ return { known:{}, lessonDone:{}, lastLesson:null, xp:0 }; }
  }
  function saveProg(){
    try { localStorage.setItem('wmPathProgress', JSON.stringify(PROG)); } catch(e){}
  }

  /* ---------- yardımcılar ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function partNo(p){ var m=String(p||'').match(/P\s*(\d+)/i); return m?+m[1]:999; }
  function natural(a,b){ return String(a).localeCompare(String(b),'tr',{numeric:true,sensitivity:'base'}); }
  function rowId(r,i){ return r.id || r.ID || r.rowId || ('S'+i); }
  function rowEN(r){ return r.sentence || r.SentenceEN || r.en || ''; }
  function rowTR(r){ return r.sentenceTr || r.SentenceTR || r.tr || ''; }
  function rowModule(r){ return r.module || r.Module || r.topic || 'Genel Modül'; }
  function rowPart(r){ return r.part || r.Part || 'P1'; }
  function rowStage(r){ return r.stage || r.LearningStage || r.grammarStructure || ''; }
  function rowLevel(r){ return r.level || r.Level || r.sentenceLevel || r.SentenceLevel || 'A1'; }
  function rowGrammar(r){ return r.grammarStructure || r.GrammarStructure || r.grammar || ''; }
  function rowOrder(r,i){ var o=+(r.order||r.OrderIndex); return isNaN(o)?i:o; }

  /* ---------- veri kaynağını bul (WordMode'a yüklü kelimeler) ---------- */
  function sourceRows(){
    // 1) aktif allWords  2) son yüklenen liste  3) localStorage
    try { if (Array.isArray(window.allWords) && window.allWords.length) return window.allWords; } catch(e){}
    try {
      var raw = localStorage.getItem('lastFileData');
      if (raw){ var a=JSON.parse(raw); if(Array.isArray(a)&&a.length) return a; }
    } catch(e){}
    return [];
  }

  /* ---------- Excel → ders ağacı ---------- */
  function buildTree(){
    var rows = sourceRows();
    var map = {};                 // moduleId -> {name, lessons:{}}
    rows.forEach(function(r,i){
      var mod = rowModule(r), part = rowPart(r), stage = rowStage(r);
      var en = rowEN(r); if (!en) return;
      var mId = mod;
      var lId = mod + ' || ' + part;
      if (!map[mId]) map[mId] = { id:mId, name:mod, level:rowLevel(r), lessons:{} };
      if (!map[mId].lessons[lId]) map[mId].lessons[lId] =
        { id:lId, module:mod, part:part, stage:stage, order:partNo(part), grammar:rowGrammar(r), items:[] };
      map[mId].lessons[lId].items.push({
        id: rowId(r,i), en:en, tr:rowTR(r), word:(r.word||r.en||''),
        grammar:rowGrammar(r), order:rowOrder(r,i), raw:r
      });
    });
    var tree = Object.keys(map).map(function(k){
      var m = map[k];
      var lessons = Object.keys(m.lessons).map(function(lk){
        var l = m.lessons[lk];
        l.items.sort(function(a,b){ return a.order-b.order; });
        return l;
      }).sort(function(a,b){ return a.order-b.order || natural(a.part,b.part); });
      m.lessonsArr = lessons;
      m.total = lessons.reduce(function(s,l){ return s+l.items.length; },0);
      return m;
    }).sort(function(a,b){ return natural(a.name,b.name); });

    PATH.tree = tree;
    PATH.byModule = {}; tree.forEach(function(m){ PATH.byModule[m.id]=m; });
    PATH.lessonsFlat = [];
    tree.forEach(function(m){ m.lessonsArr.forEach(function(l){ PATH.lessonsFlat.push(l); }); });
    return tree;
  }

  /* ---------- ilerleme hesapları ---------- */
  function lessonKnown(l){ return l.items.filter(function(it){ return PROG.known[it.id]; }).length; }
  function lessonDone(l){ return PROG.lessonDone[l.id] || (l.items.length>0 && lessonKnown(l)>=l.items.length); }
  function moduleKnown(m){ return m.lessonsArr.reduce(function(s,l){ return s+lessonKnown(l); },0); }
  function modulePct(m){ return m.total>0 ? Math.round(moduleKnown(m)/m.total*100) : 0; }
  function findLesson(id){ for(var i=0;i<PATH.lessonsFlat.length;i++) if(PATH.lessonsFlat[i].id===id) return PATH.lessonsFlat[i]; return null; }

  /* expose minimal API for later steps / debugging */
  window.WMPath = { build:buildTree, data:PATH, prog:PROG, _save:saveProg,
    _view:view, go:function(v){ Object.assign(view,v); render(); } };

  /* render & CSS & screen wiring -> defined in part 2 (same file below) */
  window.__WM_PATH_RENDER_HOOK__ = function(fn){ render = fn; };
  var render = function(){ /* replaced in part2 */ };

  /* part2 attaches: injectCSS, ensureScreen, wireNav, render */
  window.__WM_PATH_INTERNAL__ = {
    PATH:PATH, PROG:PROG, view:view, esc:esc, saveProg:saveProg,
    buildTree:buildTree, lessonKnown:lessonKnown, lessonDone:lessonDone,
    moduleKnown:moduleKnown, modulePct:modulePct, findLesson:findLesson,
    setRender:function(fn){ render=fn; }
  };
})();

/* ════════════════════════════════════════════════════════════════════════
   PART 2 — Görsellik (CSS), Ekran kurulumu, Navigasyon, Render
   ──────────────────────────────────────────────────────────────────────── */
(function WMLearningPathUI(){
  'use strict';
  var I = window.__WM_PATH_INTERNAL__; if (!I) return;
  var PATH=I.PATH, PROG=I.PROG, view=I.view, esc=I.esc;

  /* ---------- 1) CSS (tek seferlik enjekte) ---------- */
  function injectCSS(){
    if (document.getElementById('wm-path-css')) return;
    var st=document.createElement('style'); st.id='wm-path-css';
    st.textContent = `
    #sc-path{ --p-glow:rgba(139,92,246,.55); --p-glow2:rgba(59,130,246,.45);
      padding:0 0 90px; }
    #sc-path .wp-hero{ position:relative; overflow:hidden;
      padding:26px 18px 30px; border-radius:0 0 28px 28px;
      background:
        radial-gradient(120% 90% at 12% -10%, rgba(139,92,246,.35), transparent 55%),
        radial-gradient(120% 90% at 95% 0%, rgba(59,130,246,.32), transparent 55%),
        linear-gradient(180deg,#141b2e 0%, #0b0f18 100%);
      border-bottom:1px solid rgba(139,92,246,.18); }
    #sc-path .wp-hero::after{ content:""; position:absolute; inset:0;
      background-image:radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
      background-size:14px 14px; opacity:.5; pointer-events:none;
      -webkit-mask-image:linear-gradient(180deg,#000,transparent); mask-image:linear-gradient(180deg,#000,transparent); }
    #sc-path .wp-eyebrow{ font-size:11px; letter-spacing:3px; text-transform:uppercase;
      color:#a5b4fc; font-weight:800; opacity:.9; }
    #sc-path .wp-title{ font-size:27px; font-weight:900; color:#f8fafc; margin:4px 0 2px;
      letter-spacing:-.5px; }
    #sc-path .wp-sub{ font-size:13px; color:#94a3b8; }
    #sc-path .wp-stat-row{ display:flex; gap:10px; margin-top:16px; position:relative; z-index:2; }
    #sc-path .wp-stat{ flex:1; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
      backdrop-filter:blur(8px); border-radius:16px; padding:11px 12px; text-align:center; }
    #sc-path .wp-stat b{ display:block; font-size:20px; font-weight:900; color:#f8fafc; line-height:1.1; }
    #sc-path .wp-stat span{ font-size:10px; color:#94a3b8; font-weight:700; }

    /* yol / patika */
    #sc-path .wp-path{ position:relative; padding:26px 18px 10px; }
    #sc-path .wp-path::before{ content:""; position:absolute; left:42px; top:10px; bottom:10px; width:3px;
      background:linear-gradient(180deg,var(--p-glow),var(--p-glow2),transparent);
      border-radius:3px; opacity:.5; }
    #sc-path .wp-node{ position:relative; display:flex; gap:16px; align-items:stretch; margin-bottom:16px;
      opacity:0; transform:translateY(14px) scale(.98); animation:wpIn .5s cubic-bezier(.2,.8,.25,1) forwards; }
    #sc-path .wp-orb{ flex:0 0 50px; width:50px; height:50px; border-radius:16px; display:flex;
      align-items:center; justify-content:center; font-size:22px; position:relative; z-index:2;
      background:linear-gradient(145deg,#1e2742,#151b2c); border:1px solid rgba(255,255,255,.1);
      box-shadow:0 8px 22px rgba(0,0,0,.45); }
    #sc-path .wp-node.done .wp-orb{ background:linear-gradient(145deg,#16a34a,#22c55e);
      box-shadow:0 8px 26px rgba(34,197,94,.5); }
    #sc-path .wp-card{ flex:1; background:linear-gradient(150deg,rgba(30,39,66,.9),rgba(17,24,39,.92));
      border:1px solid rgba(255,255,255,.09); border-radius:18px; padding:14px 16px; cursor:pointer;
      transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
    #sc-path .wp-card:hover{ transform:translateY(-2px); border-color:rgba(139,92,246,.5);
      box-shadow:0 14px 34px rgba(99,102,241,.22); }
    #sc-path .wp-card:active{ transform:translateY(0) scale(.99); }
    #sc-path .wp-card .wp-cn{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
    #sc-path .wp-card .wp-name{ font-size:15px; font-weight:800; color:#f1f5f9; line-height:1.25; }
    #sc-path .wp-card .wp-meta{ font-size:11px; color:#94a3b8; margin-top:3px; font-weight:600; }
    #sc-path .wp-badge{ font-size:10px; font-weight:800; padding:3px 9px; border-radius:999px;
      background:rgba(99,102,241,.18); color:#c4b5fd; border:1px solid rgba(139,92,246,.3); white-space:nowrap; }
    #sc-path .wp-badge.lv{ background:rgba(34,197,94,.15); color:#86efac; border-color:rgba(34,197,94,.3); }
    /* ilerleme halkası */
    #sc-path .wp-ring{ flex:0 0 44px; width:44px; height:44px; position:relative; }
    #sc-path .wp-ring svg{ transform:rotate(-90deg); }
    #sc-path .wp-ring .wp-pct{ position:absolute; inset:0; display:flex; align-items:center;
      justify-content:center; font-size:11px; font-weight:900; color:#e2e8f0; }
    #sc-path .wp-pbar{ height:6px; border-radius:6px; background:rgba(255,255,255,.07); margin-top:10px; overflow:hidden; }
    #sc-path .wp-pbar i{ display:block; height:100%; border-radius:6px;
      background:linear-gradient(90deg,#6366f1,#22c55e); transition:width .5s ease; }

    /* part chip satırı */
    #sc-path .wp-parts{ display:flex; gap:7px; margin-top:12px; flex-wrap:wrap; }
    #sc-path .wp-chip{ font-size:11px; font-weight:800; padding:6px 12px; border-radius:999px;
      background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); color:#cbd5e1; }
    #sc-path .wp-chip.done{ background:rgba(34,197,94,.18); border-color:rgba(34,197,94,.35); color:#86efac; }

    /* üst bar */
    #sc-path .wp-top{ display:flex; align-items:center; gap:12px; padding:14px 16px 0; }
    #sc-path .wp-back{ width:40px; height:40px; border-radius:13px; border:1px solid rgba(255,255,255,.1);
      background:rgba(255,255,255,.05); color:#e2e8f0; font-size:18px; cursor:pointer; flex:0 0 40px; }
    #sc-path .wp-back:active{ transform:scale(.95); }

    /* ders akışı kartı */
    #sc-path .wp-lesson{ padding:18px; }
    #sc-path .wp-scene{ position:relative; border-radius:22px; overflow:hidden; min-height:160px;
      background:linear-gradient(150deg,#1e2742,#0f1626); border:1px solid rgba(255,255,255,.1);
      display:flex; align-items:flex-end; box-shadow:0 18px 40px rgba(0,0,0,.5); }
    #sc-path .wp-scene .wp-scene-grad{ position:absolute; inset:0;
      background:linear-gradient(180deg,transparent 35%,rgba(8,11,18,.92)); }
    #sc-path .wp-scene .wp-scene-body{ position:relative; z-index:2; padding:18px; width:100%; }
    #sc-path .wp-scene .wp-en{ font-size:21px; font-weight:900; color:#fff; line-height:1.3; letter-spacing:-.3px; }
    #sc-path .wp-scene .wp-tr{ font-size:14px; color:#cbd5e1; margin-top:6px; font-weight:600; }
    #sc-path .wp-scene .wp-tag{ display:inline-block; font-size:10px; font-weight:800; letter-spacing:1px;
      text-transform:uppercase; color:#a5b4fc; background:rgba(99,102,241,.2); padding:3px 9px;
      border-radius:999px; margin-bottom:10px; }
    #sc-path .wp-actions{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px; }
    #sc-path .wp-act{ padding:14px; border-radius:15px; border:none; font-family:'Nunito',sans-serif;
      font-size:14px; font-weight:800; cursor:pointer; color:#fff; transition:transform .15s, filter .15s;
      display:flex; align-items:center; justify-content:center; gap:7px; }
    #sc-path .wp-act:active{ transform:scale(.97); }
    #sc-path .wp-act.listen{ background:linear-gradient(135deg,#3b82f6,#2563eb); }
    #sc-path .wp-act.speak{ background:linear-gradient(135deg,#8b5cf6,#7c3aed); }
    #sc-path .wp-act.know{ background:linear-gradient(135deg,#22c55e,#16a34a); color:#052e16; }
    #sc-path .wp-act.ai{ background:linear-gradient(135deg,#f59e0b,#d97706); }
    #sc-path .wp-act.full{ grid-column:1 / -1; }
    #sc-path .wp-act.ghost{ background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); color:#cbd5e1; }
    #sc-path .wp-progress-mini{ display:flex; align-items:center; gap:10px; margin:16px 0 4px; }
    #sc-path .wp-progress-mini .bar{ flex:1; height:8px; border-radius:8px; background:rgba(255,255,255,.07); overflow:hidden; }
    #sc-path .wp-progress-mini .bar i{ display:block; height:100%; background:linear-gradient(90deg,#6366f1,#22c55e); transition:width .4s; }
    #sc-path .wp-progress-mini .lbl{ font-size:12px; font-weight:800; color:#94a3b8; white-space:nowrap; }
    #sc-path .wp-ai-box{ margin-top:14px; border-radius:16px; padding:14px;
      background:linear-gradient(150deg,rgba(245,158,11,.1),rgba(217,119,6,.05));
      border:1px solid rgba(245,158,11,.25); color:#fde68a; font-size:13px; line-height:1.6; white-space:pre-wrap; }
    #sc-path .wp-empty{ text-align:center; padding:60px 24px; color:#94a3b8; }
    #sc-path .wp-empty .em{ font-size:54px; margin-bottom:14px; }
    @keyframes wpIn{ to{ opacity:1; transform:translateY(0) scale(1);} }
    @keyframes wpShimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    #sc-path .wp-shimmer{ background:linear-gradient(100deg,#1b2230 30%,#243049 50%,#1b2230 70%);
      background-size:200% 100%; animation:wpShimmer 1.2s infinite; }
    `;
    document.head.appendChild(st);
  }

  /* ---------- 2) Ekranı garanti et ---------- */
  function ensureScreen(){
    var app = document.getElementById('app') || document.body;
    var sc = document.getElementById('sc-path');
    if (!sc){
      sc = document.createElement('div');
      sc.className = 'screen'; sc.id = 'sc-path';
      app.appendChild(sc);
    }
    return sc;
  }

  /* ---------- 3) Nav düğmesi (mevcut bn-languageMap'i içeri al / yeni ekle) ---------- */
  function wireNav(){
    var nav = document.getElementById('bottomNav'); if (!nav) return;
    if (document.getElementById('bn-path')) return;   // zaten bağlı
    var existing = document.getElementById('bn-languageMap');
    if (existing){
      // Ayrı dosya açan eski düğmeyi UYGULAMA İÇİ yola çevir
      existing.setAttribute('onclick', "WMPath.open()");
      existing.onclick = function(e){ if(e&&e.preventDefault)e.preventDefault(); openPath(); };
      existing.innerHTML = '<span class="bico">🗺️</span>Modüller';
      existing.id = 'bn-path';
      return;
    }
    if (document.getElementById('bn-path')) return;
    var btn = document.createElement('button');
    btn.className='bnav-btn'; btn.id='bn-path';
    btn.innerHTML='<span class="bico">🗺️</span>Modüller';
    btn.onclick = openPath;
    nav.insertBefore(btn, nav.firstChild);
  }

  function openPath(){
    injectCSS(); ensureScreen();
    try { I.buildTree(); } catch(e){ console.warn('path build hata', e); }
    // alt navı işaretle
    try { document.querySelectorAll('.bnav-btn').forEach(function(b){ b.classList.remove('active'); }); } catch(e){}
    var b=document.getElementById('bn-path'); if(b) b.classList.add('active');
    // diğer ekranları kapat
    try { document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); s.style.display='none'; }); } catch(e){}
    var sc=document.getElementById('sc-path'); sc.classList.add('active'); sc.style.display='block';
    try { var nav=document.getElementById('bottomNav'); if(nav) nav.style.display='flex'; } catch(e){}
    view.level='modules'; render();
  }
  window.WMPath.open = openPath;

  /* ---------- 4) RENDER ---------- */
  function ringSVG(pct){
    var r=18, c=2*Math.PI*r, off=c*(1-pct/100);
    return '<svg width="44" height="44" viewBox="0 0 44 44">'
      +'<circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="4"/>'
      +'<circle cx="22" cy="22" r="18" fill="none" stroke="url(#wpg)" stroke-width="4" stroke-linecap="round"'
      +' stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>'
      +'<defs><linearGradient id="wpg" x1="0" y1="0" x2="1" y2="1">'
      +'<stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs></svg>';
  }

  function render(){
    var sc=document.getElementById('sc-path'); if(!sc) return;
    if (view.level==='modules') return renderModules(sc);
    if (view.level==='parts')   return renderParts(sc);
    if (view.level==='lesson')  return renderLesson(sc);
  }
  I.setRender(render);

  function renderModules(sc){
    var tree=PATH.tree;
    var doneCount=0, totalKnown=0, totalAll=0;
    tree.forEach(function(m){ totalKnown+=I.moduleKnown(m); totalAll+=m.total;
      if (I.modulePct(m)>=100) doneCount++; });
    if (!tree.length){
      sc.innerHTML = '<div class="wp-hero"><div class="wp-eyebrow">WordMode</div>'
        +'<div class="wp-title">Öğrenme Yolu</div>'
        +'<div class="wp-sub">Modül modül ilerle</div></div>'
        +'<div class="wp-empty"><div class="em">📭</div>'
        +'Henüz veri yüklenmemiş.<br>Önce bir Excel listesi yükle, sonra buraya dön.</div>';
      return;
    }
    var hero = '<div class="wp-hero">'
      +'<div class="wp-eyebrow">İngilizce · Modül Yolu</div>'
      +'<div class="wp-title">Öğrenme Yolu 🗺️</div>'
      +'<div class="wp-sub">İstediğin modülü seç, kilit yok.</div>'
      +'<div class="wp-stat-row">'
        +'<div class="wp-stat"><b>'+tree.length+'</b><span>MODÜL</span></div>'
        +'<div class="wp-stat"><b>'+totalKnown+'</b><span>ÖĞRENİLEN</span></div>'
        +'<div class="wp-stat"><b>'+doneCount+'</b><span>BİTEN</span></div>'
      +'</div></div>';

    var nodes = tree.map(function(m,i){
      var pct=I.modulePct(m), done=pct>=100;
      var icon = done ? '✓' : (['🅰️','📘','📗','📙','⭐','🌟','🏆','🧩','🔤'][i%9]);
      return '<div class="wp-node '+(done?'done':'')+'" style="animation-delay:'+(i*60)+'ms">'
        +'<div class="wp-orb">'+icon+'</div>'
        +'<div class="wp-card" onclick="WMPath.go({level:\'parts\',moduleId:'+JSON.stringify(m.id).replace(/"/g,'&quot;')+'})">'
          +'<div class="wp-cn"><div>'
            +'<div class="wp-name">'+esc(m.name)+'</div>'
            +'<div class="wp-meta">'+m.lessonsArr.length+' bölüm · '+m.total+' cümle</div>'
          +'</div>'
          +'<div class="wp-ring">'+ringSVG(pct)+'<div class="wp-pct">%'+pct+'</div></div>'
          +'</div>'
          +'<div class="wp-pbar"><i style="width:'+pct+'%"></i></div>'
        +'</div></div>';
    }).join('');

    sc.innerHTML = hero + '<div class="wp-path">'+nodes+'</div>';
  }

  function renderParts(sc){
    var m=PATH.byModule[view.moduleId]; if(!m){ view.level='modules'; return render(); }
    var top='<div class="wp-top"><button class="wp-back" onclick="WMPath.go({level:\'modules\'})">←</button>'
      +'<div><div class="wp-eyebrow" style="color:#a5b4fc">'+esc(m.level||'A1')+'</div>'
      +'<div style="font-size:19px;font-weight:900;color:#f8fafc">'+esc(m.name)+'</div></div></div>';
    var nodes = m.lessonsArr.map(function(l,i){
      var k=I.lessonKnown(l), tot=l.items.length, pct=tot?Math.round(k/tot*100):0;
      var done=I.lessonDone(l);
      return '<div class="wp-node '+(done?'done':'')+'" style="animation-delay:'+(i*70)+'ms">'
        +'<div class="wp-orb">'+(done?'✓':(i+1))+'</div>'
        +'<div class="wp-card" onclick="WMPath.go({level:\'lesson\',lessonId:'+JSON.stringify(l.id).replace(/"/g,'&quot;')+',stepIdx:0})">'
          +'<div class="wp-cn"><div>'
            +'<div class="wp-name">'+esc(l.part)+(l.stage?' · '+esc(l.stage):'')+'</div>'
            +'<div class="wp-meta">'+tot+' cümle'+(l.grammar?' · '+esc(l.grammar):'')+'</div>'
          +'</div><span class="wp-badge '+(done?'lv':'')+'">'+(done?'Bitti':('%'+pct))+'</span></div>'
          +'<div class="wp-pbar"><i style="width:'+pct+'%"></i></div>'
        +'</div></div>';
    }).join('');
    sc.innerHTML = top + '<div class="wp-path">'+nodes+'</div>';
  }

  function renderLesson(sc){
    var l=I.findLesson(view.lessonId); if(!l){ view.level='modules'; return render(); }
    if (view.stepIdx>=l.items.length) view.stepIdx=l.items.length-1;
    if (view.stepIdx<0) view.stepIdx=0;
    var it=l.items[view.stepIdx];
    var k=I.lessonKnown(l), tot=l.items.length, pct=Math.round((view.stepIdx+1)/tot*100);
    var known=!!PROG.known[it.id];
    PROG.lastLesson=l.id; I.saveProg();

    var top='<div class="wp-top"><button class="wp-back" onclick="WMPath.go({level:\'parts\',moduleId:'+JSON.stringify(l.module).replace(/"/g,'&quot;')+'})">←</button>'
      +'<div style="flex:1"><div class="wp-eyebrow" style="color:#a5b4fc">'+esc(l.part)+'</div>'
      +'<div style="font-size:16px;font-weight:900;color:#f8fafc">'+esc(l.module)+'</div></div></div>';

    var body = '<div class="wp-lesson">'
      +'<div class="wp-progress-mini"><div class="bar"><i style="width:'+pct+'%"></i></div>'
        +'<span class="lbl">'+(view.stepIdx+1)+' / '+tot+'</span></div>'
      +'<div class="wp-scene" id="wpScene">'
        +'<div class="wp-scene-grad"></div>'
        +'<div class="wp-scene-body">'
          +(it.grammar?'<span class="wp-tag">'+esc(it.grammar)+'</span>':'')
          +'<div class="wp-en">'+esc(it.en)+'</div>'
          +(it.tr?'<div class="wp-tr">'+esc(it.tr)+'</div>':'')
        +'</div>'
      +'</div>'
      +'<div class="wp-actions">'
        +'<button class="wp-act listen" onclick="WMPath.listen()">🔊 Dinle</button>'
        +'<button class="wp-act speak" onclick="WMPath.speak()">🎙️ Konuş</button>'
        +'<button class="wp-act ai full" onclick="WMPath.explain()">🧠 Bu cümleyi açıkla (AI)</button>'
        +'<button class="wp-act know full" onclick="WMPath.mark()">'+(known?'✓ Biliyorum (işaretli)':'✅ Biliyorum')+'</button>'
        +'<button class="wp-act ghost" onclick="WMPath.prev()">← Geri</button>'
        +'<button class="wp-act ghost" onclick="WMPath.next()">İleri →</button>'
      +'</div>'
      +'<div id="wpAiBox"></div>'
    +'</div>';

    sc.innerHTML = top + body;
    // arka plan görseli (mevcut motor)
    loadScene(it);
  }

  /* ---------- görsel (mevcut WM_getImageFor) ---------- */
  function loadScene(it){
    var scene=document.getElementById('wpScene'); if(!scene) return;
    if (typeof window.WM_getImageFor!=='function') return;
    scene.classList.add('wp-shimmer');
    window.WM_getImageFor(it.en, it.word||'').then(function(url){
      scene.classList.remove('wp-shimmer');
      if (url){ scene.style.backgroundImage='url("'+url+'")';
        scene.style.backgroundSize='cover'; scene.style.backgroundPosition='center'; }
    }).catch(function(){ scene.classList.remove('wp-shimmer'); });
  }

  /* ---------- ders aksiyonları (mevcut motorlara bağlı) ---------- */
  function curItem(){ var l=I.findLesson(view.lessonId); return l?l.items[view.stepIdx]:null; }
  var P = window.WMPath;
  P.listen=function(){ var it=curItem(); if(it&&typeof window.speak==='function') window.speak(it.en,'en-US'); };
  P.speak=function(){ var it=curItem(); if(!it) return;
    // mevcut telaffuz koçunu kullan (varsa); yoksa sadece dinlet
    if (typeof window.startPronCoach==='function'){
      try{ window.pronCoachCustomTarget=it.en; }catch(e){}
    }
    if (typeof window.speak==='function') window.speak(it.en,'en-US');
    if (typeof window.showToast==='function') window.showToast('🎙️ Telaffuz','Tekrar et: '+it.en.slice(0,40));
  };
  P.mark=function(){ var it=curItem(); if(!it) return;
    PROG.known[it.id]=true; PROG.xp=(PROG.xp||0)+5; I.saveProg();
    try{ if(typeof window.updateSRS==='function'&&it.word) window.updateSRS(it.word,true); }catch(e){}
    try{ if(typeof window.addXP==='function') window.addXP(5,'Cümle öğrenildi'); }catch(e){}
    P.next();
  };
  P.next=function(){ var l=I.findLesson(view.lessonId); if(!l) return;
    if (view.stepIdx< l.items.length-1){ view.stepIdx++; render(); }
    else { // ders sonu
      PROG.lessonDone[l.id]=true; I.saveProg();
      if (typeof window.showToast==='function') window.showToast('🎉 Bölüm bitti', l.part+' tamamlandı');
      view.level='parts'; view.moduleId=l.module; render();
    }
  };
  P.prev=function(){ if(view.stepIdx>0){ view.stepIdx--; render(); } };

  /* ---------- AI açıklama (mevcut callAI) ---------- */
  P.explain=function(){ var it=curItem(); if(!it) return;
    var box=document.getElementById('wpAiBox'); if(!box) return;
    if (typeof window.callAI!=='function'){ box.innerHTML='<div class="wp-ai-box">AI şu an kullanılamıyor.</div>'; return; }
    box.innerHTML='<div class="wp-ai-box">🧠 Açıklanıyor…</div>';
    var sys='Sen bir İngilizce öğretmenisin. Kısa, net, Türkçe açıkla. HTML/CSS kullanma.';
    var usr='Şu İngilizce cümleyi Türk öğrenciye açıkla: "'+it.en+'"'
      +(it.grammar?(' Gramer yapısı: '+it.grammar+'.'):'')
      +' 1) Anlamı 2) Yapı/gramer mantığı 3) 1 benzer örnek. Kısa tut.';
    Promise.resolve(window.callAI(sys,usr,'context')).then(function(res){
      var txt = (res&&res.content)?res.content:String(res||'');
      box.innerHTML='<div class="wp-ai-box">'+esc(txt)+'</div>';
    }).catch(function(e){ box.innerHTML='<div class="wp-ai-box">Açıklama alınamadı.</div>'; });
  };

  /* ---------- başlat ---------- */
  function boot(){ injectCSS(); ensureScreen(); wireNav(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  // MutationObserver: nav sonradan gelirse bağla
  try{ var mo=new MutationObserver(function(){ if(document.getElementById('bottomNav')) wireNav(); });
    mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true}); }catch(e){}
})();


/* ════════════════════════════════════════════════════════════════════════
   PART 3 — Ders sonu AI gramer özeti · Akıllı tekrar quiz · Konuşma köprüsü
   Mevcut motorlar: callAI, generateQuiz, startCustomScenario, switchTab, speak
   ──────────────────────────────────────────────────────────────────────── */
(function WMLearningPathPlus(){
  'use strict';
  var I = window.__WM_PATH_INTERNAL__; if (!I) return;
  var PATH=I.PATH, PROG=I.PROG, view=I.view, esc=I.esc;
  var P = window.WMPath;

  function curLesson(){ return I.findLesson(view.lessonId); }
  function curModule(){ var l=curLesson(); return l?PATH.byModule[l.module]:null; }

  /* shuffle yardımcı */
  function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; }

  /* ----------------------------------------------------------------
     1) DERS SONU — AI gramer özeti
     P.next() ders bittiğinde parts'a dönüyordu; onun yerine önce özet
     ekranı gösterelim. Mevcut P.next'i sarmalıyoruz (override).
  ---------------------------------------------------------------- */
  var _origNext = P.next;
  P.next = function(){
    var l=curLesson(); if(!l){ return _origNext&&_origNext(); }
    if (view.stepIdx < l.items.length-1){ return _origNext&&_origNext(); }
    // ders sonu: tamamla + özet ekranı
    PROG.lessonDone[l.id]=true; I.saveProg();
    try{ if(typeof window.showToast==='function') window.showToast('🎉 Bölüm bitti', l.part+' tamamlandı'); }catch(e){}
    showLessonComplete(l);
  };

  function showLessonComplete(l){
    var sc=document.getElementById('sc-path'); if(!sc) return;
    view.level='complete';
    var m=PATH.byModule[l.module];
    var modPct = m?I.modulePct(m):0;
    var grammar = l.grammar || (l.items[0]&&l.items[0].grammar) || '';
    sc.innerHTML =
      '<div class="wp-top"><button class="wp-back" onclick="WMPath.go({level:\'parts\',moduleId:'+JSON.stringify(l.module).replace(/"/g,'&quot;')+'})">←</button>'
      +'<div style="flex:1"><div class="wp-eyebrow" style="color:#86efac">TAMAMLANDI</div>'
      +'<div style="font-size:17px;font-weight:900;color:#f8fafc">'+esc(l.part)+'</div></div></div>'
      +'<div class="wp-lesson">'
        +'<div class="wp-complete-hero">'
          +'<div class="wp-burst">🎉</div>'
          +'<div class="wp-complete-title">Bölüm tamamlandı!</div>'
          +'<div class="wp-complete-sub">'+esc(l.module)+' · Modül ilerlemesi %'+modPct+'</div>'
        +'</div>'
        +'<div class="wp-pbar" style="margin:14px 0 4px"><i style="width:'+modPct+'%"></i></div>'
        +'<button class="wp-act ai full" style="margin-top:16px" onclick="WMPath.grammarSummary()">🧠 AI Gramer Özeti</button>'
        +'<div id="wpSummaryBox"></div>'
        +'<button class="wp-act speak full" style="margin-top:10px" onclick="WMPath.practiceScenario()">💬 Bu konuda konuşma pratiği</button>'
        +'<button class="wp-act know full" style="margin-top:10px" onclick="WMPath.reviewQuiz()">🔁 Akıllı tekrar testi</button>'
        +'<button class="wp-act ghost full" style="margin-top:10px" onclick="WMPath.go({level:\'parts\',moduleId:'+JSON.stringify(l.module).replace(/"/g,'&quot;')+'})">Bölümlere dön</button>'
      +'</div>';
  }

  /* AI gramer özeti */
  P.grammarSummary = function(){
    var l=curLesson(); if(!l) return;
    var box=document.getElementById('wpSummaryBox'); if(!box) return;
    if (typeof window.callAI!=='function'){ box.innerHTML='<div class="wp-ai-box">AI şu an kullanılamıyor.</div>'; return; }
    box.innerHTML='<div class="wp-ai-box">🧠 Gramer özeti hazırlanıyor…</div>';
    var examples = l.items.slice(0,6).map(function(it){ return '- '+it.en+(it.tr?(' ('+it.tr+')'):''); }).join('\n');
    var sys='Sen deneyimli bir İngilizce öğretmenisin. Türkçe, kısa ve net açıkla. Madde madde yaz, HTML kullanma.';
    var usr='Öğrenci şu bölümü bitirdi: "'+l.module+' / '+l.part+'".'
      +(l.grammar?(' Ana gramer yapısı: '+l.grammar+'.'):'')
      +'\nÖrnek cümleler:\n'+examples
      +'\n\nŞunları ver: 1) Bu bölümün gramer kuralını 2-3 cümleyle özetle. '
      +'2) Dikkat edilecek 1 yaygın hata. 3) Aynı kalıpta 2 YENİ örnek cümle (İngilizce + Türkçe). Kısa tut.';
    Promise.resolve(window.callAI(sys,usr,'context')).then(function(res){
      var txt=(res&&res.content)?res.content:String(res||'');
      box.innerHTML='<div class="wp-ai-box">'+esc(txt)+'</div>';
    }).catch(function(){ box.innerHTML='<div class="wp-ai-box">Özet alınamadı (AI hatası).</div>'; });
  };

  /* ----------------------------------------------------------------
     2) AKILLI TEKRAR QUIZ — bu bölümün cümlelerinden 4 şıklı mini test
        (çeldiriciler aynı bölüm/modülün diğer cümlelerinden)
  ---------------------------------------------------------------- */
  var quiz = { items:[], idx:0, correct:0 };
  P.reviewQuiz = function(){
    var l=curLesson(); if(!l) return;
    var pool = l.items.slice();
    if (pool.length < 2){ // çeldirici için modül havuzunu kullan
      var m=PATH.byModule[l.module];
      if (m) pool = m.lessonsArr.reduce(function(s,x){ return s.concat(x.items); },[]);
    }
    var qs = shuffle(pool).slice(0, Math.min(5,pool.length)).filter(function(it){return it.tr;});
    if (!qs.length){ if(window.showToast)window.showToast('Tekrar','Bu bölümde çeviri verisi yok'); return; }
    quiz={ items:qs, idx:0, correct:0, pool:pool };
    view.level='quiz'; renderQuiz();
  };

  function renderQuiz(){
    var sc=document.getElementById('sc-path'); if(!sc) return;
    if (quiz.idx>=quiz.items.length) return renderQuizResult();
    var q=quiz.items[quiz.idx];
    // 1 doğru + 3 çeldirici Türkçe çeviri
    var others = shuffle(quiz.pool.filter(function(it){ return it.id!==q.id && it.tr && it.tr!==q.tr; }))
      .slice(0,3).map(function(it){ return it.tr; });
    var opts = shuffle([q.tr].concat(others));
    var l=curLesson();
    sc.innerHTML =
      '<div class="wp-top"><button class="wp-back" onclick="WMPath.go({level:\'complete\'})">←</button>'
      +'<div style="flex:1"><div class="wp-eyebrow" style="color:#a5b4fc">AKILLI TEKRAR</div>'
      +'<div style="font-size:16px;font-weight:900;color:#f8fafc">Soru '+(quiz.idx+1)+' / '+quiz.items.length+'</div></div></div>'
      +'<div class="wp-lesson">'
        +'<div class="wp-progress-mini"><div class="bar"><i style="width:'+Math.round((quiz.idx)/quiz.items.length*100)+'%"></i></div>'
          +'<span class="lbl">'+quiz.correct+' doğru</span></div>'
        +'<div class="wp-quiz-q">'+esc(q.en)+'</div>'
        +'<div class="wp-quiz-hint">Doğru Türkçe karşılığı seç</div>'
        +'<div class="wp-quiz-opts" id="wpQuizOpts">'
          +opts.map(function(o){ return '<button class="wp-quiz-opt" data-tr="'+esc(o)+'" onclick="WMPath.quizAnswer(this)">'+esc(o)+'</button>'; }).join('')
        +'</div>'
      +'</div>';
    // soruyu sesli oku
    try{ if(typeof window.speak==='function') window.speak(q.en,'en-US'); }catch(e){}
  }

  P.quizAnswer = function(btn){
    var q=quiz.items[quiz.idx];
    var chosen=btn.getAttribute('data-tr');
    var correct = (chosen===q.tr);
    var opts=document.getElementById('wpQuizOpts');
    if(opts) opts.querySelectorAll('.wp-quiz-opt').forEach(function(b){
      b.disabled=true;
      if(b.getAttribute('data-tr')===q.tr) b.classList.add('ok');
      else if(b===btn) b.classList.add('no');
    });
    if(correct){ quiz.correct++; try{ if(window.updateSRS&&q.word)window.updateSRS(q.word,true); }catch(e){} }
    else { try{ if(window.updateSRS&&q.word)window.updateSRS(q.word,false); }catch(e){} }
    setTimeout(function(){ quiz.idx++; renderQuiz(); }, 850);
  };

  function renderQuizResult(){
    var sc=document.getElementById('sc-path'); if(!sc) return;
    var pct=Math.round(quiz.correct/quiz.items.length*100);
    var msg = pct>=80?'Harika! 🌟':pct>=50?'İyi gidiyor 👍':'Tekrar çalışmaya değer 💪';
    try{ if(window.addXP) window.addXP(quiz.correct*3,'Tekrar testi'); }catch(e){}
    var l=curLesson();
    sc.innerHTML =
      '<div class="wp-top"><button class="wp-back" onclick="WMPath.go({level:\'complete\'})">←</button>'
      +'<div style="flex:1"><div class="wp-eyebrow" style="color:#86efac">SONUÇ</div>'
      +'<div style="font-size:16px;font-weight:900;color:#f8fafc">Akıllı Tekrar</div></div></div>'
      +'<div class="wp-lesson"><div class="wp-complete-hero">'
        +'<div class="wp-burst">'+(pct>=80?'🏆':pct>=50?'✨':'📚')+'</div>'
        +'<div class="wp-complete-title">'+quiz.correct+' / '+quiz.items.length+' doğru</div>'
        +'<div class="wp-complete-sub">'+msg+' · %'+pct+'</div>'
      +'</div>'
      +'<button class="wp-act know full" style="margin-top:16px" onclick="WMPath.reviewQuiz()">🔁 Tekrar dene</button>'
      +'<button class="wp-act ghost full" style="margin-top:10px" onclick="WMPath.go({level:\'parts\',moduleId:'+JSON.stringify(l?l.module:'').replace(/"/g,'&quot;')+'})">Bölümlere dön</button>'
      +'</div>';
  }

  /* ----------------------------------------------------------------
     3) KONUŞMA KÖPRÜSÜ — modül konusuyla senaryo pratiği
        Mevcut startCustomScenario / switchTab('conversation') kullanır
  ---------------------------------------------------------------- */
  P.practiceScenario = function(){
    var l=curLesson(); if(!l) return;
    var topic = l.module.replace(/^A\d-M\d+\s*/,''); // "A1-M01 Be Verb" -> "Be Verb"
    var sample = l.items.slice(0,4).map(function(it){return it.en;}).join(' ');
    var rolePrompt = 'You are a friendly English tutor. Practice a short, simple conversation with a beginner '
      +'focused on this grammar topic: "'+topic+'". Use very simple A1-level English. '
      +'Example sentences from the lesson: '+sample+' Ask one short question at a time.';
    // senaryo ekranına geç + başlat
    var started=false;
    try {
      if (typeof window.switchTab==='function'){ window.switchTab('conversation'); started=true; }
    } catch(e){}
    setTimeout(function(){
      try {
        if (typeof window.startCustomScenario==='function'){ window.startCustomScenario(rolePrompt); }
        else if (typeof window.startScenarioWithRole==='function'){ window.startScenarioWithRole('🎭 '+topic, rolePrompt); }
        else if (window.showToast){ window.showToast('Konuşma','Senaryo modu bulunamadı'); }
      } catch(e){ if(window.showToast) window.showToast('Konuşma','Başlatılamadı'); }
    }, started?260:0);
  };

  /* ----------------------------------------------------------------
     CSS — yeni parçalar (tamamlanma, quiz)
  ---------------------------------------------------------------- */
  function injectPlusCSS(){
    if (document.getElementById('wm-path-plus-css')) return;
    var st=document.createElement('style'); st.id='wm-path-plus-css';
    st.textContent = `
    #sc-path .wp-complete-hero{ text-align:center; padding:24px 16px 8px; }
    #sc-path .wp-burst{ font-size:64px; line-height:1; animation:wpPop .6s cubic-bezier(.2,1.4,.4,1) both; }
    @keyframes wpPop{ 0%{transform:scale(0) rotate(-20deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
    #sc-path .wp-complete-title{ font-size:23px; font-weight:900; color:#f8fafc; margin-top:10px; letter-spacing:-.4px; }
    #sc-path .wp-complete-sub{ font-size:13px; color:#94a3b8; margin-top:5px; font-weight:600; }
    #sc-path .wp-quiz-q{ font-size:24px; font-weight:900; color:#fff; text-align:center; padding:26px 14px;
      background:linear-gradient(150deg,#1e2742,#0f1626); border:1px solid rgba(255,255,255,.1);
      border-radius:20px; margin-top:6px; letter-spacing:-.3px; box-shadow:0 14px 34px rgba(0,0,0,.4); }
    #sc-path .wp-quiz-hint{ text-align:center; font-size:12px; color:#94a3b8; margin:12px 0; font-weight:700; }
    #sc-path .wp-quiz-opts{ display:flex; flex-direction:column; gap:10px; }
    #sc-path .wp-quiz-opt{ padding:15px; border-radius:14px; border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.05); color:#e2e8f0; font-family:'Nunito',sans-serif; font-size:15px;
      font-weight:700; cursor:pointer; text-align:left; transition:transform .12s, background .2s, border-color .2s; }
    #sc-path .wp-quiz-opt:hover{ border-color:rgba(139,92,246,.5); background:rgba(139,92,246,.1); }
    #sc-path .wp-quiz-opt:active{ transform:scale(.98); }
    #sc-path .wp-quiz-opt.ok{ background:linear-gradient(135deg,#16a34a,#22c55e); color:#fff; border-color:transparent; }
    #sc-path .wp-quiz-opt.no{ background:linear-gradient(135deg,#dc2626,#ef4444); color:#fff; border-color:transparent; }
    `;
    document.head.appendChild(st);
  }
  injectPlusCSS();
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectPlusCSS);
})();
