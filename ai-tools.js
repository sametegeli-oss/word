/*
  FABRİKA AI Tools
  Sistem sorguları ve özel araçlar için başlangıç dosyası.
  HTML tarafındaki mevcut AI_TOOLS nesnesi varsa onu ezmeden genişletir.
*/

(function(){
  const root = window;
  root.AI_TOOLS = root.AI_TOOLS || {};

  root.AI_TOOLS.queryCount = root.AI_TOOLS.queryCount || {
    risk: 'safe',
    title: 'Kayıtlı sorgu sayısı',
    run: async function(){
      const qs = root.FABRIKA_QUERIES || [];
      return {
        count: qs.length,
        analiz: `Sistemde ${qs.length} kayıtlı sorgu yüklü.`
      };
    }
  };

  root.AI_TOOLS.queryList = root.AI_TOOLS.queryList || {
    risk: 'safe',
    title: 'Kayıtlı sorguları listele',
    run: async function(){
      const qs = root.FABRIKA_QUERIES || [];
      return {
        count: qs.length,
        rows: qs.map((q, i) => ({
          no: i + 1,
          name: q.name,
          collection: q.params && q.params.koleksiyon ? q.params.koleksiyon : ''
        })),
        analiz: `${qs.length} kayıtlı sorgu listelendi.`
      };
    }
  };
})();