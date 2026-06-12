/* Compatibility wrapper: eski index.html bağlantısı için güvenli loader.
   Asıl otomatik yükleme tumdata-auto-learningpath-fix.js içindedir. */
(function(){
  'use strict';
  window.loadTumDataFromGithubCompat = function(force){
    if (typeof window.loadTumDataFromGithub === 'function') return window.loadTumDataFromGithub(!!force);
    console.warn('loadTumDataFromGithub henüz hazır değil.');
    return Promise.resolve(null);
  };
})();
