/* Sentence Mode Professional UI v3 - auto enhancer */
(function(){
  const MENU_LABELS=['Bugün','Kelime','Liste','İstatistik','AI Koç','Premium Koç','SRS','Akıllı Plan','Telaffuz','Gerçek Sohbet','Ayarlar','Modüllere Git','Alıştırmalar','Hedefler','Notlarım','Favorilerim','İstatistikler'];
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  function txt(el){return (el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();}
  function injectCssFallback(){
    if(document.getElementById('sentence-pro-ui-link')||document.querySelector('link[href*="sentence-professional-ui.css"]')) return;
    const l=document.createElement('link'); l.id='sentence-pro-ui-link'; l.rel='stylesheet'; l.href='css/sentence-professional-ui.css'; document.head.appendChild(l);
  }
  function markMenuCards(){
    document.documentElement.classList.add('sentence-pro-ui'); if(document.body) document.body.classList.add('sentence-pro-ui');
    const candidates=[...document.querySelectorAll('button,a,div,section,article')];
    candidates.forEach(el=>{
      const t=txt(el); if(!t || t.length>160) return;
      const hit=MENU_LABELS.some(x=>t.includes(x));
      if(hit && el.children.length<=10){ el.classList.add('sp-card','menu-card'); el.style.width=''; el.style.gridColumn=''; }
    });
    [...document.querySelectorAll('.menu-card,.sp-card')].forEach(card=>{
      const p=card.parentElement; if(!p) return;
      const sib=[...p.children].filter(x=>x.classList && (x.classList.contains('menu-card')||x.classList.contains('sp-card')));
      if(sib.length>=4){p.classList.add('sp-grid','home-menu-grid'); p.setAttribute('data-ui-grid','home');}
    });
  }
  function enhanceLessonScreen(){
    const roots=[...document.querySelectorAll('main,section,div')].filter(el=>{
      const t=txt(el); return t.includes('Seviye:') && t.includes('Gramer') && t.length<1200 && el.querySelector('img');
    });
    roots.slice(0,2).forEach(root=>{
      root.classList.add('sp-lesson-shell');
      const img=root.querySelector('img');
      if(img){ const wrap=img.closest('div'); if(wrap) wrap.classList.add('sp-media-card'); }
      [...root.querySelectorAll('button')].forEach(b=>b.classList.add('btn'));
    });
  }
  function run(){injectCssFallback(); markMenuCards(); enhanceLessonScreen();}
  ready(()=>{ run(); let timer=0; new MutationObserver(()=>{clearTimeout(timer); timer=setTimeout(run,80);}).observe(document.documentElement,{childList:true,subtree:true}); });
})();
