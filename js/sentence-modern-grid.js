// Sentence Mode - Modern UI enhancer
// Amaç: Ana menü ve iç ekran kartlarını 2 sütunlu profesyonel mobil görünüme zorlamak.
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function textOf(el){ return (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim(); }
  function markCards(){
    document.documentElement.classList.add('sentence-modern-ui');
    document.body && document.body.classList.add('sentence-modern-ui');

    const labels = ['Bugün','Kelime','Liste','İstatistik','AI Koç','Premium Koç','SRS','Akıllı Plan','Telaffuz','Gerçek Sohbet','Ayarlar','Modüllere Git'];
    const candidates = Array.from(document.querySelectorAll('button,a,div,section'));
    candidates.forEach(el=>{
      const t = textOf(el);
      if(!t) return;
      const matched = labels.some(l=>t.includes(l));
      if(matched && el.children.length <= 8){
        el.classList.add('menu-card');
        el.removeAttribute('style');
      }
    });

    // Kartların ortak kapsayıcısını grid yap
    const cards = Array.from(document.querySelectorAll('.menu-card'));
    cards.forEach(card=>{
      const parent = card.parentElement;
      if(!parent) return;
      const siblings = Array.from(parent.children).filter(x=>x.classList && x.classList.contains('menu-card'));
      if(siblings.length >= 4){
        parent.classList.add('home-menu-grid');
        parent.setAttribute('data-ui-grid','home');
      }
    });
  }
  ready(()=>{
    markCards();
    const obs = new MutationObserver(()=>markCards());
    obs.observe(document.documentElement,{childList:true,subtree:true});
  });
})();
