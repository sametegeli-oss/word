/* FABRİKA Intent Engine v2 - Öğrenen Intent Sistemi */

window.FABRIKA_INTENTS = window.FABRIKA_INTENTS || [];
window.FABRIKA_QUERIES = window.FABRIKA_QUERIES || [];

function normTR(s) {
  return String(s || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[âîû]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadIntentJson(url = "intent.json") {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("intent.json yüklenemedi: " + r.status);
  const data = await r.json();
  window.FABRIKA_INTENT_DATA = data;
  window.FABRIKA_INTENTS = Array.isArray(data.intents) ? data.intents : [];
  return window.FABRIKA_INTENTS;
}

async function loadSorgularJson(url = "sorgular.json") {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("sorgular.json yüklenemedi: " + r.status);
  const data = await r.json();
  window.FABRIKA_QUERY_DATA = data;
  window.FABRIKA_QUERIES = Array.isArray(data.queries) ? data.queries : [];
  return window.FABRIKA_QUERIES;
}

function scoreIntent(userText, intent) {
  const q = normTR(userText);
  const aliases = intent.aliases || [];
  let best = 0;

  for (const a of aliases) {
    const x = normTR(a);
    if (!x) continue;

    if (q === x) best = Math.max(best, 100);
    else if (q.includes(x) || x.includes(q)) best = Math.max(best, 85);
    else {
      const qw = new Set(q.split(" "));
      const aw = new Set(x.split(" "));
      let hit = 0;
      qw.forEach(w => {
        if (aw.has(w)) hit++;
      });
      const ratio = hit / Math.max(qw.size, aw.size, 1);
      best = Math.max(best, Math.round(ratio * 70));
    }
  }

  return best;
}

function findTopIntents(userText, limit = 5) {
  return (window.FABRIKA_INTENTS || [])
    .map(intent => ({
      intent,
      score: scoreIntent(userText, intent)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findQueryByName(queryName) {
  return (window.FABRIKA_QUERIES || []).find(q => q.name === queryName);
}

function addAliasToIntent(intentId, aliasText) {
  const item = window.FABRIKA_INTENTS.find(x => x.intent === intentId);
  if (!item) return false;

  item.aliases = Array.isArray(item.aliases) ? item.aliases : [];

  const exists = item.aliases.some(a => normTR(a) === normTR(aliasText));
  if (!exists) item.aliases.push(aliasText);

  localStorage.setItem(
    "FABRIKA_INTENT_DATA_UPDATED",
    JSON.stringify(window.FABRIKA_INTENT_DATA, null, 2)
  );

  return true;
}

function downloadUpdatedIntentJson() {
  const data = localStorage.getItem("FABRIKA_INTENT_DATA_UPDATED");
  if (!data) {
    alert("Güncellenmiş intent yok.");
    return;
  }

  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "intent.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function logToLearningQueue(userText, candidates) {
  const list = JSON.parse(localStorage.getItem("FABRIKA_LEARNING_QUEUE") || "[]");

  list.push({
    id: "lq_" + Date.now(),
    text: userText,
    reason: "bunlardan hiçbiri seçildi",
    candidates: candidates.map(x => ({
      intent: x.intent.intent,
      queryName: x.intent.queryName || null,
      score: x.score
    })),
    at: Date.now(),
    status: "open"
  });

  localStorage.setItem("FABRIKA_LEARNING_QUEUE", JSON.stringify(list, null, 2));
}

async function askUserToChooseIntent(userText, candidates) {
  return new Promise(resolve => {
    const box = document.createElement("div");
    box.style.cssText = `
      position:fixed; inset:0; z-index:999999;
      background:rgba(0,0,0,.65);
      display:flex; align-items:center; justify-content:center;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background:#1a2028; color:#e4e8ee;
      width:520px; max-width:92vw;
      border:1px solid #3d4854;
      border-radius:10px; padding:18px;
      font-family:system-ui,sans-serif;
    `;

    panel.innerHTML = `
      <h3 style="margin:0 0 10px;">Ne demek istediğinizi seçin</h3>
      <div style="font-size:13px;color:#8a95a3;margin-bottom:12px;">
        Sorduğunuz: <b>${userText}</b>
      </div>
    `;

    candidates.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.textContent = `${i + 1}) ${c.intent.queryName || c.intent.intent} — %${c.score}`;
      btn.style.cssText = `
        display:block; width:100%; text-align:left;
        margin:6px 0; padding:10px;
        background:#232a34; color:#e4e8ee;
        border:1px solid #3d4854; border-radius:6px;
        cursor:pointer;
      `;
      btn.onclick = () => {
        document.body.removeChild(box);
        resolve(c.intent);
      };
      panel.appendChild(btn);
    });

    const none = document.createElement("button");
    none.textContent = "Bunlardan hiçbiri";
    none.style.cssText = `
      display:block; width:100%; text-align:left;
      margin-top:12px; padding:10px;
      background:#3a1f1f; color:#f87171;
      border:1px solid #f87171; border-radius:6px;
      cursor:pointer;
    `;
    none.onclick = () => {
      document.body.removeChild(box);
      resolve(null);
    };
    panel.appendChild(none);

    box.appendChild(panel);
    document.body.appendChild(box);
  });
}

async function resolveUserQuestion(userText) {
  const candidates = findTopIntents(userText, 5);

  if (!candidates.length || candidates[0].score < 55) {
    logToLearningQueue(userText, candidates);
    return {
      ok: false,
      reason: "intent bulunamadı",
      message: "Bu soruyu anlayamadım. Öğrenme kuyruğuna ekledim."
    };
  }

  if (candidates[0].score >= 95) {
    const intent = candidates[0].intent;
    return {
      ok: true,
      intent,
      query: intent.queryName ? findQueryByName(intent.queryName) : null,
      tool: intent.tool || null
    };
  }

  const selected = await askUserToChooseIntent(userText, candidates);

  if (!selected) {
    logToLearningQueue(userText, candidates);
    return {
      ok: false,
      reason: "kullanıcı hiçbirini seçti",
      message: "Öğrenme kuyruğuna eklendi."
    };
  }

  addAliasToIntent(selected.intent, userText);

  return {
    ok: true,
    intent: selected,
    query: selected.queryName ? findQueryByName(selected.queryName) : null,
    tool: selected.tool || null,
    learned: true
  };
}

window.FabrikaIntentEngine = {
  loadIntentJson,
  loadSorgularJson,
  resolveUserQuestion,
  findTopIntents,
  addAliasToIntent,
  downloadUpdatedIntentJson,
  logToLearningQueue
};
